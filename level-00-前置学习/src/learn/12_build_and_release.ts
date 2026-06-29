/**
 * ============================================================================
 * 12_build_and_release.ts —— 打包与发布
 * ============================================================================
 *
 * 【学习目标】
 *   1. 掌握 Tauri 应用的开发、构建、发布全流程
 *   2. 理解打包配置（bundle）的关键选项
 *   3. 了解代码签名和自动更新的基本概念
 *   4. 学会分析构建产物和优化包体积
 *
 * 【与纯 Web 开发的核心差异】
 *   - 纯 Web：npm run build → 部署到 CDN/服务器
 *   - Tauri：npm run tauri build → 生成各平台原生安装包
 *   - 纯 Web：无需代码签名
 *   - Tauri：Windows/macOS 需要代码签名（否则用户看到安全警告）
 *   - 纯 Web：更新只需重新部署
 *   - Tauri：通过 Updater 插件实现增量/全量更新
 */

// ============================================================================
// 示例 1：开发模式 vs 生产模式
// ============================================================================
// 场景：理解两种运行模式的环境差异

console.log("=== 示例 1：开发模式 vs 生产模式 ===");
console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║          pnpm tauri dev  vs  pnpm tauri build             ║
  ╠══════════════════════════════════════════════════════════╣
  ║                                                        ║
  ║  pnpm tauri dev（开发模式）流程：                        ║
  ║  1. 执行 beforeDevCommand → pnpm dev（启动 Vite）        ║
  ║  2. cargo build（编译 Rust 后端，debug 模式）            ║
  ║  3. 启动 WebView 加载 http://localhost:1420              ║
  ║  4. 文件变化 → Vite HMR 热更新前端                       ║
  ║  5. Rust 代码变化 → 自动重新编译（cargo watch）          ║
  ║                                                        ║
  ║  特性：                                                  ║
  ║  - 前端热更新（HMR）                                     ║
  ║  - Rust 自动重编译                                       ║
  ║  - DevTools 可用（右键 → 检查元素）                      ║
  ║  - 未优化，包体积大                                      ║
  ║  - 开发者环境变量可用                                    ║
  ║                                                        ║
  ║  pnpm tauri build（生产模式）流程：                       ║
  ║  1. 执行 beforeBuildCommand → pnpm build（Vite build）   ║
  ║  2. cargo build --release（优化编译 Rust）               ║
  ║  3. 打包前端 dist/ + Rust binary                        ║
  ║  4. 生成平台安装包（.dmg/.msi/.deb/.AppImage）          ║
  ║  5. 生成更新清单文件（如启用 updater）                   ║
  ║                                                        ║
  ║  特性：                                                  ║
  ║  - 代码优化压缩                                          ║
  ║  - 去除了 DevTools                                       ║
  ║  - 最适合分发的体积                                      ║
  ║  - 可签名（macOS 公证）                                  ║
  ║                                                        ║
  ╚══════════════════════════════════════════════════════════╝
