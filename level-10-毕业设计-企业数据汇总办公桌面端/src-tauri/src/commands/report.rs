// src-tauri/src/commands/report.rs
// WHAT：报表数据 Command —— 调用 NestJS API 获取数据、离线 SQLite 缓存
// WHY：桌面应用的核心价值：离线可用 + 网络恢复后自动同步
// CONTRAST：
//   Electron：fetch() 在 main process 中调用 API（Node.js），缓存用 electron-store
//   Web：     SW (Service Worker) 做离线缓存
//   Tauri：   Rust Command 中通过 reqwest/tokio 调用 API，SQLite 本地缓存

use crate::state::{AppState, Report};
use serde::{Serialize, Deserialize};
use std::sync::atomic::Ordering;

/// 报表查询参数
#[derive(Debug, Deserialize)]
pub struct ReportQuery {
    pub category: Option<String>,   // sales / finance / hr / operations
    pub keyword: Option<String>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

/// 报表列表响应
#[derive(Debug, Serialize)]
pub struct ReportListResponse {
    pub reports: Vec<Report>,
    pub total: u32,
    pub page: u32,
    pub from_cache: bool,  // 是否来自离线缓存
}

/// 获取报表列表
///
/// 策略：先返回缓存数据（如果有），后台静默更新
#[tauri::command]
pub async fn list_reports(
    query: ReportQuery,
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<ReportListResponse, String> {
    println!("[Report] list_reports: category={:?}, page={:?}", query.category, query.page);

    // 检查认证
    let session = state.session.lock().await;
    if session.is_none() {
        return Err("未登录，请先登录".into());
    }
    drop(session); // 释放锁

    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);

    // ─── 模拟从 API 获取数据 ───
    // 实际项目中：reqwest::get(format!("{}/api/reports", config.api_base_url))
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

    let reports = generate_mock_reports(&query, page, page_size);

    state.api_call_count.fetch_add(1, Ordering::SeqCst);

    // 更新同步时间
    let mut last_sync = state.last_sync_time.lock().await;
    *last_sync = Some(chrono::Utc::now());
    drop(last_sync);

    // 通过 Event 通知前端刷新完成
    let _ = app.emit("data-synced", serde_json::json!({
        "count": reports.len(),
        "time": chrono::Utc::now().to_rfc3339(),
    }));

    Ok(ReportListResponse {
        total: 42, // 模拟总数
        page,
        reports,
        from_cache: false,
    })
}

/// 获取单个报表详情
#[tauri::command]
pub async fn get_report_detail(
    report_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Report, String> {
    let session = state.session.lock().await;
    if session.is_none() { return Err("未登录".into()); }
    drop(session);

    println!("[Report] get_report_detail: {report_id}");

    // 模拟数据
    Ok(Report {
        id: report_id,
        title: "Q4 销售数据汇总".into(),
        category: "sales".into(),
        summary: "Q4 季度销售总额 ¥1,245,000，同比增长 15.3%".into(),
        data: serde_json::json!({
            "quarter": "2025Q4",
            "total_revenue": 1245000,
            "yoy_growth": 15.3,
            "breakdown": [
                {"region": "华东", "revenue": 450000, "growth": 12.5},
                {"region": "华南", "revenue": 380000, "growth": 18.2},
                {"region": "华北", "revenue": 280000, "growth": 14.8},
                {"region": "西部", "revenue": 135000, "growth": 22.1}
            ]
        }),
        created_by: "张三".into(),
        created_at: "2025-12-31T10:00:00Z".into(),
        updated_at: "2026-01-05T14:30:00Z".into(),
    })
}

// ─── 模拟数据生成 ───
fn generate_mock_reports(query: &ReportQuery, page: u32, page_size: u32) -> Vec<Report> {
    let categories = vec![
        ("sales", "销售"),
        ("finance", "财务"),
        ("hr", "人力资源"),
        ("operations", "运营"),
    ];

    let mut reports = Vec::new();
    let start = ((page - 1) * page_size) as usize;

    for i in 0..page_size as usize {
        let idx = start + i;
        let (cat_en, cat_cn) = &categories[idx % 4];
        
        // 按分类过滤
        if let Some(ref filter_cat) = query.category {
            if cat_en != filter_cat { continue; }
        }

        reports.push(Report {
            id: format!("rpt_{:04}", idx + 1),
            title: format!("{}{}月度报表 - {}", cat_cn, (idx % 12) + 1, 2025 + (idx / 12) as u32),
            category: cat_en.to_string(),
            summary: format!("{}数据概况：环比{:+.1}%", cat_cn, (idx as f64 - 5.0) * 1.5),
            data: serde_json::json!({"idx": idx}),
            created_by: "系统".into(),
            created_at: "2025-12-15T08:00:00Z".into(),
            updated_at: "2026-01-08T09:00:00Z".into(),
        });
    }

    reports
}
