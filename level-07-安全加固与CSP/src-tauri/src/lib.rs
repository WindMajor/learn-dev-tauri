// Level 07：安全加固与 CSP
// WHAT：实践 Tauri v2 的安全三层防御（Capabilities + Scope + CSP）
// 每一条安全规则都标注 SECURITY 标签

use tauri::Manager;

/// 安全读取文件 —— 演示完整的参数校验流水线
///
/// SECURITY：
///   1. Capabilities 层：只有声明了 fs:allow-read 的窗口才能调用此 Command
///   2. Scope 层：路径必须在 tauri.conf.json 的 scope.allow 范围内
///   3. 参数校验：Rust 端手动校验，防止注入和路径遍历
///
/// 【对比 Electron】Electron 的 fs.readFile 无任何强制权限层
#[tauri::command]
fn secure_read_file(path: String, _app: tauri::AppHandle) -> Result<String, String> {
    // ─── 第 1 层校验：路径格式 ───
    if path.is_empty() {
        return Err("路径不能为空".into());
    }

    // ─── 第 2 层校验：路径遍历攻击 ───
    // SECURITY：路径遍历是最常见的文件访问攻击
    // 攻击示例：path = "../../etc/passwd" 或 "../../../.ssh/id_rsa"
    if path.contains("..") {
        return Err("拒绝访问：路径包含 '..'（路径遍历攻击）".into());
    }

    // ─── 第 3 层校验：路径前缀 ───
    // SECURITY：确保访问限定在允许的目录内
    let allowed_prefixes = ["/Users/", "/home/", "/tmp/"];
    if !allowed_prefixes.iter().any(|p| path.starts_with(p)) {
        return Err(format!("拒绝访问：路径 '{}' 不在允许范围内", path));
    }

    // ─── 第 4 层校验：敏感文件 ───
    // SECURITY：即使路径合法，也禁止访问敏感文件
    let forbidden = [".ssh", ".env", ".gitconfig", "id_rsa", "known_hosts"];
    if forbidden.iter().any(|f| path.contains(f)) {
        return Err("拒绝访问：路径包含敏感文件".into());
    }

    // ─── 执行读操作（正常业务） ───
    std::fs::read_to_string(&path).map_err(|e| format!("读取失败: {e}"))
}

/// 安全 SQL 查询代理 —— 演示防止 SQL 注入
///
/// SECURITY：前端永远不应该直接拼接 SQL！
/// Rust Command 作为安全边界，使用参数化查询
#[tauri::command]
fn secure_db_query(table: String, filter_field: String, filter_value: String) -> Result<String, String> {
    // ─── 校验表名（白名单） ───
    let allowed_tables = ["users", "reports", "configs"];
    if !allowed_tables.contains(&table.as_str()) {
        return Err(format!("不允许的表: {table}"));
    }

    // ─── 校验字段名（白名单） ───
    let allowed_fields = ["id", "name", "email", "created_at"];
    if !allowed_fields.contains(&filter_field.as_str()) {
        return Err(format!("不允许的字段: {filter_field}"));
    }

    // ─── 校验值（防止特殊字符） ───
    if filter_value.contains(';') || filter_value.contains("--") || filter_value.contains('\'') {
        return Err("参数包含危险字符".into());
    }

    // ✓ 安全：表名和字段名通过白名单校验，值通过字符过滤
    Ok(format!("SELECT * FROM {table} WHERE {filter_field} = ? (参数: {filter_value})"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![secure_read_file, secure_db_query])
        .setup(|app| {
            println!("[Tauri] Level 07 安全加固模式启动");
            println!("[Tauri] CSP: {}", app.config().app.security.csp.as_deref().unwrap_or("未配置"));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动失败");
}
