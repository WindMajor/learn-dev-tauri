// src-tauri/src/lib.rs
// WHAT：Level 02 的 Rust 后端 —— 演示 IPC 通信：Command 的多种模式 + State 管理
// WHY：IPC 是 Tauri 的核心通信机制，理解 Command 的参数/返回值/错误处理是安全的基石
// CONTRAST：
//   - Electron：ipcMain.handle() 接收 (event, ...args)，args 是 any[]，无类型约束
//   - NestJS：  @Body() 装饰器 + DTO class-validator，HTTP 协议，有中间件管道
//   - Tauri v2： #[tauri::command] 的 Rust 函数签名即 IPC 契约，serde 编译期验证

mod state;

use tauri::Manager;
use state::AppState;

// ═══════════════════════════════════════════════════════════════
// Command 01：基本类型参数
// ═══════════════════════════════════════════════════════════════

/// 基础 IPC 命令：接收 String 参数，返回 String
///
/// # 参数
/// - `name`: 用户名称（String 类型）
///
/// # 返回
/// 问候语字符串
///
/// # 前端调用示例
/// ```js
/// const result = await invoke('greet', { name: '张三' });
/// // result === '你好, 张三!'
/// ```
///
/// # Panics
/// 无 panic 风险
///
/// # 安全
/// 简单字符串命令，无安全风险。但如果 name 被用于文件路径，则需校验（见 Level 07）
#[tauri::command]
fn greet(name: String) -> String {
    println!("[IPC] greet 被调用, name = '{name}'");
    format!("你好, {name}! 这是你的第 2 关。")
}

// ═══════════════════════════════════════════════════════════════
// Command 02：数值参数 + 元组返回
// ═══════════════════════════════════════════════════════════════

/// 数值运算命令：演示多参数 + 结构化返回值
///
/// 【对比 Electron】Electron 中这些值都是 any，无编译期类型检查
/// Tauri v2 通过 serde 保证前端传值类型必须与 Rust 参数类型匹配
#[tauri::command]
fn calculate(a: f64, b: f64, operation: String) -> Result<f64, String> {
    println!("[IPC] calculate: {a} {operation} {b}");

    match operation.as_str() {
        "add" => Ok(a + b),
        "subtract" => Ok(a - b),
        "multiply" => Ok(a * b),
        "divide" => {
            if b == 0.0 {
                // 【WARNING】返回 Err 时前端 Promise 会 reject
                // 前端需要用 try-catch 或 .catch() 处理
                Err("除数不能为零".to_string())
            } else {
                Ok(a / b)
            }
        }
        _ => Err(format!("未知操作: {operation}，支持 add/subtract/multiply/divide")),
    }
}

// ═══════════════════════════════════════════════════════════════
// Command 03：复杂结构体参数（Serde 反序列化）
// ═══════════════════════════════════════════════════════════════

/// 用户创建参数 —— 前端传入 JSON 反序列化为 Rust 结构体
///
/// 【对比 NestJS】类似 DTO（Data Transfer Object），但 Tauri 用 serde（编译期）
/// 而非 class-validator（运行时）
#[derive(Debug, serde::Deserialize)]
struct CreateUserArgs {
    /// 用户名：2-20 个字符（Rust 端必须手动校验，serde 不做业务校验）
    name: String,
    /// 邮箱：Rust 端负责格式校验
    email: String,
    /// 年龄：0-150
    age: u32,
    /// 角色：admin / user / guest
    role: String,
}

/// 用户信息返回
///
/// 【对比 NestJS】类似 Response DTO，但 Tauri 用 serde::Serialize（编译期保证序列化能力）
#[derive(Debug, serde::Serialize)]
struct User {
    id: u64,
    name: String,
    email: String,
    age: u32,
    role: String,
    created_at: String,
}

/// 创建用户命令：接收复杂结构体，返回结构体
///
/// # 安全
/// 业务字段需要在 Rust 端校验：
/// - name: 长度 2-20，不含特殊字符
/// - email: 基本格式校验
/// - age: 0-150
/// - role: 白名单枚举值
#[tauri::command]
fn create_user(args: CreateUserArgs) -> Result<User, String> {
    println!("[IPC] create_user: {:?}", args);

    // ─── 参数校验（生产环境必须） ───
    // 【SECURITY】前端传值不可信，Rust 端必须校验所有参数
    // 【对比 Electron】Electron 中参数校验完全依赖开发者自觉
    if args.name.len() < 2 || args.name.len() > 20 {
        return Err("用户名长度必须在 2-20 个字符之间".into());
    }
    if !args.email.contains('@') {
        return Err("邮箱格式不正确".into());
    }
    if args.age > 150 {
        return Err("年龄超出合理范围".into());
    }
    let valid_roles = ["admin", "user", "guest"];
    if !valid_roles.contains(&args.role.as_str()) {
        return Err(format!("无效角色: {}，支持: {:?}", args.role, valid_roles));
    }

    // ─── 业务逻辑 ───
    Ok(User {
        id: 42, // 模拟 ID 生成
        name: args.name,
        email: args.email,
        age: args.age,
        role: args.role,
        created_at: "2025-01-15T10:30:00Z".to_string(),
    })
}

