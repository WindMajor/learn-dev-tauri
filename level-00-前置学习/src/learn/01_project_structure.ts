/**
 * ============================================================================
 * 01_project_structure.ts —— 项目结构与 V2 配置
 * ============================================================================
 *
 * 【学习目标】
 *   1. 理解 Tauri V2 项目的完整目录结构（前端 + 后端 + 配置三层分离）
 *   2. 掌握 tauri.conf.json V2 格式的关键字段（详解每个字段）
 *   3. 了解 Cargo.toml 和 package.json 的依赖关系
 *
 * 【与纯 Web 开发的核心差异】
 *   - 纯 Web 开发：只有一个 package.json + 前端源码
 *   - Tauri V2 开发：存在双层配置文件（前端 Node.js + 后端 Rust Cargo）
 *   - V2 新增 capabilities/ 目录（权限系统）
 *   - 构建产物分为两部分：前端 dist/ + 后端 native binary
 *
 * 【核心概念】
 *   - 权限系统：使用 capabilities/ 目录进行声明式权限管理
 *   - 插件独立化：插件需单独安装 npm + cargo 包
 *   - 配置结构：tauri.conf.json 的 app.security 控制安全策略
 *   - API 路径：使用 @tauri-apps/api 的模块化子路径
 */

// ============================================================================
// 示例 1：查看当前项目的关键文件路径（概念示例）
// ============================================================================
// 场景：理解 Tauri V2 项目的文件分布，哪些是编译时必须的，哪些是可选的
//
// 【Tauri V2 标准项目结构】
//
// tauri-basic-learn/                      <-- 项目根目录
// ├── src/                                <-- 前端源代码（Vue/React/Svelte 等）
// │   ├── main.ts                          <-- 前端入口文件（挂载 Vue 应用）
// │   ├── App.vue                          <-- 根组件
// │   └── learn/                           <-- 学习文件目录（自定义，非必须）
// ├── src-tauri/                           <-- Rust 后端（Tauri 的核心所在）
// │   ├── Cargo.toml                       <-- Rust 依赖管理（类似 package.json）
// │   ├── tauri.conf.json                  <-- Tauri 应用配置（V2 格式）
// │   ├── capabilities/                    <-- ★ V2 新增：权限声明文件
// │   │   └── default.json                 <-- 默认权限（core:default 等）
// │   ├── src/                             <-- Rust 源码
// │   │   ├── main.rs                      <-- Rust 程序入口
// │   │   └── lib.rs                       <-- Tauri 应用逻辑（命令、插件注册）
// │   ├── icons/                           <-- 应用图标（多平台、多分辨率）
// │   └── gen/schemas/                     <-- 自动生成的 JSON Schema
// ├── public/                              <-- 前端静态资源
// ├── package.json                         <-- 前端 Node.js 依赖
// ├── vite.config.ts                       <-- Vite 构建配置
// └── index.html                           <-- HTML 入口
//
// 关键文件的作用：
//   - tauri.conf.json: 应用元信息 + 构建配置 + 窗口配置 + 打包配置
//   - capabilities/default.json: 权限声明（声明式权限管理）
//   - lib.rs: 注册 Rust 命令和插件的核心文件

console.log("=== 示例 1：Tauri V2 项目结构概览 ===");
console.log(`
  前端入口：/src/main.ts → 挂载 Vue/React 应用
  后端入口：/src-tauri/src/main.rs → 调用 lib.rs 中的 run() 函数
  配置中枢：/src-tauri/tauri.conf.json（V2 格式，$schema 指向 V2）
  权限目录：/src-tauri/capabilities/（V2 核心特性）
  图标目录：/src-tauri/icons/（多平台、多分辨率图标）
`);

// ============================================================================
// 示例 2：tauri.conf.json V2 关键字段解析
// ============================================================================
// 场景：理解 V2 配置文件的每个字段的含义和用法
//
// 实际文件位置：/src-tauri/tauri.conf.json
// 注意：V2 的 $schema 必须指向 "https://schema.tauri.app/config/2"
//       旧项目指向 "./node_modules/@tauri-apps/cli/schema.json"

interface TauriConfV2 {
  $schema: string;           // V2 schema 地址，提供 IDE 智能提示
  productName: string;       // 产品名称（用于打包后的应用名）
  version: string;           // 应用版本号（与 package.json 独立）
  identifier: string;        // ★ 重要：应用唯一标识（反向域名格式）
  build: {
    beforeDevCommand: string;    // dev 前执行的命令（如 "pnpm dev" 启动 Vite）
    devUrl: string;              // 开发时的前端 URL（如 http://localhost:1420）
    beforeBuildCommand: string;  // build 前执行的命令（如 "pnpm build"）
    frontendDist: string;        // 前端构建产物目录（相对于 src-tauri/）
  };
  app: {
    windows: Array<{             // 窗口配置数组
      title: string;
      width: number;
      height: number;
      // 更多窗口配置见 05_window_management.ts
    }>;
    security: {
      csp: string | null;       // 内容安全策略（null 表示无限制）
    };
  };
  bundle: {
    active: boolean;             // 是否启用打包
    targets: string;             // 打包目标："all" | "deb" | "msi" | "dmg"
    icon: string[];              // 图标文件路径数组
    // 更多打包配置见 12_build_and_release.ts
  };
  // Tauri V2 特有的字段：
  // plugins: {}                 // V2 插件配置（独立于 build 和 app）
}

