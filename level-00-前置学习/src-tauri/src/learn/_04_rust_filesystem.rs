// ============================================================================
// 04_rust_filesystem.rs —— 后端文件操作
// ============================================================================
//
// 【对应前端章节】07_filesystem_operations.ts
//
// 【学习目标】
//   1. 使用 std::fs 进行文件系统操作
//   2. 获取 Tauri 应用专属目录路径
//   3. 大文件分块读取与 Channel 传输
//   4. 文件操作的权限检查与安全处理
//
// 【核心概念】
//   - V2 中推荐使用 tauri-plugin-fs 插件提供前端 API
//   - 后端自定义文件命令可以提供更灵活的操控
//   - 权限检查由 capabilities scope 和后端手动校验双重保障

use serde::Serialize;
use std::path::PathBuf;
use tauri::Manager;

// ============================================================================
// 示例 1：获取应用专属目录路径
// ============================================================================

// Tauri 应用可以访问多种系统标准目录
//
// 前端调用：
// ```typescript
// const dirs = await invoke("get_app_dirs");
// // { app_data: "/Users/.../Library/Application Support/...", ... }
// ```
#[derive(Debug, Serialize)]
pub struct AppDirectories {
    pub app_data: String,
    pub app_cache: String,
    pub app_config: String,
    pub home: String,
    pub desktop: String,
    pub document: String,
    pub download: String,
    pub temp: String,
}

#[tauri::command]
pub fn get_app_dirs(app: tauri::AppHandle) -> Result<AppDirectories, String> {
    // V2 中通过 app.path() 获取各种目录路径
    let path_resolver = app.path();

    Ok(AppDirectories {
        // 应用数据目录（适合存储持久化数据）
        app_data: format_path(path_resolver.app_data_dir()),
        // 缓存目录（可被系统清理）
        app_cache: format_path(path_resolver.app_cache_dir()),
        // 配置文件目录
        app_config: format_path(path_resolver.app_config_dir()),
        // 用户主目录
        home: format_path(path_resolver.home_dir()),
        // 桌面
        desktop: format_path(path_resolver.desktop_dir()),
        // 文档
        document: format_path(path_resolver.document_dir()),
        // 下载
        download: format_path(path_resolver.download_dir()),
        // 临时目录
        temp: format_path(path_resolver.temp_dir()),
    })
}

// 辅助函数：将 Result<PathBuf> 格式化为字符串
fn format_path(result: Result<PathBuf, tauri::Error>) -> String {
    result
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "(不可用)".to_string())
}

// ============================================================================
// 示例 2：基础文件读写命令
// ============================================================================

// 读取文本文件（通过绝对路径）
//
// 前端调用：
// ```typescript
// const content: string = await invoke("read_text_file", {
//     path: "/Users/me/document.txt"
// });
// ```
#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("读取文件失败 '{}': {}", path, e))
}

// 写入文本文件
//
// 前端调用：
// ```typescript
// await invoke("write_text_file", {
//     path: "/Users/me/output.txt",
//     content: "Hello Tauri!"
// });
// ```
#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    // 确保父目录存在
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("创建目录失败: {}", e))?;
    }

    std::fs::write(&path, &content)
        .map_err(|e| format!("写入文件失败 '{}': {}", path, e))
}

// ============================================================================
// 示例 3：安全路径处理（防止路径遍历攻击）
// ============================================================================

// 安全的文件路径组合（拒绝路径遍历）
//
// 前端调用：
// ```typescript
// // 安全示例
// await invoke("safe_read_file", { baseDir: "/app/data", fileName: "config.json" });
// // 会被拒绝的示例
// await invoke("safe_read_file", { baseDir: "/app/data", fileName: "../../etc/passwd" });
// ```
#[tauri::command]
pub fn safe_read_file(
    _app: tauri::AppHandle,
    base_dir: String,
    file_name: String,
) -> Result<String, String> {
    // 1. 获取基础目录
    let base = PathBuf::from(&base_dir);

    // 2. 规范化基础目录（解析符号链接）
    let base_canonical = base
        .canonicalize()
        .map_err(|e| format!("基础目录无效: {}", e))?;

    // 3. 组合路径
    let combined = base_canonical.join(&file_name);

    // 4. 规范化组合后的路径
    let resolved = combined
        .canonicalize()
        .map_err(|_| format!("文件不存在或无法访问: {}", file_name))?;

    // 5. ★ 关键安全检查：确保最终路径在基础目录内
    if !resolved.starts_with(&base_canonical) {
        return Err(format!(
            "路径遍历攻击被阻止！试图访问基础目录之外的文件: {}",
            file_name
        ));
    }

    // 6. 读取文件
    std::fs::read_to_string(&resolved)
        .map_err(|e| format!("读取文件失败: {}", e))
}

