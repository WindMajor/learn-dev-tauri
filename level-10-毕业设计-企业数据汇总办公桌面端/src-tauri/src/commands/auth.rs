// src-tauri/src/commands/auth.rs
// WHAT：登录认证 Command —— JWT Token 管理、凭证持久化
// WHY：桌面应用与 Web 应用不同，Token 可以安全存储在本地（Keychain/KWallet/Credential Manager）
// CONTRAST：
//   Electron：Token 存 localStorage 或 electron-store（加密可逆，安全性一般）
//   NestJS：  服务端管理 Session/JWT，不在客户端持久化
//   Tauri：   Rust 端管理 Token，前端通过 IPC 间接使用（Token 不暴露给前端 JS）
//   Swift：   Keychain Services API（系统级加密存储）

use crate::state::{AppState, UserSession};
use chrono::Utc;
use uuid::Uuid;

/// 登录参数
#[derive(Debug, serde::Deserialize)]
pub struct LoginArgs {
    pub username: String,
    pub password: String,
}

/// 登录命令：认证用户并创建会话
///
/// SECURITY：
///   - 密码仅用于登录认证，不存储在 State 中
///   - Token 存储在 Rust 端 State（前端无法直接访问）
///   - 生产环境应使用 Keychain/KWallet 加密存储 Token
#[tauri::command]
pub async fn login(
    args: LoginArgs,
    state: tauri::State<'_, AppState>,
) -> Result<UserSession, String> {
    println!("[Auth] 登录请求: username={}", args.username);

    // ─── 参数校验 ───
    if args.username.is_empty() || args.password.is_empty() {
        return Err("用户名和密码不能为空".into());
    }
    if args.username.len() > 50 || args.password.len() > 100 {
        return Err("输入长度超出限制".into());
    }

    // ─── 模拟认证（生产环境调用 NestJS API） ───
    // 演示用：用户名 "admin" 密码 "admin123" 登录成功
    if args.username != "admin" || args.password != "admin123" {
        // 模拟延迟
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        return Err("用户名或密码错误".into());
    }

    // ─── 创建会话 ───
    let session = UserSession {
        user_id: Uuid::new_v4().to_string(),
        username: args.username.clone(),
        role: if args.username == "admin" { "admin".to_string() } else { "user".to_string() },
        token: format!("jwt_mock_{}", Uuid::new_v4()),
        token_expiry: Utc::now() + chrono::Duration::hours(8),
    };

    // 存储到 State（Rust 端）
    let mut current_session = state.session.lock().await;
    *current_session = Some(session.clone());

    // 递增 API 计数
    state.api_call_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);

    println!("[Auth] 登录成功: {}", session.username);
    Ok(session)
}

/// 登出命令
#[tauri::command]
pub async fn logout(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let mut session = state.session.lock().await;
    let username = session.as_ref().map(|s| s.username.clone()).unwrap_or_default();
    *session = None;
    println!("[Auth] 登出: {username}");
    Ok("已登出".into())
}

/// 获取当前会话信息
#[tauri::command]
pub async fn get_session(state: tauri::State<'_, AppState>) -> Result<Option<UserSession>, String> {
    let session = state.session.lock().await;
    Ok(session.clone())
}

/// 检查 Token 是否有效
#[tauri::command]
pub async fn check_auth(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let session = state.session.lock().await;
    if let Some(s) = session.as_ref() {
        // 检查 Token 是否过期
        let is_valid = s.token_expiry > Utc::now();
        if !is_valid {
            println!("[Auth] Token 已过期: {}", s.token_expiry);
        }
        Ok(is_valid)
    } else {
        Ok(false)
    }
}
