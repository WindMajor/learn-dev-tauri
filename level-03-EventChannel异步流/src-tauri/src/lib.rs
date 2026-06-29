// src-tauri/src/lib.rs
// WHAT：Level 03 —— Event 发布/订阅、Channel 流式数据、async Command
// WHY：这是 Tauri v2 的实时通信核心，构建推送通知、进度条、聊天等场景
// CONTRAST：
//   - Electron：ipcRenderer.on() + webContents.send()（双向 IPC）
//   - NestJS：  @EventPattern() + ClientProxy.emit()（微服务事件）
//   - WebSocket：全双工双向流
//   - Tauri v2： Event（Pub/Sub）+ Channel（单向流）= 零网络开销的进程内通信
//
// WARNING：
//   - 前端 listen() 必须在组件卸载时调用 unlisten()
//   - Channel 是单向的（Rust → 前端），前端不能向 Channel 写入
//   - async Command 在 Tokio 运行时中执行，注意异步并发安全

use tauri::{Emitter, Manager};
use tauri::ipc::Channel;
use std::time::Duration;

// ═══════════════════════════════════════════════════════════════
// 示例 1：Rust 端 emit 事件 → 前端 listen
// ═══════════════════════════════════════════════════════════════

/// 发送通知事件
///
/// 【对比 Electron】
/// Electron: mainWindow.webContents.send('notification', data)
/// Tauri v2: app_handle.emit('notification', data)
/// 关键差异：Tauri 的 emit 可以广播给所有窗口，Electron 需要遍历 BrowserWindow.getAllWindows()
#[tauri::command]
fn send_notification(title: String, body: String, app: tauri::AppHandle) -> Result<(), String> {
    println!("[Event] 发送事件: {title} - {body}");

    let payload = serde_json::json!({
        "title": title,
        "body": body,
        "timestamp": chrono_now(),
    });

    // emit 到所有窗口
    app.emit("notification", &payload)
        .map_err(|e| format!("事件发送失败: {e}"))?;

    Ok(())
}

/// 简单的时间戳获取
fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs().to_string())
        .unwrap_or_default()
}

// ═══════════════════════════════════════════════════════════════
// 示例 2：Channel —— Rust → 前端的流式数据
// ═══════════════════════════════════════════════════════════════

/// 通过 Channel 向前端推送流式进度数据
///
/// WHAT：Channel 是 Tauri v2 的流式传输机制（Rust → 前端单向）
///
/// 【对比 WebSocket】
///   WebSocket：    全双工双向流，跨网络
///   Tauri Channel：单向流（Rust → 前端），进程内，零开销
///
/// 【对比 Electron】
///   Electron 无内置流式机制，通常用 ipcRenderer.on() 多次触发模拟
#[tauri::command]
async fn start_progress_stream(channel: Channel<String>, app: tauri::AppHandle) -> Result<(), String> {
    // 【WARNING】Channel 的 receiver 在 Tauri 内部，我们在另一个线程中写入
    // 必须在 async 上下文中使用，确保 Channel 不会被过早 drop

    let handle = app.clone();
    tokio::spawn(async move {
        let messages = vec![
            "开始处理...",
            "正在加载数据 (25%)",
            "正在计算 (50%)",
            "正在生成报表 (75%)",
            "处理完成 (100%)",
        ];

        for (i, msg) in messages.iter().enumerate() {
            // 模拟耗时操作
            tokio::time::sleep(Duration::from_millis(500)).await;

            // 通过 Channel 发送数据到前端
            if let Err(e) = channel.send(msg.to_string()) {
                eprintln!("[Channel] 发送失败: {e}");
                break;
            }

            // 同时通过 Event 广播进度百分比
            let progress = ((i + 1) as f64 / messages.len() as f64) * 100.0;
            let _ = handle.emit("progress", progress);
        }
    });

    Ok(())
}

// ═══════════════════════════════════════════════════════════════
// 示例 3：async Command（Tokio 异步）
// ═══════════════════════════════════════════════════════════════

/// 模拟异步耗时操作（如数据库查询、网络请求）
///
/// 【对比 NestJS】
/// NestJS 的 Controller 默认同步返回，使用 @Get() async handler() 处理异步
/// Tauri 的 #[tauri::command] 同样支持 async fn，内部 Tokio 调度
///
/// 【对比 Electron】
/// Electron 的 ipcMain.handle 天然异步（Promise），但执行在 Node.js 主线程
#[tauri::command]
async fn simulate_heavy_task(duration_ms: u64, app: tauri::AppHandle) -> Result<String, String> {
    println!("[Async] 模拟耗时任务开始, duration={duration_ms}ms");

    // 异步等待
    tokio::time::sleep(Duration::from_millis(duration_ms)).await;

    // 任务完成后 emit 事件通知前端
    let _ = app.emit("task-completed", serde_json::json!({
        "duration_ms": duration_ms,
        "result": "任务完成",
    }));

    println!("[Async] 任务完成");
    Ok(format!("耗时任务完成（{}ms）", duration_ms))
}

// ═══════════════════════════════════════════════════════════════
// 示例 4：前端 emit → Rust 端 listen（前端到 Rust 的事件）
// ═══════════════════════════════════════════════════════════════

/// 启动监听前端事件的 setup
fn setup_frontend_event_listener(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle().clone();

    // Rust 端监听前端 emit 的事件
    // 【对比 Electron】
    // Electron: ipcMain.on('frontend-event', (event, data) => {})
    // Tauri v2: app.listen() 或 app.once()
    let _listener = app.listen("frontend-hello", move |event| {
        println!("[Event] Rust 收到前端事件: {:?}", event.payload());
        // 可以从 event.payload() 获取前端传来的数据
        let _ = handle.emit("rust-response", serde_json::json!({
            "msg": "Rust 已收到你的消息！",
            "original": format!("{:?}", event.payload()),
        }));
    });

    Ok(())
}

// ═══════════════════════════════════════════════════════════════
// 应用启动
// ═══════════════════════════════════════════════════════════════

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            send_notification,
            start_progress_stream,
            simulate_heavy_task,
        ])
        .setup(|app| {
            println!("[Tauri] Level 03 启动完成");

            // 注册 Rust 端事件监听器（监听前端 emit）
            setup_frontend_event_listener(app)?;

            // 启动一个后台定时任务：每 5 秒向所有窗口推送心跳事件
            let handle = app.handle().clone();
            tokio::spawn(async move {
                let mut count = 0u64;
                loop {
                    tokio::time::sleep(Duration::from_secs(5)).await;
                    count += 1;
                    let payload = serde_json::json!({
                        "count": count,
                        "msg": format!("后台心跳 #{count}"),
                    });
                    if let Err(e) = handle.emit("heartbeat", &payload) {
                        eprintln!("[Heartbeat] 发送失败: {e}");
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动失败");
}
