/**
 * ============================================================================
 * 06_menu_and_tray.ts —— 菜单与系统托盘
 * ============================================================================
 *
 * 【学习目标】
 *   1. 掌握应用菜单（Menu）的构建方式：MenuItem, Submenu, PredefinedMenuItem
 *   2. 理解右键上下文菜单的绑定与使用
 *   3. 学会系统托盘（Tray）的创建与事件处理
 *   4. 了解平台差异（macOS Dock 菜单 vs Windows 任务栏）
 *
 * 【与纯 Web 开发的核心差异】
 *   - 纯 Web：浏览器没有原生菜单概念（只有右键 contextmenu 事件）
 *   - Tauri：可以使用操作系统原生菜单栏（macOS 顶部栏 / Windows 窗口菜单栏）
 *   - 右键菜单在 Tauri 中使用原生实现，比 HTML contextmenu 更一致
 *   - 系统托盘是桌面应用独有功能，Web 应用无法实现
 */

// V2 菜单通过 Rust 端构建和注册，前端主要监听菜单事件
// 以下展示前端如何配合 Rust 端菜单工作

import { emit, listen } from "@tauri-apps/api/event";

// ============================================================================
// 示例 1：应用菜单栏（MenuBar）概念与 Rust 构建方式
// ============================================================================
// 场景：为应用创建 File、Edit、Help 等标准菜单栏
// Tauri V2 特性：菜单主要在 Rust 端通过 tauri::menu 模块构建

console.log("=== 示例 1：应用菜单栏概念 ===");

/**
 * // ====== 在 Rust 端构建菜单（放在 lib.rs 的 setup 钩子中） ======
 *
 * // 注意：V2 的菜单 API 在 tauri::menu 模块中
 * // 需要在 Cargo.toml 的 tauri features 中添加必要特性
 *
 * use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
 *
 * pub fn run() {
 *     tauri::Builder::default()
 *         .setup(|app| {
 *             // 创建菜单项
 *             let open = MenuItemBuilder::with_id("file_open", "打开")
 *                 .accelerator("CmdOrCtrl+O")
 *                 .build(app)?;
 *
 *             let save = MenuItemBuilder::with_id("file_save", "保存")
 *                 .accelerator("CmdOrCtrl+S")
 *                 .build(app)?;
 *
 *             let quit = MenuItemBuilder::with_id("file_quit", "退出")
 *                 .accelerator("CmdOrCtrl+Q")
 *                 .build(app)?;
 *
 *             // 创建子菜单
 *             let file_menu = SubmenuBuilder::new(app, "文件")
 *                 .item(&open)
 *                 .item(&save)
 *                 .separator()
 *                 .item(&quit)
 *                 .build()?;
 *
 *             // 创建菜单栏
 *             let menu = MenuBuilder::new(app)
 *                 .item(&file_menu)
 *                 .build()?;
 *
 *             // 设置应用菜单
 *             app.set_menu(menu)?;
 *
 *             Ok(())
 *         })
 *         .on_menu_event(|app, event| {
 *             // 处理菜单点击事件
 *             match event.id().as_ref() {
 *                 "file_open" => { app.emit("menu:open", ()).unwrap(); }
 *                 "file_save" => { app.emit("menu:save", ()).unwrap(); }
 *                 "file_quit" => { app.exit(0); }
 *                 _ => {}
 *             }
 *         })
 *         .run(tauri::generate_context!())
 *         .expect("error");
 * }
 */

// ====== 前端监听菜单事件 ======
async function listenToMenuEvents() {
  // 监听"打开"菜单项被点击
  const unlistenOpen = await listen("menu:open", () => {
    console.log("用户点击了 文件 → 打开");
    // 这里调用打开文件对话框
  });

  // 监听"保存"菜单项被点击
  const unlistenSave = await listen("menu:save", () => {
    console.log("用户点击了 文件 → 保存");
    // 这里执行保存逻辑
  });

  console.log("菜单事件监听已设置");
  // 注意：记住在组件卸载时调用 unlistenOpen() 和 unlistenSave()
}

// ============================================================================
// 示例 2：预定义菜单项（PredefinedMenuItem）
// ============================================================================
// 场景：使用系统提供的标准菜单项（如复制、粘贴、撤销、重做）

console.log("=== 示例 2：预定义菜单项 ===");

