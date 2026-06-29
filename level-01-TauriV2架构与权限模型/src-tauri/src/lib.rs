// src-tauri/src/lib.rs
// WHAT：Tauri v2 应用的主库入口，注册 Commands、配置应用、启动事件处理
// WHY：Tauri v2 分离 lib.rs（核心逻辑）和 main.rs（启动入口），
//      类似 NestJS 的 AppModule + main.ts 分离
// CONTRAST：
//   - Electron：main.js 是 Node.js 脚本，直接操作 BrowserWindow 和 ipcMain
//   - NestJS：  NestFactory.create(AppModule) 创建 HTTP 服务
//   - Swift：   @main struct App 是入口，NSApplication 管理生命周期
//   - egui：    eframe::run_native() 启动事件循环
//   - Tauri：   tauri::Builder::default() 构建应用，register 命令和插件

use tauri::Manager;

// ─── 学习型 Command：返回 Tauri v2 架构概览 ───
// WHAT：注册一个 IPC 命令，前端通过 invoke('greet') 调用
// WHY：这是 Tauri v2 最基础的 IPC 模式 —— 前端调用 → Rust 执行 → 返回给前端
// CONTRAST：
//   - Electron 的 ipcMain.handle('greet', handler)，无类型约束，参数可以任意
//   - NestJS 的 @Get('greet') 装饰器，HTTP 协议，有类型/校验中间件
//   - Tauri v2 的 #[tauri::command] 是编译期注册，参数通过 serde 反序列化（类型安全）
// WARNING：此 Command 未做参数校验，生产环境必须校验（见 Level 07）
// SECURITY：此 Command 在 capabilities/default.json 中通过 "core:default" 隐式授权
#[tauri::command]
fn greet(name: &str) -> String {
    // 输出 IPC 调用日志，帮助建立"前后端边界直觉"
    println!("[IPC] greet 被调用，参数 name = {}", name);
    format!("你好, {}! 来自 Rust 后端的问候 🦀", name)
}

// ─── 学习型 Command：返回架构信息 ───
// WHAT：让前端查询 Tauri v2 的核心架构信息
// WHY：帮助理解 Rust 后端可以返回任意 serde 可序列化的数据
#[tauri::command]
fn get_architecture_info() -> serde_json::Value {
    println!("[IPC] get_architecture_info 被调用");

    serde_json::json!({
        "tauri_version": "2.x",
        "rust_backend": "src-tauri/src/lib.rs",
        "frontend": "Vue3 + Vite",
        "ipc_model": "Command (白名单) + Event (发布/订阅)",
        "permission_model": "Capabilities (capabilities/*.json) —— Tauri v2 新权限系统",
        "webview": "系统原生 WebView（Mac: WKWebView, Win: WebView2, Linux: WebKitGTK）",
        "process_architecture": "单进程（Rust Core + WebView 同进程）",
        "security_features": [
            "Context Isolation（强制开启，不可关闭）",
            "CSP（Content Security Policy）",
            "Capabilities 白名单",
            "Scope 路径限制",
            "禁止前端直接访问系统 API"
        ]
    })
}

// ─── 应用构建器 ───
// WHAT：创建 Tauri 应用实例，注册 Commands，配置应用行为
// WHY：tauri::Builder 是 Tauri 的 IOC 容器（类似 NestJS 的 Module），
//      所有功能（Commands, Plugins, State, Menu, Tray）都通过 Builder 注册
// CONTRAST：
//   - NestJS：Module({ controllers: [], providers: [] }) 声明式注册
//   - Electron：app.whenReady().then(() => { /* 手动 new BrowserWindow */ })
//   - Tauri：链式 Builder API，编译期检查 Command 签名
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ─── 注册 Commands ───
        // 【对比 Electron】Electron 中每个 ipcMain.handle 是独立注册，无集中管理
        // Tauri 通过 invoke_handler 集中注册，编译期验证所有 Command 签名
        .invoke_handler(tauri::generate_handler![greet, get_architecture_info])
        // ─── 应用启动时执行 ───
        // WHAT：Setup 钩子在应用启动时执行，可以访问 AppHandle
        // WHY：用于初始化 State、注册插件、设置全局资源
        .setup(|app| {
            // 打印主窗口信息，验证窗口创建成功
            if let Some(window) = app.get_webview_window("main") {
                println!("[Tauri] 主窗口创建成功: {}", window.title().unwrap_or_default());
            }
            println!("[Tauri] 应用启动完成，Capabilities 权限系统已加载");
            Ok(())
        })
        // ─── 运行应用 ───
        // 【对比 egui】eframe::run_native() 阻塞当前线程运行事件循环
        // Tauri 的 run() 同样阻塞，但内部使用 Tokio 异步运行时
        .run(tauri::generate_context!())
        .expect("启动 Tauri 应用失败");
}