`);

// ============================================================================
// 示例 2：bundle 配置详解
// ============================================================================
// 场景：配置打包选项，控制生成的安装包格式和内容

console.log("=== 示例 2：tauri.conf.json 中的 bundle 配置 ===");

/**
 * // ====== 当前项目的 bundle 配置 ======
 * // 文件位置：/src-tauri/tauri.conf.json
 *
 * {
 *   "bundle": {
 *     "active": true,            // 是否启用打包功能
 *     "targets": "all",          // 目标安装包格式
 *     "icon": [                  // 应用图标文件
 *       "icons/32x32.png",
 *       "icons/128x128.png",
 *       "icons/128x128@2x.png",
 *       "icons/icon.icns",
 *       "icons/icon.ico"
 *     ]
 *   }
 * }
 */

console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║              bundle 配置关键字段                           ║
  ╠══════════════════════════════════════════════════════════╣
  ║                                                        ║
  ║  active: boolean                                       ║
  ║    是否启用打包，设为 false 可以跳过打包阶段              ║
  ║                                                        ║
  ║  targets: string | string[]                            ║
  ║    打包目标格式：                                       ║
  ║    - "all"      → 当前平台所有可用格式                  ║
  ║    - "deb"      → Debian/Ubuntu 安装包 (.deb)          ║
  ║    - "appimage" → Linux 通用格式 (.AppImage)           ║
  ║    - "msi"      → Windows 安装程序 (.msi)              ║
  ║    - "nsis"     → Windows NSIS 安装程序 (.exe)        ║
  ║    - "dmg"      → macOS 磁盘映像 (.dmg)               ║
  ║                                                        ║
  ║  icon: string[]                                        ║
  ║    应用图标文件路径数组                                  ║
  ║    推荐使用 tauri icon 命令自动生成各尺寸               ║
  ║                                                        ║
  ║  resources: string[] | Record<string, string>          ║
  ║    打包时包含的额外资源文件                              ║
  ║    例如：["assets/*", "data/default-config.json"]      ║
  ║                                                        ║
  ║  externalBin: string[]                                 ║
  ║    Sidecar 可执行文件路径（见 10_shell_and_process.ts）  ║
  ║                                                        ║
  ║  category: string                                      ║
  ║    应用分类（macOS App Store / Linux 软件中心显示用）    ║
  ║    例如："DeveloperTools", "Productivity"               ║
  ║                                                        ║
  ║  copyright: string                                     ║
  ║    版权信息，显示在安装包中                              ║
  ║                                                        ║
  ║  identifier: string (顶层字段)                          ║
  ║    应用包名（反向域名格式，不可修改）                     ║
  ║    "com.wangmeng.tauri-app"                            ║
  ║                                                        ║
  ║  macOS 特有配置（bundle.macOS）：                       ║
  ║  {                                                      ║
  ║    "minimumSystemVersion": "10.15",                    ║
  ║    "exceptionDomain": "",  // Hardened Runtime 例外域名║
  ║    "signingIdentity": "",  // 签名证书 ID                ║
  ║    "providerShortName": "",                            ║
  ║    "entitlements": ""      // 权限文件路径               ║
  ║  }                                                      ║
  ║                                                        ║
  ║  Windows 特有配置（bundle.windows）：                    ║
  ║  {                                                      ║
  ║    "digestAlgorithm": "sha256",                        ║
  ║    "certificateThumbprint": "",  // 签名证书指纹        ║
  ║    "timestampUrl": "",                                 ║
  ║    "webviewInstallMode": {  // WebView2 安装策略        ║
  ║      "type": "downloadBootstrapper"                    ║
  ║    },                                                  ║
  ║    "wix": { ... }  // MSI 安装器语言等配置              ║
  ║  }                                                      ║
  ║                                                        ║
  ╚══════════════════════════════════════════════════════════╝
`);

// ============================================================================
// 示例 3：图标配置 —— 多平台、多分辨率
// ============================================================================
// 场景：为应用创建专业的跨平台图标

console.log("=== 示例 3：图标配置 ===");

