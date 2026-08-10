---
tags:
  - Cpp
  - Boost
  - CMake
---
### 前言

C++没有官方的 subprocess 处理库。所以要么自己写基于平台的调用代码，要么用别人封装好的库。这里选择用 Boost::process v2 来实现对外部程序的调用和管理。

### 引入 Boost::process

[[posts/blog/C++/在 CMake C++23 项目 (MODULE_STD) 中使用 Boost|在 CMake C++23 项目 (MODULE_STD) 中使用 Boost]] 

这篇文章描述了如何引入 Boost 库，其中的例子也用的是 Boost::process.

### 使用 Boost::process

我们使用 process v2，这需要我们导入如下头文件
```cpp
#include "boost/asio.hpp"
#include "boost/process/v2/process.hpp"
#include "boost/process/v2/environment.hpp"
#include "boost/process/v2/stdio.hpp"
```

同时，为方便起见，我们定义一下命名空间的简写
```cpp
namespace asio = boost::asio;
namespace bp = boost::process::v2;
```

#### 借助环境变量找到可执行程序

以 ffmpeg 为例。下面这行代码会尝试从环境变量里找到名为 `ffmpeg` 的程序。
```cpp
const auto ffmpeg = bp::environment::find_executable("ffmpeg");
```

#### 调用程序

随后，我们需要一个 asio context
```cpp
asio::io_context ctx;
```

然后，我们就可以调用程序了
```cpp
bp::process proc{ctx, ffmpeg, arguments};
```

这里的 arguments 类型为 `std::initializer_list<string_view>`，一般而言用一个 `std::vector<std::string>` 就可以了。实际代码里还有很多情况的重载写法，这里就不一一赘述了。这些 arguments 将会被直接传递给程序，不会经过 shell. 

`bp::process` 在构造时就会直接启动程序。通过在代码里执行 `proc.wait()` 可以阻塞地等待该程序运行完成。`proc.wait()` 会返回程序的退出码，也可以使用 `proc.exit_code()` 来获得退出码。这可以用于监测程序是否正确完成。

#### 获得程序输出

可以通过定义 `asio::readable_pipe` 来链接到程序的管道，从而获得程序的输出。
```cpp
asio::readable_pipe stdoutPipe{ctx};
asio::readable_pipe stderrPipe{ctx};
```
这里的 `ctx` 是前面定义的 `asio::io_context`. `asio::readable_pipi` 可以分配给 `out` 和 `err` 管道。

在构造 `bp::process` 时将管道构造成一个 `std::initializer_list` 作为第四个参数传入，即可连接管道。
```cpp
bp::process proc{
	ctx,
	m_ffmpeg,
	arguments,
	bp::process_stdio{
		.in = {},
		.out = stdoutPipe,
		.err = stderrPipe
	}
};
```
`bp::process_stdio` 的三个值按顺序分别为 `in` `out` `err`.

注意这里用到了 C++17 的 designated initializers. 如果不是 C++17，需要写 `bp::process_stdio{{}, stdoutPipe, stderrPipe}`.

这样会创建两个匿名管道并使 ffmpeg 的输出重定向到这两个管道里，匿名管道只会被父子进程使用（这里就是我们的代码和 ffmpeg）。由于操作系统只会给管道设置有限的缓冲区，所以我们需要及时地取出/清理管道的内容，否则当缓冲区满时程序会被阻塞。

我们可以使用 
```cpp
asio::async_read_until(
	AsyncReadStream& s,
    DynamicBuffer_v2 buffers,
    char delim,
    ReadToken&& token = default_completion_token_t<
	    typename AsyncReadStream::executor_type>(),
    constraint_t<is_dynamic_buffer_v2<DynamicBuffer_v2>::value > = 0)
```
来异步地读取两个管道的输出。由于 ffmpeg 会大量地写入 stderr，所以如果用同步的读取，stderr 可能会在 stdout 还没读完的时候就被写爆了，因此我们需要异步地同时读两个管道地输出。

这个函数的参数特别复杂，我其实也没太搞明白，但简单来说，
- 第一个参数可以传入一个管道，作为读取的目标；
- 第二个参数为自己定义的一个缓冲区，这会将读取到的内容写入到其中；
- 第三个参数为终止符，函数名是 read_until，意思是 “一直读直到……” 这里的终止符就是那个“直到”，当读到这个字符的时候，该次读取就会结束；
- 第四个参数是一个 `ReadToken` ，是 Boost 对读取行为的抽象，这个行为应当能接收 `(boost::system::error_code, std::size_t)` 这两个参数，

由于我在网上没有找到 **任何** 与之相关的描述，Boost 的文档[^1]也 **完全没有** 给出任何有用的信息（看这文档还不如看源码注释），因此关于第四个参数的信息完全来自于源码[^2]和 GPT 5.6-Sol 基于源码的回答。并且第四个参数的描述里仅考虑了传入一个回调函数的情况，这个回调函数会在 read_until 完成时（即读到了终止符后）被调用，没有考虑 `asio::future` `co_await` 等情况。 

因此，我们传入的参数应当为（以 `stdoutPipe` 为例）
```cpp
asio::async_read_until(
	stdoutPipe,
	asio::dynamic_buffer(stdoutBuffer), // std::string stdoutBuffer;
	'\n',
	一个lambda
)
```
这里 `asio::dynamic_buffer` 函数会返回一个指向给定参数的 `asio::dynamic_string_buffer` 包装。分隔符使用换行符 \n. 

接下来写 lambda. 由于 `async_read_until` 只会读一次，因此我们应该在回调函数里再次注册一次 `async_read_until`. 这个 lambda 会有点长，而且我们需要注册 stdout stderr 两个管道，因此我们先把这整个注册行为拆成一个函数。

