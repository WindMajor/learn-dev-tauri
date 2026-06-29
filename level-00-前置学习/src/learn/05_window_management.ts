/**
 * ============================================================================
 * 05_window_management.ts —— 窗口管理
 * ============================================================================
 *
 * 【学习目标】
 *   1. 掌握创建和管理多窗口的核心 API
 *   2. 理解窗口配置选项（位置、大小、装饰、透明度等）
 *   3. 学会窗口间通信（事件总线、共享状态）
 *   4. 了解窗口生命周期管理
 *
 * 【与纯 Web 开发的核心差异】
 *   - 纯 Web（window.open）：受浏览器安全限制，无法控制窗口外观
 *   - Tauri WebviewWindow：原生窗口 + 嵌入式 WebView，完全控制窗口属性
 *   - Tauri 窗口可以有自定义标题栏、透明背景、阴影、无边框
 *   - 多窗口之间共享同一个 Rust 后端进程（状态互通）
 *   - 每个窗口是独立的 WebView 实例（独立 JS 上下文）
 */

import { WebviewWindow, getAllWebviewWindows, getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emit, listen } from "@tauri-apps/api/event";

// ============================================================================
// 示例 1：获取当前窗口
// ============================================================================
// 场景：你需要在组件中操作当前窗口（如修改标题、切换全屏）

async function example1_currentWindow() {
  // ====== 获取当前窗口实例 ======
  const currentWindow = getCurrentWebviewWindow();

  // 获取窗口标签（label），类似浏览器中的 window.name
  console.log("当前窗口标签:", currentWindow.label);

  // 获取窗口标题
  // 注意：V2 中许多方法返回 Promise
  const title = await currentWindow.title();
  console.log("当前窗口标题:", title);

  // 修改窗口标题
  await currentWindow.setTitle("Tauri V2 学习 - 窗口管理");
  console.log("窗口标题已更新");

  // 检查窗口是否可见
  const isVisible = await currentWindow.isVisible();
  console.log("窗口是否可见:", isVisible);

  // 获取窗口是否为全屏
  const isFullscreen = await currentWindow.isFullscreen();
  console.log("是否全屏:", isFullscreen);
}

// ============================================================================
// 示例 2：创建新窗口
// ============================================================================
// 场景：点击按钮打开一个新窗口（如设置页、详情页、工具面板）
// Tauri V2 特性：WebviewWindow 创建的原生窗口内嵌 WebView

async function example2_createWindow() {
  // ====== 基础窗口创建 ======
  const settingsWindow = new WebviewWindow("settings", {
    url: "/settings.html", // 前端路由地址（或完整 URL）
    title: "设置",
    width: 600,
    height: 400,
    resizable: true,
    decorations: true, // 显示原生标题栏
    center: true, // 屏幕居中
    // 更多配置见示例 3
  });

  // 监听窗口创建完成
  settingsWindow.once("tauri://created", () => {
    console.log("设置窗口已创建");
  });

  // 监听窗口关闭错误
  settingsWindow.once("tauri://error", (e) => {
    console.error("窗口创建失败:", e);
  });

  // ====== 创建工具面板窗口（完整配置） ======
  const toolWindow = new WebviewWindow("tools", {
    url: "/tools",
    title: "工具面板",
    width: 350,
    height: 500,
    resizable: false, // 不可调整大小
    decorations: false, // 无边框（自定义标题栏）
    transparent: true, // 透明背景（毛玻璃效果）
    alwaysOnTop: true, // 始终置顶
    skipTaskbar: true, // 不在任务栏显示
    x: 100, // 指定位置
    y: 100,
    minWidth: 300, // 最小尺寸限制
    minHeight: 400,
    maxWidth: 500,
    maxHeight: 800,
  });

  // ====== 等待窗口加载完成再做操作 ======
  toolWindow.once("tauri://created", async () => {
    console.log("工具窗口已创建，标签:", toolWindow.label);
  });
}

/**
 * // ======== 对应的 Rust 后端创建窗口代码（放在 lib.rs 或独立模块中） ========
 *
 * use tauri::{WebviewWindowBuilder, WebviewUrl};
 *
 * #[tauri::command]
 * fn open_window(app: tauri::AppHandle, label: String) {
 *     let _window = WebviewWindowBuilder::new(
 *         &app,
 *         &label,
 *         WebviewUrl::App("/settings.html".into())
 *     )
 *         .title("设置")
 *         .inner_size(600.0, 400.0)
 *         .center()
 *         .build()
 *         .unwrap();
 * }
 */

