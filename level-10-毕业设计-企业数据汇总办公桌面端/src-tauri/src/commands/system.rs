// src-tauri/src/commands/system.rs
// WHAT：系统功能 Command —— 系统信息、应用版本、更新检查、全局快捷键
// WHY：桌面应用的特色功能：可以访问系统信息、管理应用更新
// CONTRAST：
//   Electron：app.getVersion() / autoUpdater（Node.js 实现）
//   Swift：   ProcessInfo / NSBundle（系统原生）
//   Tauri：   Rust 端获取系统信息，通过 tauri-plugin-updater 自动更新

use crate::state::{AppState, SystemInfo};
use tauri::Emitter;

/// 获取系统信息
#[tauri::command]
pub fn get_system_info(app: tauri::AppHandle) -> SystemInfo {
    SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        app_version: app.config().version.clone().unwrap_or_default(),
        tauri_version: env!("CARGO_PKG_VERSION").to_string(),
        available_update: None, // 生产环境从 Updater 插件获取
    }
}

/// 获取应用配置
#[tauri::command]
pub async fn get_config(state: tauri::State<'_, AppState>) -> Result<crate::state::AppConfig, String> {
    let config = state.config.lock().await;
    Ok(config.clone())
}

/// 更新应用配置
#[tauri::command]
pub async fn update_config(
    updates: serde_json::Value,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let mut config = state.config.lock().await;
    if let Some(obj) = updates.as_object() {
        for (key, value) in obj {
            match key.as_str() {
                "theme" => {
                    if let Some(v) = value.as_str() {
                        if ["light", "dark", "system"].contains(&v) {
                            config.theme = v.to_string();
                        }
                    }
                }
                "language" => {
                    if let Some(v) = value.as_str() {
                        if ["zh-CN", "en-US"].contains(&v) {
                            config.language = v.to_string();
                        }
                    }
                }
                "auto_sync_enabled" => {
                    if let Some(v) = value.as_bool() {
                        config.auto_sync_enabled = v;
                    }
                }
                "sync_interval_secs" => {
                    if let Some(v) = value.as_u64() {
                        if v >= 30 && v <= 3600 {
                            config.sync_interval_secs = v;
                        }
                    }
                }
                _ => {}
            }
        }
    }
    println!("[Config] 配置已更新: {:?}", config.theme);
    Ok("配置更新成功".into())
}

/// 检查更新
#[tauri::command]
pub async fn check_update(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    println!("[Update] 检查更新...");
    
    // 生产环境使用 tauri-plugin-updater
    // let update = app.updater().check().await?;
    // if let Some(update) = update {
    //     return Ok(serde_json::json!({
    //         "available": true,
    //         "version": update.version,
    //         "body": update.body,
    //     }));
    // }
    
    let _ = app.emit("update-checked", serde_json::json!({
        "available": false,
        "current_version": app.config().version,
    }));

    Ok(serde_json::json!({
        "available": false,
        "current_version": app.config().version,
        "message": "已是最新版本"
    }))
}

/// 获取数据同步状态
#[tauri::command]
pub async fn get_sync_status(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let last_sync = state.last_sync_time.lock().await;
    let api_count = state.api_call_count.load(std::sync::atomic::Ordering::SeqCst);

    Ok(serde_json::json!({
        "last_sync_time": last_sync.map(|t| t.to_rfc3339()),
        "api_call_count": api_count,
        "auto_sync": state.config.lock().await.auto_sync_enabled,
    }))
}
