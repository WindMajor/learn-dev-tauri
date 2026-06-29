// ============================================================================
// 03_rust_events_and_channels.rs —— 事件与通道
// ============================================================================
//
// 【对应前端章节】02_frontend_backend_communication.ts / 11_state_and_events.ts
//
// 【学习目标】
//   1. 使用 app.emit() 从 Rust 向所有前端窗口推送事件
//   2. 使用 Channel 实现流式数据传输（大数据、进度、日志）
//   3. 在后台任务中持续发送事件
//   4. 生命周期管理：防止向已关闭的窗口发送事件
//
// 【核心概念】
//   - Emitter trait：提供 emit() 方法（V2 新设计）
//   - Channel<T>：V2 新增的流式传输通道
//   - 事件是异步广播的，不保证顺序

use serde::Serialize;
use std::time::Duration;

// ============================================================================
// 示例 1：简单事件广播 —— 从 Rust 推送到前端
// ============================================================================

use tauri::{AppHandle, Emitter};

// 广播系统消息给所有窗口
//
// 前端监听：
// ```typescript
// import { listen } from "@tauri-apps/api/event";
// listen("app:message", (event) => {
//     console.log("收到后端消息:", event.payload);
// });
// ```
#[tauri::command]
pub fn broadcast_message(app: AppHandle, message: String) -> Result<(), String> {
    // V2 中通过 Emitter trait 发送事件
    app.emit("app:message", &message)
        .map_err(|e| format!("发送事件失败: {}", e))
}

// 发送带负载的结构化事件
#[derive(Debug, Clone, Serialize)]
pub struct TaskProgress {
    pub task_id: String,
    pub progress: u8,  // 0-100
    pub status: String, // "running" | "completed" | "failed"
    pub message: Option<String>,
}

#[tauri::command]
pub fn send_task_progress(
    app: AppHandle,
    task_id: String,
    progress: u8,
    status: String,
) -> Result<(), String> {
    let payload = TaskProgress {
        task_id,
        progress,
        status,
        message: None,
    };

    app.emit("task:progress", &payload)
        .map_err(|e| format!("发送失败: {}", e))
}

// ============================================================================
// 示例 2：后台任务中持续发送进度事件
// ============================================================================

// 启动一个后台任务，定期发送进度更新
//
// 重要提示：在生成线程中使用 AppHandle 是安全的
// AppHandle 实现了 Send + Sync
//
// 前端调用：
// ```typescript
// await invoke("start_progress_task");
// // 然后监听 "task:progress" 事件来更新 UI
// ```
#[tauri::command]
pub fn start_progress_task(app: AppHandle) {
    // 使用 std::thread::spawn 在独立线程中运行
    std::thread::spawn(move || {
        for i in 1..=10 {
            std::thread::sleep(Duration::from_millis(500));

            let progress = TaskProgress {
                task_id: "bg-task-1".into(),
                progress: i * 10,
                status: if i == 10 { "completed".into() } else { "running".into() },
                message: Some(format!("步骤 {}/10", i)),
            };

            // emit 可能会失败（窗口已关闭），这里用 let _ 忽略错误
            let _ = app.emit("task:progress", &progress);
        }

        println!("后台任务完成");
    });
}

// ============================================================================
// 示例 3：使用 Channel 传输流数据（V2 新特性）
// ============================================================================

use tauri::ipc::Channel;

// 流式传输大文件内容（通过 Channel 分块发送）
//
// V2 的 Channel 类似 ReadableStream：Rust 端分块写入，前端逐块读取
//
// 前端调用：
// ```typescript
// import { invoke, Channel } from "@tauri-apps/api/core";
//
// const channel = new Channel<string>();
// channel.onmessage = (chunk) => {
//     console.log("收到数据块:", chunk);
//     outputElement.textContent += chunk;
// };
//
// await invoke("stream_file_content", { path: "/data/large.log", channel });
// ```
#[tauri::command]
pub async fn stream_file_content(
    path: String,         // 文件路径
    on_chunk: Channel<String>, // ★ 数据发送通道
) -> Result<(), String> {
    // 模拟读取大文件并分块发送
    let content = format!("模拟文件内容: {}\n每块 100 字符...\n", path);

    // 将内容分块发送
    for chunk in content.as_bytes().chunks(10) {
        // 模拟读取延迟
        tokio::time::sleep(Duration::from_millis(100)).await;

        let chunk_str = String::from_utf8_lossy(chunk).to_string();
        on_chunk.send(chunk_str)
            .map_err(|e| format!("Channel 发送失败: {}", e))?;
    }

    // 发送结束标记
    on_chunk.send("[EOF]".to_string())
        .map_err(|e| format!("Channel 发送失败: {}", e))?;

    Ok(())
}

