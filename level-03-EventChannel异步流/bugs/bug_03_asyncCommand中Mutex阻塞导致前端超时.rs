// bug_03_asyncCommand中Mutex阻塞导致前端超时.rs
// WHAT：async Command 中使用了 std::sync::Mutex（阻塞锁）导致 Tokio 线程被阻塞
// 这是什么错误：运行时性能问题，前端 invoke 调用长时间无响应
// 运行后报什么错：
//   前端：Promise pending 直到超时（默认无超时，可能永远挂起）
//   Rust 端：线程被 .lock().unwrap() 阻塞，Tokio 无法调度其他任务
//
// 为什么会这样：
//   Tokio 是协作式调度（cooperative scheduling），依赖 .await 让出执行权。
//   std::sync::Mutex::lock() 是阻塞调用，会阻塞整个 Tokio 工作线程。
//   如果锁被另一个任务持有，当前线程会完全阻塞，Tokio 无法在此线程上调度其他任务。
//
//   【对比 NestJS】
//   NestJS + Node.js 是单线程事件循环，不存在阻塞锁问题（但存在阻塞 I/O 问题）。
//
//   【对比 Go】
//   Go 的 goroutine 是抢占式调度，阻塞锁不会影响其他 goroutine。
//   Rust 的 Tokio 是协作式调度，阻塞锁会饿死其他任务。
//
//   【对比 Electron】
//   Node.js 主线程中，所有 JS 代码同步执行，没有并发锁问题。
//
// 如何修复：
//   在 async 上下文中使用 tokio::sync::Mutex（异步锁，.lock().await）

use std::sync::Mutex; // ❌ 阻塞锁！

// ❌ 错误代码
// 场景：两个 async Command 并发调用，一个持有锁后 await，
// 另一个在 .lock() 处阻塞整个 Tokio 线程
//
// #[tauri::command]
// async fn bad_write_data(key: String, value: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
//     let mut data = state.data.lock().unwrap(); // ❌ 阻塞锁！
//
//     // 模拟耗时操作
//     tokio::time::sleep(std::time::Duration::from_secs(2)).await;
//
//     data.insert(key, value);
//     Ok(())
// }
//
// #[tauri::command]
// async fn bad_read_data(key: String, state: tauri::State<'_, AppState>) -> Result<Option<String>, String> {
//     // 如果 bad_write_data 持有锁且在 await，这里会阻塞 Tokio 线程！
//     let data = state.data.lock().unwrap(); // ❌ 阻塞锁！
//     Ok(data.get(&key).cloned())
// }


// ─── 修复后的代码 ───
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex as AsyncMutex; // ✅ 异步锁

pub struct AppStateFixed {
    // ✅ tokio::sync::Mutex 的 .lock().await 不会阻塞线程
    pub data: Arc<AsyncMutex<HashMap<String, String>>>,
}

// #[tauri::command]
// async fn fixed_write_data(
//     key: String, value: String,
//     state: tauri::State<'_, AppStateFixed>
// ) -> Result<(), String> {
//     let mut data = state.data.lock().await; // ✅ 异步锁，.await 让出执行权
//
//     tokio::time::sleep(std::time::Duration::from_secs(2)).await;
//
//     data.insert(key, value);
//     Ok(())
// }
//
// #[tauri::command]
// async fn fixed_read_data(
//     key: String,
//     state: tauri::State<'_, AppStateFixed>
// ) -> Result<Option<String>, String> {
//     let data = state.data.lock().await; // ✅ 异步锁，不阻塞线程
//     Ok(data.get(&key).cloned())
// }


// ─── 核心原则 ───
// 1. async fn 中永远不要使用 std::sync::Mutex
// 2. 短时间的临界区（微秒级）可以用 std::sync::Mutex（但也不推荐）
// 3. 生产环境推荐 tokio::sync::Mutex 或 tokio::sync::RwLock
// 4. 只读数据优先使用 Arc<...> 直接共享，无需锁
