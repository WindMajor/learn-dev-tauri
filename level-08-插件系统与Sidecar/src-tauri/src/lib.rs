// Level 08：插件系统与 Sidecar
// WHAT：自定义 Rust 插件 + Sidecar（外部二进制集成）
// WHY：插件封装可复用能力，Sidecar 集成外部工具链
// CONTRAST：
//   Electron：nodeIntegration 暴露全部 Node API（无边界）vs Tauri 插件按需加载
//   NestJS：  动态模块 forRoot/forFeature vs Tauri plugin::Builder
//   VSCode：   Extension API（进程外）vs Tauri Sidecar（进程外但同分发）

use tauri::plugin::{Builder, TauriPlugin};
use tauri::Runtime;

/// 自定义插件示例：数据分析工具
struct AnalyticsPlugin;

impl AnalyticsPlugin {
    fn new<R: Runtime>() -> TauriPlugin<R> {
        Builder::new("analytics")
            .invoke_handler(tauri::generate_handler![
                analyze_text,
                word_count,
            ])
            .setup(|_app, _api| {
                println!("[Plugin] Analytics 插件已加载");
                Ok(())
            })
            .build()
    }
}

/// 文本情感分析
#[tauri::command]
fn analyze_text(text: String) -> serde_json::Value {
    let chars = text.chars().count();
    let words = text.split_whitespace().count();
    let sentences = text.split(|c| c == '。' || c == '！' || c == '？' || c == '.' || c == '!' || c == '?').count();

    serde_json::json!({
        "char_count": chars,
        "word_count": words,
        "sentence_count": sentences,
        "avg_words_per_sentence": if sentences > 0 { words as f64 / sentences as f64 } else { 0.0 },
        "language": if text.contains('。') { "zh-CN" } else { "en-US" },
    })
}

/// 词频统计
#[tauri::command]
fn word_count(text: String) -> serde_json::Value {
    let words: Vec<&str> = text.split_whitespace().collect();
    serde_json::json!({
        "total": words.len(),
        "unique": {
            let mut sorted: Vec<&&str> = words.iter().collect();
            sorted.sort();
            sorted.dedup();
            sorted.len()
        },
    })
}

/// 调用 Sidecar（外部二进制）
///
/// SECURITY：Sidecar 二进制必须与 Tauri 应用一起签名分发
/// 通过 tauri-plugin-shell 的 scope 限制可执行的命令
#[tauri::command]
fn call_sidecar(app: tauri::AppHandle) -> Result<String, String> {
    // Sidecar 配置在 tauri.conf.json → bundle → externalBin
    // 调用方式：Command::new_sidecar("bin-name")
    // let output = tauri_plugin_shell::ShellExt::shell(&app)
    //     .sidecar("data-processor")?
    //     .args(["--input", "data.csv"])
    //     .output()?;
    
    println!("[Sidecar] 调用外部二进制（演示模式）");
    Ok("Sidecar 调用模拟完成".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(AnalyticsPlugin::new())
        .invoke_handler(tauri::generate_handler![call_sidecar])
        .setup(|_app| {
            println!("[Tauri] Level 08 - 插件系统与Sidecar 启动");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动失败");
}
