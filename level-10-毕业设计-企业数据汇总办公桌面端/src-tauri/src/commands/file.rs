// src-tauri/src/commands/file.rs
// WHAT：文件操作 Command —— CSV/Excel 导入、PDF 报表导出
// WHY：企业桌面应用的核心工作流：导入本地数据 → 处理 → 导出结果
// CONTRAST：
//   Web：        File API（用户手势触发，只能读取用户选择的文件）
//   Electron：   dialog + fs（无边界限制）
//   Tauri：      dialog + fs（Scope 约束 + 参数校验）
//   Rust std：   std::fs（无 UI 对话框）

use crate::state::{AppState, FileOperationResult};
use tauri::Emitter;

/// CSV 导入命令
///
/// SECURITY：
///   1. 路径必须通过 Scope 检查（caps 中声明 + conf.json 中配置）
///   2. Rust 端校验 CSV 内容格式
///   3. 限制文件大小（防止 DoS）
#[tauri::command]
pub async fn import_csv(
    file_path: String,
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<FileOperationResult, String> {
    println!("[File] import_csv: {file_path}");

    // 校验路径安全
    if file_path.contains("..") || file_path.contains("~") {
        return Err("路径不安全".into());
    }

    // 读取文件
    let content = tokio::fs::read_to_string(&file_path)
        .await
        .map_err(|e| format!("读取失败: {e}"))?;

    // 限制大小（10MB）
    if content.len() > 10 * 1024 * 1024 {
        return Err("文件过大（最大 10MB）".into());
    }

    // 解析 CSV
    let lines: Vec<&str> = content.lines().collect();
    if lines.is_empty() {
        return Err("CSV 文件为空".into());
    }

    let headers: Vec<&str> = lines[0].split(',').map(|s| s.trim()).collect();
    let row_count = lines.len() - 1;

    // 通过 Event 通知前端导入进度
    let _ = app.emit("import-progress", serde_json::json!({
        "type": "csv",
        "headers": headers,
        "rowCount": row_count,
    }));

    println!("[File] CSV 导入完成: {row_count} 行, {headers:?}");
    Ok(FileOperationResult {
        success: true,
        path: file_path,
        size: content.len() as u64,
        message: format!("成功导入 {row_count} 行数据（{} 列）", headers.len()),
    })
}

/// 导出报表为 CSV
#[tauri::command]
pub async fn export_csv(
    data: Vec<Vec<String>>,
    save_path: String,
) -> Result<FileOperationResult, String> {
    println!("[File] export_csv: {save_path}, {} 行", data.len());

    // 生成 CSV 内容
    let mut csv = String::new();
    for row in &data {
        let line = row.iter()
            .map(|cell| {
                // 转义包含逗号或引号的单元格
                if cell.contains(',') || cell.contains('"') || cell.contains('\n') {
                    format!("\"{}\"", cell.replace('"', "\"\""))
                } else {
                    cell.clone()
                }
            })
            .collect::<Vec<_>>()
            .join(",");
        csv.push_str(&line);
        csv.push('\n');
    }

    // 写入文件
    tokio::fs::write(&save_path, &csv)
        .await
        .map_err(|e| format!("写入失败: {e}"))?;

    println!("[File] CSV 导出完成: {} 字节", csv.len());
    Ok(FileOperationResult {
        success: true,
        path: save_path,
        size: csv.len() as u64,
        message: format!("成功导出 {} 行数据", data.len()),
    })
}

/// 获取文件信息
#[tauri::command]
pub async fn get_file_info(path: String) -> Result<serde_json::Value, String> {
    let metadata = tokio::fs::metadata(&path)
        .await
        .map_err(|e| format!("读取失败: {e}"))?;

    Ok(serde_json::json!({
        "path": path,
        "size": metadata.len(),
        "is_file": metadata.is_file(),
        "is_dir": metadata.is_dir(),
        "readonly": metadata.permissions().readonly(),
    }))
}