console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║           应用图标配置指南                             ║
  ╠══════════════════════════════════════════════════════╣
  ║                                                    ║
  ║  1. 准备源图标（至少 1024x1024 PNG，带透明通道）     ║
  ║  2. 使用 Tauri CLI 自动生成所有需要的尺寸：          ║
  ║     pnpm tauri icon ./source-icon.png              ║
  ║  3. CLI 会自动生成并放入 src-tauri/icons/：          ║
  ║                                                    ║
  ║    生成的图标文件清单：                              ║
  ║    ├── 32x32.png          ← 小图标                   ║
  ║    ├── 128x128.png        ← 中等图标                  ║
  ║    ├── 128x128@2x.png     ← Retina 显示屏用          ║
  ║    ├── icon.icns          ← macOS 图标格式            ║
  ║    ├── icon.ico           ← Windows 图标格式          ║
  ║    ├── icon.png           ← 默认图标                  ║
  ║    ├── Square30x30Logo.png    ← Windows 磁贴          ║
  ║    ├── Square44x44Logo.png                          ║
  ║    ├── Square71x71Logo.png                          ║
  ║    ├── Square89x89Logo.png                          ║
  ║    ├── Square107x107Logo.png                        ║
  ║    ├── Square142x142Logo.png                        ║
  ║    ├── Square150x150Logo.png                        ║
  ║    ├── Square284x284Logo.png                        ║
  ║    ├── Square310x310Logo.png                        ║
  ║    └── StoreLogo.png          ← Windows Store 商店图标║
  ║                                                    ║
  ║  图标设计建议：                                      ║
  ║  - 保持简洁，避免过多细节                            ║
  ║  - 带圆角背景（macOS 会自动裁切为圆角）              ║
  ║  - 在不同背景下都能清晰可见                          ║
  ║  - 使用 SVG 作为源文件更佳                           ║
  ║                                                    ║
  ╚══════════════════════════════════════════════════════╝
`);

// ============================================================================
// 示例 4：代码签名基础概念
// ============================================================================
// 场景：让用户安装时不看到"未知开发者"警告

console.log("=== 示例 4：代码签名 ===");
console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║                 代码签名概览                              ║
  ╠══════════════════════════════════════════════════════════╣
  ║                                                        ║
  ║  macOS：                                                ║
  ║  - 需要 Apple Developer 账号（$99/年）                  ║
  ║  - 创建 "Developer ID Application" 证书                 ║
  ║  - 签名后还需公证（Notarization）→ Apple 安全扫描       ║
  ║  - 配置在 tauri.conf.json → bundle.macOS：              ║
  ║    {                                                     ║
  ║      "signingIdentity": "Developer ID Application: ...",║
  ║      "entitlements": "entitlements.plist"               ║
  ║    }                                                     ║
  ║                                                        ║
  ║  Windows：                                              ║
  ║  - 需要代码签名证书（OV/EV，从证书颁发机构购买）         ║
  ║  - 约 $200-500/年                                       ║
  ║  - 配置在 tauri.conf.json → bundle.windows：            ║
  ║    {                                                     ║
  ║      "certificateThumbprint": "AB12CD34...",            ║
  ║      "digestAlgorithm": "sha256",                       ║
  ║      "timestampUrl": "http://timestamp.url"             ║
  ║    }                                                     ║
  ║                                                        ║
  ║  Linux：                                                ║
  ║  - 通常不需要（但 Flatpak/AppImage 有可选签名）         ║
  ║                                                        ║
  ║  不签名的后果：                                          ║
  ║  - macOS：用户看到"无法验证开发者"，需手动右键打开      ║
  ║  - Windows：SmartScreen 警告，用户可能放弃安装          ║
  ║                                                        ║
  ║  个人/开源项目：                                         ║
  ║  - 开发/测试阶段可以跳过签名                            ║
  ║  - 正式发布建议签名（至少 macOS 公证）                  ║
  ║  - 可以通过 GitHub CI 自动化签名流程                   ║
  ║                                                        ║
  ╚══════════════════════════════════════════════════════════╝
`);

// ============================================================================
// 示例 5：自动更新（Updater）插件配置
// ============================================================================
// 场景：让用户的应用自动检测和安装新版本
// Tauri V2 特性：Updater 插件支持增量更新和全量更新

console.log("=== 示例 5：自动更新机制 ===");