// 查看当前项目的实际配置
console.log("=== 示例 2：当前项目的 tauri.conf.json 配置 ===");
console.log(`
  identifier: "com.wangmeng.tauri-app"   ← 唯一标识，后续发布不可修改
  devUrl: "http://localhost:1420"        ← 开发时 Vite 固定端口
  frontendDist: "../dist"                ← 构建产物路径（相对 src-tauri/）
  windows[0].title: "tauri-app"          ← 默认窗口标题
`);

// ============================================================================
// 示例 3：Cargo.toml 关键依赖解析
// ============================================================================
// 场景：理解 Rust 后端的依赖管理方式
//
// 实际文件位置：/src-tauri/Cargo.toml

console.log("=== 示例 3：Cargo.toml 依赖管理 ===");
console.log(`
  [dependencies]
  tauri = { version = "2", features = [] }
    → Tauri V2 核心框架，"2" 表示 V2 版本
    → features 可选值：tray-icon, http-multipart, etc.

  tauri-build = { version = "2", features = [] }   [build-dependencies]
    → 构建时依赖，负责在编译阶段生成代码

  serde = { version = "1", features = ["derive"] }
    → 序列化/反序列化库，前端参数 ↔ Rust 结构体的桥梁
    → derive feature 允许使用 #[derive(Serialize, Deserialize)]

  tauri-plugin-opener = "2"
    → V2 插件示例：打开 URL 或文件
    → V2 插件以独立 crate 形式存在，按需引入

  与 package.json 的对应关系：
    Cargo.toml   ←—→  package.json（都是依赖管理）
    #[tauri::command] ←—→  @tauri-apps/api/core（命令调用对应关系）
`);

// ============================================================================
// 示例 4：lib.rs 核心结构解析
// ============================================================================
// 场景：理解 Tauri 应用初始化的核心代码
//
// 实际文件位置：/src-tauri/src/lib.rs

/**
 * // lib.rs 核心结构（当前项目实际代码）：
 *
 * #[tauri::command]
 * fn greet(name: &str) -> String {
 *     format!("Hello, {}! You've been greeted from Rust!", name)
 * }
 *
 * pub fn run() {
 *     tauri::Builder::default()
 *         .plugin(tauri_plugin_opener::init())     // ★ V2 插件注册方式
 *         .invoke_handler(tauri::generate_handler![greet])  // 注册命令
 *         .run(tauri::generate_context!())          // 启动应用
 *         .expect("error while running tauri application");
 * }
 */
console.log("=== 示例 4：lib.rs 核心结构 ===");
console.log(`
  Builder::default()     → 创建 Tauri 应用构建器
  .plugin(...)           → 注册插件（V2 推荐方式，替代旧的内联方式）
  .invoke_handler(...)   → 注册 Rust 命令供前端调用
  .manage(...)           → 注入全局状态（见 11_state_and_events.ts）
  .setup(|app| { ... })  → 应用初始化钩子
  .run(...)              → 启动事件循环
`);

// ============================================================================
// 示例 5：capabilities 权限系统（V2 核心特性）
// ============================================================================
// 场景：V2 的权限模型从「全局大列表」改为「分文件声明」，更灵活、可组合
//
// 实际文件位置：/src-tauri/capabilities/default.json

console.log("=== 示例 5：capabilities 权限系统（V2 核心变更）===");
console.log(`
  常见错误写法：
    tauri.conf.json 中配置：
    {
      "tauri": {
        "allowlist": {
          "fs": { "readFile": true, "scope": ["$APPDATA/**"] }
        }
      }
    }

  V2 方式（当前使用）：
    src-tauri/capabilities/default.json：
    {
      "identifier": "default",
      "description": "Capability for the main window",
      "windows": ["main"],           ← 限定作用的窗口
      "permissions": [
        "core:default",              ← 核心默认权限
        "opener:default"             ← 插件默认权限
      ]
    }

  V2 的优势：
    1. 每个 JSON 文件是一个独立的「能力包」
    2. 可以为不同窗口分配不同权限
    3. 权限可精确到特定文件路径（scope）
    4. 第三方插件可以提供预定义的权限集合

  详细权限配置见 04_capabilities_and_permissions.ts
`);

