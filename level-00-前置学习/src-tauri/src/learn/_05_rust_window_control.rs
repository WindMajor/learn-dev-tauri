// ============================================================================
// 05_rust_window_control.rs —— 窗口控制
// ============================================================================
//
// 【对应前端章节】05_window_management.ts
//
// 【学习目标】
//   1. 在 Rust 命令中获取当前窗口引用
//   2. 使用 WebviewWindowBuilder 创建新窗口
//   3. 动态修改窗口属性（标题、大小、置顶等）
//   4. 处理窗口关闭事件与确认对话框
//
// 【核心概念】
//   - Tauri 自动注入 WebviewWindow 或 Window 引用到命令参数
//   - 使用 WebviewWindowBuilder 创建和管理窗口
//   - 窗口 URL 支持三种模式：App、External、CustomProtocol

use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

// ============================================================================
// 示例 1：获取和修改当前窗口属性
// ============================================================================

// 获取当前窗口的基本信息
//
// 前端调用：
// ```typescript
// const info = await invoke("get_current_window_info");
// // { label: "main", title: "...", is_visible: true, is_fullscreen: false, ... }
// ```
#[tauri::command]
pub async fn get_current_window_info(
    window: WebviewWindow,
) -> Result<serde_json::Value, String> {
    let title = window.title().map_err(|e| e.to_string())?;
    let is_visible = window.is_visible().map_err(|e| e.to_string())?;
    let is_fullscreen = window.is_fullscreen().map_err(|e| e.to_string())?;
    let is_maximized = window.is_maximized().map_err(|e| e.to_string())?;
    let scale_factor = window.scale_factor().map_err(|e| e.to_string())?;
    let label = window.label().to_string();

    Ok(serde_json::json!({
        "label": label,
        "title": title,
        "is_visible": is_visible,
        "is_fullscreen": is_fullscreen,
        "is_maximized": is_maximized,
        "scale_factor": scale_factor,
    }))
}

// 动态修改窗口标题
#[tauri::command]
pub fn set_window_title(window: WebviewWindow, new_title: String) -> Result<(), String> {
    window.set_title(&new_title)
        .map_err(|e| format!("设置窗口标题失败: {}", e))
}

// 动态修改窗口大小
#[tauri::command]
pub fn set_window_size(
    window: WebviewWindow,
    width: f64,
    height: f64,
) -> Result<(), String> {
    use tauri::LogicalSize;
    window.set_size(LogicalSize::new(width, height))
        .map_err(|e| format!("设置窗口大小失败: {}", e))
}

// 切换窗口置顶
#[tauri::command]
pub fn toggle_always_on_top(window: WebviewWindow) -> Result<bool, String> {
    let current = window.is_always_on_top().map_err(|e| e.to_string())?;
    window.set_always_on_top(!current)
        .map_err(|e| e.to_string())?;
    Ok(!current) // 返回切换后的状态
}

// ============================================================================
// 示例 2：最小化/最大化/全屏/关闭
// ============================================================================

