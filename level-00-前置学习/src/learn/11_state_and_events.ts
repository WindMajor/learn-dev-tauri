/**
 * ============================================================================
 * 11_state_and_events.ts —— 状态管理与事件系统
 * ============================================================================
 *
 * 【学习目标】
 *   1. 理解 Tauri 后端全局状态（State）的注入与使用
 *   2. 掌握前端通过 invoke 获取/修改后端状态
 *   3. 深入理解事件系统的三种模式（全局、窗口级、负载类型）
 *   4. 比较 Tauri State 与前端状态管理（Vuex/Pinia/Redux）的协作关系
 *
 * 【与纯 Web 开发的核心差异】
 *   - 纯 Web：状态管理完全在前端（Vuex/Pinia/Redux + localStorage）
 *   - Tauri：状态可以存在 Rust 后端，跨窗口共享且更安全
 *   - 纯 Web：事件系统是前端框架内部的
 *   - Tauri：事件系统是应用级的，可以连接前端和后端
 *   - Tauri State 存在于 Rust 内存中，访问速度快，可跨窗口
 */

import { invoke } from "@tauri-apps/api/core";
import { emit, listen, once, Event } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

// ============================================================================
// 示例 1：通过 invoke 获取后端全局状态
// ============================================================================
// 场景：多个窗口需要共享同一份配置数据，存在 Rust 后端
// Tauri V2 特性：State 通过 .manage() 注入，命令通过 State<'_, T> 访问

async function example1_getState() {
  // ====== 获取应用配置状态 ======
  try {
    const appConfig = await invoke<{
      theme: string;
      language: string;
      autoSave: boolean;
      version: string;
    }>("get_app_config");

    console.log("当前应用配置:", appConfig);
    console.log(`主题: ${appConfig.theme}`);
    console.log(`语言: ${appConfig.language}`);
    console.log(`自动保存: ${appConfig.autoSave}`);
  } catch (error) {
    console.error("获取状态失败:", error);
  }

  // ====== 获取统计数据 ======
  try {
    const stats = await invoke<{
      totalFiles: number;
      activeWindows: number;
      uptimeSeconds: number;
    }>("get_app_stats");

    console.log("应用统计:", stats);
    console.log(`已运行: ${(stats.uptimeSeconds / 3600).toFixed(2)} 小时`);
  } catch (error) {
    console.error("获取统计失败:", error);
  }
}

/**
 * // ====== 对应的 Rust 后端代码 ======
 *
 * use std::sync::Mutex;
 * use serde::Serialize;
 *
 * #[derive(Default, Serialize, Clone)]
 * struct AppConfig {
 *     theme: String,
 *     language: String,
 *     auto_save: bool,
 *     version: String,
 * }
 *
 * #[derive(Default, Serialize)]
 * struct AppStats {
 *     total_files: u32,
 *     active_windows: u32,
 *     uptime_seconds: u64,
 * }
 *
 * #[tauri::command]
 * fn get_app_config(config: tauri::State<'_, Mutex<AppConfig>>) -> AppConfig {
 *     let cfg = config.lock().unwrap();  // 读锁
 *     cfg.clone()
 * }
 *
 * #[tauri::command]
 * fn get_app_stats(stats: tauri::State<'_, Mutex<AppStats>>) -> AppStats {
 *     // 返回状态的快照
 *     let s = stats.lock().unwrap();
 *     AppStats { total_files: s.total_files, ..*s }
 * }
 *
 * // 在 run() 中注入状态：
 * pub fn run() {
 *     tauri::Builder::default()
 *         .manage(Mutex::new(AppConfig {
 *             theme: "light".into(),
 *             language: "zh-CN".into(),
 *             auto_save: true,
 *             version: "1.0.0".into(),
 *         }))
 *         .manage(Mutex::new(AppStats::default()))
 *         .invoke_handler(tauri::generate_handler![
 *             get_app_config,
 *             get_app_stats
 *         ])
 *         .run(tauri::generate_context!())
 *         .expect("error");
 * }
 */

