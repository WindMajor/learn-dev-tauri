# learn-dev-tauri：闯关式 Tauri v2 商业级桌面应用开发

## 项目定位

这不是一个"从零学 Tauri"的教程，而是**为已掌握 Rust + TypeScript + Vue3 的资深开发者设计的 Tauri v2 差异地图**。

10 个关卡、30~90 分钟/关，以"玩桌面端"的心态打通 Tauri v2 在企业软件中的核心架构能力与工程化规范，最终产出可打包、可签名、可自动更新的完整桌面应用。

## 学习者画像（难度锚点）

| 维度 | 水平 |
|------|------|
| TypeScript | 深度使用，熟悉 Vue3/Vite/Pinia/类型体操 |
| Rust | 深度使用，理解所有权/借用/生命周期/Tokio |
| 前端 | Vue3（`<script setup>`/Pinia/Vue Router） |
| 后端 | NestJS（IoC/DI/模块化/REST/WebSocket） |
| 运维 | Docker（多阶段构建/Compose/生产安全） |
| 桌面端 | 了解 Electron，探索 Tauri/Swift/egui 方案 |

**极度反感"从什么是 pnpm install 开始讲"的小白式教学。**

## 路线图

```
Level 01 ── Tauri v2 架构与权限模型（Capabilities 全新权限系统）
  │
Level 02 ── IPC 通信：Command 与 State（前后端类型安全边界）
  │
Level 03 ── Event、Channel 与异步流（实时数据推送）
  │
Level 04 ── 文件系统与原生对话框（Scope 路径约束）
  │
Level 05 ── 窗口管理与多 WebView（WebviewWindow 分离）
  │
Level 06 ── 菜单、托盘与系统集成（系统级交互）
  │
Level 07 ── 安全加固与 CSP（最小权限 + 纵深防御）
  │
Level 08 ── 插件系统与 Sidecar（扩展生态 + 外部二进制）
  │
Level 09 ── 打包、签名与自动更新（跨平台分发）
  │
Level 10 ── 毕业设计：企业数据汇总办公桌面端（全栈整合）
```

## 环境准备

```bash
# Rust 工具链（1.75+）
rustup update stable
rustup target add aarch64-apple-darwin x86_64-apple-darwin

# Node.js（20+）
node --version  # >= 20.0.0

# Tauri CLI（v2）
cargo install tauri-cli --version "^2.0"

# 系统依赖（MacOS）
xcode-select --install  # 如果未安装
```

## 与现有知识体系的衔接

| 你已掌握 | Tauri v2 对应概念 | 关键差异 |
|----------|-------------------|---------|
| **Electron** `ipcMain`/`ipcRenderer` | `#[tauri::command]` + `invoke()` | Tauri IPC 是显式白名单，Electron 无边界 |
| **Electron** `BrowserWindow` | `WebviewWindowBuilder` | Tauri 使用系统原生 WebView |
| **NestJS** Controller | `#[tauri::command]` | IPC 替代 HTTP，进程内通信 |
| **NestJS** Provider/Injectable | `tauri::State<T>` | 单例状态管理，非 DI 容器 |
| **Vue3** Pinia Store | `tauri::State<T>` + Event | 前后端状态双向同步 |
| **Rust** `cargo build` | `cargo tauri build` | Tauri 封装了 Cargo + 资源打包 |
| **Docker** 多阶段构建 | Tauri `bundle` 配置 | 原生二进制 vs 容器化 |
| **Swift** `NSWindow` | `WebviewWindow` | 跨平台 vs Apple 独占 |
| **egui** Immediate Mode | Vue3 SFC | Web 声明式 UI vs 即时模式 |

## 使用方式

```bash
# 进入任一关卡
cd level-01-TauriV2架构与权限模型

# 安装前端依赖
pnpm install

# 启动开发模式（热更新）
cargo tauri dev

# 构建生产版本
cargo tauri build
```

## 各关概览

| 关卡 | 主题 | 核心知识点 | 时间 |
|------|------|-----------|------|
| 01 | 架构与权限模型 | Capabilities、Context Isolation、CSP | 30min |
| 02 | IPC：Command & State | `#[tauri::command]`、`invoke`、State 单例 | 45min |
| 03 | Event & Channel | `emit`/`listen`、流式数据、async Command | 45min |
| 04 | 文件系统 | `tauri-plugin-dialog`/`fs`、Scope 限制 | 45min |
| 05 | 窗口管理 | `WebviewWindow`、多窗口通信、状态持久化 | 60min |
| 06 | 菜单/托盘 | 系统托盘、全局快捷键、通知 | 60min |
| 07 | 安全加固 | Capabilities 精细化、CSP、参数校验 | 45min |
| 08 | 插件 & Sidecar | 自定义插件、外部二进制集成 | 60min |
| 09 | 打包 & 签名 | DMG/MSI/AppImage、代码签名、Updater | 60min |
| 10 | 毕业设计 | 企业数据汇总办公桌面端 | 90min |

## 核心设计思想

### 能跑起来才算学会
- 每关的主菜是可编译、可运行的 Rust + TS 代码
- `.md` 文件只当辅助
- 代码即教程，注释即文档

### 站在已知看未知
- 每个新概念显式对比 Electron/Swift/egui/NestJS
- 注释格式：`// WHAT` / `// WHY` / `// CONTRAST` / `// WARNING` / `// SECURITY`

### 错误是最好的老师
- 每关 `bugs/` 目录包含 2~3 个故意写错的案例
- 覆盖权限、IPC、状态管理、窗口、打包、安全、跨平台 7 大类陷阱

### Tauri v2 的核心安全哲学

```
Electron:  "默认开放，需要时关闭"（nodeIntegration 曾经默认 true）
Tauri v2:  "默认拒绝，显式授权"（Capabilities 白名单 + Scope 约束）
           ↓
每条 IPC 通道、每个文件路径、每个系统 API 调用都必须
在 capabilities/*.json 中显式声明，否则运行时被拦截。
```

---

开始闯关吧！从 [Level 01](./level-01-TauriV2架构与权限模型/README.md) 出发 🚀