/**
 * // ====== Rust 端使用预定义菜单项 ======
 *
 * use tauri::menu::{PredefinedMenuItem, SubmenuBuilder, MenuBuilder};
 *
 * .setup(|app| {
 *     // 系统预定义的菜单项（自带原生行为）
 *     let undo = PredefinedMenuItem::undo(app, Some("撤销"))?;    // Cmd+Z
 *     let redo = PredefinedMenuItem::redo(app, Some("重做"))?;    // Cmd+Shift+Z
 *     let cut = PredefinedMenuItem::cut(app, Some("剪切"))?;      // Cmd+X
 *     let copy = PredefinedMenuItem::copy(app, Some("复制"))?;    // Cmd+C
 *     let paste = PredefinedMenuItem::paste(app, Some("粘贴"))?;  // Cmd+V
 *     let select_all = PredefinedMenuItem::select_all(app, Some("全选"))?; // Cmd+A
 *
 *     let edit_menu = SubmenuBuilder::new(app, "编辑")
 *         .item(&undo)
 *         .item(&redo)
 *         .separator()
 *         .item(&cut)
 *         .item(&copy)
 *         .item(&paste)
 *         .separator()
 *         .item(&select_all)
 *         .build()?;
 *
 *     let menu = MenuBuilder::new(app)
 *         .item(&edit_menu)
 *         .build()?;
 *
 *     app.set_menu(menu)?;
 *     Ok(())
 * })
 *
 * // PredefinedMenuItem 类型枚举：
 * // - undo, redo, cut, copy, paste, select_all
 * // - minimize, maximize, close_window, quit
 * // - separator (分隔线)
 * // - hide, hide_others, show_all (macOS 专用)
 */

// ============================================================================
// 示例 3：右键上下文菜单（Context Menu）
// ============================================================================
// 场景：在特定元素上右键时，弹出原生上下文菜单
// Tauri V2 特性：支持在 Rust 端构建并弹出原生右键菜单

console.log("=== 示例 3：右键上下文菜单 ===");

/**
 * // ====== 方式 1：前端触发 Rust 弹出菜单（推荐） ======
 *
 * // 前端监听右键事件，通过 invoke 告诉 Rust 弹出菜单
 *
 * // 前端代码（在 Vue 组件中）：
 * function onContextMenu(event: MouseEvent) {
 *   event.preventDefault();  // 阻止浏览器默认右键菜单
 *   invoke("show_context_menu", {
 *     x: event.clientX,
 *     y: event.clientY,
 *     itemId: "some-item-id"
 *   });
 * }
 * 
 * // HTML 模板：
 * // <div @contextmenu="onContextMenu" data-id="item-123">右键点击我</div>
 */

/**
 * // ====== Rust 端弹出菜单 ======
 *
 * use tauri::menu::{ContextMenuBuilder, MenuItemBuilder};
 * use tauri::{Emitter, WebviewWindow};
 *
 * #[tauri::command]
 * fn show_context_menu(window: WebviewWindow, x: f64, y: f64, item_id: String) {
 *     let edit = MenuItemBuilder::with_id("ctx_edit", "编辑").build(&window).unwrap();
 *     let delete = MenuItemBuilder::with_id("ctx_delete", "删除").build(&window).unwrap();
 *     let props = MenuItemBuilder::with_id("ctx_properties", "属性").build(&window).unwrap();
 *
 *     let menu = ContextMenuBuilder::new(&window)
 *         .item(&edit)
 *         .item(&delete)
 *         .separator()
 *         .item(&props)
 *         .build()
 *         .unwrap();
 *
 *     // 弹出菜单
 *     window.popup_menu(&menu, tauri::PhysicalPosition::new(x as i32, y as i32)).unwrap();
 * }
 *
 * // 或被移至应用级：
 * // .on_menu_event(|app, event| {
 * //     match event.id().as_ref() {
 * //         "ctx_delete" => app.emit("context:delete", item_id).unwrap(),
 * //         _ => {}
 * //     }
 * // })
 */

// ============================================================================
// 示例 4：系统托盘（System Tray）
// ============================================================================
// 场景：应用最小化到系统托盘，点击托盘图标恢复窗口
// Tauri V2 特性：V2 中托盘通过 tauri::tray 模块配置（需要在 features 中启用 "tray-icon"）

console.log("=== 示例 4：系统托盘 ===");

