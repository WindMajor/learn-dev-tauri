# Level 08：插件系统与 Sidecar

## 通关标准
能编写自定义 Rust 插件、集成官方插件、通过 Sidecar 调用外部二进制（Python/Go/Rust CLI）。

## 核心概念

### 自定义插件
```rust
// 通过 tauri::plugin::Builder 创建插件
tauri::plugin::Builder::new("my-plugin")
    .js_init_script(include_str!("api.js"))
    .invoke_handler(tauri::generate_handler![my_command])
    .build()
```

### Sidecar
将外部二进制（如 Go 工具、Python 脚本打包）作为 Sidecar 集成，通过 Command 调用。

## 自检清单
- [ ] 能创建一个自定义 Rust 插件
- [ ] 能将外部二进制配置为 Sidecar
- [ ] 能理解插件与 Sidecar 的取舍（插件 = 进程内 vs Sidecar = 进程外）
