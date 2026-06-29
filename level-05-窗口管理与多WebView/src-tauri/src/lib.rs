// Level 05：窗口管理与多 WebView
// WHAT：演示 WebviewWindowBuilder 创建多窗口、窗口间通信、状态持久化
// CONTRAST：
//   Electron：BrowserWindow（每个窗口独立 Renderer 进程）
//   Swift：   NSWindow + NSWindowController（原生但平台独占）
//   Tauri v2：WebviewWindow（单进程，WebView 与 Window 分离）

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct WindowConfig { label: String, title: String, width: f64, height: f64, url: String }

/// 创建子窗口
/// 
/// 【WARNING】visible: false 防止白屏闪烁，先创建再 show
#[tauri::command]
fn create_child_window(label: String, title: String, app: tauri::AppHandle) -> Result<String, String> {
    let url = "/".to_string();
    let win = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(url.into()))
        .title(&title)
        .inner_size(600.0, 400.0)
        .visible(false)       // 【关键】先隐藏，防止白屏
        .resizable(true)
        .decorations(true)
        .build()
        .map_err(|e| format!("创建窗口失败: {e}"))?;

    // 窗口创建完毕后显示（或等待前端 ready 事件）
    win.show().map_err(|e| format!("{e}"))?;

    Ok(format!("窗口 '{}' 创建成功", label))
}

/// 列出所有窗口
#[tauri::command]
fn list_windows(app: tauri::AppHandle) -> Vec<WindowConfig> {
    app.webview_windows().iter().map(|(label, w)| {
        let size = w.inner_size().unwrap_or(tauri::PhysicalSize::new(800, 600));
        WindowConfig {
            label: label.clone(), title: w.title().unwrap_or_default(),
            width: size.width as f64, height: size.height as f64, url: "/".into(),
        }
    }).collect()
}

/// 关闭指定窗口
#[tauri::command]
fn close_window(label: String, app: tauri::AppHandle) -> Result<String, String> {
    if let Some(win) = app.get_webview_window(&label) {
        win.close().map_err(|e| format!("{e}"))?;
        Ok(format!("窗口 '{}' 已关闭", label))
    } else {
        Err(format!("窗口 '{}' 不存在", label))
    }
}

/// 窗口间消息广播
#[tauri::command]
fn broadcast_message(msg: String, app: tauri::AppHandle) -> Result<(), String> {
    app.emit("cross-window-msg", &serde_json::json!({
        "from": "main", "message": msg, "time": chrono_now()
    })).map_err(|e| format!("{e}"))
}

fn chrono_now() -> String {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs().to_string()).unwrap_or_default()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            create_child_window, list_windows, close_window, broadcast_message
        ])
        .setup(|app| {
            // 启动时恢复窗口状态（简化演示）
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_title("Level 05 - 窗口管理中心");
            }
            println!("[Tauri] Level 05 窗口管理中心就绪");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动失败");
}
