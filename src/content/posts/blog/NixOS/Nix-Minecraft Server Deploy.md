---
tags:
  - NixOS
  - Server
  - Minecraft
publishedAt: 2026-02-03
---
### Deploy Minecraft Server

使用[Infinidoge/nix-minecraft](https://github.com/Infinidoge/nix-minecraft) 部署。
相比 `services.minecraft-server` 的部署方案，nix-minecraft可以同时运行多个服务器、可以运行mod服务器，可用性更强。
nix-minecraft可近似看成原本 `services.minecraft-server` 的打包，可配置项几乎一模一样。

本身作为一个系统模块，不使用home-manager管理。

如下为Rhynix Studio Server部署的版本
```nix
# flake.nix
# inputs中增加
inputs = {
    # other inputs
    nix-minecraft.url = "github:Infinidoge/nix-minecraft";
  };
```

```nix
# minecraftserver.nix
{ config, pkgs, lib, inputs, outputs, ... }:

{
  imports = [ inputs.nix-minecraft.nixosModules.minecraft-servers ];
  nixpkgs.overlays = [ inputs.nix-minecraft.overlay ];

  services.minecraft-servers = {
    enable = true;
    eula = true;

    dataDir = "/mnt/md0/MinecraftServer";

    servers = {
      far-away-from-real = {
        enable = true;
        package = pkgs.vanillaServers.vanilla-1_21_11;

        serverProperties = {
          allow-flight = "true";
          difficulty = "hard";
          gamemode = "survival";
          server-port = 25746;
          level-name = "Far Away From Real";
          motd = "Far Away From Real. Escape.";
          online-mode = "true";
          op-permission-level = 4;
          simulation-distance = 12;
          view-distance = 16;
        };

        jvmOpts = "-Xms512m -Xmx1g";
      };

      realive-minecraft = {
        enable = true;
        package = pkgs.vanillaServers.vanilla-1_21_11;

        serverProperties = {
          allow-flight = "true";
          difficulty = "hard";
          gamemode = "survival";
          server-port = 25747;
          motd = "Yes children I revive 24 times, man.";
          online-mode = "false";
          op-permission-level = 4;
          simulation-distance = 10;
          view-distance = 12;
        };

        jvmOpts = "-Xms512m -Xmx2g";
      };
    };
  };
}
```
具体可配置项在此处查询：[NixOS Search - Options - minecraft-server](https://search.nixos.org/options?channel=25.11&query=minecraft-server) 
`dataDir` 为所有数据所在的文件夹，`servers` 中的服务器每个都会在其下有一个自己的文件夹。文件夹名即为 `servers.<name>` 的name.
`serverProperties` 即为`server.properties` 文件的内容，值全部使用字符串是可行且正确的操作。 `package` 指定服务端版本，mod配置见 [[#References]] 中的其他文章。

### Attach Server Console

服务器作为systemd的一个service启动，service名为 `minecraft-server-<name>` 
已启动的服务器会在 `/run/minecraft/` 下生成一个供tmux使用的socket，使用 `tmux -S /run/minecraft/<name>.socket attach` 访问服务器控制台。
`dataDir` 和 socket 的默认权限组为 `minecraft:minecraft` ，推荐在用户的 `extraGroups` 中加入 `minecraft` 以方便地attach tmux和修改服务器文件。

### Deploy SakuraFrp

配置樱花映射，以将服务器穿透至外部网络。
见 [[posts/blog/NixOS/NixOS SakuraFrp Deploy|NixOS SakuraFrp Deploy]] 

### References

- [Infinidoge/nix-minecraft: An attempt to better support Minecraft-related content for the Nix ecosystem](https://github.com/Infinidoge/nix-minecraft)
- [Effortless Minecraft Servers on NixOS | Simple Declarative Setup | JourNix](https://journix.dev/posts/effortless-minecraft-servers-on-nixos/)
- [Configuring a Minecraft Server Using NixOS | Michael Murphy - Blog](https://mich-murphy.com/nixos-minecraft-server/)
- [Minecraft Server - Official NixOS Wiki](https://wiki.nixos.org/wiki/Minecraft_Server)

