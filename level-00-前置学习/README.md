# Tauri V2 系统学习项目

<p align="center">
  <img src="https://tauri.app/meta/tauri_logo_dark.svg" width="120" alt="Tauri Logo" />
</p>

<p align="center">
  <strong>基于 Tauri V2 + Vue 3 + TypeScript 的桌面端开发系统化学习仓库</strong>
</p>

<p align="center">
  <a href="https://v2.tauri.app/">Tauri V2 官网</a> •
  <a href="./LEARN_GUIDE.md">📖 学习指南</a> •
  <a href="./CAPABILITIES_CHEATSHEET.md">🔐 权限速查表</a>
</p>

---

## 📋 项目简介

本项目是一个完整的 **Tauri V2** 系统化学习工程，包含 12 个前端学习模块和 8 个后端学习模块，涵盖从基础入门到进阶实战的全流程内容。

适合已具备 TypeScript 和 Rust 基础语法知识、希望深入掌握桌面端应用开发的开发者。

2026年6月8日 添加 Tauri V2 系统学习项目说明文档
2026年6月8日 优化css归属的bug
2026年6月8日 把Vue的全局样式移到了专门的src/styles/main.css里了，回归标准
2026年6月8日 解决tauri.confi.json的schema黄线问题，网络下载被限制了
2026年6月8日 新增所有的学习文件，开启基础学习模式
2026年6月6日 Tauri学习项目首次初始化

---

## 🚀 技术栈

| 层级       | 技术                                          | 版本         |
| ---------- | --------------------------------------------- | ------------ |
| 前端框架   | [Vue](https://vuejs.org/)                     | 3.5+         |
| 前端语言   | [TypeScript](https://www.typescriptlang.org/) | ~5.6         |
| 构建工具   | [Vite](https://vitejs.dev/)                   | 6.0+         |
| 桌面端框架 | [Tauri](https://tauri.app/)                   | V2           |
| 后端语言   | [Rust](https://www.rust-lang.org/)            | 2021 Edition |
| 包管理     | pnpm / npm                                    | —            |

---

## 📁 项目结构

```
.
├── src/                          # 前端源码
│   ├── learn/                    # 📘 前端学习模块 (12个 TS 文件)
│   │   ├── 01_project_structure.ts
│   │   ├── 02_frontend_backend_communication.ts
│   │   ├── 03_commands_and_payloads.ts
│   │   ├── 04_capabilities_and_permissions.ts
│   │   ├── 05_window_management.ts
│   │   ├── 06_menu_and_tray.ts
│   │   ├── 07_filesystem_operations.ts
│   │   ├── 08_dialogs_and_notifications.ts
│   │   ├── 09_clipboard_and_http.ts
│   │   ├── 10_shell_and_process.ts
│   │   ├── 11_state_and_events.ts
│   │   └── 12_build_and_release.ts
│   ├── App.vue                   # 主页面
│   └── main.ts                   # 入口文件
│
├── src-tauri/                    # Rust 后端源码
│   ├── src/
│   │   └── learn/                # 📗 后端学习模块 (8个 RS 文件)
│   │       ├── _01_rust_commands.rs
│   │       ├── _02_rust_state_management.rs
│   │       ├── _03_rust_events_and_channels.rs
│   │       ├── _04_rust_filesystem.rs
│   │       ├── _05_rust_window_control.rs
│   │       ├── _06_rust_security.rs
│   │       ├── _07_rust_plugins.rs
│   │       └── _08_rust_integrated_example.rs
│   ├── capabilities/             # V2 权限配置文件
│   ├── Cargo.toml                # Rust 依赖管理
│   └── tauri.conf.json           # Tauri 应用配置
│
├── LEARN_GUIDE.md                # 📖 完整学习路线图
├── CAPABILITIES_CHEATSHEET.md    # 🔐 V2 权限速查表
└── package.json                  # Node 依赖管理
```

---

## 🛠️ 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) 最新稳定版
- [pnpm](https://pnpm.io/installation)（推荐）或 npm

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm tauri dev
```

> 启动后会同时运行前端 Vite 开发服务器和 Tauri 桌面窗口，支持热更新（HMR）。

### 构建生产版本

```bash
pnpm tauri build
```

> 构建完成后，安装包位于 `src-tauri/target/release/bundle/` 目录下。

---

## 📖 学习路线

| 阶段                   | 内容                                                | 文件                                                   |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| **第一阶段：入门核心** | 项目结构、前后端通信、命令系统、权限模型            | `src/learn/01-04.ts` + `src-tauri/src/learn/_01-03.rs` |
| **第二阶段：桌面特性** | 窗口管理、菜单托盘、文件系统、对话框通知            | `src/learn/05-08.ts` + `src-tauri/src/learn/_04-05.rs` |
| **第三阶段：进阶实战** | 剪贴板 HTTP、进程管理、安全权限、插件开发、打包发布 | `src/learn/09-12.ts` + `src-tauri/src/learn/_06-08.rs` |

完整的学习顺序和说明请查看 [**LEARN_GUIDE.md**](./LEARN_GUIDE.md)。

### 🔒 Tauri V2 权限系统

Tauri V2 采用**声明式权限模型**：

- `capabilities/*.json` 分文件声明权限，粒度更细，可按窗口绑定
- 默认拒绝所有权限，必须显式声明
- 每个 IPC 调用、文件路径、系统 API 都需要在 capabilities 中授权

---

## 💡 推荐 IDE 配置

- [VS Code](https://code.visualstudio.com/)
  - [Vue - Official (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) — Vue 3 官方插件
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) — Tauri 官方插件
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) — Rust 语言支持

---

## 📚 相关资源

| 资源              | 链接                                                       |
| ----------------- | ---------------------------------------------------------- |
| Tauri V2 官方文档 | https://v2.tauri.app/                                      |
| Vue 3 文档        | https://vuejs.org/                                         |
| Rust 官方教程     | https://doc.rust-lang.org/book/                            |
| 本仓库学习指南    | [LEARN_GUIDE.md](./LEARN_GUIDE.md)                         |
| V2 权限速查表     | [CAPABILITIES_CHEATSHEET.md](./CAPABILITIES_CHEATSHEET.md) |

---

## 📝 License

[MIT](./LICENSE)
