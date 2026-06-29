/**
 * ============================================================================
 * 04_capabilities_and_permissions.ts —— 权限与安全模型（V2 重点）
 * ============================================================================
 *
 * 【学习目标】
 *   1. 深入理解 V2 的 Capabilities 权限模型（声明式权限管理）
 *   2. 掌握能力文件的编写：权限标识符、scope、窗口限定
 *   3. 了解常用权限标识符及其配置方式
 *   4. 学会调试权限被拒绝时的错误
 *
 * 【与纯 Web 开发的核心差异】
 *   - 纯 Web 浏览器：受限于浏览器沙箱，权限由用户授予（如文件、通知）
 *   - Tauri V2：权限由开发者在 capabilities/ 中声明白名单策略
 *   - 权限系统：使用分布式的 capabilities/ 目录管理
 *   - V2 的权限声明更灵活：可绑定到特定窗口、可限制 scope 范围
 *
 * 【核心概念】
 *   所有权限必须在 capabilities/*.json 中显式声明
 *   所有权限必须在 capabilites/*.json 中声明
 *   每个插件的权限标识符格式：插件名:权限名（如 fs:read-files）
 */

// ============================================================================
// 示例 1：理解 V2 核心概念 —— "能力"（Capability）
// ============================================================================
// 场景：从一个能力文件出发，理解 V2 的权限架构
//
// 实际文件位置：/src-tauri/capabilities/default.json

console.log("=== 示例 1：Capabilities 核心概念 ===");

/**
 * ====== 分析当前项目的 default.json（见 /src-tauri/capabilities/default.json） ======
 * 
 * {
 *   "$schema": "../gen/schemas/desktop-schema.json",  ← 自动生成的 schema，提供 IDE 提示
 *   "identifier": "default",                          ← 能力标识符（唯一）
 *   "description": "Capability for the main window",  ← 能力描述
 *   "windows": ["main"],                              ← ★ 限定作用窗口（关键字段！）
 *   "permissions": [                                  ← 权限列表
 *     "core:default",                                 ← Tauri 核心默认权限
 *     "opener:default"                                ← opener 插件默认权限
 *   ]
 * }
 * 
 * 关键理解：
 * 1. "windows": ["main"] 表示此能力仅适用于标签为 "main" 的窗口
 * 2. 可以创建多个能力文件，分配给不同窗口
 * 3. 权限标识符格式：provider:name（如 core:default, fs:read-files）
 * 4. 插件会提供自己的预设权限集合（如 "fs:default"）
 */

// ============================================================================
// 示例 2：常用权限标识符速查 —— 功能与标识符的对应
// ============================================================================
// 场景：你需要给应用添加某个功能，需要知道应该添加哪个权限标识符

console.log("=== 示例 2：常用权限标识符 ===");

/**
 * ====== Tauri V2 常用权限标识符对照表 ======
 * 
 * 【核心权限 - core】不需要显式声明，core:default 已包含
 *
 * 【文件系统 - fs 插件】
 *   "fs:read-files"          → 读取文件（需要 scope 指定路径）
 *   "fs:write-files"         → 写入文件（需要 scope 指定路径）
 *   "fs:read-dirs"           → 读取目录列表
 *   "fs:create-dirs"         → 创建目录
 *   "fs:remove"              → 删除文件/目录
 *   "fs:rename"              → 重命名文件/目录
 *   "fs:default"             → 以上所有基础权限的集合
 *   "fs:allow-exists"        → 检查文件是否存在
 *   "fs:allow-stat"          → 获取文件元信息
 *
 * 【对话框 - dialog 插件】
 *   "dialog:allow-open"      → 允许打开文件对话框（需要 scope）
 *   "dialog:allow-save"      → 允许保存文件对话框（需要 scope）
 *   "dialog:allow-message"   → 允许消息对话框
 *   "dialog:allow-ask"       → 允许询问对话框
 *   "dialog:allow-confirm"   → 允许确认对话框
 *   "dialog:default"         → 以上所有对话框权限
 *
 * 【Shell - shell 插件】
 *   "shell:allow-execute"    → 允许执行命令
 *   "shell:allow-spawn"      → 允许启动进程
 *   "shell:allow-kill"       → 允许终止进程
 *   "shell:allow-open"       → 允许用默认程序打开文件/URL
 *
 * 【通知 - notification 插件】
 *   "notification:default"   → 发送通知权限
 *   "notification:allow-notify" → 发送通知
 *   "notification:allow-request-permission" → 请求通知权限
 *
 * 【剪贴板 - clipboard 插件】
 *   "clipboard:allow-read-text"   → 读取剪贴板文本
 *   "clipboard:allow-write-text"  → 写入剪贴板文本
 *   "clipboard:default"           → 剪贴板默认权限
 */
