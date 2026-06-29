// Level 04：文件系统与原生对话框
// WHAT：通过 Tauri v2 插件实现文件对话框、文件读写、Scope 路径安全
// WHY：桌面应用的核心能力：导入/导出文件、读取本地数据
// CONTRAST：
//   Electron：ipcMain 中调用 dialog.showOpenDialog + fs.readFile（无权限边界）
//   Web：     File API（用户手势触发，沙盒隔离）
//   Tauri：   插件 + Capabilities Scope 白名单（有边界的安全文件访问）
//   Swift：   NSOpenPanel + FileManager（系统原生，但平台独占）

use tauri::Manager;

/// 读取文本文件 —— 通过 invoke 调用，前端传入已经用户选择的文件路径
///
/// SECURITY：路径来自用户通过原生对话框选择（前端应使用 dialog 插件），
///            Capabilities 中的 Scope 限制可访问路径
///            Rust 端仍做路径校验防止路径遍历
#[tauri::command]
async fn read_file_content(path: String) -> Result<String, String> {
    println!("[IPC] read_file_content: {path}");

    // SECURITY：检查路径是否包含危险模式（路径遍历）
    if path.contains("..") || path.contains("~") {
        return Err("拒绝访问：路径包含不安全的模式".into());
    }

    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("读取文件失败: {e}"))
}

/// 写入文本文件
#[tauri::command]
async fn write_file_content(path: String, content: String) -> Result<String, String> {
    println!("[IPC] write_file_content: {path} ({} 字节)", content.len());

    if path.contains("..") || path.contains("~") {
        return Err("拒绝访问：路径包含不安全的模式".into());
    }

    tokio::fs::write(&path, &content)
        .await
        .map_err(|e| format!("写入文件失败: {e}"))?;

    Ok(format!("成功写入 {} 字节", content.len()))
}

/// 列出目录内容
///
/// 【对比 Electron】Electron 的 fs.readdir 无 Scope 限制，Tauri 通过 Scope 约束
#[tauri::command]
async fn list_directory(path: String) -> Result<Vec<String>, String> {
    println!("[IPC] list_directory: {path}");

    let mut entries = tokio::fs::read_dir(&path)
        .await
        .map_err(|e| format!("读取目录失败: {e}"))?;

    let mut result = Vec::new();
    while let Ok(Some(entry)) = entries.next_entry().await {
        let name = entry.file_name().to_string_lossy().to_string();
        let file_type = entry.file_type().await.map(|ft| {
            if ft.is_dir() { format!("{}/", name) }
            else { name }
        }).unwrap_or(name);
        result.push(file_type);
    }
    result.sort();
    Ok(result)
}

#[tauri::command]
fn process_dropped_file(path: String, app: tauri::AppHandle) -> Result<String, String> {
    println!("[IPC] 文件拖拽: {path}");
    let _ = app.emit("file-dropped", &serde_json::json!({ "path": &path }));
    Ok(format!("接收到拖拽文件: {path}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            read_file_content, write_file_content, list_directory, process_dropped_file
        ])
        .setup(|_app| {
            println!("[Tauri] Level 04 启动 — dialog + fs 插件已加载");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动失败");
}
