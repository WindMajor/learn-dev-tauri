/**
 * ============================================================================
 * 02_frontend_backend_communication.ts —— 前后端通信核心
 * ============================================================================
 *
 * 【学习目标】
 *   1. 掌握 invoke<T>() 调用 Rust 命令的核心方法
 *   2. 理解 emit/listen 事件系统的双向通信机制
 *   3. 学习 Channel 用于大数据流传输
 *   4. 对比 Tauri 通信与 HTTP API、WebSocket 的差异
 *
 * 【与纯 Web 开发的核心差异】
 *   - 纯 Web：前后端通过 HTTP/WebSocket 跨网络通信
 *   - Tauri：前后端运行在同一进程中，通过 IPC（进程间通信）通信（严格来说是跨语言边界的通信）
 *   - invoke 是"函数调用"而非"网络请求"，零延迟、无序列化开销差异
 *   - 参数和返回值自动序列化/反序列化（通过 serde + JSON）
 *   - 不存在 CORS 问题，不需要 API 路由定义
 */

import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { Channel } from '@tauri-apps/api/core';

// ============================================================================
// 示例 1：基础 invoke 调用 —— 最简单的"前后端 Hello World"
// ============================================================================
// 场景：前端传递一个用户名，Rust 后端返回问候语
// Tauri V2 特性：invoke 函数签名 invoke<T>(cmd: string, args?: InvokeArgs): Promise<T>

async function example1_basicInvoke() {
  // 泛型 T 指定返回值类型，这里 Rust 返回 String，TS 侧也是 string
  const greeting = await invoke<string>('greet', {
    name: 'Tauri Learner',
  });
  console.log('Rust 返回的问候语:', greeting);
  // 输出: "Hello, Tauri Learner! You've been greeted from Rust!"

  // 也可以不指定泛型，让 TS 推断为 unknown
  const result = await invoke('greet', { name: 'World' });
  // result 的类型是 unknown，需要类型断言
  console.log((result as string).toUpperCase());
}

/**
 * // ======== 对应的 Rust 后端代码（放在 src-tauri/src/lib.rs 中） ========
 *
 * #[tauri::command]
 * fn greet(name: &str) -> String {
 *     format!("Hello, {}! You've been greeted from Rust!", name)
 * }
 *
 * // 在 run() 中注册：
 * .invoke_handler(tauri::generate_handler![greet])
 */

// ============================================================================
// 示例 2：invoke 的错误处理 —— Rust 返回 Err 时前端如何捕获
// ============================================================================
// 场景：调用可能失败的命令（如文件读写），处理 Rust 端返回的错误
// Tauri V2 特性：Rust 的 Result::Err 会被序列化为 JS Error

async function example2_errorHandling() {
  // ====== 场景 A：Rust 返回 Result<T, String> ======
  try {
    const data = await invoke<string>('read_config_file', {
      path: '/invalid/path.json',
    });
    console.log('读取成功:', data);
  } catch (error) {
    // Rust 的 Err("message") 会被 Tauri 转换为 JS Error 对象
    console.error('命令执行失败:', error);
    // error 的 message 属性包含 Rust 的 Err 字符串
    if (typeof error === 'string') {
      console.error('错误信息:', error);
    } else if (error instanceof Error) {
      console.error('错误详情:', error.message);
    }
  }

  // ====== 场景 B：Rust panic 的情况 ======
  try {
    // Rust panic 会导致前端收到一个特殊错误
    await invoke('broken_command');
  } catch (error) {
    // Tauri V2 会捕获 Rust panic 并返回错误信息
    console.error('命令异常（可能是 Rust panic）:', error);
  }

  // ====== 场景 C：网络异常处理（开发模式端口未启动） ======
  try {
    await invoke('greet', { name: 'test' });
  } catch (error) {
    // 如果 Tauri 应用未启动（在纯浏览器环境运行），会抛出错误
    console.warn('可能未在 Tauri 环境中运行:', error);
  }
}

/**
 * // ======== 对应的 Rust 后端代码 ========
 *
 * #[tauri::command]
 * fn read_config_file(path: String) -> Result<String, String> {
 *     std::fs::read_to_string(&path)
 *         .map_err(|e| format!("无法读取文件 {}: {}", path, e))
 * }
 *
 * #[tauri::command]
 * fn broken_command() -> Result<String, String> {
 *     // 模拟 panic（实际开发中不要这样写！）
 *     panic!("这是一个故意的 panic");
 * }
 */

// ============================================================================
// 示例 3：emit/listen 事件系统 —— 从 Rust 主动推送数据到前端
// ============================================================================
// 场景：Rust 后端有实时数据更新（如文件监控、计时器），主动推送给前端
// Tauri V2 特性：事件是异步广播，支持多窗口监听同一事件