#[tauri::command]
pub fn minimize_window(window: WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn maximize_window(window: WebviewWindow) -> Result<(), String> {
    window.maximize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unmaximize_window(window: WebviewWindow) -> Result<(), String> {
    window.unmaximize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_fullscreen(window: WebviewWindow) -> Result<bool, String> {
    let current = window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(!current).map_err(|e| e.to_string())?;
    Ok(!current)
}

#[tauri::command]
pub fn show_window(window: WebviewWindow) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn hide_window(window: WebviewWindow) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn close_window(window: WebviewWindow) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

// ============================================================================
// 示例 3：创建新窗口
// ============================================================================

// 创建新窗口（从 Rust 端）
//
// 前端调用：
// ```typescript
// await invoke("open_settings_window");
// ```
#[tauri::command]
pub fn open_settings_window(app: AppHandle) -> Result<(), String> {
    // WebviewUrl::App 表示从内建前端路由加载
    // 路径相对于 frontendDist
    WebviewWindowBuilder::new(&app, "settings", WebviewUrl::App("settings.html".into()))
        .title("设置")
        .inner_size(600.0, 450.0)
        .resizable(true)
        .center()
        .build()
        .map_err(|e| format!("创建设置窗口失败: {}", e))?;

    Ok(())
}

// 创建工具面板窗口（无边框、透明背景）
#[tauri::command]
pub fn open_tool_panel(app: AppHandle) -> Result<(), String> {
    WebviewWindowBuilder::new(&app, "tools-panel", WebviewUrl::App("tools.html".into()))
        .title("工具面板")
        .inner_size(320.0, 500.0)
        .resizable(false)
        .decorations(false)   // ★ 无边框
        .always_on_top(true)  // ★ 始终置顶
        .skip_taskbar(true)   // ★ 不在任务栏显示
        .build()
        .map_err(|e| format!("创建工具窗口失败: {}", e))?;

    Ok(())
}

// ============================================================================
// 示例 4：窗口关闭拦截（"你有未保存的更改"）
// ============================================================================

// 在 setup 中设置关闭拦截
//
// ```rust
// .setup(|app| {
//     let window = app.get_webview_window("main").expect("main window not found");
//     let window_clone = window.clone();
//
//     window.on_window_event(move |event| {
//         if let tauri::WindowEvent::CloseRequested { api, .. } = event {
//             // 阻止默认关闭
//             api.prevent_close();
//
//             // 发送事件通知前端（前段可以弹出确认对话框）
//             let _ = window_clone.emit("window:close-requested", ());
//
//             // 前端确认后再由前端调用 close_window 命令
//         }
//     });
//
//     Ok(())
// })
// ```

// ============================================================================
// 示例 5：窗口间通信桥梁
// ============================================================================

// 向指定标签的窗口发送事件
#[tauri::command]
pub fn send_to_window(
    app: AppHandle,
    target_label: String,
    event_name: String,
    payload: String,
) -> Result<(), String> {
    // 查找目标窗口
    if let Some(target_window) = app.get_webview_window(&target_label) {
        target_window
            .emit(&event_name, &payload)
            .map_err(|e| format!("发送事件到窗口 '{}' 失败: {}", target_label, e))?;
        Ok(())
    } else {
        Err(format!("窗口 '{}' 不存在", target_label))
    }
}

// 获取所有窗口标签列表
#[tauri::command]
pub fn list_all_windows(app: AppHandle) -> Vec<String> {
    app.webview_windows()
        .keys()
        .cloned()
        .collect()
}

// ============================================================================
// 示例 6：窗口位置与屏幕坐标
// ============================================================================

// 设置窗口到指定位置（屏幕坐标）
#[tauri::command]
pub fn set_window_position(
    window: WebviewWindow,
    x: f64,
    y: f64,
) -> Result<(), String> {
    use tauri::LogicalPosition;
    window.set_position(LogicalPosition::new(x, y))
        .map_err(|e| e.to_string())
}

// 获取窗口中心坐标（用于弹出子窗口）
#[tauri::command]
pub fn get_window_center(window: WebviewWindow) -> Result<(f64, f64), String> {
    let outer_pos = window.outer_position().map_err(|e| e.to_string())?;
    let outer_size = window.outer_size().map_err(|e| e.to_string())?;

    let cx = outer_pos.x as f64 + outer_size.width as f64 / 2.0;
    let cy = outer_pos.y as f64 + outer_size.height as f64 / 2.0;

    Ok((cx, cy))
}

// ============================================================================
// 示例 7：子窗口（父子关系）
// ============================================================================

// 创建与父窗口关联的子窗口
// 子窗口会保持在父窗口之上
#[tauri::command]
pub fn open_child_window(
    app: AppHandle,
    parent_label: String,
    child_label: String,
    title: String,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let _parent = app
        .get_webview_window(&parent_label)
        .ok_or_else(|| format!("父窗口 '{}' 不存在", parent_label))?;

    // V2 中可以通过 parent 设置父子关系
    // （具体 API 取决于 Tauri V2 版本，此处展示概念）
    let _window = WebviewWindowBuilder::new(
        &app,
        &child_label,
        WebviewUrl::App(format!("{}.html", child_label).into()),
    )
        .title(&title)
        .inner_size(width, height)
        .center()
        .build()
        .map_err(|e| format!("创建子窗口失败: {}", e))?;

    Ok(())
}

// ============================================================================
// 【本章小结】
// ============================================================================
//
// 1. V2 窗口控制核心 API：
//    - WebviewWindow：当前窗口引用（自动注入）
//    - WebviewWindowBuilder：创建新窗口
//    - AppHandle::get_webview_window()：查找特定窗口
//
// 2. 窗口创建选项：
//    - decorations: 控制标题栏显示
//    - transparent: 透明背景
//    - always_on_top: 始终置顶
//    - skip_taskbar: 隐藏任务栏图标
//    - center: 屏幕居中
//
// 3. 窗口间通信：
//    - 全局事件：app.emit()
//    - 窗口级事件：target_window.emit()
//    - 状态共享：通过 Rust State（见 02 章）
//
// 4. 关闭拦截模式：
//    - 监听 WindowEvent::CloseRequested
//    - 调用 api.prevent_close() 阻止关闭
//    - 通过事件通知前端弹出确认对话框
//    - 前端确认后调用 close_window 命令
//
// 5. 注册命令：
//    .invoke_handler(tauri::generate_handler![
//        get_current_window_info, set_window_title, set_window_size,
//        toggle_always_on_top,
//        minimize_window, maximize_window, unmaximize_window,
//        toggle_fullscreen, show_window, hide_window, close_window,
//        open_settings_window, open_tool_panel,
//        send_to_window, list_all_windows,
//        set_window_position, get_window_center,
//        open_child_window
//    ])
