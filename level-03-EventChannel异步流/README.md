# Level 03：Event、Channel 与异步流

## 通关标准

**本关结束后，你能独立完成：**
- Rust 端 emit 事件 → 前端 listen 接收（双向事件）
- 使用 Channel 实现 Rust → 前端的流式数据传输（如进度条）
- 编写 async fn Command（Tokio 异步）
- 正确管理前端事件监听器的生命周期（unlisten 防止内存泄漏）

## 核心概念速查

### Event 系统（发布/订阅）

```rust
// Rust 端 emit
app_handle.emit("my-event", payload)?;

// 前端 listen
import { listen } from '@tauri-apps/api/event';
const unlisten = await listen('my-event', (event) => {
  console.log(event.payload); // 来自 Rust 的数据
});
// 组件卸载时必须 unlisten()！
```

**对比 Electron**：Electron 的 `ipcRenderer.on()` / `mainWindow.webContents.send()` 是双向 IPC，Tauri 的 Event 是发布/订阅（Rust ↔ 前端双向）。

### Channel（流式数据）

```rust
// Rust 端创建 Channel 并通过 Event 发送
let channel = Channel::new(|msg| { /* 前端每次收到一条消息 */ });
app_handle.emit("start-stream", channel)?;

// 前端接收
import { Channel } from '@tauri-apps/api/core';
```

**对比**：WebSocket 全双工双向流 vs Tauri Channel 单向（Rust → 前端），但零网络开销。

---

## 对比表

| 概念 | Tauri v2 | Electron | Web 标准 | Rust std |
|------|----------|----------|----------|----------|
| 事件 | `emit()` / `listen()` | `ipcRenderer.on()` / `webContents.send()` | `EventTarget` / `CustomEvent` | `tokio::sync::broadcast` |
| 流式 | `Channel` (单向) | 自定义分片 | `ReadableStream` + fetch | `tokio::sync::mpsc` |
| 异步 | `async fn` + Tokio | `async` + Node.js event loop | `async/await` + Promise | `async fn` + Tokio |
| 清理 | `unlisten()` | `removeListener()` | `removeEventListener()` | `drop(rx)` |

---

## 编译/运行

```bash
cd level-03-EventChannel异步流
pnpm install
cargo tauri dev
```

---

## 自检清单

- [ ] 能写出 Rust emit → 前端 listen 的完整事件流代码
- [ ] 能使用 Channel 实现进度条/流式日志
- [ ] 能编写 async fn Command 并使用 Tokio sleep/spawn
- [ ] 能在组件卸载时正确调用 unlisten() 防止内存泄漏
- [ ] 能独立修复 `bugs/` 目录下的 3 个错误
