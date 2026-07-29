---
heroImage:
tags:
  - Tech
  - NixOS
  - Server
publishedAt: 2026-01-26
---
### Download & Install SakuraFrp

按照 [frpc 基本使用指南 | SakuraFrp 帮助文档](https://doc.natfrp.com/frpc/usage.html) 中所述下载frpc.
不需要将frpc移动至 `/usr/bin` 或 `/usr/local/bin` 

### Create systemd Service

设置为用户服务，由home-manager管理。
```nix
# frpc.nix
{ config, pkgs, inputs, outputs, ... }:

{
  systemd.user.services.frpc-a746 = {
    Unit = {
      Description = "Sakura frp. Used for host game server.";
      After = [ "network.target" ];
    };

    Install = {
      WantedBy = [ "default.target" ];
    };

    Service = {
      Environment = [
        "NATFRP_TOKEN=token"
        "NATFRP_TARGET=targetA[,targetB]"
        # see https://doc.natfrp.com/frpc/manual.html
      ];

      ExecStart = "/home/a746/programs/frpc/frpc";
      WorkingDirectory = "/home/a746/programs/frpc/natfrp";
      #Restart = "on-failure";
      #RestartSec = "60s";
    };
  };
}
```

大致参照 [systemd 配置 frpc 服务 | SakuraFrp 帮助文档](https://doc.natfrp.com/frpc/service/systemd.html) 
不同之处在于没有使用 `frpc@` 这样的systemd service template，而是通过 [frpc 用户手册 | SakuraFrp 帮助文档](https://doc.natfrp.com/frpc/manual.html) 中提到的环境变量来设置token和目标隧道，如此会在服务start时自动启动对应隧道。
systemd user service配置细则见 [[#References]] ，没有特殊变化。
如上配置方法会在用户下线时终止service，可以通过修改 `WantedBy` 或设置 `configuration.nix` 的 `users.users.<name>.linger` 为true来让服务始终在线。

使用 `systemctl --user status <service-name>.service` 获得service信息，使用 `journalctl --user-unit <service-name>.service` 查看日志。

### References

- [frpc 基本使用指南 | SakuraFrp 帮助文档](https://doc.natfrp.com/frpc/usage.html)
- [systemd 配置 frpc 服务 | SakuraFrp 帮助文档](https://doc.natfrp.com/frpc/service/systemd.html)
- [frpc 用户手册 | SakuraFrp 帮助文档](https://doc.natfrp.com/frpc/manual.html)
- [Systemd templates - Help - NixOS Discourse](https://discourse.nixos.org/t/systemd-templates/36356/2) 未使用template方案
- [nix - How to create a systemd service template in NixOS? - Stack Overflow](https://stackoverflow.com/questions/69355197/how-to-create-a-systemd-service-template-in-nixos) 未使用template方案
- [Creating User’s Services With systemd | Baeldung on Linux](https://www.baeldung.com/linux/systemd-create-user-services)



