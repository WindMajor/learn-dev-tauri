# Tauri V2 系统化学习指南

> 本项目是一个完整的 Tauri V2 学习项目，包含 12 个前端学习文件和 8 个后端学习文件。
> 适用于有 TypeScript 和基础 Rust 知识的开发者。

---

## 📖 学习路线图

### 第一阶段：入门核心（前端 01-04 + 后端 01-03）

阅读顺序，建立 Tauri V2 的整体认知：

| 顺序 | 文件 | 主题 | 时间 |
|------|------|------|------|
| 1 | `src/learn/01_project_structure.ts` | 项目结构与V2配置 | 30min |
| 2 | `src/learn/02_frontend_backend_communication.ts` | 前后端通信核心(invoke/emit/channel) | 45min |
| 3 | `src/learn/03_commands_and_payloads.ts` | 命令系统与数据传递 | 45min |
| 4 | `src/learn/04_capabilities_and_permissions.ts` | ★V2权限模型（最重要） | 60min |
| 5 | `src-tauri/src/learn/_01_rust_commands.rs` | Rust基础命令编写 | 45min |
| 6 | `src-tauri/src/learn/_02_rust_state_management.rs` | Rust后端状态管理 | 40min |
| 7 | `src-tauri/src/learn/_03_rust_events_and_channels.rs` | Rust事件与Channel | 40min |

### 第二阶段：桌面应用特性（前端 05-08 + 后端 04-05）

深入桌面应用的独有功能：

| 顺序 | 文件 | 主题 |
|------|------|------|
| 8 | `src/learn/05_window_management.ts` | 窗口管理 |
| 9 | `src-tauri/src/learn/_05_rust_window_control.rs` | Rust窗口控制 |
| 10 | `src/learn/06_menu_and_tray.ts` | 菜单与系统托盘 |
| 11 | `src/learn/07_filesystem_operations.ts` | 文件系统操作 |
| 12 | `src-tauri/src/learn/_04_rust_filesystem.rs` | Rust文件操作 |
| 13 | `src/learn/08_dialogs_and_notifications.ts` | 对话框与通知 |

### 第三阶段：进阶与实战（前端 09-12 + 后端 06-08）

综合运用所学知识：

| 顺序 | 文件 | 主题 |
|------|------|------|
| 14 | `src/learn/09_clipboard_and_http.ts` | 剪贴板与HTTP |
| 15 | `src/learn/10_shell_and_process.ts` | 进程管理 ⚠️安全 |
| 16 | `src-tauri/src/learn/_06_rust_security.rs` | 安全与权限 |
| 17 | `src/learn/11_state_and_events.ts` | 状态管理与事件系统 |
| 18 | `src-tauri/src/learn/_07_rust_plugins.rs` | 插件开发入门 |
| 19 | `src/learn/12_build_and_release.ts` | 打包与发布 |
| 20 | `src-tauri/src/learn/_08_rust_integrated_example.rs` | ★综合实战：待办事项应用 |

---

## 🔄 Tauri V1 vs V2 核心差异对照表

| 功能领域 | V1 (已废弃) | V2 (当前) |
|----------|-------------|----------|
| **权限系统** | `tauri.conf.json` 中 `allowlist` | `capabilities/*.json` 分文件声明 |
| **权限格式** | `{ "fs": { "readFile": true } }` | `"fs:read-files"` (插件:操作) |
| **权限粒度** | 全局 | 可按窗口绑定 (`"windows": ["main"]`) |
| **Scope 配置** | allowlist 内的 scope 字段 | 独立的 `"fs:scope"` 权限标识符 |
| **插件注册** | `tauri.conf.json` 的 `plugins` 字段 | `lib.rs` 中 `.plugin(xxx::init())` |
| **插件依赖** | feature flag 模式 | 独立的 npm 包 + cargo crate |
| **配置文件** | `$schema` 指向 `./node_modules/.../schema.json` | `$schema` 指向 `https://schema.tauri.app/config/2` |
| **事件 API** | `app.emit_all()` / `window.emit()` | `Emitter` trait: `app.emit()` / `window.emit()` |
| **Channel** | ❌ 不支持 | ✅ `tauri::ipc::Channel` 流式传输 |
| **菜单构建** | 前端 + Rust 混合 | 主要在 Rust 端 (`menu` 模块) |
| **窗口创建** | `WindowBuilder` | `WebviewWindowBuilder` |
| **状态管理** | 相同 (manage + State) | 相同，无变化 |
| **命令定义** | `#[tauri::command]` | 相同，无变化 |