// ═══════════════════════════════════════════════════════════════
// Command 04：使用 State 的 Command（AppState 共享）
// ═══════════════════════════════════════════════════════════════

/// 获取应用配置（从 State 读取）
///
/// 【对比 NestJS】tauri::State<AppState> 相当于 NestJS 的
///   constructor(@Inject('APP_CONFIG') private config: AppConfig) {}
/// 但 Tauri 是函数参数注入而非构造函数注入
#[tauri::command]
fn get_app_config(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    println!("[IPC] get_app_config 被调用");

    // 【WARNING】State 是共享引用，多线程安全由 Rust 所有权保证
    // 读取不需要加锁（send + Sync 保证），回写需要 Mutex
    let config = state.config.lock().map_err(|e| format!("锁获取失败: {e}"))?;
    Ok(config.clone())
}

/// 更新应用配置（回写 State）
///
/// 【WARNING】此处使用 Mutex 保护写操作。
/// 如果多个 Command 并发调用此函数，Mutex 保证串行化。
#[tauri::command]
fn update_app_config(
    key: String,
    value: serde_json::Value,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    println!("[IPC] update_app_config: {key} = {value}");

    let mut config = state.config.lock().map_err(|e| format!("锁获取失败: {e}"))?;
    config.as_object_mut()
        .ok_or("配置不是 JSON 对象")?
        .insert(key, value);

    Ok("配置更新成功".to_string())
}

/// 获取访问计数器（State 中的原子操作）
#[tauri::command]
fn get_visit_count(state: tauri::State<'_, AppState>) -> Result<u64, String> {
    let count = state.visit_count.load(std::sync::atomic::Ordering::SeqCst);
    Ok(count)
}

/// 递增访问计数器
#[tauri::command]
fn increment_visit_count(state: tauri::State<'_, AppState>) -> Result<u64, String> {
    let new_count = state.visit_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;
    println!("[IPC] visit_count 递增为 {new_count}");
    Ok(new_count)
}

// ═══════════════════════════════════════════════════════════════
// Command 05：Vec 集合类型返回
// ═══════════════════════════════════════════════════════════════

/// 获取全部用户列表（模拟数据）
#[tauri::command]
fn list_users(state: tauri::State<'_, AppState>) -> Result<Vec<User>, String> {
    println!("[IPC] list_users 被调用");
    let _ = state.visit_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);

    // 模拟数据库查询
    Ok(vec![
        User {
            id: 1,
            name: "张三".into(),
            email: "zhang@example.com".into(),
            age: 28,
            role: "admin".into(),
            created_at: "2024-01-01T00:00:00Z".into(),
        },
        User {
            id: 2,
            name: "李四".into(),
            email: "li@example.com".into(),
            age: 35,
            role: "user".into(),
            created_at: "2024-06-15T00:00:00Z".into(),
        },
    ])
}

// ═══════════════════════════════════════════════════════════════
// 应用启动
// ═══════════════════════════════════════════════════════════════

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // ─── 初始化 AppState ───
    // 【对比 NestJS】类似 NestJS 的 providers 注册：
    //   providers: [{ provide: 'APP_STATE', useValue: appState }]
    let app_state = AppState::new();

    tauri::Builder::default()
        // ─── 注册 State（必须，否则 Command 中无法注入） ───
        .manage(app_state)
        // ─── 注册全部 Commands ───
        .invoke_handler(tauri::generate_handler![
            greet,
            calculate,
            create_user,
            get_app_config,
            update_app_config,
            get_visit_count,
            increment_visit_count,
            list_users,
        ])
        .setup(|app| {
            println!("[Tauri] Level 02 启动完成");
            println!("[Tauri] 已注册 {} 个 IPC Commands", 8);
            if let Some(w) = app.get_webview_window("main") {
                println!("[Tauri] 主窗口: {}", w.title().unwrap_or_default());
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动失败");
}
