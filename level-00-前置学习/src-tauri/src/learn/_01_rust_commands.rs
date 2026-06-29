// ============================================================================
// 01_rust_commands.rs —— 基础命令编写
// ============================================================================
//
// 【对应前端章节】02_frontend_backend_communication.ts / 03_commands_and_payloads.ts
//
// 【学习目标】
//   1. 掌握 #[tauri::command] 宏的完整用法
//   2. 理解同步命令与异步命令的区别
//   3. 学会参数接收（基础类型 + 结构体）和返回值返回
//   4. 掌握 Result<T, String> 错误处理模式
//
// 【使用方式】
//   将所需命令的 #[tauri::command] 函数和对应的 struct 复制到 lib.rs，
//   并在 generate_handler![] 中注册。

use serde::{Deserialize, Serialize};

// ============================================================================
// 示例 1：最简单的同步命令 —— 无参数，返回字符串
// ============================================================================

// 返回应用版本号（最简单的命令示例）
//
// 前端调用：
// ```typescript
// const version: string = await invoke("get_version");
// ```
#[tauri::command]
pub fn get_version() -> String {
    // 这里可以读取 Cargo.toml 中的版本
    env!("CARGO_PKG_VERSION").to_string()
}

// ============================================================================
// 示例 2：带参数的同步命令 —— 接收基础类型
// ============================================================================

// 加法计算器：接收两个 i32，返回它们的和
//
// 前端调用：
// ```typescript
// const sum: number = await invoke("add", { a: 42, b: 58 });
// ```
#[tauri::command]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// 问候命令：接收字符串，返回格式化的问候语
//
// 前端调用：
// ```typescript
// const greeting: string = await invoke("greet_learn", { name: "Tauri" });
// ```
// 说明：&str 是 Rust 中的字符串切片，Tauri 会自动将前端的 string 转换
#[tauri::command]
pub fn greet_learn(name: &str) -> String {
    format!("你好，{}！这条消息来自 Rust 后端。", name)
}

// ============================================================================
// 示例 3：接收复杂结构体参数（需要 derive Deserialize）
// ============================================================================

// 用户信息结构体（接收前端传来的数据，需要 Deserialize）
//
// 前端传递的 JS 对象会自动反序列化为此结构体：
// ```typescript
// const result = await invoke("register_user", {
//     user: { name: "Alice", age: 30, email: "alice@example.com" }
// });
// ```
#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub name: String,
    pub age: u8,
    pub email: Option<String>, // Option 表示可选字段
}

// 注册用户：接收复杂结构体，返回新用户的 ID
#[tauri::command]
pub fn register_user(user: CreateUserRequest) -> String {
    // 在实际应用中，这里会写入数据库
    let id = uuid::Uuid::new_v4().to_string();
    println!("注册新用户: {:?} (ID: {})", user, id);
    id
}

// ============================================================================
// 示例 4：返回复杂结构体（需要 derive Serialize）
// ============================================================================

// 用户响应结构体（返回给前端，需要 Serialize）
//
// 前端接收：
// ```typescript
// interface UserResponse { id: string; name: string; is_adult: boolean; }
// ```
#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: String,
    pub name: String,
    pub age: u8,
    pub is_adult: bool,
    pub created_at: String,
}

// 创建用户并返回完整信息
#[tauri::command]
pub fn create_user(user: CreateUserRequest) -> UserResponse {
    let id = uuid::Uuid::new_v4().to_string();
    UserResponse {
        id,
        name: user.name,
        age: user.age,
        is_adult: user.age >= 18,
        created_at: chrono::Utc::now().to_rfc3339(),
    }
}

// ============================================================================
// 示例 5：Result<T, String> 错误处理模式（推荐）
// ============================================================================

// 除法计算器：使用 Result 处理除零错误
//
// 前端调用：
// ```typescript
// try {
//     const result: number = await invoke("safe_divide", { a: 10, b: 0 });
// } catch (error) {
//     console.error(error); // "除数不能为零"
// }
// ```
//
// **重点**：Rust 的 Err("message") 会被 Tauri 转换为 JS Error
// 前端通过 try/catch 捕获，error 对象的 message 就是这里的字符串
#[tauri::command]
pub fn safe_divide(a: f64, b: f64) -> Result<f64, String> {
    if b == 0.0 {
        // 返回 Err，前端 catch 到
        Err("除数不能为零".to_string())
    } else {
        // 返回 Ok，前端直接拿到值
        Ok(a / b)
    }
}

