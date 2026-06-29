/**
 * ============================================================================
 * 09_clipboard_and_http.ts —— 剪贴板与 HTTP
 * ============================================================================
 *
 * 【学习目标】
 *   1. 掌握剪贴板文本的读写操作
 *   2. 理解 Tauri HTTP API 与浏览器 fetch 的区别
 *   3. 学会使用 Tauri HTTP 绕过 CORS 限制
 *
 * 【与纯 Web 开发的核心差异】
 *   - 纯 Web：clipboard API 需要用户手势触发（安全性限制）
 *   - Tauri：可以直接读写剪贴板（需 capabilities 权限）
 *   - 纯 Web HTTP：受 CORS 限制，无法跨域访问
 *   - Tauri HTTP：在 Rust 端发起请求，绕过浏览器 CORS
 *   - 纯 Web：fetch 在前端执行，受浏览器安全策略约束
 *   - Tauri HTTP：请求在 Rust 端执行，完全自由的网络访问
 */

// ============================================================================
// 【第一部分：剪贴板操作】
// ============================================================================

// 注意：需要安装 @tauri-apps/plugin-clipboard-manager
// pnpm add @tauri-apps/plugin-clipboard-manager
// Cargo.toml: tauri-plugin-clipboard-manager = "2"
// lib.rs: .plugin(tauri_plugin_clipboard_manager::init())

import {
  readText,
  writeText,
  readImage,
  writeImage,
  clear,
} from "@tauri-apps/plugin-clipboard-manager";

// ============================================================================
// 示例 1：剪贴板文本读写
// ============================================================================
// 场景：实现"复制到剪贴板"和"从剪贴板粘贴"功能
// Tauri V2 特性：不受浏览器安全策略限制，可直接访问系统剪贴板

async function example1_clipboardText() {
  // ====== 写入文本到剪贴板（"复制"功能） ======
  await writeText("这段文字来自 Tauri V2 学习项目！");
  console.log("文本已复制到剪贴板");

  // ====== 读取剪贴板文本（"粘贴"功能） ======
  const text = await readText();
  if (text) {
    console.log("剪贴板内容:", text);
    console.log("内容长度:", text.length);
  } else {
    console.log("剪贴板为空或不是文本");
  }

  // ====== 实用：复制带格式的内容 ======
  const codeSnippet = `
import { invoke } from "@tauri-apps/api/core";
const result = await invoke("my_command", { arg: "value" });
  `.trim();
  await writeText(codeSnippet);
  console.log("代码片段已复制到剪贴板");

  // ====== 清空剪贴板 ======
  // await clear();  // 注意：V2 某些平台可能不支持 clear
}

/**
 * // ====== capabilities 权限配置 ======
 * {
 *   "permissions": [
 *     "clipboard-manager:allow-read-text",
 *     "clipboard-manager:allow-write-text",
 *     "clipboard-manager:allow-read-image",
 *     "clipboard-manager:allow-write-image"
 *   ]
 * }
 */

// ============================================================================
// 示例 2：剪贴板图片操作
// ============================================================================
// 场景：实现截图工具的"复制图片"和"粘贴图片"功能

async function example2_clipboardImage() {
  // ====== 写入图片到剪贴板 ======
  // 假设我们有一个 canvas 生成的图片数据
  // const imageData = canvas.toDataURL();
  // await writeImage(imageData);  // Base64 格式

  // ====== 读取剪贴板中的图片 ======
  try {
    const imageBase64 = await readImage();
    if (imageBase64) {
      console.log("剪贴板中有图片数据（Base64 格式）");

      // 可以用于：显示预览、上传到服务器、保存到本地
      // 例如显示在 <img> 标签中：
      // imgElement.src = `data:image/png;base64,${imageBase64}`;
    }
  } catch (error) {
    console.log("剪贴板中没有图片或读取失败:", error);
  }

  // ====== 平台差异 ======
  console.log(`
  剪贴板图片支持的平台差异：
  - Windows: 完整支持 BMP/PNG 格式
  - macOS: 完整支持 TIFF/PNG 格式
  - Linux: 取决于桌面环境和剪贴板管理器（Wayland 有限制）
  
  Base64 编码的图片数据可以跨平台传输
  `);
}