// ============================================================================
// 示例 4：文件元信息与目录列表
// ============================================================================

// 文件信息结构体
#[derive(Debug, Serialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
    pub is_file: bool,
    pub modified: String,
}

// 列出目录内容
#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<FileInfo>, String> {
    let dir = std::fs::read_dir(&path)
        .map_err(|e| format!("无法读取目录 '{}': {}", path, e))?;

    let mut files = Vec::new();
    for entry in dir {
        let entry = entry.map_err(|e| format!("读取目录条目失败: {}", e))?;
        let metadata = entry.metadata().map_err(|e| format!("获取元信息失败: {}", e))?;

        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| {
                // 尝试格式化为可读时间
                Some(format!("{:?}", t))
            })
            .unwrap_or_else(|| "未知".to_string());

        files.push(FileInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            size: metadata.len(),
            is_dir: metadata.is_dir(),
            is_file: metadata.is_file(),
            modified,
        });
    }

    // 排序：目录在前，然后按名称
    files.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(files)
}

// ============================================================================
// 示例 5：大文件分块读取 + Channel 传输
// ============================================================================

use tauri::ipc::Channel;

// 分块读取大文件（避免内存溢出）
//
// 前端调用：
// ```typescript
// const channel = new Channel<string>();
// channel.onmessage = (chunk) => { console.log("收到:", chunk); };
//
// // chunkSize 单位是字节
// await invoke("read_large_file", {
//     path: "/data/bigfile.log",
//     chunkSize: 4096,
//     channel: channel
// });
// ```
#[tauri::command]
pub fn read_large_file(
    path: String,
    _chunk_size: usize,
    on_chunk: Channel<String>,
) -> Result<(), String> {
    use std::fs::File;
    use std::io::{BufRead, BufReader};

    // 打开文件
    let file = File::open(&path)
        .map_err(|e| format!("无法打开文件: {}", e))?;

    let reader = BufReader::new(file);
    let mut total_lines = 0u64;

    // 按行读取并分块发送（适合文本文件）
    for line_result in reader.lines() {
        let line = line_result.map_err(|e| format!("读取行失败: {}", e))?;
        total_lines += 1;

        on_chunk.send(line)
            .map_err(|e| format!("Channel 发送失败: {}", e))?;

        // 这里可以加入速率控制
        if total_lines % 1000 == 0 {
            println!("已发送 {} 行", total_lines);
        }
    }

    // 发送完成信号
    let _ = on_chunk.send(format!("[COMPLETED] 总共 {} 行", total_lines));

    Ok(())
}

// ============================================================================
// 示例 6：在应用数据目录中管理 JSON 数据
// ============================================================================

// 从应用数据目录加载 JSON 配置
#[tauri::command]
pub fn load_json_config(app: tauri::AppHandle, file_name: String) -> Result<serde_json::Value, String> {
    let config_dir = app.path()
        .app_config_dir()
        .map_err(|e| format!("获取配置目录失败: {}", e))?;

    let config_path = config_dir.join(&file_name);

    if !config_path.exists() {
        // 返回空对象（首次运行，配置还未创建）
        return Ok(serde_json::json!({}));
    }

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("读取配置文件失败: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("JSON 解析失败: {}", e))
}

// 保存 JSON 配置到应用数据目录
#[tauri::command]
pub fn save_json_config(
    app: tauri::AppHandle,
    file_name: String,
    data: serde_json::Value,
) -> Result<(), String> {
    let config_dir = app.path()
        .app_config_dir()
        .map_err(|e| format!("获取配置目录失败: {}", e))?;

    // 确保目录存在
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("创建配置目录失败: {}", e))?;

    let config_path = config_dir.join(&file_name);
    let json_str = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("JSON 序列化失败: {}", e))?;

    std::fs::write(&config_path, json_str)
        .map_err(|e| format!("保存配置失败: {}", e))
}

// ============================================================================
// 【本章小结】
// ============================================================================
//
// 1. 文件操作方式选择：
//    - V2 前端插件（tauri-plugin-fs）：适合简单文件读写
//    - Rust 自定义命令：适合复杂文件处理、需要额外逻辑
//    - 两层可以混合使用，各取所长
//
// 2. 安全处理：
//    - 始终规范化路径（canonicalize）
//    - 检查路径在允许的目录范围内
//    - 配合 capabilities scope 做双层防御
//    - 不信任用户输入的路径参数
//
// 3. 大文件处理：
//    - 使用 BufReader 逐行读取
//    - 通过 Channel 分块发送给前端
//    - 考虑加入进度通知
//
// 4. 注册命令：
//    .invoke_handler(tauri::generate_handler![
//        get_app_dirs,
//        read_text_file, write_text_file,
//        safe_read_file,
//        list_directory,
//        read_large_file,
//        load_json_config, save_json_config
//    ])
