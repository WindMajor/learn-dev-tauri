//! learn/mod.rs —— Tauri V2 后端学习模块入口
//!
//! 本模块包含 8 个独立的学习文件，覆盖 Tauri V2 后端的核心主题。
//! 每个文件都可以独立阅读和学习，代码可直接复制到 lib.rs 中使用。
//!
//! ## 学习顺序建议
//! 1. 01_rust_commands.rs        —— 基础命令编写（对应前端 02/03 章）
//! 2. 02_rust_state_management.rs —— 后端状态管理（对应前端 11 章）
//! 3. 03_rust_events_and_channels.rs —— 事件与通道（对应前端 02/11 章）
//! 4. 04_rust_filesystem.rs      —— 后端文件操作（对应前端 07 章）
//! 5. 05_rust_window_control.rs  —— 窗口控制（对应前端 05 章）
//! 6. 06_rust_security.rs        —— 安全与权限（对应前端 04 章）
//! 7. 07_rust_plugins.rs         —— 插件开发入门（对应前端 01/04 章）
//! 8. 08_rust_integrated_example.rs —— 综合实战：待办事项应用（全章综合）
//!
//! ## 使用方式
//! 将这些文件的代码整合到 src-tauri/src/lib.rs 中，或者
//! 创建子模块分别引入。

pub mod _01_rust_commands;
pub mod _02_rust_state_management;
pub mod _03_rust_events_and_channels;
pub mod _04_rust_filesystem;
pub mod _05_rust_window_control;
pub mod _06_rust_security;
pub mod _07_rust_plugins;
pub mod _08_rust_integrated_example;