async function example3_eventSystem() {
  // ====== 步骤 1：前端监听事件 ======
  // listen 返回一个 Promise，resolve 后获得 unlisten 函数
  const unlisten = await listen<string>('backend-status', (event) => {
    // event.payload 是 Rust 发送的数据（已自动反序列化）
    console.log('收到后端事件:', event.payload);
    console.log('事件ID:', event.id); // 全局唯一事件 ID
  });

  // ====== 步骤 2：前端触发事件（前端也可以 emit） ======
  // 前端 emit 可以通知 Rust 或其他窗口
  await emit('frontend-action', {
    type: 'user-clicked',
    timestamp: Date.now(),
  });
  console.log('前端事件已发出');

  // ====== 步骤 3：取消监听（防止内存泄漏） ======
  // 在组件卸载时调用
  // unlisten();  // 取消监听

  // ====== 全局事件 vs 窗口级事件 ======
  // Tauri V2 中事件默认是应用全局的
  // 如果只需要窗口内通信，可以使用 window.emit / window.listen
}

/**
 * // ======== 对应的 Rust 后端代码 ========
 *
 * use tauri::Emitter;  // V2 新引入的 trait
 *
 * #[tauri::command]
 * fn start_background_task(app: tauri::AppHandle) {
 *     // 在后台线程中持续 emit 事件
 *     std::thread::spawn(move || {
 *         for i in 1..=10 {
 *             std::thread::sleep(std::time::Duration::from_secs(1));
 *             // V2 中 emit 被移到了 Emitter trait
 *             app.emit("backend-status", format!("进度: {}/10", i)).unwrap();
 *         }
 *     });
 * }
 *
 * // lib.rs 中注册：
 * .invoke_handler(tauri::generate_handler![start_background_task])
 */

// ============================================================================
// 示例 4：Channel —— 大数据流传输（V2 新特性）
// ============================================================================
// 场景：传输大文件/流数据，如实时日志、文件上传进度、二进制数据流
// Tauri V2 特性：Channel 允许 Rust 端分块发送数据，前端逐块接收（类似 ReadableStream）

async function example4_channel() {
  // ====== 创建 Channel 用于接收流数据 ======
  const channel = new Channel<number>(); // 泛型指定每块数据的类型

  // 设置数据接收回调（每收到一块数据都会调用）
  channel.onmessage = (chunk: number) => {
    console.log('收到一块数据:', chunk);
    // 比如进度更新：收到 10, 20, 30, ... 100
  };

  // 调用需要 Channel 的命令，将 Channel 传给 Rust
  // 前端调用带有 Channel 参数的 invoke
  await invoke('stream_data', { onProgress: channel });

  console.log('Channel 数据传输完成');

  // ====== Channel 的实际使用场景 ======
  // 1. 大文件下载进度：每次收到已下载的字节数
  // 2. 实时日志：每条日志作为一块
  // 3. 数据库查询结果流：逐行返回大量数据
  // 4. 子进程 stdout 实时输出（见 10_shell_and_process.ts）
}

/**
 * // ======== 对应的 Rust 后端代码 ========
 *
 * use tauri::ipc::Channel;
 *
 * #[tauri::command]
 * async fn stream_data(on_progress: Channel<u32>) {
 *     // 模拟分 10 次发送数据
 *     for i in 1..=10 {
 *         tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
 *         on_progress.send(i * 10).unwrap();
 *     }
 * }
 */

// ============================================================================
// 示例 5：invoke 传递复杂对象
// ============================================================================
// 场景：前端传递 JS 对象，Rust 接收结构体，并返回复杂 JSON 对象
// Tauri V2 特性：serde 自动处理 JS Object ↔ Rust Struct 的序列化

interface User {
  name: string;
  age: number;
  email?: string;
}

interface UserResponse {
  id: string;
  user: User;
  created_at: string;
}

async function example5_complexObject() {
  const user: User = {
    name: 'Alice',
    age: 30,
    email: 'alice@example.com',
  };

  // JS 对象自动序列化为 JSON → Rust 反序列化为 struct
  const response = await invoke<UserResponse>('create_user', {
    user: user,
  });

  console.log('创建的用户ID:', response.id);
  console.log('创建时间:', response.created_at);
}

/**
 * // ======== 对应的 Rust 后端代码 ========
 *
 * use serde::{Serialize, Deserialize};
 *
 * #[derive(Deserialize)]  // 接收前端传来的数据
 * struct User {
 *     name: String,
 *     age: u32,
 *     email: Option<String>,  // Option 表示可选字段
 * }
 *
 * #[derive(Serialize)]    // 返回给前端的数据
 * struct UserResponse {
 *     id: String,
 *     user: User,
 *     created_at: String,
 * }
 *
 * #[tauri::command]
 * fn create_user(user: User) -> UserResponse {
 *     UserResponse {
 *         id: uuid::Uuid::new_v4().to_string(),
 *         user,  // 直接返回接收到的 user
 *         created_at: chrono::Utc::now().to_rfc3339(),
 *     }
 * }
 */

