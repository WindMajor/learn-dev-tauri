// src-tauri/src/state.rs
// WHAT：DataHub Desktop 全局应用状态
// WHY：桌面应用需要一个中心化的状态管理，类似 Pinia Store 的 Rust 端对应物
// CONTRAST：
//   NestJS：多个 Provider 可通过 DI 组合作用域
//   Tauri： 单一 State 或通过 .manage() 注册多个独立 State
//   Pinia：  前端状态，通过 IPC 与 Rust State 双向同步

use std::sync::{Arc, atomic::AtomicU64};
use tokio::sync::Mutex;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

/// 用户会话状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSession {
    pub user_id: String,
    pub username: String,
    pub role: String,            // admin / user / viewer
    pub token: String,           // JWT Token
    pub token_expiry: DateTime<Utc>,
}

/// 应用配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub api_base_url: String,
    pub auto_sync_enabled: bool,
    pub sync_interval_secs: u64,
    pub theme: String,           // light / dark / system
    pub language: String,        // zh-CN / en-US
    pub max_cache_size_mb: u64,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            api_base_url: "https://api.datahub.example.com".into(),
            auto_sync_enabled: true,
            sync_interval_secs: 300,  // 5 分钟
            theme: "system".into(),
            language: "zh-CN".into(),
            max_cache_size_mb: 500,
        }
    }
}

/// 应用全局状态
pub struct AppState {
    /// 当前用户会话（Option：未登录时为 None）
    pub session: Mutex<Option<UserSession>>,
    /// 应用配置
    pub config: Mutex<AppConfig>,
    /// API 调用计数
    pub api_call_count: AtomicU64,
    /// 最后同步时间
    pub last_sync_time: Mutex<Option<DateTime<Utc>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            session: Mutex::new(None),
            config: Mutex::new(AppConfig::default()),
            api_call_count: AtomicU64::new(0),
            last_sync_time: Mutex::new(None),
        }
    }
}

/// 报表数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Report {
    pub id: String,
    pub title: String,
    pub category: String,        // sales / finance / hr / operations
    pub summary: String,
    pub data: serde_json::Value, // 报表数据
    pub created_by: String,
    pub created_at: String,
    pub updated_at: String,
}

/// 文件操作结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileOperationResult {
    pub success: bool,
    pub path: String,
    pub size: u64,
    pub message: String,
}

/// 系统信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub app_version: String,
    pub tauri_version: String,
    pub available_update: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert_eq!(config.language, "zh-CN");
        assert!(config.auto_sync_enabled);
    }

    #[test]
    fn test_app_state_new() {
        let state = AppState::new();
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let session = state.session.lock().await;
            assert!(session.is_none());
        });
    }
}
