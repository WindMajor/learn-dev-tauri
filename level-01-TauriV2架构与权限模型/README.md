# Level 01：Tauri v2 架构与权限模型

## 通关标准

**本关结束后，你能独立完成：**
- 从零创建一个 Tauri v2 项目，配置 Capabilities 权限系统
- 解释 Tauri v2 的进程架构和安全边界
- 向 Electron/Swift 开发者讲清楚 Tauri v2 的权限模型差异

## 核心概念速查

### Tauri v2 进程架构

```
┌─────────────────────────────────────────────────┐
│  Tauri App Process（Rust）                       │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Core (tauri) │  │  WebView (系统原生)       │ │
│  │ - Commands   │  │  - Vue3 前端              │ │
│  │ - State      │  │  - HTML/CSS/JS            │ │
│  │ - Plugins    │  │  - @tauri-apps/api        │ │
│  │ - Events     │◄─┤  - invoke() → IPC 调用    │ │
│  │ - Tray/Menu  │  └──────────────────────────┘ │
│  └──────────────┘                                │
└─────────────────────────────────────────────────┘
```

**关键事实**：
- Tauri v2 只有一个进程（Rust Core + WebView 在同一进程）
- 前端通过 IPC（`invoke`）调用 Rust Command，**不能直接访问系统 API**
- WebView 使用操作系统原生 WebView：MacOS 用 WKWebView，Windows 用 WebView2，Linux 用 WebKitGTK

### Tauri v2 与 v1 的根本差异

| 特性 | v1 | v2 |
|------|----|----|
| 权限模型 | `allowlist`（单一 JSON 字段） | `capabilities/` 目录（多文件、可组合） |
| 窗口管理 | `Window` 一体 | `WebviewWindow` + `Webview` 分离 |
| 移动端 | 不支持 | 支持 iOS/Android |
| 多 WebView | 有限支持 | 原生支持 |
| 插件系统 | 初步 | 成熟的插件 Builder API |

### Capabilities 权限系统（v2 核心革新）

```
【对比 Electron】
Electron 的权限模型：preload.js 可访问全部 Node API，依赖开发者自觉限制。
Tauri v2 的权限模型：每个 IPC 调用、每个文件路径、每个系统 API 都必须在
capabilities/*.json 中显式声明，否则运行时被 Tauri Core 拦截并拒绝。

【对比 Swift App Sandbox】
Swift 的 App Sandbox 通过 entitlements.plist 声明权限（类似但平台独占）。
Tauri v2 的 Capabilities 是跨平台的权限声明，在不同平台映射到对应的系统权限。
```

**capabilities/default.json 结构**：
```json
{
  "identifier": "default",        // 权限集唯一标识
  "description": "默认权限集",
  "windows": ["main"],            // 哪些窗口可以使用这些权限
  "permissions": [
    "core:default",               // 核心权限（IPC、事件等）
    "core:window:default",        // 窗口操作权限
    "core:window:allow-close",
    "core:window:allow-set-title"
  ]
}
```

### Context Isolation（上下文隔离）

```
┌──────────────────────────────────────────┐
│  WebView 渲染进程                        │
│  ┌────────────────┐  ┌────────────────┐ │
│  │ 前端 JS        │  │ 隔离的 preload │ │
│  │ (Vue3/HTML)    │  │ (Tauri API)    │ │
│  │                 │  │                │ │
│  │ 不能访问：      │  │ 可以访问：      │ │
│  │ - Node API     │  │ - window.__TAURI__│
│  │ - 文件系统     │  │ - invoke()     │ │
│  │ - 系统调用     │  │ - listen()     │ │
│  └────────────────┘  └────────────────┘ │
└──────────────────────────────────────────┘
```

**对比**：
- **Electron**：contextIsolation 可选（v12+ 默认开启），但 preload 脚本仍可暴露任意 Node API
- **Tauri v2**：contextIsolation 强制开启且不可关闭，preload 由 Tauri 自动生成（不暴露 Node API）

### CSP（Content Security Policy）

Tauri v2 默认 CSP：
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```

**对比 Electron**：Electron 默认无 CSP，Tauri 默认启用严格 CSP。

---

## 对比表

| 概念 | Electron | Tauri v2 | Swift (AppKit) | egui | NestJS |
|------|----------|----------|---------------|------|--------|
| 进程模型 | Main + Renderer（多进程） | 单进程（Rust + WebView） | 单进程（原生） | 单进程 | 单进程 |
| IPC | `ipcMain`/`ipcRenderer`（无边界） | `invoke` + `#[command]`（白名单） | N/A | N/A | HTTP Controller |
| 权限 | 无强制（依赖开发者） | Capabilities（强制白名单） | App Sandbox（平台独占） | N/A | Guard + Middleware |
| 前端框架 | 任意 | 任意（本题用 Vue3） | SwiftUI | egui 即时模式 | 任意 |
| 打包体积 | ~150MB | ~3-5MB | ~10MB | ~3MB | N/A |
| 内存占用 | ~200MB+ | ~50MB | ~50MB | ~30MB | N/A |
| 跨平台 | ✅ (Chromium 捆绑) | ✅ (系统 WebView) | ❌ (仅 Apple) | ✅ (自绘) | ✅ (服务端) |

---

## 编译/运行命令

```bash
# 进入本关目录
cd level-01-TauriV2架构与权限模型

# 安装前端依赖
pnpm install

# 启动 Tauri 开发模式
cargo tauri dev

# 仅编译 Rust 后端（快速检查）
cargo check --manifest-path src-tauri/Cargo.toml

# 查看 Tauri CLI 版本
cargo tauri --version
```

---

## 自检清单

- [ ] 能手写出 Tauri v2 的项目结构（`src-tauri/` + `src/` + `capabilities/`）
- [ ] 能理解 Capabilities 权限系统的工作原理（白名单 + Scope）
- [ ] 能独立修复 `bugs/` 目录下的 3 个错误
- [ ] 能用 `cargo tauri dev` 编译运行并看到 Vue3 页面
- [ ] 能向一个只用 Electron 的开发者解释清楚：为什么 Tauri v2 选择"默认拒绝"的安全哲学，以及 Electron 的 `contextIsolation` 为何不够