/**
 * // ====== 在 Cargo.toml 中启用托盘特性 ======
 * [dependencies]
 * tauri = { version = "2", features = ["tray-icon"] }
 *
 * // ====== Rust 端构建托盘 ======
 *
 * use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
 * use tauri::menu::{MenuBuilder, MenuItemBuilder};
 *
 * pub fn run() {
 *     tauri::Builder::default()
 *         .setup(|app| {
 *             // 创建托盘菜單
 *             let show = MenuItemBuilder::with_id("tray_show", "显示窗口").build(app)?;
 *             let quit = MenuItemBuilder::with_id("tray_quit", "退出").build(app)?;
 *
 *             let tray_menu = MenuBuilder::new(app)
 *                 .item(&show)
 *                 .separator()
 *                 .item(&quit)
 *                 .build()?;
 *
 *             // 创建托盘图标
 *             let _tray = TrayIconBuilder::new()
 *                 .icon(app.default_window_icon().unwrap().clone())  // 使用应用图标
 *                 .tooltip("Tauri V2 学习应用")                        // 悬停提示
 *                 .menu(&tray_menu)                                    // 右键菜单
 *                 .on_menu_event(|app, event| {
 *                     match event.id().as_ref() {
 *                         "tray_show" => {
 *                             // 显示主窗口
 *                             if let Some(window) = app.get_webview_window("main") {
 *                                 let _ = window.show();
 *                                 let _ = window.set_focus();
 *                             }
 *                         }
 *                         "tray_quit" => { app.exit(0); }
 *                         _ => {}
 *                     }
 *                 })
 *                 .on_tray_icon_event(|tray, event| {
 *                     // 处理托盘图标点击
 *                     if let TrayIconEvent::Click {
 *                         button: MouseButton::Left,
 *                         button_state: MouseButtonState::Up,
 *                         ..
 *                     } = event {
 *                         // 左键点击切换窗口显示/隐藏
 *                         let app = tray.app_handle();
 *                         if let Some(window) = app.get_webview_window("main") {
 *                             let _ = window.show();
 *                             let _ = window.set_focus();
 *                         }
 *                     }
 *                 })
 *                 .build(app)?;
 *
 *             Ok(())
 *         })
 *         .run(tauri::generate_context!())
 *         .expect("error");
 * }
 */

// ====== 前端：监听窗口关闭，隐藏而非退出 ======
async function trayIntegration() {
  // 最小化到托盘而非关闭
  const currentWindow = (
    await import("@tauri-apps/api/webviewWindow")
  ).getCurrentWebviewWindow();

  currentWindow.onCloseRequested(async (event) => {
    event.preventDefault();
    // 隐藏窗口而非关闭（用户通过托盘菜单退出）
    await currentWindow.hide();
    console.log("窗口已隐藏到系统托盘");
  });

  // 监听来自托盘的显示事件
  const unlistenShow = await listen("tray:show-window", async () => {
    await currentWindow.show();
    await currentWindow.setFocus();
  });
}

// ============================================================================
// 示例 5：上下文菜单的另一种实现 —— 前端纯 HTML/CSS 菜单
// ============================================================================
// 场景：如果不需要原生菜单，也可以用前端技术实现右键菜单
// 对比：原生菜单 vs 前端实现的选择

console.log("=== 示例 5：原生菜单 vs 前端菜单 ===");
console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║       原生右键菜单 vs 前端右键菜单                      ║
  ╠═══════════════════════════════════════════════════════╣
  ║ 特性           │ 原生菜单（Rust）  │ 前端菜单（HTML）  ║
  ╠═══════════════════════════════════════════════════════╣
  ║ 外观一致性     │ ★★★★★ 系统原生   │ ★★★ 需自行实现   ║
  ║ 跨平台一致性   │ ★★★★★ 自动适配   │ ★★★★ 需测试      ║
  ║ 自定义样式     │ ★★ 受限         │ ★★★★★ 完全自由   ║
  ║ 快捷键支持     │ ★★★★ 原生支持   │ ★★ 需手写监听    ║
  ║ 实现复杂度     │ ★★★ 需 Rust     │ ★★ 纯前端即可    ║
  ║ 可扩展性       │ ★★★ 固定结构    │ ★★★★★ 任意自定义  ║
  ╚═══════════════════════════════════════════════════════╝
  
  建议：
  - 应用菜单栏：必须用原生（应用体验的基础）
  - 右键菜单：简单操作用原生，复杂交互用前端
  - 系统托盘：必须用原生
