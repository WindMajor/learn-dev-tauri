// src-tauri/src/plugins/custom.rs
// WHAT：自定义 Tauri v2 插件 —— DataHub 专属插件
// WHY：将可复用的 Rust 功能封装为插件，类似 NestJS 的动态模块
// CONTRAST：
//   NestJS：DynamicModule.forRoot() 导出可配置的 Provider
//   Tauri：  tauri::plugin::Builder 构建插件，注入 Command 和 JS API
//   Electron：无插件系统，通过 node_modules 或自定义 native addon 扩展

use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

/// DataHub 自定义插件
///
/// 提供企业数据分析专用的 Rust 工具函数：
/// - 数据聚合计算
/// - 格式转换（JSON ↔ CSV）
/// - 数据校验
pub struct DataHubPlugin;

impl DataHubPlugin {
    pub fn new<R: Runtime>() -> TauriPlugin<R> {
        Builder::new("datahub")
            .invoke_handler(tauri::generate_handler![
                aggregate_data,
                validate_data,
            ])
            .setup(|_app, _api| {
                println!("[Plugin] DataHub 自定义插件已加载");
                Ok(())
            })
            .build()
    }
}

/// 数据聚合计算 Command（插件内）
#[tauri::command]
fn aggregate_data(
    values: Vec<f64>,
    method: String,
) -> Result<serde_json::Value, String> {
    println!("[DataHub Plugin] aggregate: {} 个值, method={}", values.len(), method);

    if values.is_empty() {
        return Err("数据为空".into());
    }

    match method.as_str() {
        "sum" => {
            let total: f64 = values.iter().sum();
            Ok(serde_json::json!({ "method": "sum", "result": total }))
        }
        "avg" => {
            let avg = values.iter().sum::<f64>() / values.len() as f64;
            Ok(serde_json::json!({ "method": "avg", "result": avg }))
        }
        "max" => {
            let max = values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
            Ok(serde_json::json!({ "method": "max", "result": max }))
        }
        "min" => {
            let min = values.iter().cloned().fold(f64::INFINITY, f64::min);
            Ok(serde_json::json!({ "method": "min", "result": min }))
        }
        _ => Err(format!("不支持的聚合方法: {method}，支持: sum/avg/max/min")),
    }
}

/// 数据校验 Command（插件内）
#[tauri::command]
fn validate_data(
    data: serde_json::Value,
    rules: Vec<String>,
) -> Result<serde_json::Value, String> {
    let mut results = Vec::new();

    for rule in &rules {
        match rule.as_str() {
            "non_empty" => {
                let valid = match &data {
                    serde_json::Value::String(s) => !s.is_empty(),
                    serde_json::Value::Array(a) => !a.is_empty(),
                    serde_json::Value::Object(o) => !o.is_empty(),
                    _ => true,
                };
                results.push(serde_json::json!({ "rule": rule, "valid": valid }));
            }
            "is_number" => {
                results.push(serde_json::json!({
                    "rule": rule,
                    "valid": data.is_number()
                }));
            }
            _ => {
                results.push(serde_json::json!({
                    "rule": rule,
                    "valid": true,
                    "note": "规则未实现"
                }));
            }
        }
    }

    Ok(serde_json::json!({ "results": results, "all_valid": results.iter().all(|r| r["valid"].as_bool().unwrap_or(false)) }))
}

// ─── 插件 JS API（可选） ───
// 前端可通过以下方式调用：
// import { invoke } from '@tauri-apps/api/core';
// const result = await invoke('plugin:datahub|aggregate_data', { values: [1,2,3], method: 'avg' });
