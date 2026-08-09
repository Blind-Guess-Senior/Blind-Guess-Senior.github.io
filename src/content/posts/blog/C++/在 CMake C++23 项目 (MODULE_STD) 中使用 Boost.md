---
tags:
  - Cpp
  - CMake
  - Boost
  - vcpkg
---
### 概述

如标题所述，这一行为主要包含几个部分：
1. 在 CMake 中使用 MODULE_STD (即 `import std;` 用法)
2. 在 CMake 中使用 Boost
3. Boost 并没有实现 module 形式，仍然只能用 `#include`，需要使之和 `import std;` 能一起使用

本文主要考虑 `boost::process` 这一子库。

本文描述的用法已用于 [Blind-Guess-Senior/ProfileEncoder](https://github.com/Blind-Guess-Senior/ProfileEncoder) 项目。

以下逐点来说。

### 在 CMake 中使用 MODULE_STD

见 [[posts/blog/C++/在VS CMake环境下使用std module|在VS CMake环境下使用std module]] 

### 在 CMake 中使用 Boost

在 CMake 中引用别的依赖，就我所知主要有四种方法，一是使用 `FetchContent`，这会在 CMake 构建时下载对应的源；二是将依赖直接纳入项目里；三是使用包管理器，例如 `vcpkg` `Conan` 等；四是只使用 CMake 的 `find_package` 来寻找设备上已下载的依赖。

由于 Boost 库比较大，`FetchContent` 会从 github 下载很大的源，不太合适；而我对 Boost 库的了解不够深，直接将依赖纳入项目有些一头雾水；`find_package` 我完全没看懂，[[#References]] 里放了一些相关的资料，有兴趣的读者可以自己研究一下，我就不考虑这个方案了。

最终选择使用包管理器。这里使用微软的 `vcpkg`.

#### 安装 vcpkg

直接 clone `vcpkg` 仓库([microsoft/vcpkg: C++ Library Manager for Windows, Linux, and MacOS](https://github.com/microsoft/vcpkg))并执行目录下的 `bootstrap-vcpkg.[bat|sh]` 即可。

另外一提，更新 `vcpkg` 本身的方法是重新拉取仓库并再次执行 `bootstrap-vcpkg.[bat|sh]` [^1].

#### 在 vcpkg 中添加 `boost-process`

在项目目录下执行
```powershell
vcpkg new --application
```
以创建 `vcpkg.json` 文件。这个文件会管理该项目的 vcpkg 依赖。

随后执行
```powershell
vcpkg add port boost-process
```
以在 `vcpkg.json` 文件里添加依赖 `boost-process`. 

#### 限制依赖版本

在 `vcpkg.json` 中添加
```json
"builtin-baseline": "vcpkg 自身的 commit hash"
```
`vcpkg` 的库的版本是和 `vcpkg` 自身的版本有关的，因此限制 `vcpkg` 从哪个版本的自己那里找依赖目录就能起到限制依赖版本的作用[^3]。

#### 在 CMake 中使用 vcpkg

根据微软官方文档的指引[^2]，有以下三种方法设置 CMake: 

> - Set the `CMAKE_TOOLCHAIN_FILE` in your CMakePresets.json file.  
> - Pass `-DCMAKE_TOOLCHAIN_FILE=<path/to/vcpkg>/scripts/buildsystems/vcpkg.cmake` as a parameter in your CMake configure call.  
> - Set the `CMAKE_TOOLCHAIN_FILE` CMake variable before the first call to `project()` in your `CMakeLists.txt` file.  

这里选择方案一，将 `"CMAKE_TOOLCHAIN_FILE": "$env{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake"` 加入到 `CMakePresets.json` 的 `cacheVariables` 项里。这样的话既能确保 `vcpkg` 的设置能被 git 提交，也能提供被使用者覆写的自由度。

之后，需要在 `CMakeLists.txt` 里将 `Boost::process` 作为 link library 加入。由于我们使用 `vcpkg` 管理依赖，并且在上面设置了 `vcpkg` 的 toolchain，所以这里我们只需要直接 `find_package` 就能借助 `vcpkg` 的配置来直接找到 `Boost::process`.
```cmake
find_package(Boost 1.86 REQUIRED COMPONENTS process)
```
这里限制最低为 1.86 版本，因为 1.86 版本的 `Boost::process` 有比较大的变化，从纯头文件变成了编译库。

然后将依赖链接到可执行文件。
```cmake
target_link_libraries(ProfileEncoder
  PRIVATE
    ... 其他库
    Boost::process
)
```
这里 `ProfileEncoder` 是我的 target 名称。

### 在 `import std;` 项目中 include Boost

虽然前面的依赖配置已经是地狱了，但尝试在使用 std module 的项目里同时用只支持 include 的库更是病村。

首先这两段话不该出现在同一个文件里[^4]，所以我们应当把所有使用 Boost 的代码都封装到一个 module 里，然后由它暴露出接口。

虽然实际上我这个写法不知道为什么不仅能过编译还能运行
```cpp
#include <boost/asio/io_context.hpp>
#include <boost/process/v2/environment.hpp>
#include <boost/process/v2/process.hpp>
import std;
import std.compat;
import argparse;
```
但这绝对是个定时炸弹，我不是 C++ 高手，所以我不会赌这种奇妙写法是否正确。

我们应当创建一个模块文件（这里为方便起见就不区分定义和实现了），使用 Global Module Fragment 来引入旧的 include 并只在该模块文件内部使用，不暴露到外部。[[posts/blog/C++/C++ module 初探#Global Module Fragment|C++ module 初探#Global Module Fragment]] 里有一些相关的解释，这篇文章的 [[posts/blog/C++/C++ module 初探#References|References]] 也有更多相关信息。

例如，我们的模块文件应当长这样
```cpp
// e.g. process_runner.ixx
module;

#include <boost/asio/io_context.hpp>
#include <boost/process/v2/environment.hpp>
#include <boost/process/v2/process.hpp>
...一些其他 Boost 库

#include <filesystem>
...一些其他标准库

export module process_runner;
```

此后，我们在入口文件里 `import process_runner` 来使用被封装过的功能。

对这个模块干了什么感到好奇的话，可以看这篇文章 [[posts/blog/C++/C++ 中调用外部程序|C++ 中调用外部程序]].

### 结语

微软的文档还是做的很不错啊。我看 Boost 自己的文档根本看不懂该干什么……

### References

- [find_package — CMake 4.4.2 Documentation](https://cmake.org/cmake/help/latest/command/find_package.html) 
- [cmake - How do you add Boost libraries in CMakeLists.txt? - Stack Overflow](https://stackoverflow.com/questions/6646405/how-do-you-add-boost-libraries-in-cmakelists-txt) 
- [How to link C++ program with Boost using CMake - Stack Overflow](https://stackoverflow.com/questions/3897839/how-to-link-c-program-with-boost-using-cmake) 
- [Boost Getting Started on Windows](https://www.boost.org/doc/libs/latest/more/getting_started/windows.html) 

- [通过 CMake 安装和使用包 | Microsoft Learn](https://learn.microsoft.com/zh-cn/vcpkg/get_started/get-started?pivots=shell-powershell) 
- [Tutorial: Install a dependency from a manifest file | Microsoft Learn](https://learn.microsoft.com/en-us/vcpkg/consume/manifest-mode?tabs=msbuild%2Cbuild-MSBuild) 
- [Tutorial: Install a specific version of the Boost libraries using registry baselines | Microsoft Learn](https://learn.microsoft.com/en-us/vcpkg/consume/boost-versions) 

[^1]: [Frequently Asked Questions | Microsoft Learn](https://learn.microsoft.com/en-us/vcpkg/about/faq#how-do-i-update-vcpkg) 

[^2]: [Tutorial: Install a dependency from a manifest file | Microsoft Learn](https://learn.microsoft.com/en-us/vcpkg/consume/manifest-mode?tabs=msbuild%2Cbuild-MSBuild) 

[^3]: [Tutorial: Install a specific version of a package | Microsoft Learn](https://learn.microsoft.com/en-us/vcpkg/consume/lock-package-versions?tabs=inspect-powershell) 

[^4]: [Tutorial: Import the standard library (STL) using modules from the command line (C++) | Microsoft Learn](https://learn.microsoft.com/en-us/cpp/cpp/tutorial-import-stl-named-module?view=msvc-170#standard-library-named-module-considerations) 
