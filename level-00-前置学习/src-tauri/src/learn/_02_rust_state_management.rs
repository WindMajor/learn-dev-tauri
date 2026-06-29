// ============================================================================
// 02_rust_state_management.rs —— 后端状态管理
// ============================================================================
//
// 【对应前端章节】11_state_and_events.ts
//
// 【学习目标】
//   1. 使用 std::sync::Mutex 或 tokio::sync::Mutex 管理共享状态
//   2. 通过 Builder::manage() 注入全局状态
//   3. 在命令中通过 State<'_, T> 提取和操作状态
//   4. 理解并发安全的注意事项
//
// 【关键概念】
//   - Tauri 是多线程环境，所有共享状态必须线程安全（Send + Sync）
//   - std::sync::Mutex 适合同步命令
//   - tokio::sync::Mutex 适合异步命令（.await 跨临界区）

use serde::{Deserialize, Serialize};
use std::sync::Mutex;

// ============================================================================
// 示例 1：定义全局状态结构体
// ============================================================================

// 应用配置状态（在整个应用生命周期中共享）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub theme: String,        // "light" | "dark"
    pub language: String,     // "zh-CN" | "en"
    pub auto_save: bool,
    pub max_history: u32,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            theme: "light".to_string(),
            language: "zh-CN".to_string(),
            auto_save: true,
            max_history: 50,
        }
    }
}

// 应用统计信息（运行时动态更新）
#[derive(Debug, Clone, Serialize)]
pub struct AppStats {
    pub total_operations: u64,
    pub active_sessions: u32,
    pub started_at: String,
}