```cpp
using read_line_handler = std::function<void(std::string_view)>;
static void ReadLines(
	asio::readable_pipe& pipe,
	std::string& buffer,
	read_line_handler handler,
	std::optional<boost::system::error_code>& read_error
)
{
	asio::async_read_until(
		pipe,
		asio::dynamic_buffer(buffer),
		'\n',
		[&pipe, &buffer, &read_error, handler = std::move(handler)](
			const boost::system::error_code& error,
			const std::size_t size
		) mutable -> void
		{
			...
			ReadLines(pipe, buffer, std::move(handler), read_error);
			...
		}
	);
}
```

`ReadLines` 接收一个 `std::function<void(std::string_view)>` 作为对读到内容的处理函数，我们在 lambda 内部做 error 的处理，将实际读到的内容转发给 handler 来处理。lambda 里 capture 管道、缓冲区和错误码，以用于传递给下一次注册。这里 handler 不会有所有权问题，它是唯一的，所以我们总是可以 move 它。

对于 `read_error`，直接创建一个 `std::optional<boost::system::error_code>` 传入即可。例如，我们可以定义 `std::optional<boost::system::error_code> stdoutError;` 并传入它作为 stdout 管道的错误码记录者。

先简单做一下错误的处理，如果没有出现错误，那么一切正常，我们直接重新注册。
```cpp
if (!error) {
	...
	ReadLines(pipe, buffer, std::move(handler), read_error);
	return;
}
```

如果出现错误，如果这个错误只是单纯的读完了，那么我们清空缓冲区并返回
```cpp
if (error == asio::error::eof) {
	if (!buffer.empty()){
		handler(buffer);
		buffer.clear();
	}
	return;
}
```

如果出现了其他的错误，我们就记录错误码。

```
read_error = error;
```

总结如下
```cpp
if (!error) {
	...
    ReadLines(pipe, buffer, std::move(handler), read_error);
    return;
}

if (error == asio::error::eof) {
    if (!buffer.empty()) {
        handler(buffer);
        buffer.clear();
    }
    return;
}

read_error = error;
```

然后我们把处理过程也补上。先解释一下这个 `ReadToken&&` lambda 被要求接收的两个参数，第一个错误码自不必说，第二个 size 是怎么一回事？我们的 buffer 不是自身就有 size 吗？

虽然 `read_until` 在读到终止符的时候就会终止，但它终止的方式是记录有效长度，缓冲区内仍然可能有在终止符之后的内容，例如，buffer 里的内容可能为 `frame=100\nspeed=2.4x\n`，`read_util` 会返回 `size = 10` 来指明读到的有效内容只是 `frame=100\n`，但后面的 `speed=2.4x\n` 也确实在 buffer 里面。

因此，不管是处理读到的内容还是清理缓冲区，都需要以给定的 size 为准。
```cpp
std::string line = buffer.substr(0, size);
buffer.erase(0, size);

while (!line.empty() && (line.back() == '\n' || line.back() == '\r')) {
    line.pop_back();
}

handler(line);
ReadLines(pipe, buffer, std::move(handler), read_error);
return;
```
这段代码取出了 buffer 内的有效内容，擦除了 buffer 内的对应区域，将有效内容简单清理之后转发给 handler 处理。

最后，我们需要在调用程序之后、`proc.wait()` 之前执行
```cpp
ctx.run();
```
来运行 `asio::io_context`，从而使重定向输出后的程序可以被正确地读取内容并清理缓冲区。

如果在构造 `bp::process` 之前就执行 `ctx.run()`，会导致 io context 在管道正确连接到进程之前就启动，管道描述符将会是无效的，io context 无法获得任何信息；而如果在 `proc.wait()` 之后才执行 `ctx.run()`，会造成死锁，程序需要等待缓冲区清空，io context 需要等待程序退出才运行。

需要注意的是，前面的 `ReadLines`（更确切地说，是 `asio::async_read_util`）也需要在构造 `bp::process` 之后执行，否则也会有管道描述符无效，无法链接的问题。并且显然地，这需要在 `ctx.run()` 之前绑定。

io context 会在它管理的管道都关闭后自动退出。

补充一点，可以在 `ctx.run()` 之后立即检查一次错误码来判断管道是不是一开始就出问题了。
```cpp
if (stdoutError) {
	// do something
}
```
由于我们的回调函数里已经处理了 `error == asio::error::eof` 的情况，所以这里不会因为该情况而进入分支。

### 结语

以上，我们就完成了对外部程序的调用。由于我自己也是 C++ 的初学者，文章内容难免有不全面乃至错误的地方，如有发现，烦请指正。

这篇文章里的代码可以在 [Blind-Guess-Senior/ProfileEncoder](https://github.com/Blind-Guess-Senior/ProfileEncoder) 找到。

PS: include 编译是真的慢啊……

### References

- [boost.process documentation](https://www.boost.org/doc/libs/latest/libs/process/doc/html/index.html) 
- [ffmpeg Documentation](https://www.ffmpeg.org/ffmpeg.html) 
- [C++开发回忆录之进程通信——管道 - 知乎](https://zhuanlan.zhihu.com/p/715615587) 
- [C++管道通讯深入学习（基于开源项目分析） - 知乎](https://zhuanlan.zhihu.com/p/665919343) 
- [cs.tufts.edu/comp/21/notes/C++\_boost\_asio/asio.html](https://www.cs.tufts.edu/comp/21/notes/C++_boost_asio/asio.html) 

[^1]: [async_read_until](https://www.boost.org/doc/libs/latest/doc/html/boost_asio/reference/async_read_until.html) 

[^2]: boost\asio\read_util.hpp