// ============================================================================
// 示例 3：窗口配置选项大全
// ============================================================================
// 场景：了解所有可用的窗口配置选项

console.log("=== 示例 3：窗口配置选项 ===");
console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║             WebviewWindow 配置选项详解                         ║
  ╠══════════════════════════════════════════════════════════════╣
  ║                                                              ║
  ║  【布局与外观】                                               ║
  ║  url: string          → 窗口加载的页面路由                     ║
  ║  title: string        → 窗口标题（显示在标题栏）               ║
  ║  width / height       → 窗口初始宽高                           ║
  ║  x / y                → 窗口初始位置（屏幕坐标）               ║
  ║  center: boolean      → 是否屏幕居中                          ║
  ║  decorations: boolean → 是否显示原生标题栏和边框               ║
  ║  transparent: boolean → 窗口背景透明（毛玻璃效果）             ║
  ║                                                              ║
  ║  【行为控制】                                                 ║
  ║  resizable: boolean   → 是否允许用户调整窗口大小               ║
  ║  maximizable: boolean → 是否显示最大化按钮                    ║
  ║  minimizable: boolean → 是否显示最小化按钮                    ║
  ║  closable: boolean    → 是否显示关闭按钮                      ║
  ║  alwaysOnTop: boolean → 是否始终置顶                          ║
  ║  skipTaskbar: boolean → 不在任务栏显示（适合工具窗口）         ║
  ║  focus: boolean       → 创建时是否获取焦点                    ║
  ║                                                              ║
  ║  【尺寸限制】                                                 ║
  ║  minWidth / minHeight → 最小尺寸                              ║
  ║  maxWidth / maxHeight → 最大尺寸                              ║
  ║                                                              ║
  ║  【高级选项】                                                 ║
  ║  visible: boolean     → 创建时是否立即显示（默认 true）         ║
  ║  fullscreen: boolean  → 是否全屏启动                          ║
  ║  shadow: boolean      → 是否显示窗口阴影（macOS）              ║
  ║  parent: string       → 父窗口标签（子窗口跟随父窗口）         ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// 示例 4：窗口操作 —— 最小化、最大化、关闭、显示/隐藏
// ============================================================================
// 场景：按钮控制窗口的状态切换

async function example4_windowOperations() {
  const currentWindow = getCurrentWebviewWindow();

  // ====== 最小化 ======
  await currentWindow.minimize();
  console.log("窗口已最小化");

  // ====== 最大化 ======
  await currentWindow.maximize();
  console.log("窗口已最大化");

  // ====== 取消最大化 ======
  await currentWindow.unmaximize();
  console.log("窗口已还原");

  // ====== 切换全屏 ======
  const currentFullscreen = await currentWindow.isFullscreen();
  await currentWindow.setFullscreen(!currentFullscreen);
  console.log("全屏状态已切换");

  // ====== 显示/隐藏 ======
  // 隐藏（窗口仍在后台，不销毁）
  await currentWindow.hide();
  // 显示
  await currentWindow.show();

  // ====== 聚焦 ======
  await currentWindow.setFocus();

  // ====== 关闭窗口 ======
  // 直接关闭
  // await currentWindow.close();

  // ====== 关闭前拦截（如询问是否保存） ======
  // 监听关闭请求事件
  const unlisten = await currentWindow.onCloseRequested(async (event) => {
    // 阻止默认关闭行为
    event.preventDefault();

    // 这里可以弹出确认对话框
    // 如果确认关闭，手动调用 close
    // await currentWindow.close();
  });

  console.log("已设置关闭前拦截");
}

/**
 * // ======== 对应的 Rust 后端窗口操作代码 ========
 *
 * use tauri::WebviewWindow;
 *
 * #[tauri::command]
 * async fn toggle_fullscreen(window: WebviewWindow) {
 *     let is_fullscreen = window.is_fullscreen().unwrap();
 *     window.set_fullscreen(!is_fullscreen).unwrap();
 * }
 *
 * #[tauri::command]
 * async fn hide_window(window: WebviewWindow) {
 *     window.hide().unwrap();
 * }
 *
 * #[tauri::command]
 * async fn show_window(window: WebviewWindow) {
 *     window.show().unwrap();
 * }
 */

