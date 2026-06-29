// bug_01_state非Send导致编译失败.rs
// WHAT：Rust State 中存储了非 Send 类型，导致 Tauri 编译失败
// 这是什么错误：编译期类型错误，Tauri Core 要求 State<T> 中的 T 必须实现 Send + Sync
// 编译/运行后报什么错：
//
//   error[E0277]: `std::rc::Rc<...>` cannot be sent between threads safely
//     --> src/state.rs:15:5
//      |
//   15 |     .manage(buggy_state)
//      |      ^^^^^^ `std::rc::Rc<...>` cannot be sent between threads safely
//      |
//      = help: the trait `Send` is not implemented for `std::rc::Rc<...>`
//      = note: required for `AppStateBug` to implement `Send`
//   note: required by a bound in `tauri::Builder::<A, M>::manage`
//      | pub fn manage<T: Send + Sync + 'static>(self, state: T) -> ...
//      |                      ^^^^^^^^  required by this bound
//
// 为什么会这样：
//   Tauri v2 内部使用 Tokio 异步运行时（多线程），State<T> 可能在多个线程间共享。
//   std::rc::Rc 的引用计数不是原子操作，无法安全跨线程传递。
//   必须使用 std::sync::Arc（原子引用计数）替代 Rc。
//
// 【对比 Electron】
//   Electron 的 main process 是 Node.js 单线程（主线程），无此约束。
//   但 Worker 线程中使用 SharedArrayBuffer 也有限制。
//
// 【对比 Swift】
//   Swift 的 Actor 模型（Swift 5.5+）通过编译期隔离保证线程安全，
//   类似 Rust 的 Send/Sync 但实现机制不同。
//
// 【对比 egui】
//   egui 是单线程即时模式，通常不使用多线程共享状态。
//
// 如何修复：
//   将 Rc<T> 替换为 Arc<T>：
//      use std::sync::Arc;
//      struct AppState { data: Arc<Vec<String>> }
//
// 修复后的正确代码见下方：

// ============ 错误代码 ============
use std::rc::Rc; // ❌ 非 Send！
use std::sync::Mutex;

pub struct AppStateBug {
    // ❌ Rc 不是 Send：无法在多线程间安全共享
    pub data: Mutex<Rc<Vec<String>>>,
    // ❌ std::cell::RefCell 不是 Sync：内部可变性不安全
    // pub cache: std::cell::RefCell<HashMap<String, String>>,
}

// ============ 修复后的代码 ============
// use std::sync::Arc;
//
// pub struct AppStateFixed {
//     // ✅ Arc 是 Send + Sync：原子引用计数
//     pub data: Mutex<Arc<Vec<String>>>,
//     // ✅ Mutex 提供内部可变性，且是 Send + Sync
// }
