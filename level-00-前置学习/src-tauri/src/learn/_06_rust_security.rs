// ============================================================================
// 06_rust_security.rs —— 安全与权限
// ============================================================================
//
// 【对应前端章节】04_capabilities_and_permissions.ts
//
// 【学习目标】
//   1. 在命令中对用户输入进行参数校验与消毒
//   2. 实现路径校验防止目录遍历攻击
//   3. 敏感操作日志记录
//   4. 理解 capabilities 文件与后端校验的双层防御机制
//
// 【核心原则】
//   capabilities 是"入口守卫"（哪些 API 可调用，哪些路径可访问）
//   后端校验是"内容守卫"（参数值是否合法，行为是否安全）
//   两层必须同时存在，缺一不可

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::Manager;

// ============================================================================
// 示例 1：输入消毒 —— 永远不信任前端传来的数据
// ============================================================================

// 安全的用户名验证
//
// 即使前端已经做了格式校验，后端也必须再次验证
// 因为恶意用户可能绕过前端直接调用 Tauri 命令
#[tauri::command]
pub fn validate_username(username: String) -> Result<String, String> {
    // 1. 长度限制
    if username.is_empty() {
        return Err("用户名不能为空".into());
    }
    if username.len() > 32 {
        return Err("用户名不能超过 32 个字符".into());
    }

    // 2. 字符白名单（只允许字母、数字、下划线、中文）
    if !username.chars().all(|c| {
        c.is_alphanumeric() || c == '_' || c == '-' || ('\u{4e00}'..='\u{9fff}').contains(&c)
    }) {
        return Err("用户名包含不允许的字符".into());
    }

    // 3. 不匹配保留用户名
    let reserved = ["admin", "root", "system", "null", "undefined"];
    let lower = username.to_lowercase();
    if reserved.contains(&lower.as_str()) {
        return Err(format!("'{}' 是保留用户名，请选择其他名称", username));
    }

    Ok(username)
}

// 安全的文件名处理
#[tauri::command]
pub fn sanitize_filename(input: String) -> Result<String, String> {
    // 移除路径分隔符（防止目录遍历）
    let sanitized: String = input
        .chars()
        .filter(|c| !matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|'))
        .take(255) // 长度限制
        .collect();

    if sanitized.is_empty() {
        return Err("文件名无效".into());
    }

    Ok(sanitized)
}

// ============================================================================
// 示例 2：路径安全 —— 防止目录遍历攻击
// ============================================================================

// 路径安全校验核心函数
//
// 使用此函数检查所有文件操作的目标路径
pub fn validate_path_safe(base_dir: &Path, user_path: &str) -> Result<PathBuf, String> {
    // 步骤 1：拒绝空路径
    if user_path.is_empty() {
        return Err("路径不能为空".into());
    }

    // 步骤 2：拒绝绝对路径（只允许相对路径）
    let user_path_obj = Path::new(user_path);
    if user_path_obj.is_absolute() {
        return Err("不允许使用绝对路径".into());
    }

    // 步骤 3：组合基础目录和用户路径
    let combined = base_dir.join(user_path_obj);

    // 步骤 4：规范化路径（解析 .. 和符号链接）
    let canonical_base = base_dir
        .canonicalize()
        .map_err(|e| format!("基础目录无法访问: {}", e))?;

    let canonical_combined = combined
        .canonicalize()
        .map_err(|_| format!("文件不存在或无法访问: {}", user_path))?;

    // 步骤 5：★ 关键检查 —— 确保最终路径在基础目录内
    if !canonical_combined.starts_with(&canonical_base) {
        // 记录安全事件日志
        eprintln!(
            "[安全警告] 路径遍历攻击被阻止！基础目录: {:?}, 用户路径: {}, 解析后: {:?}",
            canonical_base, user_path, canonical_combined
        );
        return Err(format!(
            "路径遍历攻击被阻止！不允许访问基础目录之外的文件: {}",
            user_path
        ));
    }

    Ok(canonical_combined)
}

// 使用安全路径校验的文件读取命令
//
// 前端调用：
// ```typescript
// // ✅ 安全：读取应用数据目录中的文件
// await invoke("secure_read_file", { fileName: "data/config.json" });
//
// // ❌ 被阻止：尝试路径遍历
// await invoke("secure_read_file", { fileName: "../../../etc/passwd" });
// ```
#[tauri::command]
pub fn secure_read_file(app: tauri::AppHandle, file_name: String) -> Result<String, String> {
    // 获取应用数据目录作为基础目录
    let base_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))?;

    // 使用安全校验
    let safe_path = validate_path_safe(&base_dir, &file_name)?;

    // 读取文件
    std::fs::read_to_string(&safe_path)
        .map_err(|e| format!("读取文件失败: {}", e))
}

