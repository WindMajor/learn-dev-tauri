// Level 09：打包、签名与自动更新
// WHAT：Tauri v2 的多平台打包配置 + 代码签名 + 自动更新 Updater
// WHY：这是从开发到交付的最后一步
// CONTRAST：
//   Electron：electron-builder 配置类似但产物体积 ~150MB vs Tauri ~5MB
//   Swift：   Xcode Archive + notarytool vs Tauri cargo tauri build + codesign
//   Docker：  容器化分发（运行时依赖）vs Tauri 原生二进制（自包含）

use tauri::Emitter;

/// 获取构建信息
#[tauri::command]
fn get_build_info(app: tauri::AppHandle) -> serde_json::Value {
    let config = app.config();
    serde_json::json!({
        "product_name": config.product_name,
        "version": config.version,
        "identifier": config.identifier,
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "build_type": if cfg!(debug_assertions) { "debug" } else { "release" },
        "target": std::env::consts::ARCH,
        "binary_size_hint": "~5MB (Tauri) vs ~150MB (Electron)",
    })
}

/// 检查更新（演示）
#[tauri::command]
async fn check_for_update(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    println!("[Updater] 检查更新...");
    let _ = app.emit("update-checked", serde_json::json!({ "status": "no_update" }));
    Ok(serde_json::json!({
        "available": false,
        "current_version": app.config().version,
        "message": "已是最新版本。生产环境中配置 updater endpoint 后启用自动更新。"
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![get_build_info, check_for_update])
        .setup(|_app| {
            println!("[Tauri] Level 09 - 打包签名与自动更新 启动");
            println!("[Tauri] 运行: cargo tauri build 生成分发安装包");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动失败");
}
