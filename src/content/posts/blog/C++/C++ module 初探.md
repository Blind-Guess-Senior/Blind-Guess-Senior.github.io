---
tags:
  - Cpp
  - CMake
---
### 前言

这段时间在写 [[posts/blog/VideoProcess/AV1编码使用报告|AV1编码使用报告]] ，其中需要反复将一批文件以同样的 ffmpeg 参数跑一遍，并记录其中的一些信息（例如花费的总时间），想了想可以借此机会练习练习现代点的软件开发，于是决定用 C++ 写一个这样的程序。

既然是一个全新的程序，那理应毫无历史包袱地直接用上最新的功能，刚好我对 C++ 的 `#include` 积怨已久，正好乘此机会直接大跨步迈入 C++23 时代，用上先进的 `module` 功能。只可惜 MSVC 还不支持完整的 C++26 规范，不然就能走向更现代的 C++26 了。

### `#include`, Header units and modules

先简单辨析理解一下这几个概念。这三个东西分别是从旧到新的引用方法。

#### `#include`

我们最熟悉的引用方式，使用了极为先进（大嘘）的原文复制方法。除非要用的库不支持 module ，不然完全不考虑使用。

`#include` 会原样导出 macros，这在一些情况会是有用的，但个人认为在现代的软件开发里，我们不应该再依赖这样脆弱的 macros 了。

#### Header units

C++20 引入的新方法，将传统的头文件以 module 的形式导入。是从 `#include` 方案到 named modules 方案的过渡用法。比 `#include` 快但是比正统 module 慢。

Header units 也会导出 macros，如果实在需要 macros，应当使用这个而非 `#include` . 并且 Header units 不会受到 macros 的影响，这意味着用 Header units 的时候再也不用像 `#include` 那样小心翼翼地排顺序了。

Header units 的写法形如
```cpp
import <vector>;
```

#### modules

~~绝对的现代，由此而生的难用，教会你编译速度的是~~

最现代的用法。除非遇到不得已的情况，我应该就只用这个了。

Modules 让 C++ 的引用终于像现代语言了。它使 C++ 终于在规范语义上区分开了不同的库，或者说模块，这使得每个模块之间的区别变得更确切、更具体，

首先它不再需要像传统方案那样区分出 `.h` 和 `.cpp` 也就是定义和实现，可以只在一个接口文件里写所有的东西。这也意味着不用为了遵循 ODR（单一定义规则）而在实现文件里写长的不行的 `namespace::` . 尽管这样的分离很多时候会用到。

并且 modules 不会导出 macros，modules 内部可以非常放心地乱用 macros 了(x)

同时，每个 module 都是单独编译的，这意味着之后的编译会快特别多，仅会重新编译真正被修改的部分。

### Modules 的组成和使用

一个 module 必须包含一个 *Primary Interface Unit* （下称接口单元），这个单元一般就是一个文件，这个文件需要以 `export module ModuleName;` 作为文件有效内容的开头，以此标识这是一个 module interface.

在接口单元内部，我们可以像写平常的 `.cpp` 文件一样写内容，唯一的区别是是否加上 `export` 前缀。`export` 前缀标识这个函数/类/...可以被导出，当外部代码A `import ModuleName;` 的时候，这些被 `export` 的代码就会在A中可用，而没有被 `export` 的代码就不会被导入到A里。

例如，下面这段代码里，如果 `import TestModule1;` 那么将可以使用 `AddTwo` 而不能使用 `AddTwoInternal`  
```cpp
export module TestModule1;

export int AddTwo(int a, int b)
{
	return a + b;
}

int AddTwoInternal(int a, int b)
{
	return a + b;
}

export class SampleClass
{
	...
}
```

```cpp
// Usage sample
import std;
import TestsModule1;

int main()
{
	std::println("{}", AddTwo(1,2)); // Will print 3
	return 0;
}
```

#### `export import`

`export import moduleName;` 语句可以把自己 import 的库也 export 出去。一个草率的类比是， A 文件 include 了 B，这时候 C include A 也能用 B 的东西。

#### 分离声明和定义

Modules 仍然可以分离声明和定义。这样做的好处和以往没有太大不同，方便理解、隐藏不必要的细节、仅修改实现时加快编译等等。

Modules 的定义被称为 *Module Implementation Unit* （下称实现单元）。一个实现单元应当以 `module ModuleName;` 开头，并且在内容中不含任何 `export`. `export` 的行为完全由接口单元控制。例如，把我们上面的 `TestModule1` 拆分后，应当长这样
```cpp
// Interface unit
export module TestModule1;

export int AddTwo(int a, int b);

int AddTwoInternal(int a, int b)
{
	return a + b;
}

export class SampleClass;
```

```cpp
// Implementation unit
module TestModule1;

int AddTwo(int a, int b)
{
	return a + b;
}

int AddTwoInternal(int a, int b)
{
	return a + b;
}

class SampleClass
{
	...
}
```