// ============================================================================
// 示例 3：敏感操作日志记录
// ============================================================================

// 安全日志记录器（概念实现）
pub struct SecurityLogger;

impl SecurityLogger {
    /// 记录敏感操作
    pub fn log_operation(operation: &str, details: &str) {
        let timestamp = chrono::Utc::now().to_rfc3339();
        println!("[AUDIT {}] {} - {}", timestamp, operation, details);

        // 实际应用中，这里可以：
        // 1. 写入专门的审计日志文件
        // 2. 发送到远程日志服务器
        // 3. 写入数据库审计表
    }
}

// 执行管理员操作的命令（带审计日志）
#[tauri::command]
pub fn admin_delete_data(_app: tauri::AppHandle, data_id: String) -> Result<(), String> {
    // 记录审计日志
    SecurityLogger::log_operation(
        "ADMIN_DELETE_DATA",
        &format!("data_id={}, window={}", data_id, "main"),
    );

    // 执行实际删除操作...
    println!("删除数据: {}", data_id);

    Ok(())
}

// ============================================================================
// 示例 4：命令级权限检查（手动实现）
// ============================================================================

// 手动实现的命令级权限控制（概念示例）
//
// 虽然 capabilities 提供了声明式权限，
// 但有时需要在命令中做更细粒度的运行时权限检查

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserRole {
    pub is_admin: bool,
    pub permissions: Vec<String>,
}

// 检查当前用户是否有执行某操作的权限
//
// 在需要权限检查的命令中使用：
// ```rust
// #[tauri::command]
// fn dangerous_operation(role: tauri::State<'_, ...>) -> Result<(), String> {
//     check_permission(&role, "delete_all")?;
//     // ... 执行操作 ...
//     Ok(())
// }
// ```
pub fn check_permission(role: &UserRole, required_perm: &str) -> Result<(), String> {
    if role.is_admin || role.permissions.contains(&required_perm.to_string()) {
        Ok(())
    } else {
        SecurityLogger::log_operation(
            "PERMISSION_DENIED",
            &format!("user lacks '{}' permission", required_perm),
        );
        Err(format!("权限不足，需要 '{}' 权限", required_perm))
    }
}

// ============================================================================
// 示例 5：SQL 注入防护（概念示例）
// ============================================================================

// 安全的数据库查询（预防 SQL 注入）
//
// 如果应用接入 SQLite（通过 tauri-plugin-sql 或 rusqlite），
// 必须使用参数化查询，绝不能拼接 SQL 字符串！
//
// ```rust
// // ❌ 危险：字符串拼接
// // format!("SELECT * FROM users WHERE name = '{}'", user_input);
//
// // ✅ 安全：参数化查询
// // conn.execute("SELECT * FROM users WHERE name = ?1", [user_input]);
//
// #[tauri::command]
// fn search_users(query: String) -> Result<Vec<User>, String> {
//     // 1. 先消毒输入
//     let safe_query = sanitize_search_query(&query)?;
//     
//     // 2. 使用参数化查询
//     // let results = db.query(
//     //     "SELECT * FROM users WHERE name LIKE ?1",
//     //     [format!("%{}%", safe_query)]
//     // )?;
//     
//     Ok(results)
// }
// ```

// ============================================================================
// 示例 6：shell 命令参数消毒
// ============================================================================