// ============================================================================
// 示例 6：invoke 返回不同类型 —— 基础类型 vs 数组 vs 元组
// ============================================================================
// 场景：Rust 可以返回各种 Serde 支持的类型

async function example6_returnTypes() {
  // 基础类型
  const count: number = await invoke<number>('get_count');
  // Rust: fn get_count() -> u32

  // 字符串数组
  const files: string[] = await invoke<string[]>('list_files');
  // Rust: fn list_files() -> Vec<String>

  // JSON 对象
  const config: Record<string, unknown> = await invoke<Record<string, unknown>>('get_config');
  // Rust: fn get_config() -> serde_json::Value

  // 布尔值
  const isReady: boolean = await invoke<boolean>('is_ready');
  // Rust: fn is_ready() -> bool

  console.log({ count, files, config, isReady });
}

// ============================================================================
// 示例 7：invoke 与传统 HTTP API 的对比
// ============================================================================
// 场景：理解 Tauri invoke 与传统 Web 开发的本质区别

async function example7_comparison() {
  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║           Tauri invoke vs HTTP API 对比                    ║
  ╠══════════════════════════════════════════════════════════╣
  ║ 特性           │ Tauri invoke      │ HTTP API (fetch)      ║
  ╠══════════════════════════════════════════════════════════╣
  ║ 通信方式       │ 进程内 IPC        │ 网络请求               ║
  ║ 延迟           │ 微秒级            │ 毫秒级                 ║
  ║ CORS           │ 不存在            │ 需要配置               ║
  ║ 断线重连       │ 无需（同进程）    │ 需要实现               ║
  ║ 类型安全       │ Rust 类型 → TS 类型│ 需手动定义             ║
  ║ 调试           │ Rust + 前端双重   │ 仅前端                ║
  ║ 负载均衡       │ 不支持            │ 支持                   ║
  ╚══════════════════════════════════════════════════════════╝
  `);

  // 在实际项目中，Tauri invoke 用于本地操作（文件、系统、进程）
  // HTTP fetch 用于远程 API（云服务、第三方接口）
  // 两者可混合使用，各司其职
}

// ============================================================================
// 【常见错误示例】
// ============================================================================

async function example8_commonMistakes() {
  // 错误 1：invoke 命令名与 Rust 端不匹配
  console.log(`
  ❌ 错误：命令名大小写不匹配
  await invoke("Greet", { name: "test" });  // Rust 中是 "greet"
  
  原因：invoke 的命令名必须与 Rust #[tauri::command] 函数名完全一致
  修复：确保大小写一致，Rust 函数名默认是小写蛇形命名（greet）
  `);

  // 错误 2：忘记处理异步
  console.log(`
  ❌ 错误：没有 await 或 .catch()
  invoke("greet", { name: "test" });  // 返回 Promise，不会执行
  
  原因：invoke 是异步的（返回 Promise），必须 await 或 .then()
  修复：使用 await invoke("greet", ...) 或 invoke("greet", ...).then(...)
  `);

  // 错误 3：emit 事件后立即 listen
  console.log(`
  ❌ 错误：先 emit 后 listen，错过了事件
  emit("my-event", data);     // 事件已发出
  listen("my-event", cb);     // 监听器注册太晚
  
  原因：emit 是即时的，不会保留历史事件
  修复：先 listen 再 emit，或者使用一次性的 once() 方法
  `);

  // 错误 4：Channel 未设置 onmessage
  console.log(`
  ❌ 错误：创建 Channel 但没设置 onmessage
  const ch = new Channel<number>();
  await invoke("stream", { ch });  // 数据发送了但没接收
  
  修复：必须在调用 invoke 前设置 channel.onmessage = (data) => {...}
  `);
}

// ============================================================================
// 【本章小结】
// ============================================================================
/**
 * 1. invoke<T>(cmd, args) 是前后端通信的核心方法：
 *    - 类似"远程过程调用（RPC）"，但不是通过网络
 *    - 返回 Promise<T>，必须异步处理
 *    - Rust 的 Result::Err 会被转换为 JS Error
 *
 * 2. 事件系统（emit/listen）实现 Rust → 前端推送：
 *    - 适合实时数据更新、进度通知等场景
 *    - listen 需要在事件发生前注册
 *    - 组件卸载时必须 unlisten 防止内存泄漏
 *
 * 3. Channel（V2 新特性）用于大数据流传输：
 *    - 适合文件下载、实时日志、长时任务进度
 *    - 对比 Web：类似 WebSocket 但走 IPC，延迟更低
 *
 * 4. 与纯 Web 开发的核心区别：
 *    - 不需要定义 REST API 路由
 *    - 不需要处理 CORS
 *    - 不需要序列化协议选择（固定使用 JSON/serde）
 *    - 类型安全从前端贯通到后端
 */