---

## 🛠 运行命令

### 开发模式
```bash
# 1. 安装依赖
npm install
# 或
pnpm install

# 2. 启动 Tauri 开发服务器（前端热更新 + Rust 热重载）
npm run tauri dev
# 或
pnpm tauri dev
```

### Rust 代码检查
```bash
# 在 src-tauri 目录下检查 Rust 代码编译
cd src-tauri
cargo check

# 检查学习模块是否能编译
cargo check --lib
```

### 生产构建
```bash
# 构建当前平台安装包
npm run tauri build
# 或
pnpm tauri build
```

---

## 🔍 常见问题排查

### 1. 权限报错

**现象**：`permission 'fs:read-files' not granted`

**排查步骤**：
1. 确认插件已安装：`Cargo.toml` 有 `tauri-plugin-fs = "2"`，`package.json` 有 `@tauri-apps/plugin-fs`
2. 确认 `lib.rs` 有 `.plugin(tauri_plugin_fs::init())`
3. 确认 `capabilities/*.json` 有 `"fs:read-files"` 权限
4. 确认 scope 配置包含目标路径
5. 确认权限绑定到正确的窗口标签

### 2. 窗口白屏

**现象**：应用启动后显示空白页面

**排查步骤**：
1. 确认 `frontendDist` 路径正确（指向实际构建产物目录）
2. 确认 `beforeBuildCommand` 正确执行了前端构建
3. 开发模式下确认 `devUrl` 端口正确（默认 1420）
4. 检查浏览器控制台（开发模式下右键 → 检查元素）
5. 检查 `index.html` 中 script 的引入路径

### 3. Rust 编译错误

**常见情况**：
- `cannot find derive macro` → 确保 `serde = { version = "1", features = ["derive"] }`
- `method not found in Emitter` → V2 需要 `use tauri::Emitter;`
- `cannot find type WebviewWindow` → 确认导入 `use tauri::WebviewWindow;`
- `the trait Send is not implemented` → 用 `Mutex` 或 `Arc` 包装

### 4. 前端 invoke 报错

**现象**：`command not found`

**排查步骤**：
1. 确认 Rust 命令已用 `#[tauri::command]` 标注
2. 确认命令名在 `generate_handler![]` 中注册
3. 确认前端调用的命令名与 Rust 函数名一致（蛇形命名）

---

## 📚 推荐学习资源

### 官方文档（必读）
- [Tauri V2 官方文档](https://v2.tauri.app/)
- [Tauri V2 API 参考](https://docs.rs/tauri/2/)
- [Tauri V2 概念指南](https://v2.tauri.app/develop/)
- [安全模型详解](https://v2.tauri.app/security/)
- [插件开发指南](https://v2.tauri.app/develop/plugins/)

### Rust 基础
- [Rust 官方教程](https://doc.rust-lang.org/book/)
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/)
- [Serde 文档](https://serde.rs/)

### 社区资源
- [Tauri GitHub](https://github.com/tauri-apps/tauri)
- [Tauri Discord](https://discord.com/invite/tauri)
- [Awesome Tauri](https://github.com/tauri-apps/awesome-tauri)

---

## 📝 学习建议

1. **先读前端再读后端**：前端文件展示了"怎么用"，后端文件解释了"为什么"
2. **1-4 章是基础中的基础**：不要跳过，V2 的权限模型完全不同
3. **写代码比看代码重要**：每学完一章，尝试在当前项目中实践
4. **第 20 章的待办事项应用**：建议学完后独立实现一遍
5. **遇到问题先检查 capabilities**：V2 90% 的功能问题都是权限配置遗漏
6. **关注 V1→V2 差异**：如果之前用过 V1，务必注意权限系统的完全重构

---

> 项目地址：`tauri-basic-learn`
> 技术栈：Tauri V2 + Vue 3 + TypeScript + Vite 6 + Rust 2021
