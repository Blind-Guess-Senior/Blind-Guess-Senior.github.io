---
tags:
  - Cpp
  - CMake
---
### 前言

我一直觉得 `#include` 是人类历史上的一座丰碑。它展现了人类如何坚持在一堆史山代码里打滚数十年。为什么到了2026年我们还在用它……

所以我决定宫了 `#include` ，改而使用先进的module.

### 开启 CMake 实验性功能

我使用的CMake是Visual Studio工具链内自带的 CMake 4.3.1. 截至我完成这篇文章的时候，最新的CMake 4.2.2还没有对std module的正式支持，需要在 `CMakeLists.txt` 里开启实验性支持[^1]。

具体的写法为，在 `CMakeLists.txt` 里， `project()` 语句之前加入 `set(CMAKE_EXPERIMENTAL_CXX_IMPORT_STD "UUID")` ，这将允许CMake使用 `CXX_MODULE_STD` 和 `CMAKE_CXX_MODULE_STD` ，从而允许项目使用 `import std` . 

严格来说只需要在CMake发现CXX工具链之前设置好即可，但比较常见的写法是 `project("ProjectName" LANGUAGES CXX)` ，这里会触发CMake对CXX工具链的发现，所以还是写前面一点比较好。

根据文档描述，每个CMake版本的该实验性功能的UUID都可能不同，所以需要把上面set语句里的UUID换成对应版本的。如果希望自己的项目有比较好的兼容性，那最好是写一堆if. 这里留一个可抄的作业。

```cmake
cmake_minimum_required (VERSION 3.30) # CMake在3.30才有对import std的实验性支持

if(CMAKE_VERSION VERSION_LESS "3.31.8")
  # CMake 3.30.0 - 3.31.7
  set(CMAKE_EXPERIMENTAL_CXX_IMPORT_STD "0e5b6991-d74f-4b3d-a41c-cf096e0b2508")
elseif(CMAKE_VERSION VERSION_LESS "4.0.0")
  # CMake 3.31.8 - 3.31.12
  set(CMAKE_EXPERIMENTAL_CXX_IMPORT_STD "d0edc3af-4c50-42ea-a356-e2862fe7a444")
elseif(CMAKE_VERSION VERSION_LESS "4.0.3")
  # CMake 4.0.0 - 4.0.2
  set(CMAKE_EXPERIMENTAL_CXX_IMPORT_STD "a9e1cf81-9932-4810-974b-6eccaf14e457")
elseif(CMAKE_VERSION VERSION_LESS "4.3.0")
  # CMake 4.0.3 - 4.2.7
  set(CMAKE_EXPERIMENTAL_CXX_IMPORT_STD "d0edc3af-4c50-42ea-a356-e2862fe7a444")
elseif(CMAKE_VERSION VERSION_LESS "4.4.0")
  # CMake 4.3.x
  set(CMAKE_EXPERIMENTAL_CXX_IMPORT_STD "451f2fe2-a8a2-47c3-bc32-94786d8fc91b")
elseif(CMAKE_VERSION VERSION_LESS "4.4.2")
  # CMake 4.4.0 - 4.4.2
  set(CMAKE_EXPERIMENTAL_CXX_IMPORT_STD "f35a9ac6-8463-4d38-8eec-5d6008153e7d")
else()
  message(FATAL_ERROR
          "Unsupported CMake ${CMAKE_VERSION}: "
          "check https://github.com/Kitware/CMake/blob/master/Help/dev/experimental.rst for the current import std UUID")
endif()
```

### 配置MODULE_STD

在 `CMakeLists.txt` 里设置属性 `CXX_SCAN_FOR_MODULES ON` 以开启CMake对module的扫描[^2]，设置 `CXX_MODULE_STD ON` 以开启标准库的模块支持[^3]。这应该是会让CMake自动搜索项目路径内的module定义，然后将找到的标准库模块纳入CMake的生成中。

截至这篇文章完成时， `CXX_STANDARD` 最高只能为23，因为MSVC还没有对c++26的完整支持。尽管我们能用c++26的一些MSVC已实现的实验性功能。

完整set参考如下。 `CXX_EXTENSIONS OFF` 和 `CXX_STANDARD_REQUIRED ON` 与引入std module无关。
```cmake
set_target_properties(TargetName 
  PROPERTIES
  CXX_STANDARD 23
  CXX_STANDARD_REQUIRED ON
  CXX_EXTENSIONS OFF
  CXX_SCAN_FOR_MODULES ON
  CXX_MODULE_STD ON
)
```

### 结语

经过如上配置后，就可以在项目里使用 `import std` 和自己的module语句了。
```cpp
import std;
int main(const int argc, const char* argv[])
{
    std::println("{}", argc);
    return 0;
}
```
例如这段代码将会运行良好。

但在VS 18.8.2 stable版本下，intellisense对CMake管理的import sdt支持不是很好，错误列表会一直误报，代码补全也疑似会坏掉。需要代码补全可以用 *Jetbrains Resharper* ，但错误列表目前没找到好的解决方案，只能以实际构建为准了。

### 补充

VS官方有对开启 `import std` 的文档指引[^4]，但对于CMake项目这是不必要的，CMake的 `CXX_MODULE_STD ON` 已经会在CMake的缓存里正确构建std的target。这里也简单提及一下。

#### 编译std

根据VS官方文档的指引[^4]，我们应该将标准库的具名module编译为二进制形式。切换到项目文件夹，在vs的命令行中执行
```cmd
cl /std:c++latest /EHsc /nologo /W4 /c "%VCToolsInstallDir%\modules\std.ixx"
```

随后项目目录将会出现 `std.ifc` 和 `std.obj`. 这对应了 `import std;` 的用法。

这两个文件的位置不会带来影响，可以自由地将它们放到诸如 `lib/std` 这样的子文件夹里。

#### 编译std.compat

同样，我们执行
```cmd
cl /std:c++latest /EHsc /nologo /W4 /c "%VCToolsInstallDir%\modules\std.ixx" "%VCToolsInstallDir%\modules\std.compat.ixx"
```

这对应了 `import std.compat` 的用法。

### References

[^1]: [CMake/Help/dev/experimental.rst at master · Kitware/CMake](https://github.com/Kitware/CMake/blob/master/Help/dev/experimental.rst) 
[^2]: [CXX_SCAN_FOR_MODULES — CMake 4.4.0 文档 - CMake 构建系统](https://cmake.com.cn/cmake/help/latest/prop_tgt/CXX_SCAN_FOR_MODULES.html#prop_tgt:CXX_SCAN_FOR_MODULES) 
[^3]: [CXX_MODULE_STD — CMake 4.4.0 文档 - CMake 构建系统](https://cmake.com.cn/cmake/help/latest/prop_tgt/CXX_MODULE_STD.html) 
[^4]: [教程：使用命令行中的模块导入标准库 （STL）（C++） | Microsoft Learn](https://learn.microsoft.com/zh-cn/cpp/cpp/tutorial-import-stl-named-module?view=msvc-180) 
- [c++ - How to use CMake to build a project with C++23 standard library module(import std)? - Stack Overflow](https://stackoverflow.com/questions/76268455/how-to-use-cmake-to-build-a-project-with-c23-standard-library-moduleimport-st) 