// ============================================================================
// 示例 3：Tauri 剪贴板 vs 浏览器 Clipboard API 对比
// ============================================================================
// 场景：理解两种 API 的适用场景差异

console.log("=== 示例 3：Tauri 剪贴板 vs 浏览器剪贴板 ===");
console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║     Tauri Clipboard vs 浏览器 Clipboard API            ║
  ╠═══════════════════════════════════════════════════════╣
  ║ 特性           │ Tauri           │ 浏览器 Clipboard   ║
  ╠═══════════════════════════════════════════════════════╣
  ║ 读取权限       │ 声明式（capabilities）│ 运行时授权     ║
  ║ 读取时机       │ 任何时候         │ 需要用户手势       ║
  ║ 写入时机       │ 任何时候         │ 安全上下文+手势    ║
  ║ 图片支持       │ ✅              │ ⚠️ 有限            ║
  ║ 后台读取       │ ✅（Rust 端）    │ ❌                ║
  ║ Firefox/Safari │ ✅（WebView 无关）│ ⚠️ 支持不完整     ║
  ╚═══════════════════════════════════════════════════════╝
`);

// ============================================================================
// 【第二部分：HTTP 请求】
// ============================================================================

// 注意：需要安装 @tauri-apps/plugin-http
// pnpm add @tauri-apps/plugin-http
// Cargo.toml: tauri-plugin-http = "2"
// lib.rs: .plugin(tauri_plugin_http::init())

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

// ============================================================================
// 示例 4：使用 Tauri HTTP 发出请求（绕过 CORS）
// ============================================================================
// 场景：访问不受 CORS 限制的第三方 API
// Tauri V2 特性：请求在 Rust 端发起，不受浏览器同源策略限制

async function example4_tauriHttp() {
  // ====== 基础 GET 请求 ======
  try {
    const response = await tauriFetch("https://api.github.com/repos/tauri-apps/tauri", {
      method: "GET",
      headers: {
        "User-Agent": "Tauri-V2-Learn/1.0",
        Accept: "application/json",
      },
      // timeout 在 V2 中通过配置或 Rust 端设置
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Tauri 仓库信息:", {
        name: data.name,
        stars: data.stargazers_count,
        description: data.description,
      });
    } else {
      console.error("HTTP 错误:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("请求失败（可能是网络问题或 scope 限制）:", error);
  }

  // ====== POST 请求 ======
  try {
    const response = await tauriFetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Tauri V2 学习笔记",
        body: "今天学习了 HTTP 插件",
        userId: 1,
      }),
    });

    const created = await response.json();
    console.log("创建成功，ID:", created.id);
  } catch (error) {
    console.error("POST 请求失败:", error);
  }

  // ====== 文件下载（获取二进制数据） ======
  try {
    const response = await tauriFetch("https://picsum.photos/200/300", {
      method: "GET",
      responseType: "arrayBuffer", // 获取二进制数据
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      console.log(`下载了 ${buffer.byteLength} 字节的图片数据`);
      // 可以用 fs 插件保存到本地
      // 或转换为 Blob URL 显示
    }
  } catch (error) {
    console.error("文件下载失败:", error);
  }
}

/**
 * // ====== capabilities 中 HTTP scope 配置 ======
 * // 限制允许访问的 URL 范围
 * {
 *   "identifier": "http-capability",
 *   "permissions": [
 *     "http:default",
 *     {
 *       "identifier": "http:allow-fetch",
 *       "allow": [
 *         { "url": "https://api.myapp.com/**" },
 *         { "url": "https://api.github.com/**" },
 *         { "url": "https://jsonplaceholder.typicode.com/**" },
 *         { "url": "https://picsum.photos/**" }
 *       ]
 *     }
 *   ]
 * }
 */

// ============================================================================
// 示例 5：Tauri HTTP vs 浏览器 fetch 的对比
// ============================================================================
// 场景：理解两种 HTTP 客户端的区别和各自适用场景

console.log("=== 示例 5：Tauri HTTP vs 浏览器 fetch ===");
console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║         Tauri HTTP (tauri-plugin-http) vs 浏览器 fetch        ║
  ╠══════════════════════════════════════════════════════════════╣
  ║                                                            ║
  ║  使用 Tauri HTTP 的场景：                                    ║
  ║  ✅ 需要绕过 CORS → 访问无 CORS 头的第三方 API               ║
  ║  ✅ 需要设置自定义证书 → 企业内部 HTTPS                      ║
  ║  ✅ 需要特殊的 TLS 配置 → 使用特定 TLS 版本或密码套件         ║
  ║  ✅ 需要代理支持 → 通过系统代理或自定义代理                   ║
  ║  ✅ 需要发送原始 TCP/UDP → 通过 Rust 端扩展                  ║
  ║  ❌ 轻量请求 → 用浏览器 fetch 更快                            ║
  ║                                                            ║
  ║  使用浏览器 fetch 的场景：                                    ║
  ║  ✅ 请求自己后端 API → 正常配置 CORS 即可                     ║
  ║  ✅ 利用浏览器缓存 → 自动缓存 GET 请求                        ║
  ║  ✅ SSE (Server-Sent Events) → 原生支持流式数据               ║
  ║  ✅ 需要 Cookie 自动管理 → 浏览器自动处理                     ║
  ║  ❌ 跨域请求受限 → 此时用 Tauri HTTP                          ║
  ║                                                            ║
  ║  关键区别：                                                  ║
  ║  - Tauri HTTP 在 Rust 端执行（reqwest 库）                    ║
  ║  - 浏览器 fetch 在 JS 引擎中执行                              ║
  ║  - Tauri HTTP 不受浏览器安全策略限制                          ║
  ║  - 浏览器 fetch 自动携带 Cookie，Tauri HTTP 需要手动设置      ║
  ║                                                            ║
  ╚══════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// 示例 6：超时处理与重试策略
// ============================================================================
// 场景：处理网络不稳定时的请求重试

async function example6_timeoutAndRetry() {
  // ====== 带超时和重试的请求封装 ======

  async function fetchWithRetry(
    url: string,
    options: Record<string, unknown> = {},
    maxRetries: number = 3,
    timeoutMs: number = 10000
  ): Promise<Response> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 使用 AbortController 和超时并行 race
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await tauriFetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok || attempt === maxRetries) {
          return response;
        }

        // 如果是服务端错误（5xx），等待后重试
        if (response.status >= 500) {
          const delay = Math.pow(2, attempt) * 1000; // 指数退避
          console.log(`第 ${attempt} 次请求失败(${response.status})，${delay}ms 后重试...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // 客户端错误不重试
        return response;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.log(`第 ${attempt} 次请求异常，准备重试...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new Error("所有重试均失败");
  }

  // 使用封装后的请求函数
  try {
    const response = await fetchWithRetry("https://api.github.com/zen", {}, 3, 5000);
    if (response.ok) {
      const zen = await response.text();
      console.log("GitHub 名言:", zen);
    }
  } catch (error) {
    console.error("请求最终失败:", error);
  }
}

// ============================================================================
// 示例 7：Rust 端 HTTP 请求（通过自定义命令）
// ============================================================================
// 场景：需要更复杂的 HTTP 逻辑（如请求签名、证书管理），在 Rust 端实现

async function example7_httpViaRustCommand() {
  // 前端调用 Rust 端的 HTTP 命令
  try {
    const ipInfo = await tauriFetch(
      // 用自定义 invoke 指令的方式更合适
      // await invoke<Record<string, unknown>>("http_get", {
      //   url: "https://httpbin.org/ip",
      // });
      "https://httpbin.org/ip"
    );

    console.log("通过 Rust 端发起的请求结果:", ipInfo);
  } catch (error) {
    console.error("请求失败:", error);
  }
}

/**
 * // ====== 对应的 Rust 后端代码 ======
 * // 注意：需要在 Cargo.toml 添加依赖：
 * // reqwest = { version = "0.12", features = ["json"] }
 * // tokio = { version = "1", features = ["full"] }
 *
 * use serde::{Serialize, Deserialize};
 *
 * #[derive(Serialize, Deserialize)]
 * struct HttpGetResponse {
 *     status: u16,
 *     body: String,
 *     headers: std::collections::HashMap<String, String>,
 * }
 *
 * #[tauri::command]
 * async fn http_get(url: String) -> Result<HttpGetResponse, String> {
 *     let client = reqwest::Client::new();
 *     let response = client
 *         .get(&url)
 *         .send()
 *         .await
 *         .map_err(|e| format!("请求失败: {}", e))?;
 *
 *     let status = response.status().as_u16();
 *     let headers = response.headers().iter()
 *         .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
 *         .collect();
 *     let body = response
 *         .text()
 *         .await
 *         .map_err(|e| format!("读取响应失败: {}", e))?;
 *
 *     Ok(HttpGetResponse { status, body, headers })
 * }
 */

// ============================================================================
// 【常见错误示例】
// ============================================================================

console.log("=== 常见错误示例 ===");

console.log(`
  ❌ 错误 1：Tauri HTTP scope 未配置目标 URL
  await tauriFetch("https://third-party-api.com/data")
  // 报错: URL not in scope: https://third-party-api.com/data
  
  原因：没有在 capabilities 的 http:scope 中添加此 URL
  修复：在 capabilities 文件中添加：
    { "identifier": "http:scope", "allow": [{ "url": "https://third-party-api.com/**" }] }

  ❌ 错误 2：混淆 Tauri fetch 和浏览器 fetch
  import { fetch } from "@tauri-apps/plugin-http";
  // 如果写 const data = await fetch("/api/data");
  // 这会走 Tauri HTTP，而不是浏览器 fetch
  
  原因：两种 fetch 的行为不同（Cookie、CORS 等）
  修复：区分使用场景，必要时重命名导入：
    import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

  ❌ 错误 3：剪贴板读图片权限未声明
  await readImage();
  // 报错：permission denied
  
  原因：默认权限不包含图片读写
  修复：添加 "clipboard-manager:allow-read-image" 到 capabilities
`);

// ============================================================================
// 【本章小结】
// ============================================================================
/**
 * 1. 剪贴板操作（tauri-plugin-clipboard-manager）：
 *    - readText / writeText：文本读写
 *    - readImage / writeImage：图片读写（Base64）
 *    - clear：清空剪贴板
 *    - 不需要用户手势（比浏览器 Clipboard API 更方便）
 *    - 需要在 capabilities 中声明各操作的权限
 *
 * 2. Tauri HTTP（tauri-plugin-http）：
 *    - fetch：在 Rust 端发起 HTTP 请求
 *    - 绕过浏览器 CORS 限制（最大优势）
 *    - 需要在 scope 中配置允许的 URL
 *    - 适合访问第三方 API、需要特殊 TLS/代理的场景
 *
 * 3. HTTP 选择建议：
 *    - 访问自己后端（已配置 CORS）→ 用浏览器 fetch（更轻量）
 *    - 访问第三方 API（无 CORS 头）→ 用 Tauri HTTP
 *    - 需要特殊网络配置 → 用 Tauri HTTP 或 Rust 自定义命令
 *
 * 4. 安全注意事项：
 *    - HTTP scope 应精确配置 URL 白名单
 *    - 剪贴板权限应谨慎授予（可能泄露敏感信息）
 *    - 敏感数据不要通过剪贴板明文传输
 */