`);

// ============================================================================
// 示例 6：动态更新菜单项（启用/禁用、勾选状态）
// ============================================================================
// 场景：根据应用状态动态切换菜单项的可用性和勾选状态

console.log("=== 示例 6：动态菜单 ===");

/**
 * // ====== Rust 端：提供更新菜单状态的命令 ======
 *
 * use tauri::{AppHandle, menu::MenuBuilder};
 *
 * #[tauri::command]
 * fn set_menu_item_enabled(app: AppHandle, menu_id: String, enabled: bool) {
 *     if let Some(item) = app.menu_item(&menu_id) {
 *         let _ = item.set_enabled(enabled);
 *     }
 * }
 *
 * #[tauri::command]
 * fn set_menu_item_checked(app: AppHandle, menu_id: String, checked: bool) {
 *     // 适用于 Check 类型的菜单项
 *     if let Some(item) = app.menu_item(&menu_id) {
 *         let _ = item.set_checked(checked);
 *     }
 * }
 *
 * // 使用时，在 setup 中通过 app.menu_item() 或保存引用
 * // MenuItemBuilder::with_id 设置的 id 就是查找的 key
 *
 * // Check 菜单项示例：
 * // let dark_mode = CheckMenuItemBuilder::with_id("view_darkmode", "深色模式")
 * //     .checked(false)
 * //     .build(app)?;
 */

// ============================================================================
// 示例 7：平台差异处理（macOS vs Windows vs Linux）
// ============================================================================
// 场景：不同操作系统的菜单行为不同，需要针对性处理

console.log("=== 示例 7：平台差异 ===");
console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║               平台菜单差异                                 ║
  ╠══════════════════════════════════════════════════════════╣
  ║                                                        ║
  ║  macOS 特殊行为：                                       ║
  ║  - 菜单栏在屏幕顶部（非窗口内）                          ║
  ║  - 第一个子菜单自动变为应用菜单（含"关于"、"退出"等）     ║
  ║  - 支持 Dock 菜单（右键点击 Dock 图标弹出菜单）          ║
  ║  - 快捷键使用 Cmd 而非 Ctrl                             ║
  ║                                                        ║
  ║  Windows 特殊行为：                                     ║
  ║  - 菜单栏在窗口顶部（每个窗口独立）                      ║
  ║  - 系统托盘在任务栏右下角                                ║
  ║  - 关闭窗口 = 退出应用（默认，可修改）                    ║
  ║                                                        ║
  ║  Linux 特殊行为：                                       ║
  ║  - 不同 DE（GNOME/KDE/etc.）表现可能不同                ║
  ║  - 系统托盘可能需要安装额外依赖（libappindicator）       ║
  ║                                                        ║
  ║  Tauri 跨平台处理建议：                                  ║
  ║  - 使用 CmdOrCtrl 表示快捷键修饰符（自动适配）           ║
  ║  - 托盘图标需要 .png 格式（非 .ico）                     ║
  ║  - #[cfg(target_os = "macos")] 做平台条件编译            ║
  ║                                                        ║
  ╚══════════════════════════════════════════════════════════╝
`);

// ============================================================================
// 【常见错误示例】
// ============================================================================

console.log("=== 常见错误示例 ===");

console.log(`
  ❌ 错误 1：忘记在 Cargo.toml 中启用托盘 feature
  [dependencies]
  tauri = { version = "2" }  ← 缺少 features = ["tray-icon"]
  
  原因：V2 的托盘功能是可选 feature，默认不包含
  修复：tauri = { version = "2", features = ["tray-icon"] }

  ❌ 错误 2：菜单项 ID 重名
  MenuItemBuilder::with_id("save", "保存").build(app);
  MenuItemBuilder::with_id("save", "另存为").build(app);  ← ID 冲突
  
  原因：菜单项 ID 必须全局唯一
  修复：使用带前缀的 ID，如 "file_save", "file_save_as"

  ❌ 错误 3：在前端直接构建菜单（V2 API 变更）
  在 V2 中菜单主要在 Rust 端构建，前端通过事件监听菜单操作、
  调用 Rust 命令触发菜单更新
  
  原因：V2 架构调整，菜单逻辑移至 Rust 端
  修复：使用 Rust 端的 MenuBuilder / ContextMenuBuilder
`);

// ============================================================================
// 【本章小结】
// ============================================================================
/**
 * 1. Tauri V2 菜单系统核心概念：
 *    - MenuBuilder：构建应用菜单栏
 *    - SubmenuBuilder：构建子菜单
 *    - MenuItemBuilder：构建菜单项（带 ID 用于事件识别）
 *    - PredefinedMenuItem：系统预定义菜单项（撤销、复制、粘贴等）
 *    - ContextMenuBuilder：构建右键上下文菜单
 *
 * 2. 菜单架构变化（V2）：
 *    - 菜单主要在 Rust 端构建和注册（.setup() 钩子中）
 *    - .on_menu_event() 处理菜单点击事件
 *    - 前端通过事件监听响应菜单操作
 *
 * 3. 系统托盘（Tray）：
 *    - 需要 features = ["tray-icon"]
 *    - TrayIconBuilder 构建托盘（图标 + 菜单 + 事件处理）
 *    - 监听左键点击切换窗口，右键弹出菜单
 *
 * 4. 平台差异：
 *    - macOS 菜单在屏幕顶部，Windows 在窗口内
 *    - 使用 CmdOrCtrl 快捷键自适应
 *    - 条件编译处理平台特定行为
 *
 * 5. 选择建议：
 *    - 应用菜单栏 → 必须原生
 *    - 右键菜单 → 简单操作用原生，复杂 UI 用前端
 *    - 系统托盘 → 原生（桌面应用的标志性功能）
 */