// 使用 Channel 传输二进制数据（如图片）
#[tauri::command]
pub async fn stream_binary_data(
    size: u32,
    on_data: Channel<Vec<u8>>,  // ★ Channel<Vec<u8>> 传输二进制
) -> Result<(), String> {
    for i in 0..size {
        let chunk = vec![i as u8; 1024]; // 每块 1KB
        on_data.send(chunk).map_err(|e| e.to_string())?;
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
    Ok(())
}

// ============================================================================
// 示例 4：窗口级事件 vs 全局事件
// ============================================================================

use tauri::WebviewWindow;

// 仅向当前窗口发送事件（窗口级事件）
//
// 前端调用：
// ```typescript
// await invoke("send_to_current_window", { message: "Hi" });
// // 只有调用此命令的窗口会收到 "window:private-msg" 事件
// ```
#[tauri::command]
pub fn send_to_current_window(
    window: WebviewWindow,
    message: String,
) -> Result<(), String> {
    // V2 中 WebviewWindow 也实现了 Emitter trait
    window.emit("window:private-msg", &message)
        .map_err(|e| format!("发送窗口事件失败: {}", e))
}

// ============================================================================
// 示例 5：在 setup 钩子中启动后台任务
// ============================================================================

// 在应用启动时启动全局后台任务
//
// 在 lib.rs 的 setup 中：
// ```rust
// .setup(|app| {
//     let handle = app.handle().clone();
//
//     // 定期检查文件变化的后台任务
//     std::thread::spawn(move || {
//         loop {
//             std::thread::sleep(Duration::from_secs(30));
//             let _ = handle.emit("app:health-check", "ok");
//         }
//     });
//
//     Ok(())
// })
// ```

// ============================================================================
// 示例 6：接收前端 emit 的事件（Rust 端监听）
// ============================================================================

// 在 setup 中监听前端 emit 的事件（V2 方式）
//
// V2 中 Rust 端监听前端事件的推荐方式是通过命令（invoke）
// 或者使用 tauri::Builder 的 on_event 或特定 API
//
// ```rust
// // 如果需要双向事件通信，模式是：
// // 前端 → Rust: invoke("command_name", { ... })
// // Rust → 前端: app.emit("event_name", payload)
// // 这样更清晰，避免事件名冲突
// ```

// ============================================================================
// 示例 7：事件序列化 —— 支持复杂数据类型
// ============================================================================

// 发送包含枚举/复杂结构的 payload
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "data")]
pub enum SystemEvent {
    FileChanged { path: String, timestamp: i64 },
    NetworkStatus { online: bool },
    UserActivity { action: String, detail: String },
}

#[tauri::command]
pub fn send_system_event(
    app: AppHandle,
    event: SystemEvent,
) -> Result<(), String> {
    app.emit("system:event", &event)
        .map_err(|e| format!("发送系统事件失败: {}", e))
}

// ============================================================================
// 【本章小结】
// ============================================================================
//
// 1. V2 事件系统核心：
//    - Emitter trait 提供 emit() 方法
//    - AppHandle 用于全局广播
//    - WebviewWindow 用于窗口级事件
//    - Channel<T> 用于流式数据传输
//
// 2. Channel 使用场景：
//    - 大文件传输（分块避免内存爆炸）
//    - 实时日志流
//    - 数据库查询结果（逐行返回）
//    - 子进程 stdout 实时输出
//
// 3. 后台任务生命周期：
//    - AppHandle 可安全移动到其他线程（Send + Sync）
//    - emit 时应处理窗口已关闭的情况（let _ 忽略错误）
//    - 可以用 AtomicBool 控制后台任务退出
//
// 4. 注册命令：
//    .invoke_handler(tauri::generate_handler![
//        broadcast_message,
//        send_task_progress,
//        start_progress_task,
//        stream_file_content,
//        stream_binary_data,
//        send_to_current_window,
//        send_system_event
//    ])