// 解析 JSON：使用 Result 处理可能失败的操作
#[tauri::command]
pub fn parse_json(json_str: String) -> Result<serde_json::Value, String> {
    serde_json::from_str(&json_str)
        .map_err(|e| format!("JSON 解析失败: {}", e))
}

// ============================================================================
// 示例 6：异步命令（async fn） —— 配合 tokio 进行异步 I/O
// ============================================================================

// 模拟耗时操作（如数据库查询、网络请求）
//
// **V2 特性**：async command 在 tokio 运行时中执行
// 前端可以同时调用多个 async 命令而不互相阻塞
// 
// 前端调用：
// ```typescript
// const results = await Promise.all([
//     invoke("expensive_task", { id: 1 }),
//     invoke("expensive_task", { id: 2 }),
// ]);
// ```
#[tauri::command]
pub async fn expensive_task(id: u32) -> Result<String, String> {
    // 模拟数据库查询耗时
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    Ok(format!("任务 #{} 处理完成", id))
}

// 读取 URL 内容（真正的异步 I/O）
// 需要依赖 reqwest，在 Cargo.toml 中添加：
// reqwest = { version = "0.12", features = ["json"] }
//
// 前端调用：
// ```typescript
// const data = await invoke("fetch_url", { url: "https://api.example.com" });
// ```
#[tauri::command]
pub async fn fetch_url(url: String) -> Result<String, String> {
    // 注意：需要添加 reqwest 依赖才能使用
    //
    // let response = reqwest::get(&url)
    //     .await
    //     .map_err(|e| format!("请求失败: {}", e))?;
    //
    // response.text()
    //     .await
    //     .map_err(|e| format!("读取响应失败: {}", e))

    // 这里用占位代替，实际使用请添加 reqwest 依赖
    Ok(format!("将会请求: {}", url))
}

// ============================================================================
// 示例 7：命令中注入 Tauri 上下文（window、app、state）
// ============================================================================

// Tauri V2 可以自动注入以下类型的参数（前端不需要传）：
// - tauri::AppHandle：应用句柄
// - tauri::WebviewWindow：当前窗口引用
// - tauri::State<'_, T>：全局状态（见 02 章）
// - tauri::Window：窗口引用（V2 推荐 WebviewWindow）
use tauri::WebviewWindow;

// 通过 Rust 获取当前窗口标题
//
// 前端调用：
// ```typescript
// const title: string = await invoke("get_window_title");
// // 注意：前端不需要传 window 参数！Tauri 自动注入
// ```
#[tauri::command]
pub fn get_window_title(window: WebviewWindow) -> Result<String, String> {
    window
        .title()
        .map_err(|e| format!("获取窗口标题失败: {}", e))
}

// ============================================================================
// 【本章小结】
// ============================================================================
//
// 1. #[tauri::command] 是连接前端和 Rust 后端的桥梁
//    - 同步命令在独立线程执行，不阻塞主线程
//    - 异步命令在 tokio 运行时执行，适合 I/O 密集型操作
//
// 2. 参数接收规则：
//    - 基础类型（&str, String, i32, f64, bool）直接接收
//    - 复杂对象需要 #[derive(Deserialize)]
//    - 可选字段用 Option<T>
//    - Tauri 上下文类型自动注入（window, app, state）
//
// 3. 返回值规则：
//    - 基础类型和 String 直接返回
//    - 复杂对象需要 #[derive(Serialize)]
//    - 推荐用 Result<T, String> 进行错误处理
//    - Err 的消息会被序列化为前端的 Error
//
// 4. 注册命令（在 lib.rs 中）：
//    .invoke_handler(tauri::generate_handler![
//        get_version,
//        add,
//    greet_learn,
//        greet,
//        register_user,
//        create_user,
//        safe_divide,
//        parse_json,
//        expensive_task,
//        fetch_url,
//        get_window_title
//    ])
