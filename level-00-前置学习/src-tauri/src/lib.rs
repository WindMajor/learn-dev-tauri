// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// ====== 学习模块声明 ======
// 通过此声明可以编译 learn/ 目录下的所有学习代码
// 每个文件展示一个独立主题，代码可直接参考使用
pub mod learn;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