// ============================================================================
// 示例 2：通过 invoke 修改后端全局状态
// ============================================================================
// 场景：用户修改设置后，更新后端全局状态并通知所有窗口
// Tauri V2 特性：Rust State 可以在多个窗口间实时共享

async function example2_updateState() {
  // ====== 更新配置 ======
  try {
    await invoke("update_app_config", {
      config: {
        theme: "dark",
        language: "en",
        autoSave: false,
      },
    });
    console.log("配置已更新为深色主题");

    // 此时所有窗口都可以通过 get_app_config 看到更新后的配置
  } catch (error) {
    console.error("更新配置失败:", error);
  }

  // ====== 更新计数器 ======
  try {
    const newCount = await invoke<number>("increment_counter", {
      delta: 5,
    });
    console.log("计数器新值:", newCount);
  } catch (error) {
    console.error("更新计数器失败:", error);
  }
}

/**
 * // ====== 对应的 Rust 后端代码 ======
 *
 * #[tauri::command]
 * fn update_app_config(
 *     config: tauri::State<'_, Mutex<AppConfig>>,
 *     new_config: AppConfig,
 * ) -> Result<(), String> {
 *     let mut cfg = config.lock().map_err(|e| e.to_string())?;
 *     *cfg = new_config;
 *     Ok(())
 * }
 *
 * #[tauri::command]
 * fn increment_counter(
 *     counter: tauri::State<'_, Mutex<i32>>,
 *     delta: i32,
 * ) -> i32 {
 *     let mut count = counter.lock().unwrap();
 *     *count += delta;
 *     *count  // 返回新值
 * }
 */

// ============================================================================
// 示例 3：事件系统的三种模式
// ============================================================================
// 场景：理解全局事件、窗口事件、带负载事件的差异

async function example3_eventModes() {
  // ====== 模式 1：全局事件（应用级，所有窗口都能收到） ======
  // 适用于：跨窗口通知、系统级状态变更
  const unlistenGlobal = await listen<{ message: string }>(
    "app:global-notification",
    (event) => {
      console.log("[全局事件]", event.payload.message);
    }
  );

  // ====== 模式 2：窗口级事件（仅当前窗口） ======
  // 适用于：窗口内部组件间通信
  const currentWindow = getCurrentWebviewWindow();
  const unlistenWindow = await currentWindow.listen<{ data: string }>(
    "window:internal-update",
    (event) => {
      console.log("[窗口事件]", event.payload.data);
    }
  );

  // ====== 模式 3：带命名空间的事件 ======
  // 推荐使用命名空间前缀组织事件
  // "user:login-success" "user:logout"
  // "file:saved" "file:deleted" "file:modified"
  // "network:online" "network:offline"
  // "task:progress" "task:completed" "task:failed"

  // ====== once：只监听一次 ======
  // 适用于：等待一次性通知（如初始化完成）
  await once<{ ready: boolean }>("app:initialized", (event) => {
    console.log("应用初始化完成:", event.payload.ready);
    // 可以开始加载数据、显示 UI 等
  });

  console.log("事件监听器已设置");

  // ====== 发送事件 ======
  // 全局发送（所有窗口收到）
  await emit("app:global-notification", {
    message: "全局通知：系统即将维护",
  });

  // 窗口级发送（仅当前窗口）
  await currentWindow.emit("window:internal-update", {
    data: "窗口内部数据更新",
  });

  console.log("事件已发送");
}

// ============================================================================
// 示例 4：带负载数据的事件 —— 传递结构化信息
// ============================================================================
// 场景：任务进度事件携带详细信息（百分比、状态、消息）

interface TaskProgress {
  taskId: string;
  progress: number; // 0-100
  status: "running" | "paused" | "completed" | "failed";
  message?: string;
  timestamp: number;
}

async function example4_eventWithPayload() {
  // ====== 监听任务进度事件 ======
  const unlisten = await listen<TaskProgress>("task:progress", (event) => {
    const { taskId, progress, status, message, timestamp } = event.payload;

    // 更新进度条
    console.log(`[${taskId}] ${progress}% - ${status}`);

    if (status === "completed") {
      console.log(`✅ 任务完成: ${message}`);
    } else if (status === "failed") {
      console.error(`❌ 任务失败: ${message}`);
    }

    // event.payload 的类型是 TaskProgress（TypeScript 泛型约束）
  });

  // ====== 启动任务（通过 invoke） ======
  // await invoke("start_export_task", { taskId: "export-001" });

  console.log("任务进度监听已设置");
}

