// ============================================================================
// 07_rust_plugins.rs —— 插件开发入门
// ============================================================================
//
// 【对应前端章节】01_project_structure.ts / 04_capabilities_and_permissions.ts
//
// 【学习目标】
//   1. 了解 Tauri V2 插件的基本结构
//   2. 学会使用现有插件（updater, single-instance 等）
//   3. 理解自定义插件的注册流程
//   4. 了解插件的权限声明机制
//
// 【核心概念】
//   - V2 插件 = 前端 npm 包 + 后端 Rust crate + 权限声明文件
//   - 通过 Builder::plugin() 注册
//   - 插件可以提供命令、状态、事件、资源

// ============================================================================
// 示例 1：使用现有插件（Updater）
// ============================================================================

// 自动更新插件配置示例
//
// 【步骤 1】安装依赖
// ```bash
// pnpm add @tauri-apps/plugin-updater
// ```
//
// 【步骤 2】在 Cargo.toml 添加：
// ```toml
// [dependencies]
// tauri-plugin-updater = "2"
// ```
//
// 【步骤 3】在 tauri.conf.json 配置：
// ```json
// {
//   "plugins": {
//     "updater": {
//       "endpoints": ["https://cdn.example.com/update.json"],
//       "pubkey": "YOUR_PUBLIC_KEY"
//     }
//   }
// }
// ```
//
// 【步骤 4】在 lib.rs 注册：
// ```rust
// .plugin(tauri_plugin_updater::Builder::new().build())
// ```
//
// 【步骤 5】在 capabilities 声明权限：
// ```json
// {
//   "permissions": [
//     "updater:default",
//     "updater:allow-check",
//     "updater:allow-download-and-install"
//   ]
// }
// ```

// ============================================================================
// 示例 2：使用单实例插件（Single Instance）
// ============================================================================

// 单实例插件 —— 确保应用只运行一个实例
//
// 【步骤 1】Cargo.toml:
// ```toml
// [dependencies]
// tauri-plugin-single-instance = "2"
// ```
//
// 【步骤 2】lib.rs:
// ```rust
// pub fn run() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
//             println!("{}, {argv:?}, {cwd}", app.package_info().name);
//             // 如果尝试打开第二个实例，聚焦已有窗口
//             if let Some(window) = app.get_webview_window("main") {
//                 let _ = window.set_focus();
//             }
//         }))
//         .run(tauri::generate_context!())
//         .expect("error");
// }
// ```

// ============================================================================
// 示例 3：常用 V2 插件速查
// ============================================================================

// V2 官方插件列表和使用场景：
//
// ┌────────────────────────────────────────────────────────────────────┐
// │ 插件名                         │ npm 包                            │
// ├────────────────────────────────────────────────────────────────────┤
// │ tauri-plugin-fs                │ @tauri-apps/plugin-fs              │
// │   → 文件系统访问（读写、目录浏览）                                   │
// │ tauri-plugin-dialog            │ @tauri-apps/plugin-dialog          │
// │   → 原生对话框（文件选择、确认、消息）                               │
// │ tauri-plugin-shell             │ @tauri-apps/plugin-shell           │
// │   → 系统命令执行、子进程管理                                       │
// │ tauri-plugin-notification      │ @tauri-apps/plugin-notification    │
// │   → 系统通知推送                                                   │
// │ tauri-plugin-clipboard-manager │ @tauri-apps/plugin-clipboard-manager│
// │   → 剪贴板文本/图片读写                                            │
// │ tauri-plugin-http              │ @tauri-apps/plugin-http            │
// │   → HTTP 请求（绕过 CORS）                                          │
// │ tauri-plugin-updater           │ @tauri-apps/plugin-updater         │
// │   → 应用自动更新                                                   │
// │ tauri-plugin-process           │ @tauri-apps/plugin-process         │
// │   → 进程管理（重启、退出）                                          │
// │ tauri-plugin-opener            │ @tauri-apps/plugin-opener          │
// │   → 用默认程序打开文件/URL                                         │
// │ tauri-plugin-single-instance   │ (仅 Rust crate)                    │
// │   → 确保单实例运行                                                  │
// │ tauri-plugin-log               │ @tauri-apps/plugin-log             │
// │   → 统一日志（前端 + 后端）                                         │
// │ tauri-plugin-store             │ @tauri-apps/plugin-store           │
// │   → 持久化键值存储                                                  │
// │ tauri-plugin-sql               │ @tauri-apps/plugin-sql             │
// │   → SQLite 数据库集成                                               │
// └────────────────────────────────────────────────────────────────────┘

// ============================================================================
// 示例 4：自定义插件结构概述
// ============================================================================

