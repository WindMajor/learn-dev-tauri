# Level 05：窗口管理与多 WebView

## 通关标准
能独立创建多窗口应用、管理窗口生命周期、实现窗口间通信和状态同步。

## 核心概念
- `WebviewWindowBuilder`：v2 的窗口创建 API（Webview 与 Window 分离）
- `WebviewWindow` vs `Webview`：v2 支持一个 Window 中多个 Webview
- 多窗口通信：Event 广播、全局 State
- 窗口状态：位置/尺寸持久化

### v2 关键差异
```
v1: Window（窗口 = WebView，绑定在一起）
v2: WebviewWindow（窗口 + WebView 分离，一个 Window 可含多个 Webview）

【对比 Electron】
Electron: BrowserWindow 天然 = 窗口，每个窗口独立 Renderer 进程（进程隔离）
Tauri v2: WebviewWindow 在同进程中，通过 Context Isolation 隔离前端
```

## 自检清单
- [ ] 能从 Rust 端创建新窗口（WebviewWindowBuilder）
- [ ] 能实现窗口间 Event 通信
- [ ] 能保存/恢复窗口位置
- [ ] 能管理多 WebView 的生命周期
