---
tags:
  - NixOS
  - Server
---
### 症状

连接校园网 WiFi 时，即使正确填写了认证账号和密码，但通过 NetworkManager 连接时报错 `secrets were required but not provided` 从而连接失败。

### 解决方案

当提示无密码输入的时候，可能是无线网卡的天线位置比较差，导致没有和路由器建立起连接。虽然与这次的情况无关，但此前有遇到过。

另一种可能是系统时间不对。nmtui 和 nmcli 都会错误地把系统时间不正确导致的无法和上游通信报告为 `secrets were required but not provided`.

此时如果有桌面环境，可以直接进桌面环境的设置，临时连上自己的手机热点后，触发一次时间同步，再之后就可以正常连接了。

如果没有桌面环境，可以自己查一下怎么在命令行触发重新同步。