// Tauri V2 自定义插件基本结构：
//
// ```
// my-custom-plugin/
// ├── Cargo.toml                    ← Rust crate 配置
// ├── package.json                  ← 前端 npm 包配置
// ├── src/
// │   ├── lib.rs                    ← 插件主入口（Builder + init）
// │   └── commands.rs               ← 插件提供的命令
// ├── permissions/                  ← ★ V2 新特性：权限声明
// │   ├── default.toml              ← 默认权限集合
// │   └── schemas/                  ← 权限 JSON Schema
// ├── guest-js/                     ← 前端 JavaScript API
// │   ├── index.ts                  ← 前端入口
// │   └── bindings.ts               ← 类型定义
// └── build.rs                      ← 构建脚本
// ```
//
// 关键文件说明：
// - permissions/default.toml：定义插件提供哪些权限
// - guest-js/index.ts：提供前端调用的 TypeScript API
// - src/lib.rs：插件的 Builder 和 launch 逻辑

// ============================================================================
// 示例 5：插件权限声明文件结构
// ============================================================================

// 插件的权限文件示例（permissions/default.toml）：
//
// ```toml
// # permissions/default.toml
// [default]
// # 默认授予的权限列表
// permissions = [
//     "allow-default-operation",
//     "allow-read-config"
// ]
//
// [permission_sets.set-default]
// # 权限集合定义
// permissions = [
//     "allow-read-config",
//     "allow-write-config"
// ]
//
// [permission.allow-default-operation]
// # 单个权限定义
// description = "允许执行默认操作"
// commands = ["default_op"]
//
// [permission.allow-read-config]
// description = "允许读取配置"
// commands = ["read_config"]
//
// [permission.allow-write-config]
// description = "允许写入配置"
// commands = ["write_config"]
// ```

// ============================================================================
// 示例 6：在 lib.rs 中注册多个插件的最佳实践
// ============================================================================

// 推荐的插件注册方式：
//
// ```rust
// pub fn run() {
//     tauri::Builder::default()
//         // 核心插件
//         .plugin(tauri_plugin_opener::init())
//         .plugin(tauri_plugin_fs::init())
//         .plugin(tauri_plugin_dialog::init())
//
//         // 可选插件（仅在需要时启用）
//         .plugin(tauri_plugin_shell::init())
//         .plugin(tauri_plugin_notification::init())
//         .plugin(tauri_plugin_clipboard_manager::init())
//
//         // 带配置的插件
//         .plugin(tauri_plugin_updater::Builder::new().build())
//         .plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {
//             // 单实例处理逻辑
//         }))
//
//         // 自定义命令
//         .invoke_handler(tauri::generate_handler![
//             my_custom_command_1,
//             my_custom_command_2,
//         ])
//
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }
// ```
//
// ★ 注意：每个插件都必须在 capabilities 中声明对应的权限！
// 加入 .plugin() 只是注册了功能，能否调用取决于权限声明。

// ============================================================================
// 示例 7：不依赖 Tauri 插件架构的轻量级"插件"
// ============================================================================

// 对于简单的功能，可以在不创建完整插件的情况下复用：
//
// 在项目中创建独立的模块目录：
// ```
// src-tauri/src/
// ├── lib.rs
// ├── features/
// │   ├── mod.rs
// │   ├── file_manager.rs    ← 文件管理模块（提供命令 + 工具函数）
// │   ├── database.rs        ← 数据库模块
// │   └── notification.rs    ← 通知模块
// └── utils/
//     ├── mod.rs
//     └── security.rs        ← 安全工具函数
// ```
//
// 每个 feature 模块可以导出命令函数，在 lib.rs 中统一注册：
// ```rust
// mod features;
//
// pub fn run() {
//     tauri::Builder::default()
//         .invoke_handler(tauri::generate_handler![
//             features::file_manager::read_file,
//             features::file_manager::write_file,
//             features::database::query_users,
//         ])
//         .run(tauri::generate_context!())
//         .expect("error");
// }
// ```
//
// 这种方式的好处：
// - 不需要维护独立的 crate 和 npm 包
// - 适合项目内功能复用
// - 开发迭代更快
pub struct PluginExample; // 占位项，使文档注释合法

// ============================================================================
// 【本章小结】
// ============================================================================
//
// 1. Tauri V2 插件的三个组成部分：
//    - 前端 npm 包（JavaScript/TypeScript API）
//    - 后端 Rust crate（功能实现）
//    - 权限声明文件（permissions/ 目录，V2 新特性）
//
// 2. 使用插件的完整步骤：
//   ① 安装 npm 包（@tauri-apps/plugin-xxx）
//   ② 添加 Cargo 依赖（tauri-plugin-xxx = "2"）
//   ③ 在 lib.rs 注册（.plugin(xxx::init())）
//   ④ 在 capabilities 声明权限（"xxx:default" 或具体权限）
//   ⑤ 在前端代码中导入和使用
//
// 3. 自定义插件 vs 项目模块：
//    - 自定义插件：适合多项目复用、社区分享
//    - 项目内部模块：适合项目内功能组织，更轻量
//
// 4. 常用插件速记：
//    fs → 文件 | dialog → 对话框 | shell → 命令 | notification → 通知
//    clipboard → 剪贴板 | http → 网络 | updater → 更新 | store → 存储