console.log("查看上方注释中的完整权限对照表");

// ============================================================================
// 示例 3：为应用添加文件读写权限（完整步骤）
// ============================================================================
// 场景：你需要让应用读取用户文档目录中的文件
// 步骤：1. 安装 fs 插件 2. 配置能力文件 3. 设置 scope

console.log("=== 示例 3：配置文件读写权限 ===");

/**
 * // ====== 步骤 1：安装 fs 插件 ======
 * 
 * # 前端依赖
 * pnpm add @tauri-apps/plugin-fs
 *
 * # Rust 依赖（在 src-tauri/Cargo.toml 中添加）
 * [dependencies]
 * tauri-plugin-fs = "2"
 *
 * // ====== 步骤 2：在 lib.rs 中注册插件 ======
 * 
 * // src-tauri/src/lib.rs
 * pub fn run() {
 *     tauri::Builder::default()
 *         .plugin(tauri_plugin_fs::init())  // ← 注册 fs 插件
 *         .invoke_handler(tauri::generate_handler![...])
 *         .run(tauri::generate_context!())
 *         .expect("error while running tauri application");
 * }
 *
 * // ====== 步骤 3：在 capabilities 中声明权限 ======
 * 
 * // 新建 src-tauri/capabilities/file-access.json：
 * {
 *   "identifier": "file-access",
 *   "description": "允许主窗口访问文档目录",
 *   "windows": ["main"],
 *   "permissions": [
 *     "fs:read-files",
 *     "fs:write-files",
 *     "fs:read-dirs",
 *     {
 *       // ★ scope 限定：只能访问指定路径
 *       "identifier": "fs:scope",
 *       "allow": [
 *         { "path": "$DOCUMENT/**" },   // 文档目录下所有文件
 *         { "path": "$APPDATA/**" },    // 应用数据目录
 *         { "path": "$DOWNLOAD/**" }    // 下载目录
 *       ]
 *     }
 *   ]
 * }
 */

// ============================================================================
// 示例 4：Scope 配置详解 —— 精确控制可访问范围
// ============================================================================
// 场景：权限申请时限制可操作的路径/URL 范围，防止越权访问
// Tauri V2 特性：scope 是 V2 安全模型的核心，支持白名单和拒绝列表双重约束

console.log("=== 示例 4：Scope 配置策略 ===");

/**
 * ====== 文件系统 Scope 示例 ======
 * 
 * {
 *   "identifier": "fs:scope",
 *   "allow": [
 *     // 使用内置变量指定目录
 *     { "path": "$APPDATA/**" },        // 仅应用数据目录
 *     { "path": "$DOCUMENT/**" },       // 仅文档目录
 *     { "path": "$DESKTOP/*.txt" },     // 仅桌面的 txt 文件
 *     { "path": "$HOME/.myapp/**" },    // 仅用户目录下的特定子目录
 *     
 *     // 精确路径
 *     { "path": "/tmp/myapp-*" },       // /tmp 下以 myapp- 开头的文件
 *     
 *     // 拒绝特定路径
 *     { "path": "$APPDATA/**" }         // allow 列表
 *   ],
 *   "deny": [
 *     { "path": "$APPDATA/secrets/**" } // 明确拒绝敏感子目录
 *   ]
 * }
 *
 * // ====== Shell Scope 示例 ======
 * // 配置允许执行的外部命令
 * {
 *   "identifier": "shell:allow-execute",
 *   "allow": [
 *     {
 *       "name": "node",
 *       "cmd": "/usr/local/bin/node",   // 仅允许此路径的 node
 *       "args": true                     // 允许任意参数
 *     },
 *     {
 *       "name": "git",
 *       "cmd": "/usr/bin/git",
 *       "args": [                        // 限制参数
 *         { "validator": "--help" },
 *         { "validator": "--version" },
 *         { "validator": "status" }
 *       ]
 *     }
 *   ]
 * }
 *
 * // ====== 网络/URL Scope 示例 ======
 * {
 *   "identifier": "http:scope",
 *   "allow": [
 *     { "url": "https://api.myapp.com/**" },     // 仅允许访问自己的 API
 *     { "url": "https://cdn.myapp.com/**" }      // 仅允许访问自己的 CDN
 *   ]
 * }
 */