/**
 * // ====== 配置步骤 ======
 *
 * // 1. 安装 Updater 插件
 * // pnpm add @tauri-apps/plugin-updater
 * // Cargo.toml: tauri-plugin-updater = "2"
 * // lib.rs: .plugin(tauri_plugin_updater::Builder::new().build())
 *
 * // 2. 配置 tauri.conf.json（在 plugins 部分）
 * {
 *   "plugins": {
 *     "updater": {
 *       "pubkey": "YOUR_PUBLIC_KEY",     // 更新签名公钥
 *       "endpoints": [
 *         "https://cdn.example.com/updates/{{target}}/{{arch}}/{{current_version}}"
 *       ],
 *       "windows": {
 *         "installMode": "passive"
 *       }
 *     }
 *   }
 * }
 *
 * // 3. 生成签名密钥对
 * // pnpm tauri signer generate -w ~/.tauri/myapp.key
 *
 * // 4. 在 CI 中使用私钥签名更新包
 * // pnpm tauri signer sign -k ~/.tauri/myapp.key update.zip
 */

import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

async function example5_checkForUpdate() {
  try {
    // 检查更新
    const update = await check();
    if (update) {
      console.log("发现新版本:", update.version);
      console.log("更新说明:", update.body);

      // 下载并安装更新
      let downloaded = 0;
      let contentLength = 0;

      await update.download((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength || 0;
            console.log(`开始下载更新 (${(contentLength / 1024 / 1024).toFixed(1)} MB)`);
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            const progress = (downloaded / contentLength) * 100;
            console.log(`下载进度: ${progress.toFixed(1)}%`);
            break;
          case "Finished":
            console.log("下载完成！");
            break;
        }
      });

      // 安装更新并重启应用
      await update.install();
      await relaunch();
    } else {
      console.log("当前已是最新版本");
    }
  } catch (error) {
    console.error("更新检查失败:", error);
  }
}

// ============================================================================
// 示例 6：构建产物分析与体积优化
// ============================================================================
// 场景：减小安装包体积，提升用户体验

console.log("=== 示例 6：体积优化策略 ===");
console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║            包体积优化策略                             ║
  ╠══════════════════════════════════════════════════════╣
  ║                                                    ║
  ║  1. Rust 编译优化：                                  ║
  ║     Cargo.toml [profile.release]：                   ║
  ║     opt-level = "s"          ← 优化体积（非速度）    ║
  ║     lto = true               ← 链接时优化            ║
  ║     codegen-units = 1        ← 更好的优化            ║
  ║     strip = true             ← 移除调试符号          ║
  ║     panic = "abort"          ← 减小 unwinding 代码  ║
  ║                                                    ║
  ║  2. 前端优化：                                      ║
  ║     - Vite build 自动 tree-shaking 和代码分割       ║
  ║     - 压缩图片资源（WebP 替代 PNG）                  ║
  ║     - 按需加载大模块（dynamic import）               ║
  ║     - 移除未使用的 @tauri-apps/api 导入              ║
  ║                                                    ║
  ║  3. 资源管理：                                      ║
  ║     - 大资源文件放 CDN 而非打包进应用                ║
  ║     - 首次启动时下载必要资源                          ║
  ║     - 使用增量更新而非全量替换                        ║
  ║                                                    ║
  ║  4. 典型包体积参考：                                  ║
  ║     - Rust Hello World binary: ~2-3 MB              ║
  ║     - 小型应用（含前端）: ~5-10 MB                  ║
  ║     - 中型应用（含多个插件）: ~20-50 MB              ║
  ║     - WebView2 运行时（Windows，首次安装）: ~120 MB  ║
  ║                                                    ║
  ║  5. 分析工具：                                      ║
  ║     - cargo bloat：分析 Rust binary 体积构成         ║
  ║     - vite-plugin-visualizer：分析前端 bundle        ║
  ║     - du -sh src-tauri/target/release/：查看产物    ║
  ║                                                    ║
  ╚══════════════════════════════════════════════════════╝
