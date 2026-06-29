// src-tauri/build.rs
// WHAT：Tauri v2 的构建脚本，在 Cargo build 阶段运行
// WHY：Tauri 需要编译期生成一些代码（如 Windows 资源文件、MacOS plist）
// CONTRAST：Electron 用 electron-builder（Node.js 脚本），Tauri 用 Rust build.rs（编译期）

fn main() {
    tauri_build::build()
}