一个模块可以有多个实现单元，只要它们都是以 `module ModuleName;` 开头。一个实现单元至少是个完整的文件，所以不能在一个文件里写多个模块的实现。

template 仍然应当在接口单元里就定义，否则会导致链接失败。

#### Internal Linkage Export

不是所有的东西都能被 `export`. 如果一个实体具有 **Explicit** Internel Linkage（例如 `static` 或匿名 namespace），那么它将无法被 `export`. 例如
```cpp
export module test1;

export static int a = 10;
export namespace 
{
    int a1 = 40;
}
```
这里的 `a` 和 `a1` 无法被 `export`，编译器报错 
`error C2294: 无法导出符号“a”，因为它具有内部链接`。
`error C2291: 无法导出匿名命名空间。`
```error C2294: 无法导出符号“`anonymous-namespace'::a1”，因为它具有内部链接```

但同样是 Internal Linkage 的 `const` 和 `constexpr` 可以被 `export`. 例如
```cpp
export module test1;

export const int b = 20;
export constexpr int c = 30;
```
这里的 `b` 和 `c` 可以被正常 `export` 并使用。且它们仍然保有 `const` 或 `constexpr` 的性质。在这个时候，它们会被赋予 External Linkage.

但什么是 Internal Linkage, 什么是 External Linkage 呢？

根据[^1][^2][^3][^4]的描述，我们可以简单把这两个东西理解为

- Internal Linkage: 仅在当前**翻译单元**可见
- External Linkage: 在整个程序过程可见

其中 `static` 和匿名 namespcace 是显式指定的 Internal Linkage，而 `const` 和 `constexpr` 是生来被隐式附带的 Internal Linkage (`static`). 两者的区别使得后者可以被赋予 External Linkage 并被 `export` ，而前者不能。

在这个回答里 https://stackoverflow.com/a/1358796 有更完整的例子，和对 `extern` `static` 的更准确描述。

#### Module 文件的后缀

module 文件的后缀在每个编译器都不一样，MSVC 中是 `.ixx`；clang 中是 `cppm`；gcc 中没有相关要求；同时也有 `mpp` `mxx` 等说法。XMake 会根据后缀名来找 module，但 CMake 是靠自己在 `CMakeLists.txt` 里写，不管后缀。这里就先用 `.ixx` 指代。

### Module 如何与基于 `#include` 的旧库一同工作

这里就要用到前面提到的 [[#Header units]]. 直接 `import "header.h";` 就可以将旧的 header 作为 header unit 导入。

不过和前面提到的一样，这会导致 macros 无法导出。在 [现代C++基础-06-Modules_16:23_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV14y411a7co/?share_source=copy_web&vd_source=1fbc290e1e0658cd1aa12d6496cd7122&t=982) 处有相关的描述。

由于 CMake 没有对 Header units 的支持[^5]，所以这里我没法通过实际操作来确认 macros 无法导出到底如何影响对传统库使用 header units. 下方这一段只是我的猜测。

以 [p-ranav/argparse: Argument Parser for Modern C++](https://github.com/p-ranav/argparse) 为例，它的头文件是这么写的
```cpp
#pragma once

#include <cerrno>

#ifndef ARGPARSE_MODULE_USE_STD_MODULE
#include Many stl...
#endif
```
它通过 `ARGPARSE_MODULE_USE_STD_MODULE` 这个宏来实现对 std module 的支持。Header unit 不导出宏应当会使得这里的 `#ifndef` 无效果从而导致重复定义。

#### Global Module Fragment

Global Module Fragment 是一个妥协方案，适用于 header units 不可用的情况。它的写法为
```cpp
module; // 标识这是个 global module fragement

#define MACRO_PARAM_A
#include "AHeaderNeedMacro.h"

module ModuleName; // 假设这是个实现单元
```

这样的话就可以使用常规的头文件了。

### References

- [Compare header units, modules, and precompiled headers | Microsoft Learn](https://learn.microsoft.com/en-us/cpp/build/compare-inclusion-methods?view=msvc-170) 
- [现代C++基础-06-Modules_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV14y411a7co) 注意视频发布时间，里面对 `import std;` 的描述已经有些过时
- [p-ranav/argparse: Argument Parser for Modern C++](https://github.com/p-ranav/argparse) 

[^1]: [c++ - What is external linkage and internal linkage? - Stack Overflow](https://stackoverflow.com/questions/1358400/what-is-external-linkage-and-internal-linkage) 

[^2]: [内部链接 | Microsoft Learn](https://learn.microsoft.com/zh-cn/cpp/c-language/internal-linkage?view=msvc-170) 

[^3]: [C 存储类 | Microsoft Learn](https://learn.microsoft.com/zh-cn/cpp/c-language/c-storage-classes?view=msvc-170) 

[^4]: [7.6 — Internal linkage – Learn C++](https://www.learncpp.com/cpp-tutorial/internal-linkage/) 

[^5]: [cmake-cxxmodules(7) — CMake 4.4.2 Documentation](https://cmake.org/cmake/help/v4.4/manual/cmake-cxxmodules.7.html#limitations) 