`);

// ============================================================================
// 示例 7：CI/CD 自动化构建
// ============================================================================
// 场景：通过 GitHub Actions 自动化跨平台构建

console.log("=== 示例 7：CI/CD 自动化 ===");
console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║         GitHub Actions 自动化构建简要流程              ║
  ╠══════════════════════════════════════════════════════╣
  ║                                                    ║
  ║  1. 使用官方 action: tauri-apps/tauri-action@v0     ║
  ║  2. 配置矩阵构建三平台：                              ║
  ║     - ubuntu-latest → .deb / .AppImage              ║
  ║     - windows-latest → .msi / .exe (NSIS)           ║
  ║     - macos-latest → .dmg / .app (需签名)           ║
  ║  3. 安装依赖：                                       ║
  ║     - Ubuntu: libwebkit2gtk, libgtk-3-dev 等        ║
  ║     - Windows: WebView2（系统自带 Win 11）          ║
  ║     - macOS: 无需额外依赖                            ║
  ║  4. 上传产物到 Release：                              ║
  ║     - 使用 softprops/action-gh-release               ║
  ║     - 同时上传签名文件和更新清单                      ║
  ║                                                    ║
  ║  示例 .github/workflows/release.yml：                ║
  ║  https://tauri.app/distribute/ci-integration         ║
  ║                                                    ║
  ╚══════════════════════════════════════════════════════╝
`);

// ============================================================================
// 【常见错误示例】
// ============================================================================

console.log("=== 常见错误示例 ===");

console.log(`
  ❌ 错误 1：targe triple 不匹配
  在 macOS 上运行 tauri build --target x86_64-pc-windows-msvc
  报错：linker 'link.exe' not found
  
  原因：不能在当前平台交叉编译到其他平台（除非配置交叉编译工具链）
  修复：使用 CI/CD 多平台构建，或安装交叉编译工具链

  ❌ 错误 2：frontendDist 路径错误
  // tauri.conf.json
  {
    "build": { "frontendDist": "../dist" }  // 从 src-tauri/ 的相对路径
  }
  // 如果 Vite 输出到 /project/build/ 而非 /project/dist/
  // 需要修改此路径
  
  原因：frontendDist 必须指向前端构建产物的实际目录
  修复：检查 Vite build.outDir 配置，确保路径一致

  ❌ 错误 3：忘记配置 beforeBuildCommand
  // tauri.conf.json
  {
    "build": {
      "frontendDist": "../dist",
      // 缺少 "beforeBuildCommand": "pnpm build" ← 导致 dist/ 为空！
    }
  }
  
  原因：不执行前端构建，dist/ 目录为空，打包进去的只有 Rust 后端
  现象：应用启动后白屏
  修复：添加 beforeBuildCommand 指向正确的构建命令
`);

// ============================================================================
// 【本章小结】
// ============================================================================
/**
 * 1. 开发流程概览：
 *    - 开发阶段：pnpm tauri dev（HMR + 热重载）
 *    - 构建阶段：pnpm tauri build（优化 + 打包）
 *    - 发布阶段：签名 + 上传 + 更新配置
 *
 * 2. 打包配置核心：
 *    - bundle.targets：选择目标安装包格式
 *    - bundle.icon：应用图标（多平台多分辨率）
 *    - bundle.resources：附带资源文件
 *    - bundle.externalBin：Sidecar 可执行文件
 *    - beforeBuildCommand：前端构建命令
 *    - frontendDist：前端产物目录
 *
 * 3. 代码签名：
 *    - macOS：Developer ID + 公证（Notarization）
 *    - Windows：EV Code Signing Certificate
 *    - 开发者：测试阶段可跳过，发布前必须签名
 *
 * 4. 自动更新（Updater）：
 *    - 需要公钥私钥对（tauri signer generate）
 *    - 通过更新端点检查新版本
 *    - 支持增量更新和全量更新
 *
 * 5. 体积优化：
 *    - Rust: opt-level="s", lto=true, strip=true
 *    - 前端: tree-shaking, 图片压缩, 按需加载
 *    - 资源: CDN 托管大文件，增量更新
 */
