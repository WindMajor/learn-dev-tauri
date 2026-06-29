// Level 06：菜单、托盘与系统集成
// WHAT：Tauri v2 的系统级交互 —— 托盘、全局快捷键、通知
// CONTRAST：
//   Electron：Tray + globalShortcut + Notification API（相似但体积大）
//   Swift：   NSStatusBar + CGEvent + UNUserNotificationCenter（平台独占）
//   egui：    无内置托盘支持（需借助 winit/tao 底层 API）

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Emitter,
};

#[tauri::command]
fn send_system_notification(title: String, body: String, app: tauri::AppHandle) -> Result<(), String> {
    // 使用 tauri-plugin-notification
    tauri_plugin_notification::Notification::new(&app.config().identifier)
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| format!("通知失败: {e}"))?;
    Ok(())
}

#[tauri::command]
fn get_app_info(app: tauri::AppHandle) -> serde_json::Value {
    serde_json::json!({
        "name": app.config().product_name,
        "version": app.config().version,
        "identifier": app.config().identifier,
    })
}

fn build_tray_menu(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItemBuilder::with_id("show", "显示窗口").build(app)?;
    let hide = MenuItemBuilder::with_id("hide", "隐藏窗口").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;
    let menu = MenuBuilder::new(app).items(&[&show, &hide, &quit]).build()?;

    // TrayIconBuilder —— v2 的托盘 API
    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Level 06 - 菜单托盘演示")
        .on_menu_event(move |app, event| {
            match event.id().as_ref() {
                "show" => { if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.set_focus(); } }
                "hide" => { if let Some(w) = app.get_webview_window("main") { let _ = w.hide(); } }
                "quit" => { app.exit(0); }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            // 左键点击托盘图标 → 显示/隐藏主窗口
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    if w.is_visible().unwrap_or(false) { let _ = w.hide(); }
                    else { let _ = w.show(); let _ = w.set_focus(); }
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![send_system_notification, get_app_info])
        .setup(|app| {
            build_tray_menu(&app.handle())?;
            println!("[Tauri] Level 06 启动——托盘+通知+快捷键已就绪");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动失败");
}