// ============================================================================
// 示例 5：窗口间通信 —— 通过事件总线共享数据
// ============================================================================
// 场景：主窗口操作后通知设置窗口更新；子窗口提交数据给主窗口
// Tauri V2 特性：事件系统天然支持跨窗口通信

async function example5_interWindowCommunication() {
  // ====== 主窗口：监听来自子窗口的数据 ======
  const unlistenSettings = await listen<{ theme: string }>(
    "settings:theme-changed",
    (event) => {
      console.log("收到主题变更通知:", event.payload.theme);
      // 更新主窗口 UI
      document.documentElement.setAttribute(
        "data-theme",
        event.payload.theme
      );
    }
  );

  // ====== 子窗口：发送数据给主窗口 ======
  // 子窗口中的代码：
  // import { emit } from "@tauri-apps/api/event";
  // await emit("settings:theme-changed", { theme: "dark" });

  // ====== 主窗口：通知所有窗口刷新 ======
  // await emit("app:refresh", { timestamp: Date.now() });

  // ====== 窗口间通信的三种方式对比 ======
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║           窗口间通信方式对比                        ║
  ╠══════════════════════════════════════════════════╣
  ║ 方式          │ 适用场景           │ 数据持久性   ║
  ╠══════════════════════════════════════════════════╣
  ║ 事件总线      │ 实时通知、状态同步 │ 即时，不持久  ║
  ║ emit/listen                              ║
  ║───────────────┼───────────────────┼─────────────╣
  ║ Rust State    │ 共享数据、全局配置 │ 应用生命周期  ║
  ║ (invoke获取)                               ║
  ║───────────────┼───────────────────┼─────────────╣
  ║ 本地存储      │ 持久化配置、缓存   │ 持久化       ║
  ║ localStorage                              ║
  ╚══════════════════════════════════════════════════╝
  `);

  // ====== 获取所有窗口 ======
  const allWindows = getAllWebviewWindows();
  console.log(
    "当前所有窗口:",
    allWindows.map((w) => w.label)
  );
}

// ============================================================================
// 示例 6：窗口比例与定位 —— 实现"迷你播放器"效果
// ============================================================================
// 场景：创建一个迷你模式窗口（如音乐播放器），固定在屏幕右下角

async function example6_miniPlayerPattern() {
  // ====== 迷你播放器窗口示例 ======
  // 注意：具体创建时机应根据业务逻辑决定
  // 这里展示配置方式

  const miniPlayerConfig = {
    url: "/mini-player",
    title: "迷你播放器",
    width: 320,
    height: 200,
    decorations: false, // 无边框
    resizable: false,
    alwaysOnTop: true, // 始终置顶
    skipTaskbar: true, // 不显示在任务栏
    // 定位到右下角
    // x 和 y 可以通过 invoke 从 Rust 获取屏幕尺寸后计算
  };

  console.log("迷你播放器窗口配置:", miniPlayerConfig);

  // ====== 获取屏幕信息（需要 Rust 命令） ======
  // 屏幕尺寸一般通过 Rust 获取
  // const monitors = await invoke("get_monitors");
  // 或者直接用 Web API：window.screen.width / window.screen.height
  const screenWidth = window.screen.availWidth;
  const screenHeight = window.screen.availHeight;
  const miniWidth = 320;
  const miniHeight = 200;

  console.log(
    `屏幕尺寸: ${screenWidth}x${screenHeight}，迷你窗口建议位置: x=${screenWidth - miniWidth}, y=${screenHeight - miniHeight}`
  );
}

// ============================================================================
// 示例 7：多窗口标签页（Tab）架构设计思路
// ============================================================================
// 场景：设计类似 IDE 的多标签页布局，理解每个窗口何时独立、何时合并

console.log("=== 示例 7：多窗口架构设计 ===");
console.log(`
  ╔══════════════════════════════════════════════════╗
  ║         多窗口架构设计策略                         ║
  ╠══════════════════════════════════════════════════╣
  ║                                                  ║
  ║  策略 1：单窗口 + 前端路由（推荐简单应用）         ║
  ║  ┌─────────────────────────────┐                ║
  ║  │  标题栏（自定义或原生）       │                ║
  ║  │  [Tab1] [Tab2] [Tab3]       │ <-- Vue Router  ║
  ║  │  ┌─────────────────────┐    │                ║
  ║  │  │   页面内容区域      │    │                ║
  ║  │  └─────────────────────┘    │                ║
  ║  └─────────────────────────────┘                ║
  ║  优点：简单、无需处理窗口间通信                   ║
  ║  缺点：无法跨屏幕、内存占用单一进程               ║
  ║                                                  ║
  ║  策略 2：主窗口 + 浮动工具窗口（推荐专业应用）     ║
  ║  ┌─────────┐  ┌──────┐  ┌──────┐              ║
  ║  │ 主窗口   │  │工具A  │  │设置  │              ║
  ║  │ (main)  │  │float │  │dialog│              ║
  ║  └─────────┘  └──────┘  └──────┘              ║
  ║  适用：IDE、设计工具、音视频编辑器               ║
  ║  优点：灵活、可跨屏幕、专业感强                   ║
  ║  缺点：窗口间通信复杂、需处理焦点管理             ║
  ║                                                  ║
  ║  策略 3：完全多窗口（如 Excel 多文档窗口）         ║
  ║  每个文档一个独立窗口，窗口标签独立标识           ║
  ║  适用：文档编辑器为核心的应用                     ║
  ║  优点：类似原生应用体验                          ║
  ║  缺点：窗口管理复杂、资源占用高                   ║
  ║                                                  ║
  ╚══════════════════════════════════════════════════╝
`);

// ============================================================================
// 【常见错误示例】
// ============================================================================

console.log("=== 常见错误示例 ===");

// 错误 1：忘记 await 窗口 API
console.log(`
  ❌ 错误：不 await 窗口操作方法
  const w = getCurrentWebviewWindow();
  w.setTitle("新标题");  // 返回 Promise，可能未执行！
  console.log(await w.title());  // 可能还是旧标题
  
  原因：V2 的窗口 API 大多返回 Promise
  修复：始终使用 await 或 .then()
  await w.setTitle("新标题");
`);

// 错误 2：窗口标签重复
console.log(`
  ❌ 错误：创建标签已存在的窗口
  new WebviewWindow("main", { ... })  // "main" 标签已被主窗口占用
  
  原因：Tauri 要求每个窗口标签唯一
  现象：Tauri 报错 "window label 'main' already exists"
  修复：使用唯一的标签名（如 "settings", "tools-1", "editor-abc123"）
`);

// 错误 3：在窗口未创建完成时操作
console.log(`
  ❌ 错误：创建窗口后立即操作（窗口可能尚未就绪）
  const w = new WebviewWindow("tools", { ... });
  w.setTitle("新标题");  // ← 可能失败！
  
  原因：窗口创建是异步的，new WebviewWindow 只是发起创建请求
  修复：监听 "tauri://created" 事件后再操作
  w.once("tauri://created", () => { w.setTitle("新标题"); });
`);

// ============================================================================
// 【本章小结】
// ============================================================================
/**
 * 1. WebviewWindow 是 Tauri V2 窗口管理核心：
 *    - getCurrentWebviewWindow() 获取当前窗口引用
 *    - new WebviewWindow(label, options) 创建新窗口
 *    - getAllWebviewWindows() 获取所有窗口列表
 *
 * 2. 与浏览器 window.open 的区别：
 *    - Tauri 窗口是原生操作系统窗口（非浏览器弹窗）
 *    - 可以无边框、透明、始终置顶、跳过任务栏
 *    - 每个窗口是独立 WebView 实例（独立 JS 上下文）
 *    - 可以通过 Rust 后端共享状态
 *
 * 3. 窗口间通信方案：
 *    - 事件总线（emit/listen）：实时双向通信
 *    - Rust State + invoke：共享后端状态
 *    - localStorage + 事件通知：持久化配置
 *
 * 4. 注意事项：
 *    - 所有窗口 API 几乎都是异步的（返回 Promise）
 *    - 窗口标签必须全局唯一
 *    - 创建后应在 tauri://created 事件中操作
 *    - 无边框窗口需要自己实现拖拽和关闭按钮
 */