// ============================================================================
// 示例 5：Rust 端主动推送事件
// ============================================================================
// 场景：Rust 后端检测到文件变化，主动通知所有窗口刷新
// Tauri V2 特性：app.emit() 从 Rust 端广播事件

/**
 * // ====== Rust 后端代码：文件变化检测并发送事件 ======
 *
 * use tauri::{AppHandle, Emitter, Manager};
 * use std::sync::Mutex;
 *
 * struct FileWatcher {
 *     watching: Vec<String>,
 * }
 *
 * #[tauri::command]
 * fn start_file_watching(app: AppHandle, paths: Vec<String>) {
 *     // 在后台线程中定期检查文件变化
 *     std::thread::spawn(move || {
 *         loop {
 *             std::thread::sleep(std::time::Duration::from_secs(5));
 *             
 *             // 检测文件变化...
 *             // 如果发现变化，emit 事件
 *             let _ = app.emit("file:changed", serde_json::json!({
 *                 "path": "/data/config.json",
 *                 "timestamp": chrono::Utc::now().timestamp(),
 *                 "changeType": "modified"
 *             }));
 *         }
 *     });
 * }
 *
 * // 前端监听：
 * // listen("file:changed", (event) => {
 * //     console.log("检测到文件变化:", event.payload);
 * //     // 刷新 UI
 * // });
 */

// ============================================================================
// 示例 6：事件生命周管理 —— 防止内存泄漏
// ============================================================================
// 场景：组件卸载时必须取消事件监听，避免内存泄漏

console.log("=== 示例 6：事件生命周期管理 ===");
console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║           事件监听生命周期管理                        ║
  ╠══════════════════════════════════════════════════════╣
  ║                                                    ║
  ║  Vue 3 组件中的最佳实践：                            ║
  ║                                                    ║
  ║  <script setup lang="ts">                           ║
  ║  import { onMounted, onUnmounted } from "vue";      ║
  ║  import { listen } from "@tauri-apps/api/event";    ║
  ║                                                    ║
  ║  // 存储取消监听的函数                              ║
  ║  const unlisteners: (() => void)[] = [];            ║
  ║                                                    ║
  ║  onMounted(async () => {                            ║
  ║    // 注册监听并保存 unlisten 函数                  ║
  ║    const unlisten1 = await listen("event-a", cb);   ║
  ║    const unlisten2 = await listen("event-b", cb);   ║
  ║    unlisteners.push(unlisten1, unlisten2);          ║
  ║  });                                                ║
  ║                                                    ║
  ║  onUnmounted(() => {                                ║
  ║    // 组件卸载时清理所有监听                        ║
  ║    unlisteners.forEach(fn => fn());                 ║
  ║  });                                                ║
  ║  </script>                                          ║
  ║                                                    ║
  ║  React 中的最佳实践：                                ║
  ║  useEffect(() => {                                  ║
  ║    const unlisteners: (() => void)[] = [];          ║
  ║    let cancelled = false;                           ║
  ║                                                      ║
  ║    listen("event-a", (e) => {                       ║
  ║      if (!cancelled) handleEvent(e);                ║
  ║    }).then(unlisten => unlisteners.push(unlisten)); ║
  ║                                                      ║
  ║    return () => {                                   ║
  ║      cancelled = true;                              ║
  ║      unlisteners.forEach(fn => fn());               ║
  ║    };                                               ║
  ║  }, []);                                            ║
  ║                                                    ║
  ╚══════════════════════════════════════════════════════╝
