---
tags:
  - Windows
  - Aseprite
publishedAt: 2025-01-09
---

[aseprite/aseprite: Animated sprite editor & pixel art tool (Windows, macOS, Linux)](https://github.com/aseprite/aseprite)


Aseprite的系统要求：
- Windows：Visual Studio Community 2022
		具体要求见此图[Visual Studio Community 2022 + Windows 10.0 SDK (the latest version available)](https://imgur.com/a/7zs51IT) 
- macOS 13.0.1 Ventura + Xcode 14.1 + macOS 11.3 SDK (older version might work)
- Linux： clang 10.0


依赖：
- CMake 3.16 或更高版本
- Ninja Build System
- [Skia library](https://github.com/aseprite/skia#readme)  `aseprite-m102` 分支的编译版本。这是一个预编译包。原文如下：
	*And a compiled version of the `aseprite-m102` branch of the [Skia library](https://github.com/aseprite/skia#readme). There are [pre-built packages available](https://github.com/aseprite/skia/releases). You can get some extra information in the [laf dependencies](https://github.com/aseprite/laf#dependencies) page.*

在安装Visual Studio Community 2022时一般已经包含了大多数依赖。需要的只有安装ninja和Skia library
ninja的安装较为简单，官网两行字即可理解，这里不作赘述。


实际操作：
1. 将Aseprite源代码解压至一个文件夹（记为`/Aseprite`）
2. 将Skia预编译文件解压至某文件夹（记为`/Aseprite/Skia`）下载地址[Releases · aseprite/skia](https://github.com/aseprite/skia/releases)
3. 打开 `x64 Native Tools Command Prompt for VS 2022` 或在cmd中 `call "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat" -arch=x64` 以唤起Visual Stuido Command Prompt 来使用CMake。参见[[Windows CMake]]
4. 在其中 执行以下命令
		```cd Asperite\build
		cmake -DCMAKE_BUILD_TYPE=RelWithDebInfo -DLAF_BACKEND=skia -DSKIA_DIR=E:\Aseprite\Skia -DSKIA_LIBRARY_DIR=E:\Aseprite\Skia\out\Release-x64 -DSKIA_LIBRARY=E:\Aseprite\Skia\out\Release-x64\skia.lib -G Ninja ..```
		其中DSKIA_DIR为Skia编译后或（预编译版本）解压后的位置。第二条命令的`..`不可省略，这表示cmake应当从`..`中寻找CMakeList.txt
		同时当前文件夹必须在与源代码文件夹不同（或不同层级）的文件夹，否则报错：```ERROR:: in-source builds are disabled!
		Run cmake in a separate build directory:
		$ cmake -S . -B build```
		如果已经报错过，需要删除CMakeCache.txt 否则无法编译 报错`Aborting ...`
5. 执行`ninja Aseprite`以完成最终构建