// 安全的 Shell 参数校验
//
// 当必须执行系统命令时（尽量用 Rust 替代），校验参数
#[tauri::command]
pub fn safe_execute_command(command: String, args: Vec<String>) -> Result<String, String> {
    // 1. 命令白名单
    let allowed_commands = ["git", "node", "npm", "python3", "echo"];
    let cmd_name = command
        .split_whitespace()
        .next()
        .ok_or("命令为空")?;

    if !allowed_commands.contains(&cmd_name) {
        SecurityLogger::log_operation(
            "COMMAND_BLOCKED",
            &format!("试图执行未允许的命令: {}", cmd_name),
        );
        return Err(format!("命令 '{}' 不在允许列表中", cmd_name));
    }

    // 2. 参数消毒 —— 拒绝任何形式的命令注入
    for arg in &args {
        // 检查分号和管道符（命令注入常见手法）
        if arg.contains(';') || arg.contains('|') || arg.contains('&') {
            return Err(format!("参数包含危险字符: '{}'", arg));
        }
    }

    // 3. 记录日志
    SecurityLogger::log_operation(
        "COMMAND_EXECUTED",
        &format!("cmd={}, args={:?}", command, args),
    );

    // 4. 执行命令（需要配置 shell scope）
    let output = std::process::Command::new(&command)
        .args(&args)
        .output()
        .map_err(|e| format!("命令执行失败: {}", e))?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

// ============================================================================
// 示例 7：敏感数据保护
// ============================================================================

// 数据脱敏示例
//
// 返回给前端的敏感数据应该脱敏处理
#[tauri::command]
pub fn get_user_info(user_id: String) -> Result<serde_json::Value, String> {
    // 模拟从数据库读取用户数据
    let phone = "13812345678";
    let email = "user@example.com";
    let id_card = "110101199001011234";

    Ok(serde_json::json!({
        "user_id": user_id,
        "phone": mask_phone(phone),      // "138****5678"
        "email": mask_email(email),      // "u***@example.com"
        "id_card": mask_id_card(id_card),// "110***********1234"
    }))
}

// 手机号脱敏
fn mask_phone(phone: &str) -> String {
    if phone.len() >= 11 {
        format!("{}****{}", &phone[..3], &phone[7..])
    } else {
        "****".to_string()
    }
}

// 邮箱脱敏
fn mask_email(email: &str) -> String {
    if let Some(at_pos) = email.find('@') {
        format!("{}***{}", &email[..1], &email[at_pos..])
    } else {
        "***".to_string()
    }
}

// 身份证脱敏
fn mask_id_card(id: &str) -> String {
    if id.len() >= 15 {
        format!("{}***********{}", &id[..3], &id[id.len()-4..])
    } else {
        "***".to_string()
    }
}

// ============================================================================
// 【本章小结】
// ============================================================================
//
// 1. 双层防御机制：
//    - 第一层：capabilities 文件声明（入口控制）
//    - 第二层：Rust 后端参数校验（内容安全）
//    - 两层必须同时存在，不能依赖单一层
//
// 2. 输入消毒清单：
//    - ✅ 用户名/文件名：长度限制 + 字符白名单
//    - ✅ 路径：canonicalize + starts_with 检查
//    - ✅ SQL：参数化查询（不用字符串拼接）
//    - ✅ Shell：命令白名单 + 参数过滤
//    - ✅ 输出：敏感数据脱敏
//
// 3. 审计日志：
//    - 记录所有敏感操作（删除、修改权限、执行命令）
//    - 包含时间戳、操作类型、相关参数
//    - 可用于事后审计和安全分析
//
// 4. 永远不信任的数据源：
//    - 前端传来的所有参数
//    - 用户输入的任何内容
//    - 外部系统的数据
//
// 5. 注册命令：
//    .invoke_handler(tauri::generate_handler![
//        validate_username, sanitize_filename,
//        secure_read_file,
//        admin_delete_data,
//        safe_execute_command,
//        get_user_info
//    ])