// ============================================================================
// 示例 6：main.rs 入口文件
// ============================================================================
// 场景：理解 Rust 程序入口与 Tauri 应用启动的关系
//
// 实际文件位置：/src-tauri/src/main.rs

console.log("=== 示例 6：main.rs 入口 ===");
console.log(`
  // main.rs 内容（当前项目）：
  #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

  fn main() {
      tauri_app_lib::run()   ← 调用 lib.rs 中的 run() 函数
  }

  说明：
  - windows_subsystem = "windows" → Windows 发布版不显示控制台窗口
  - main.rs 只是入口，所有逻辑在 lib.rs 中
  - 这是 Rust 的典型模式：bin（main.rs）调用 lib（lib.rs）
`);

// ============================================================================
// 示例 7：前端依赖解析
// ============================================================================
// 场景：理解前端 package.json 中 Tauri 相关依赖的作用

console.log("=== 示例 7：前端 package.json 中 Tauri 依赖 ===");
console.log(`
  核心依赖（dependencies）：
    "@tauri-apps/api": "^2"
      → 前端调用 Rust 命令的 API 库
      → 导入方式：import { invoke } from "@tauri-apps/api/core";
      → 版本必须与 Cargo.toml 中的 tauri = "2" 主版本号一致

    "@tauri-apps/plugin-opener": "^2"
      → 对应的 V2 插件前端 API
      → 每个 V2 插件都有对应的 npm 包和 cargo crate

  开发依赖（devDependencies）：
    "@tauri-apps/cli": "^2"
      → Tauri CLI 命令行工具
      → 提供 npm run tauri dev / tauri build 等命令
      → 版本必须与 @tauri-apps/api 兼容

  依赖版本说明：
    V2: @tauri-apps/api@^2  ← 模块化导入
    V2: @tauri-apps/api@^2  ← 模块化导入（/core, /event, /window 等子路径）
`);

// ============================================================================
// 【常见错误示例】
// ============================================================================

console.log("=== 常见错误示例 ===");

// 错误 1：混淆 Cargo.toml 和 tauri.conf.json 的作用
console.log(`
  ❌ 错误：在 tauri.conf.json 中管理 Rust 依赖
  // tauri.conf.json（错误写法）
  {
    "dependencies": { "tauri": "2" }  ← 这是错误的！
  }
  
  原因：Rust 依赖必须在 Cargo.toml 中声明，tauri.conf.json 只管应用配置
  修复：在 src-tauri/Cargo.toml 的 [dependencies] 中添加依赖
`);

// 错误 2：忘记在 V2 中使用 capabilities 文件
console.log(`
  ❌ 错误：在 tauri.conf.json 中使用了 allowlist 配置（已废弃）
  // tauri.conf.json（已废弃的错误配置）
  {
    "tauri": {
      "allowlist": { "fs": { "readFile": true } }  ← 此字段已被废弃，Tauri 不再解析！
    }
  }
  
  原因：Tauri V2 所有权限必须通过 capabilities/ 目录声明
  修复：
    1. 删除 tauri.conf.json 中的 allowlist 配置
    2. 在 src-tauri/capabilities/ 下新建或修改 JSON 文件
    3. 添加 "fs:read-files" 等权限标识符
`);

// 错误 3：$schema 指向了本地路径
console.log(`
  ❌ 错误：tauri.conf.json 的 $schema 指向本地文件
  {
    "$schema": "./node_modules/@tauri-apps/cli/schema.json"  ← 本地路径（不推荐）
  
  原因：V2 的 schema 在不同位置，指向错误会导致 IDE 提示失效
  修复：
    "$schema": "https://schema.tauri.app/config/2"
`);

// ============================================================================
// 【本章小结】
// ============================================================================
/**
 * 1. Tauri V2 项目由三层组成：
 *    - 前端层（Vue/React + Vite）→ src/
 *    - 配置层（tauri.conf.json + capabilities/）→ src-tauri/
 *    - 后端层（Rust + Tauri Framework）→ src-tauri/src/
 *
 * 2. Tauri V2 核心架构特点：
 *    - 权限系统：通过 capabilities/ 多文件声明
 *    - 插件管理：feature flag → 独立的 cargo crate + npm 包
 *    - 配置结构：tauri.xxx → app.xxx / build.xxx / bundle.xxx
 *
 * 3. 关键文件职责：
 *    - tauri.conf.json：应用元信息、构建指令、窗口、打包配置
 *    - capabilities/：权限声明（V2 最重要目录）
 *    - Cargo.toml：Rust 依赖管理
 *    - lib.rs：Tauri 应用核心逻辑
 *
 * 4. 下一步学习路径：
 *    → 02_frontend_backend_communication.ts（前后端通信）
 *    → 03_commands_and_payloads.ts（命令系统）
 *    → 04_capabilities_and_permissions.ts（权限深入）
 */
