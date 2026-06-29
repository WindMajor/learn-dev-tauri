// src-tauri/src/state.rs
// WHAT：Tauri v2 的全局应用状态（AppState）
// WHY：State 是 Tauri 的依赖注入机制，类似 NestJS 的 Provider 但更底层
//
// CONTRAST：
//   NestJS Provider：
//     - @Injectable() 装饰器 + Module providers 注册
//     - 通过 constructor(@Inject()) 注入
//     - 作用域灵活：Singleton / Request / Transient
//     - NestJS 的 IoC 容器自动管理生命周期
//
//   Tauri State：
//     - 普通 Rust 结构体 + tauri::Builder::manage() 注册
//     - 通过 Command 参数 tauri::State<'_, T> 注入
//     - 固定 Singleton 作用域（应用级全局共享）
//     - 必须 Send + Sync（多线程安全）
//     - 生命周期由 Tauri Core 管理（应用启动创建、退出销毁）
//
//   Electron：
//     - 无内置 State 管理 —— 全局变量或 require() 返回单例
//     - 无生命周期管理 —— 开发者需手动处理
//     - 无并发约束 —— Node.js 单线程但 Event Emitter 异步
//
//   Swift (AppKit)：
//     - @StateObject / @EnvironmentObject（SwiftUI）
//     - 编译器管理生命周期（视图树绑定）
//     - 平台独占
//
// WARNING：
//   - State 中的字段如果需要在多线程中修改，必须使用 Mutex/RwLock/Atomic
//   - State 不能是裸指针、FFI 引用、或包含非 Send 类型
//   - 多窗口共享同一个 State 实例

use std::sync::{Arc, Mutex, atomic::AtomicU64};

/// 应用级全局状态
///
/// 【对比 NestJS】相当于 NestJS 的 @Injectable() + scope: Scope.DEFAULT（单例）
pub struct AppState {
    /// 应用配置（JSON 格式，需要 Mutex 保护写操作）
    /// 【WARNING】Mutex 是 std::sync::Mutex（阻塞锁），在 async 上下文中可能导致死锁
    /// 生产环境推荐使用 tokio::sync::Mutex（异步锁）
    pub config: Arc<Mutex<serde_json::Value>>,

    /// 访问计数器（原子操作，无需 Mutex）
    /// 【对比 Electron】Electron 中需要用 Atomics + SharedArrayBuffer
    pub visit_count: Arc<AtomicU64>,
}

impl AppState {
    /// 创建默认应用状态
    pub fn new() -> Self {
        Self {
            config: Arc::new(Mutex::new(serde_json::json!({
                "app_name": "Level 02 - IPC Command & State",
                "version": "0.1.0",
                "language": "zh-CN",
                "theme": "dark",
                "max_connections": 100
            }))),
            visit_count: Arc::new(AtomicU64::new(0)),
        }
    }
}

// ─── 单元测试 ───
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_state_creation() {
        let state = AppState::new();
        let config = state.config.lock().unwrap();
        assert_eq!(config["app_name"], "Level 02 - IPC Command & State");
    }

    #[test]
    fn test_visit_count() {
        let state = AppState::new();
        let initial = state.visit_count.load(std::sync::atomic::Ordering::SeqCst);
        assert_eq!(initial, 0);

        let new_count = state.visit_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;
        assert_eq!(new_count, 1);
    }
}
