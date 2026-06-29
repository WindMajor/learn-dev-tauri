// bug_02_Channel未正确关闭导致Rust端阻塞.rs
// WHAT：Channel 未正确关闭导致 Rust 端 tokio::spawn 的线程永远等待
// 这是什么错误：Channel 的 receiver 端被 drop，但 sender 端仍在尝试发送数据
// 运行后报什么错：
//   Rust 端 (stderr)：[Channel] 发送失败: channel closed
//   前端：只收到部分消息或完全没收到（取决于时序）
//
// 为什么会这样：
//   Channel 是 Tauri v2 的流式通道，Rust 端持有 sender，前端持有 receiver。
//   如果 Channel 在 tokio::spawn 中被使用后 spawn 的 future 没有被正确取消，
//   或者 app_handle 传递方式不当，Channel 可能被过早 drop。
//
// 【对比 Electron】
//   Electron 无 Channel 概念，通过多次 ipcRenderer.send() 模拟流式，
//   不存在 Channel 生命周期的竞态问题。
//
// 【对比 tokio::sync::mpsc】
//   tokio 的 mpsc channel 有显式的 close() 语义，
//   而 Tauri 的 Channel 由 Tauri Core 管理生命周期。
//
// 【对比 WebSocket】
//   WebSocket 有明确的 close 事件和 readyState 状态机。
//   Tauri Channel 的关闭是隐式的（receiver drop 时）。
//
// 如何修复：
//   1. 在 spawn 的 async block 中检查 Channel 是否仍然可写
//   2. 使用 tokio::sync::oneshot 通知 spawn 取消
//   3. 确保 AppHandle 的 clone 在正确的作用域中

use tauri::ipc::Channel;

// ❌ 错误代码：Channel 可能被过早 drop
#[tauri::command]
async fn bad_progress_stream(channel: Channel<String>, app: tauri::AppHandle) -> Result<(), String> {
    // ❌ 问题：spawn 中 clone 了 app，但 Channel 的存活时间不确定
    let handle = app.clone();

    // ❌ Channel 作为参数传入后，Tauri Core 管理其生命周期。
    // 如果此 async fn 完成前 Channel 的 receiver 被 drop，
    // 后续的 send 会失败。
    tokio::spawn(async move {
        for i in 0..100 {
            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
            match channel.send(format!("进度 {i}%")) {
                Ok(_) => {}
                Err(e) => {
                    eprintln!("发送失败: {e}"); // Channel 已被关闭
                    break;
                }
            }
        }
    });

    // ❌ 函数立即返回 Ok，但 spawn 还在运行
    // 如果前端在 spawn 完成前卸载了组件，Channel 的 receiver 被 drop，
    // Rust 端的 send 持续失败但循环仍在运行（直到 i 到 100）
    Ok(())
}

// ─── 修复后的代码 ───
#[tauri::command]
async fn fixed_progress_stream(channel: Channel<String>, app: tauri::AppHandle) -> Result<(), String> {
    let handle = app.clone();

    // ✅ 使用 tokio::task::JoinHandle 跟踪 spawn 状态
    let task = tokio::spawn(async move {
        for i in 0..100 {
            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
            // ✅ 每次 send 后检查结果
            if channel.send(format!("进度 {i}%")).is_err() {
                eprintln!("Channel 已关闭，停止发送");
                break; // ✅ Channel 关闭后立即终止循环
            }
        }
    });

    // ✅ 等待 spawn 完成（或超时）
    tokio::time::timeout(
        std::time::Duration::from_secs(10),
        task,
    ).await
    .map_err(|_| "任务超时".to_string())?
    .map_err(|e| format!("任务失败: {e}"))?;

    // ✅ 通知前端完成
    let _ = handle.emit("stream-complete", "done");
    Ok(())
}
