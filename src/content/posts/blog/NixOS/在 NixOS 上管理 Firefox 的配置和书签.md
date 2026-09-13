---
tags:
  - NixOS
---
### 管理配置

这里假定使用 Home Manager[^1]和 Flake 管理 NixOS.

[[#References]] 里的两篇 NixOS Discourse 上的帖子讲的已经很完善了。尤其是 *sleepy* 的帖子，里面还附上了 Preferences 和 Policies 的参考链接。

但这两篇帖子都有个问题，因为他们写的是 NixOS module, 其中有很多 Option 名称和结构是错误的。

根据 Home Manager 的文档[^2]，帖子里用到的 `Preferences` 和类似项对应的是 `profiles.<name>.settings`. 且其中每一项的值只能是 bool int string，不能是帖子里的 `lock-false` `lock-true`。目前我还没找到锁定某个 preference 的方法。

对于 Extensions，似乎有 Policy 和 Preferences 两种管理方案。由于两篇帖子用的都是 Policy 方案，而 Home Manager 文档[^2]的 Preferences 方案我没太看懂，所以我用的 Policy 方案。

用 Policy 方案时，`"*".installation_mode` 建议设置为 `allowed`。这样会让使用的 Firefox 可能和配置里声明的不同，但用起来会方便很多，可以运行时临时装上插件。不管是试一下还是短期使用都很舒适。只是注意要及时把确定要用的插件加回 Nix 配置里。

对于 Policy 而言，个人认为有很多东西不需要往里面加，尤其是运行时经常变化的值。例如 `Cookies.Allow`。而那些不怎么变化或很需要被同步的值则更应该被加到 Nix 配置里。对于 Policy 而言，这样的值其实不多。

需要注意的是，两篇帖子的作者对个人信息的态度比较严肃，他们都几乎彻底关掉了数据收集，甚至会在浏览器关闭时清除所有浏览数据等。我想对于绝大部分人来说应该是不希望这样的，因此在抄配置的时候需要注意一下。这里也给一下我自己的配置[^3]。

对于 `profiles.<name>`，如果不知道这是什么，那说明你应该用不到 profile 切换的功能，只需要写 `profiles."default"`，并将 `profiles."default".id` 设置为 0 即可。profile 里的 `search` 项非常好用，可以参照 [[#References]] 里的配置和文档自己配一下。

以及一个小技巧，如果不知道想改的值是什么，可以在 Firefox 里打开 `about:config` 页面，然后到 GUI 的设置里去调想改的值，在页面里勾选 "Show only modified preferences" 然后搜索可能的值。例如 AI 功能可以尝试搜索 ai chat 这样的关键词。一般选项名也和它在页面里的名称有关。直接搜索选项名也可能能搜到 Firefox 官方的文档，里面一般会提及该项和哪些 preferences 有关。

### 管理书签

接下来就是我认为最好用的地方：管理书签。

Home Manager 文档[^2]里的描述相对比较清晰，照着写起来应该没什么问题。这里只提一个容易踩坑的地方。

Firefox 的书签管理方式是有个 "All Bookmarks"，然后其下有一堆组，例如 *Bookmarks Menu*, *Bookmarks Toolbar* 这些(后者不确定是不是默认就有的)。打开 Firefox 的 Bookmark 管理页面应该能理解。

以 Toolbar 上的书签为例，我们需要一个根 Bookmark，这个 Bookmark 需要 `toolbar = true`，这会让它在 Toolbar 上可见。在它的 `bookmarks` 里，我们再写所有的 Bookmark。这些 Bookmark 每个都可以嵌套 `bookmarks` 子项，有这个子项且不写 url tags 之类的 Option 就是文件夹。需要注意除了最顶层的根 bookmark，其他 bookmark 不要写 `toolbar = true`。

如果不太清晰，可以去看我仓库里的 `bookmarks.json`[^3]，应该就能很好地理解这个层级结构。

但这有个大问题，那就是每次加书签都要到 Nix 配置里重写并 rebuild，这完全不是人。有一个方案可以很好地解决这个问题：我们在更新 Nix 配置之前，从 Firefox 的本地配置里读出它的 Bookmarks 配置，然后导入到我们的 Nix 配置。

这样的话，我们就同时获得了 Nix 对书签的管理能力和在浏览器里便捷收藏网页的能力。

在我的仓库里[^3]有一个可以直接被照搬的实现。这个实现由我描述需求后由 GPT 5.6-Sol 实现。整个流程大概就是从 Firefox 的本地 config 里读对应项，转写成 JSON，再让 Nix 从这个 JSON 里读配置。这个实现非常简单，你也可以自己实现或让你的 agent 实现。

有了这个小工具之后，对 Firefox 的管理就会非常 "Nix"。并且基于 Nix 配置也让它很容易通过 git 同步，这样也就不需要走 Firefox 的服务器了，各方面来说都很不错。

### References

- [Declare Firefox extensions and settings](https://discourse.nixos.org/t/declare-firefox-extensions-and-settings/36265) 
- [NixOS Firefox configuration with policies, preferences, extensions, search engines and cookie exceptions](https://discourse.nixos.org/t/nixos-firefox-configuration-with-policies-preferences-extensions-search-engines-and-cookie-exceptions/73747) 

[^1]: https://home-manager.dev/ 

[^2]: [firefox - Home Manager Manual](https://nix-community.github.io/home-manager/options/home-manager/programs/firefox.html) 

[^3]: [nixos-config/common/home/firefox/default.nix at main](https://github.com/Blind-Guess-Senior/nixos-config/blob/main/common/home/firefox/default.nix) 