impl Default for AppStats {
    fn default() -> Self {
        Self {
            total_operations: 0,
            active_sessions: 1,
            started_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

// ============================================================================
// 示例 2：注入状态到 Tauri 应用
// ============================================================================

// 在 lib.rs 的 run() 函数中注入状态：
//
// ```rust
// pub fn run() {
//     tauri::Builder::default()
//         .manage(Mutex::new(AppConfig::default())) // ★ 注入 AppConfig
//         .manage(Mutex::new(AppStats::default()))  // ★ 注入 AppStats
//         .manage(Mutex::new(0i32))                 // ★ 注入简单计数器
//         .invoke_handler(tauri::generate_handler![...])
//         .run(tauri::generate_context!())
//         .expect("error");
// }
// ```
//
// **重点**：
// - .manage() 可以多次调用，每次注入一个状态对象
// - 状态对象用 Mutex 包装以确保线程安全
// - 可以注入任何 Send + Sync 的类型

// ============================================================================
// 示例 3：读取状态 —— State<'_, Mutex<T>>
// ============================================================================

// 获取当前应用配置（只读）
//
// 前端调用：
// ```typescript
// const config = await invoke("get_config");
// // config: { theme: "light", language: "zh-CN", auto_save: true, max_history: 50 }
// ```
#[tauri::command]
pub fn get_config(
    config: tauri::State<'_, Mutex<AppConfig>>
) -> Result<AppConfig, String> {
    // lock() 获取读锁，返回 MutexGuard
    // 需要 clone 数据返回（序列化时释放锁）
    let cfg = config.lock().map_err(|e| format!("获取配置锁失败: {}", e))?;
    Ok(cfg.clone())
}

// 获取应用统计
#[tauri::command]
pub fn get_stats(
    stats: tauri::State<'_, Mutex<AppStats>>
) -> Result<AppStats, String> {
    let s = stats.lock().map_err(|e| e.to_string())?;
    Ok(s.clone())
}

// ============================================================================
// 示例 4：修改状态 —— 更新配置和计数
// ============================================================================

// 更新应用配置
//
// 前端调用：
// ```typescript
// await invoke("update_config", {
//     config: { theme: "dark", language: "en", auto_save: false, max_history: 100 }
// });
// ```
#[tauri::command]
pub fn update_config(
    config_state: tauri::State<'_, Mutex<AppConfig>>,
    new_config: AppConfig,
) -> Result<(), String> {
    let mut cfg = config_state.lock().map_err(|e| e.to_string())?;
    // 直接替换整个配置
    *cfg = new_config;
    // MutexGuard 在离开作用域时自动释放
    Ok(())
}

// 部分更新配置（只改主题）
#[tauri::command]
pub fn set_theme(
    config_state: tauri::State<'_, Mutex<AppConfig>>,
    theme: String,
) -> Result<(), String> {
    let mut cfg = config_state.lock().map_err(|e| e.to_string())?;

    // 验证主题值
    match theme.as_str() {
        "light" | "dark" => {
            cfg.theme = theme;
            Ok(())
        }
        _ => Err(format!("不支持的主题: {}", theme)),
    }
}

// 增加操作计数器
#[tauri::command]
pub fn increment_counter(
    counter: tauri::State<'_, Mutex<i32>>,
) -> i32 {
    let mut count = counter.lock().unwrap();
    *count += 1;
    *count
}

// ============================================================================
// 示例 5：在 setup 钩子中初始化状态
// ============================================================================

// 使用 setup 钩子初始化复杂的应用状态
//
// 在 lib.rs 中：
// ```rust
// .setup(|app| {
//     // 从文件加载配置
//     let config = load_config_from_file().unwrap_or_default();
//     let state = app.state::<Mutex<AppConfig>>();
//     let mut cfg = state.lock().unwrap();
//     *cfg = config;
//     Ok(())
// })
// ```

// ============================================================================
// 示例 6：tokio::sync::Mutex 用于异步命令
// ============================================================================

// 当状态需要在 async 命令中跨越 .await 时，使用 tokio::sync::Mutex
//
// 注意：std::sync::Mutex 不能在 async 代码中跨 .await 持有锁！
// 如果需要异步场景，请使用 tokio::sync::Mutex

// 使用 tokio Mutex 的状态示例：
// use tokio::sync::Mutex as AsyncMutex;
//
// #[tauri::command]
// async fn async_update_config(
//     config: tauri::State<'_, AsyncMutex<AppConfig>>,
//     new_theme: String,
// ) -> Result<(), String> {
//     // tokio Mutex 的 lock 返回 Future，需要 .await
//     let mut cfg = config.lock().await;
//     cfg.theme = new_theme;
//     // 可以在这里 .await 其他操作
//     Ok(())
// }

// ============================================================================
// 示例 7：状态与事件结合 —— 修改后通知所有窗口
// ============================================================================

use tauri::{AppHandle, Emitter};

// 更新配置并通过事件通知所有窗口
//
// 这是推荐模式：先更新状态，再 emit 事件让前端刷新 UI
#[tauri::command]
pub fn update_config_and_notify(
    app: AppHandle,
    config_state: tauri::State<'_, Mutex<AppConfig>>,
    new_config: AppConfig,
) -> Result<(), String> {
    // 1. 更新状态
    {
        let mut cfg = config_state.lock().map_err(|e| e.to_string())?;
        *cfg = new_config.clone();
    } // ← 这里提前释放锁（重要！避免死锁）

    // 2. 通知所有窗口（emit 是全局广播）
    app.emit("config:updated", &new_config)
        .map_err(|e| format!("发送事件失败: {}", e))?;

    Ok(())
}

// ============================================================================
// 示例 8：并发安全注意事项
// ============================================================================

// ┌─────────────────────────────────────────────────────────────┐
// │                      并发安全三原则                           │
// ├─────────────────────────────────────────────────────────────┤
// │                                                             │
// │  1. 锁的持有时间尽量短 → 拿到数据就 clone，立即释放锁        │
// │                                                             │
// │  2. 避免嵌套锁 → fn A 获取锁 1，fn B 获取锁 2               │
// │     如果 A 调用 B，且 B 尝试获取锁 1 → 死锁！               │
// │     解决：统一锁的获取顺序                                   │
// │                                                             │
// │  3. 不在持有 std::sync::Mutex 锁期间调用 .await             │
// │     std::sync::Mutex 的 MutexGuard 不是 Send，              │
// │     跨 .await 会导致编译错误或运行时 panic                  │
// │     解决：用 tokio::sync::Mutex（异步锁）                    │
// │                                                             │
// │  4. 死锁预防：lock() 和 try_lock()                          │
// │     try_lock() 不阻塞，可以设置超时重试                      │
// │                                                             │
// └─────────────────────────────────────────────────────────────┘

// ============================================================================
// 【本章小结】
// ============================================================================
//
// 1. Tauri 状态管理核心：
//    - .manage() 注入全局状态（Builder 方法）
//    - State<'_, Mutex<T>> 提取状态（命令参数）
//    - Mutex 确保线程安全（Tauri 是多线程的）
//
// 2. Mutex 选择：
//    - std::sync::Mutex → 同步命令（简单、快速）
//    - tokio::sync::Mutex → 异步命令（需要跨 .await 持有锁）
//
// 3. 最佳实践：
//    - 锁的持有时间要短（尽快 clone 后释放锁）
//    - 状态变更后通过事件通知前端
//    - 避免嵌套锁（防止死锁）
//    - 考虑用 AtomicXXX 替代 Mutex<i32/u64/bool>
//
// 4. 在 lib.rs 中注册命令：
//    .manage(Mutex::new(AppConfig::default()))
//    .manage(Mutex::new(AppStats::default()))
//    .invoke_handler(tauri::generate_handler![
//        get_config, get_stats,
//        update_config, set_theme,
//        increment_counter,
//        update_config_and_notify
//    ])