// ============================================================================
// 示例 5：为不同窗口分配不同权限
// ============================================================================
// 场景：主窗口有完整权限，子窗口（如设置弹窗）只有读取权限
// Tauri V2 特性：能力可以绑定到特定窗口标签

console.log("=== 示例 5：窗口级别权限控制 ===");

/**
 * // capabilites/main-window.json —— 主窗口能力
 * {
 *   "identifier": "main-capability",
 *   "windows": ["main"],      // ← 仅主窗口
 *   "permissions": [
 *     "core:default",
 *     "fs:default",           // 完整文件访问
 *     "dialog:default",       // 完整对话框
 *     "shell:allow-execute"   // 命令行执行
 *   ]
 * }
 *
 * // capabilites/settings-window.json —— 设置窗口能力
 * {
 *   "identifier": "settings-capability",
 *   "windows": ["settings"],          // ← 仅设置窗口
 *   "permissions": [
 *     "core:default",
 *     "fs:read-files",                // 仅读取（不可写入）
 *     { "identifier": "fs:scope", "allow": [{ "path": "$APPDATA/**" }] }
 *   ]
 * }
 *
 * // 创建窗口时指定标签：
 * // 前端：new WebviewWindow("settings", { ... })  ← 标签为 "settings"
 * // 这样 settings 窗口就只有读取权限，无法写入文件
 */

// ============================================================================
// 示例 6：自定义权限声明
// ============================================================================
// 场景：你想在自己的 Rust 代码中定义权限检查
// Tauri V2 特性：开发者可以自定义权限标识符

console.log("=== 示例 6：自定义权限 ===");

/**
 * // ====== 步骤 1：Rust 端定义权限（需要 Tauri 的 permission 机制） ======
 * 
 * // 对于简单的自定义命令，可以通过在命令参数中注入权限即可
 * // 真正的插件权限需要定义 permissions/ 目录
 *
 * // 这里展示如何在命令中使用权限 guard（概念示例）
 * 
 * // ====== 更实际的做法：用 capabilities 限制哪些命令可被调用 ======
 * // 实际上，如果命令已在 generate_handler! 中注册，
 * // 且能力文件中包含了 core:default，那么就可以调用。
 * // 更细粒度的权限控制需要自定义插件。
 */

// ============================================================================
// 示例 7：权限被拒绝时的错误诊断
// ============================================================================
// 场景：前端调用被拒绝的 API 时，如何定位和修复权限问题
// Tauri V2 特性：权限错误有明显的信息，帮助定位缺失的权限

console.log("=== 示例 7：权限错误诊断 ===");

