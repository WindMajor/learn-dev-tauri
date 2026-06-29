// src-tauri/src/lib.rs
// WHAT：DataHub Desktop 主入口 —— 注册所有 Commands、State、Plugins、Menu、Tray
// WHY：这是 Tauri v2 的 IOC 容器（类似 NestJS 的 AppModule），所有能力在此组装
//
// 架构概览：
//   ┌─────────────────────────────────────────────────────────┐
//   │  DataHub Desktop（Tauri v2 App）                        │
//   │  ┌──────────────┐  ┌──────────────────────────────────┐ │
//   │  │ Rust Core     │  │ Vue3 WebView                     │ │
//   │  │ • commands/   │◄─┤ • views/ (Login/Dashboard/...)  │ │
//   │  │   auth.rs     │  │ • stores/ (Pinia)               │ │
//   │  │   report.rs   │  │ • router/ (Hash)                │ │
//   │  │   file.rs     │  │ • composables/ (useTauri)       │ │
//   │  │   system.rs   │  │ • api/ (tauri.ts IPC 封装)      │ │
//   │  │ • state.rs    │  └──────────────────────────────────┘ │
//   │  │ • plugins/    │                                        │
//   │  │   custom.rs   │  ┌──────────────────────────────────┐ │
//   │  │ • Tray Icon   │  │ 系统托盘（最小化后台运行）        │ │
//   │  └──────────────┘  └──────────────────────────────────┘ │
//   └─────────────────────────────────────────────────────────┘
//
// CONTRAST：
//   Electron：main.js 中 require('electron') 然后手动构建一切
//   NestJS：  NestFactory.create(AppModule) 声明式组装
//   Tauri：   tauri::Builder 链式 API 组装（类型安全 + 编译期检查）

mod state;
mod commands;
mod plugins;

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Emitter,
};
use state::AppState;
use plugins::custom::DataHubPlugin;

// ─── 构建系统托盘 ───
fn build_tray(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItemBuilder::with_id("show", "显示主窗口").build(app)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let about = MenuItemBuilder::with_id("about", "关于 DataHub").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[&show, &separator, &about, &quit])
        .build()?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("DataHub Desktop - 企业数据汇总")
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "show" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
                "about" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.show();
                        let _ = w.set_focus();
                        let _ = app.emit("navigate", "/settings");
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    if w.is_visible().unwrap_or(false) {
                        let _ = w.hide();
                    } else {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    println!("[Tray] 系统托盘已创建");
    Ok(())
}

// ─── 注册全局快捷键 ───
fn register_shortcuts(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    let app_handle = app.clone();
    app.plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_handler(move |_app, shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    println!("[Shortcut] 快捷键触发: {:?}", shortcut);
                }
            })
            .build(),
    )?;

    // 注册快捷键：Cmd/Ctrl+Shift+D 显示主窗口
    #[cfg(target_os = "macos")]
    let shortcut_str = "CmdOrCtrl+Shift+D";
    #[cfg(not(target_os = "macos"))]
    let shortcut_str = "Ctrl+Shift+D";

    app.global_shortcut().register(shortcut_str)?;

    println!("[Shortcut] 全局快捷键已注册: {shortcut_str}");
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::new();

    tauri::Builder::default()
        // ─── 注册插件 ───
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        // 自定义插件
        .plugin(DataHubPlugin::new())
        // ─── 注册 State ───
        .manage(app_state)
        // ─── 注册全部 Commands ───
        .invoke_handler(tauri::generate_handler![
            // auth
            commands::auth::login,
            commands::auth::logout,
            commands::auth::get_session,
            commands::auth::check_auth,
            // report
            commands::report::list_reports,
            commands::report::get_report_detail,
            // file
            commands::file::import_csv,
            commands::file::export_csv,
            commands::file::get_file_info,
            // system
            commands::system::get_system_info,
            commands::system::get_config,
            commands::system::update_config,
            commands::system::check_update,
            commands::system::get_sync_status,
        ])
        // ─── Setup 钩子 ───
        .setup(|app| {
            let handle = app.handle();

            // 创建系统托盘
            build_tray(&handle)?;

            // 注册全局快捷键
            let _ = register_shortcuts(&handle);

            println!("╔══════════════════════════════════════════════╗");
            println!("║  DataHub Desktop v1.0.0                      ║");
            println!("║  企业数据汇总办公桌面端                       ║");
            println!("║  Rust 后端: {} Commands 已注册              ║", 13);
            println!("║  Vue3 前端: Pinia + Vue Router + Composables ║");
            println!("║  托盘 + 快捷键 + 通知 + 多窗口 + 自动更新      ║");
            println!("╚══════════════════════════════════════════════╝");

            Ok(())
        })
        // ─── 窗口关闭时的行为（MacOS 习惯：关闭窗口不退出，隐藏到托盘） ───
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                #[cfg(target_os = "macos")]
                {
                    let _ = window.hide();
                    api.prevent_close();
                }
                #[cfg(not(target_os = "macos"))]
                {
                    // Windows/Linux：直接关闭
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("启动 DataHub Desktop 失败");
}