`);

// ============================================================================
// 示例 7：Tauri State 与前端状态管理的协作
// ============================================================================
// 场景：理解哪种状态放 Rust 后端、哪种放前端 Pinia/Vuex

console.log("=== 示例 7：状态管理分层策略 ===");
console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║        Tauri State vs 前端状态管理 分层策略            ║
  ╠══════════════════════════════════════════════════════╣
  ║                                                    ║
  ║  Rust State 适合存放：                               ║
  ║  ✅ 跨窗口共享的数据（全局配置、用户信息）           ║
  ║  ✅ 安全敏感数据（加密密钥、Token）                  ║
  ║  ✅ 系统级状态（网络状态、进程管理）                 ║
  ║  ✅ 需要持久化的核心数据（配合文件存储）             ║
  ║  ✅ 数据库连接池、文件句柄等资源                    ║
  ║                                                    ║
  ║  前端 Pinia/Vuex/Redux 适合存放：                    ║
  ║  ✅ 临时 UI 状态（loading、error、selected）        ║
  ║  ✅ 表单草稿数据                                    ║
  ║  ✅ 路由状态                                        ║
  ║  ✅ 页面级缓存（Rust State 的快照）                  ║
  ║  ✅ 动画状态、模态框开关                            ║
  ║                                                    ║
  ║  协作模式（推荐）：                                  ║
  ║                                                    ║
  ║  用户操作 → 前端 Store 乐观更新                      ║
  ║           → invoke 更新 Rust State                  ║
  ║           → Rust emit 确认事件                      ║
  ║           → 前端 Store 确认/回滚                     ║
  ║                                                    ║
  ║  事件总线（事件驱动同步）：                          ║
  ║                                                    ║
  ║  Rust State 变化                                     ║
  ║    → emit("state:changed", newState)                ║
  ║    → 所有窗口的 Pinia Store 订阅此事件               ║
  ║    → 更新前端缓存                                    ║
  ║                                                    ║
  ╚══════════════════════════════════════════════════════╝
`);

// ============================================================================
// 【常见错误示例】
// ============================================================================

console.log("=== 常见错误示例 ===");

console.log(`
  ❌ 错误 1：忘记 unlisten 导致内存泄漏
  async function setup() {
      listen("my-event", callback);  // 忘记保存 unlisten
  }
  // 组件多次挂载卸载后，会积累多个重复的监听器
  
  原因：每次 listen 都会注册新监听器，不取消就会堆积
  修复：保存 unlisten 函数，在组件卸载时调用

  ❌ 错误 2：在 Rust State 中使用非线程安全类型
  // Rust 端：
  // struct MyState {
  //     data: RefCell<String>,  // ← RefCell 不是 Send + Sync！
  // }
  
  原因：Tauri 是多线程环境，State 必须实现 Send + Sync
  修复：使用 Mutex（std::sync::Mutex 或 tokio::sync::Mutex）

  ❌ 错误 3：在事件回调中做耗时操作
  listen("event", async (event) => {
      await heavyComputation();  // 阻塞事件处理
  });
  
  原因：事件回调在事件循环中执行，阻塞会导致事件积压
  修复：将耗时操作放入队列或新异步任务中处理
`);

// ============================================================================
// 【本章小结】
// ============================================================================
/**
 * 1. Tauri State（后端全局状态）：
 *    - 通过 Builder::manage() 注入 Rust 对象
 *    - 命令中通过 State<'_, T> 参数访问
 *    - 必须使用 Mutex 包装（线程安全要求）
 *    - 适合跨窗口共享、安全敏感、系统级数据
 *
 * 2. 事件系统三种模式：
 *    - 全局事件（emit/listen）：整个应用范围广播
 *    - 窗口事件（window.emit/listen）：仅当前窗口
 *    - once：一次性监听，收到后自动取消
 *
 * 3. 状态管理分层策略：
 *    - Rust State → 跨窗口共享、持久化、安全数据
 *    - 前端 Store (Pinia/Vuex) → UI 状态、表单草稿、缓存
 *    - 事件总线 → 双向同步，Rust State 变化通知前端
 *
 * 4. 关键注意事项：
 *    - 始终在组件卸载时调用 unlisten()
 *    - Rust State 必须用 Mutex 包装
 *    - 事件命名使用命名空间前缀（如 "file:"、"user:"）
 *    - 避免在事件回调中做耗时操作
 */
