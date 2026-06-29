// src-tauri/src/main.rs
// WHAT：Tauri v2 程序的入口点，调用 lib.rs 中的 run() 函数
// WHY：分离 lib.rs（逻辑）和 main.rs（入口），便于测试和作为库使用
// CONTRAST：
//   - Electron：main.js 即是入口也是逻辑（无 lib/main 分离）
//   - NestJS：  main.ts 调用 NestFactory.create()，lib 是各个 module
//   - Rust 惯例：main.rs 是二进制入口，lib.rs 是库入口

// 禁止在 main.rs 输出时使用控制台窗口（Windows 平台）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    level_01_tauri_arch_lib::run()
}
