// src-tauri/src/commands/mod.rs
// WHAT：命令模块声明 —— 将所有 Command 子模块导出
// WHY：模块化组织代码，类似 NestJS 的 Modules 目录
pub mod auth;
pub mod report;
pub mod file;
pub mod system;