// 模拟权限被拒绝的情况
async function diagnosePermissionError() {
  // 假设你尝试读取文件但没配置 fs:read-files 权限
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║         权限被拒绝时的诊断步骤                       ║
  ╠═══════════════════════════════════════════════════╣
  ║ 1. 查看控制台错误信息                               ║
  ║    典型错误: "permission 'fs:read-files' not granted"║
  ║                                                   ║
  ║ 2. 确认插件已安装                                   ║
  ║    Cargo.toml: tauri-plugin-fs = "2" ✓            ║
  ║    package.json: @tauri-apps/plugin-fs ^2 ✓       ║
  ║                                                   ║
  ║ 3. 确认插件已在 lib.rs 注册                         ║
  ║    .plugin(tauri_plugin_fs::init()) ✓              ║
  ║                                                   ║
  ║ 4. 确认能力文件中有对应权限                          ║
  ║    capabilities/*.json 中要有 "fs:read-files"      ║
  ║                                                   ║
  ║ 5. 确认 scope 配置正确                              ║
  ║    scope 中的路径是否包含目标文件？                   ║
  ║    路径变量（$APPDATA 等）是否正确？                 ║
  ║                                                   ║
  ║ 6. 确认权限绑定了正确的窗口                          ║
  ║    "windows": ["main"] ← 确保当前窗口标签匹配        ║
  ╚═══════════════════════════════════════════════════╝
  `);

  // ====== 常见权限错误及其修复 ======
  const commonErrors: Record<string, string> = {
    "fs:read-files":
      "添加权限 'fs:read-files' 和 scope 到 capabilities 文件",
    "dialog:allow-open": "添加权限 'dialog:allow-open' 和 scope",
    "shell:allow-execute": "添加权限 'shell:allow-execute' 和 scope 中的允许命令",
    "notification:allow-notify": "添加权限 'notification:default' 或 notification:allow-notify",
  };
  console.table(commonErrors);
}

// ============================================================================
// 【常见错误示例】
// ============================================================================

console.log("=== 常见错误示例 ===");

// 错误 1：只安装了 npm 包，忘记 cargo 包
console.log(`
  ❌ 错误：只在 package.json 中添加了 @tauri-apps/plugin-fs
  {
    "dependencies": {
      "@tauri-apps/plugin-fs": "^2"    ← JavaScript API 有了
    }
  }
  但 src-tauri/Cargo.toml 中没有 tauri-plugin-fs
  
  原因：V2 插件需要同时安装前端 npm 包和后端 cargo crate
  修复：在 Cargo.toml 中添加：
    [dependencies]
    tauri-plugin-fs = "2"
`);

// 错误 2：忘记了在 lib.rs 中注册插件
console.log(`
  ❌ 错误：安装了插件但忘了注册
  tauri::Builder::default()
      // 忘记 .plugin(tauri_plugin_fs::init())  ← 缺少这一行
      .invoke_handler(tauri::generate_handler![...])
      .run(...)
  
  原因：V2 插件必须显式注册到 Builder
  修复：添加 .plugin(tauri_plugin_fs::init())
`);

// 错误 3：scope 路径变量写错
console.log(`
  ❌ 错误：scope 中使用了错误的路径变量
  { "path": "$APP_DATA/**" }      ← 错误：应该是 $APPDATA
  { "path": "$USER_HOME/**" }     ← 错误：没有这个变量
  
  原因：V2 的路径变量有固定名称（大小写敏感）
  修复：使用正确的变量名：
    $APPDATA, $DOCUMENT, $DOWNLOAD, $DESKTOP,
    $HOME, $TEMP, $CWD, $RESOURCE, $CONFIG
`);

// 错误 4：权限绑定了错误的窗口标签
console.log(`
  ❌ 错误：窗口标签不匹配
  // capabilities 文件：
  { "windows": ["main"] }   ← 权限仅限 "main" 窗口
  
  // 前端：
  const w = new WebviewWindow("tools", { ... })  ← 标签是 "tools"，拿不到权限
  
  原因：V2 允许将权限精确绑定到特定窗口
  修复：在 capabilities 文件中添加 "tools" 到 windows 数组
`);

// ============================================================================
// 【本章小结】
// ============================================================================
/**
 * 1. V2 权限模型核心概念：
 *    - Capability（能力）：权限声明的载体，每个 JSON 文件是一个能力
 *    - Permission（权限）：具体的操作许可，格式为 "provider:name"
 *    - Scope（范围）：权限的作用范围限制（路径、URL 等）
 *    - Window binding：能力可以绑定到特定窗口标签
 *
 * 2. 权限配置要点：
 *    - 不要使用 allowlist，所有权限通过 capabilities/ 声明
 *    - 所有权限移至 capabilities/*.json 文件
 *    - 每个插件都需要独立的权限标识符
 *
 * 3. 添加新功能的完整步骤：
 *    ① 安装前端 npm 包和后端 cargo crate
 *    ② 在 lib.rs 中注册插件 .plugin(xxx::init())
 *    ③ 在 capabilities 文件中声明权限标识符
 *    ④ 配置 scope（如需要）
 *    ⑤ 在前端代码中导入和使用
 *
 * 4. 安全原则：
 *    - 最小权限原则：只申请必要的权限
 *    - scope 最小化：限制到最小范围
 *    - 拒绝比允许优先级高（deny > allow）
 *    - 敏感操作（shell）务必限制 scope
 */
