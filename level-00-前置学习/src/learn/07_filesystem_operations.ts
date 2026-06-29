/**
 * ============================================================================
 * 07_filesystem_operations.ts —— 文件系统操作
 * ============================================================================
 *
 * 【学习目标】
 *   1. 掌握 Tauri V2 文件系统插件的核心读写 API
 *   2. 理解 BaseDirectory 枚举及其对应的物理路径
 *   3. 学会安全地处理文件路径和 scope 限制
 *   4. 与浏览器 FileSystem API 做对比
 *
 * 【与纯 Web 开发的核心差异】
 *   - 纯 Web：FileReader API 只能读取用户手动选择的文件
 *   - Tauri：可以直接读写文件系统（受 capabilities scope 限制）
 *   - 浏览器 localStorage：键值对存储，有大小限制
 *   - Tauri 文件存储：无大小限制直接写硬盘
 *   - 安全模型：浏览器由用户授权，Tauri 由开发者预先配置 scope
 */

// 注意：需要先安装 @tauri-apps/plugin-fs
// pnpm add @tauri-apps/plugin-fs
// 并在 src-tauri/Cargo.toml 添加 tauri-plugin-fs = "2"
// 在 lib.rs 中注册 .plugin(tauri_plugin_fs::init())
// 在 capabilities 中声明权限

import {
  readTextFile,
  writeTextFile,
  readFile,
  writeFile,
  readDir,
  createDir,
  removeFile,
  renameFile,
  exists,
  stat,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";

// ============================================================================
// 示例 1：使用 BaseDirectory 枚举读取应用配置文件
// ============================================================================
// 场景：读取应用专属目录下的配置文件
// Tauri V2 特性：BaseDirectory 枚举映射到系统标准目录

async function example1_baseDirectories() {
  // ====== BaseDirectory 枚举说明 ======
  // 这些枚举值对应系统不同的标准目录

  console.log("=== BaseDirectory 枚举对照表 ===");
  console.log(`
  BaseDirectory.AppConfig   → macOS: ~/Library/Application Support/<bundle-id>/
                           → Windows: C:\\Users\\<user>\\AppData\\Roaming\\<bundle-id>\\

  BaseDirectory.AppData     → 同上（AppConfig 的别名）

  BaseDirectory.AppCache    → macOS: ~/Library/Caches/<bundle-id>/
                           → Windows: C:\\Users\\<user>\\AppData\\Local\\<bundle-id>\\

  BaseDirectory.AppLocalData → macOS: ~/Library/Application Support/<bundle-id>/
                            → Windows: C:\\Users\\<user>\\AppData\\Local\\<bundle-id>\\

  BaseDirectory.Temp        → 系统临时目录

  BaseDirectory.Desktop     → 用户桌面目录

  BaseDirectory.Document    → 用户文档目录

  BaseDirectory.Download    → 用户下载目录

  BaseDirectory.Home        → 用户主目录（~/）

  BaseDirectory.Resource    → 应用的资源目录（只读，打包在安装包中）
  `);

  // ====== 读取应用数据目录中的配置文件 ======
  try {
    const configContent = await readTextFile("config.json", {
      baseDir: BaseDirectory.AppConfig,
    });
    const config = JSON.parse(configContent);
    console.log("读取到的配置:", config);
  } catch (error) {
    console.log("配置文件不存在，使用默认配置");
  }

  // ====== 写入配置 ======
  const settings = {
    theme: "dark",
    language: "zh-CN",
    fontSize: 14,
  };
  await writeTextFile("config.json", JSON.stringify(settings, null, 2), {
    baseDir: BaseDirectory.AppConfig,
  });
  console.log("配置已保存到应用数据目录");
}

/**
 * // ====== capabilities 中需要的 scope 配置 ======
 * // 如果 BaseDirectory 是当前配置的 scope 这个目录不再需要额外 scope
 * // 但如果直接使用绝对路径，需要 scope：
 * {
 *   "identifier": "fs:scope",
 *   "allow": [
 *     { "path": "$APPDATA/**" },     // AppConfig/AppData
 *     { "path": "$DOWNLOAD/**" },
 *     { "path": "$DESKTOP/**" },
 *     { "path": "$DOCUMENT/**" },
 *     { "path": "$HOME/.myapp/**" },
 *     { "path": "$TEMP/**" }
 *   ]
 * }
 */

// ============================================================================
// 示例 2：文件基础操作 —— 创建、读取、写入、重命名、删除
// ============================================================================
// 场景：完整的文件 CRUD 操作流程

async function example2_fileCRUD() {
  const filePath = "notes/learning-notes.txt";
  const baseDir = BaseDirectory.AppConfig;

  // ====== 1. 创建目录 ======
  // recursive: true 表示递归创建父级目录
  await createDir("notes", {
    baseDir,
    recursive: true,
  });
  console.log("目录 notes/ 已创建");

  // ====== 2. 写入文本文件 ======
  const content = `# Tauri V2 学习笔记

日期: ${new Date().toLocaleDateString()}
进度: 第 7 章 文件系统操作

要点:
1. BaseDirectory 枚举映射到系统标准目录
2. 文件读写需要配置 capabilities scope
3. V2 使用插件形式（tauri-plugin-fs）`;
  await writeTextFile(filePath, content, { baseDir });
  console.log("文件已写入:", filePath);

  // ====== 3. 检查文件是否存在 ======
  const fileExists = await exists(filePath, { baseDir });
  console.log("文件是否存在:", fileExists);

  // ====== 4. 获取文件信息 ======
  const fileInfo = await stat(filePath, { baseDir });
  console.log("文件信息:", {
    size: `${(fileInfo.size / 1024).toFixed(2)} KB`,
    isFile: fileInfo.isFile,
    isDirectory: fileInfo.isDirectory,
  });

  // ====== 5. 读取文件 ======
  const readContent = await readTextFile(filePath, { baseDir });
  console.log("文件内容预览:", readContent.substring(0, 50) + "...");

  // ====== 6. 重命名文件 ======
  await renameFile(filePath, "notes/tauri-v2-notes.txt", { baseDir });
  console.log("文件已重命名");

  // ====== 7. 删除文件 ======
  await removeFile("notes/tauri-v2-notes.txt", { baseDir });
  console.log("文件已删除");
}

// ============================================================================
// 示例 3：遍历目录 —— 实现文件浏览器
// ============================================================================
// 场景：列出指定目录下的所有文件和子目录

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

async function example3_readDirectory(): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];

  try {
    const dirEntries = await readDir("notes", {
      baseDir: BaseDirectory.AppConfig,
    });

    for (const entry of dirEntries) {
      entries.push({
        name: entry.name,
        path: `notes/${entry.name}`,
        isDirectory: entry.isDirectory,
        size: entry.isDirectory ? 0 : entry.size || 0,
      });
    }

    console.log(`目录 notes/ 中共有 ${entries.length} 个条目`);
  } catch (error) {
    console.error("读取目录失败:", error);
  }

  return entries;
}

// ============================================================================
// 示例 4：二进制文件读写 —— 图片、音频等
// ============================================================================
// 场景：保存和读取二进制文件（图片缓存、音频数据等）

async function example4_binaryIO() {
  // ====== 写入二进制数据 ======
  const buffer = new Uint8Array([72, 101, 108, 108, 111]); // "Hello" 的 UTF-8 字节
  await writeFile("data.bin", buffer, {
    baseDir: BaseDirectory.AppCache,
  });
  console.log("二进制数据已写入");

  // ====== 读取二进制数据 ======
  const readBuffer = await readFile("data.bin", {
    baseDir: BaseDirectory.AppCache,
  });
  console.log("读取到的二进制数组:", readBuffer);
  // readBuffer 是 Uint8Array

  // ====== 实际场景：缓存用户头像 ======
  // 1. 从网络获取头像
  // const response = await fetch("https://avatar.example.com/user123.png");
  // const avatarBuffer = new Uint8Array(await response.arrayBuffer());
  // 2. 写入本地缓存
  // await writeFile("avatar-cache/user123.png", avatarBuffer, {
  //   baseDir: BaseDirectory.AppCache,
  // });
  // 3. 下次直接读取本地缓存
  // const cachedAvatar = await readFile("avatar-cache/user123.png", {
  //   baseDir: BaseDirectory.AppCache,
  // });
}

// ============================================================================
// 示例 5：路径安全与 scope 校验
// ============================================================================
// 场景：避免路径遍历攻击，确保文件操作在允许范围内
// Tauri V2 特性：scope 机制提供双层防护（capabilities + 后端校验）

async function example5_pathSecurity() {
  // ====== Tauri V2 的路径安全机制 ======
  console.log(`
  ╔═════════════════════════════════════════════╗
  ║         Tauri V2 路径安全三层防护            ║
  ╠═════════════════════════════════════════════╣
  ║ 第一层：capabilities scope                  ║
  ║   - 声明允许访问的目录范围                   ║
  ║   - FS 插件会自动校验                        ║
  ║                                             ║
  ║ 第二层：Rust 后端手动路径校验                ║
  ║   - 使用 canonicalize() 解析真实路径         ║
  ║   - 检查是否以允许的根目录为前缀             ║
  ║                                             ║
  ║ 第三层：操作系统权限                          ║
  ║   - 文件系统自身权限控制                     ║
  ╚═════════════════════════════════════════════╝
  `);

  // ====== 永远不要做的事情 ======
  // ❌ 使用用户输入直接拼接路径
  // const userInput = "../../etc/passwd";
  // await readTextFile(userInput); // 路径遍历攻击！

  // ✅ 正确做法：在 Rust 后端做路径校验
  console.log(`
  路径安全最佳实践：
  1. BaseDirectory 优先（自动限定到安全目录）
  2. 需要自定义路径时，在 Rust 端规范化校验
  3. 拒绝包含 .. 或绝对路径的用户输入
  4. 使用 path.resolve(base, userInput) 后再检查
  `);
}

// ============================================================================
// 示例 6：与浏览器 FileSystem API 的对比
// ============================================================================
// 场景：理解何时用 Tauri 文件 API，何时用浏览器 API

async function example6_comparisonWithWeb() {
  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║     Tauri FS API vs 浏览器 FS API vs Node.js FS         ║
  ╠══════════════════════════════════════════════════════════╣
  ║                                                        ║
  ║  Tauri FS (tauri-plugin-fs):                           ║
  ║  ✅ 直接读写文件系统（限 scope 范围）                    ║
  ║  ✅ 访问系统标准目录（桌面、文档、下载等）               ║
  ║  ✅ 二进制文件读写                                     ║
  ║  ✅ 遍历目录                                           ║
  ║  ✅ 创建/删除目录和文件                                 ║
  ║  ❌ 需要权限配置                                       ║
  ║                                                        ║
  ║  浏览器 FileReader API:                                ║
  ║  ✅ 用户主动选择，安全性高                              ║
  ║  ✅ 无需额外权限                                       ║
  ║  ❌ 只能读取用户选择的文件                             ║
  ║  ❌ 无法遍历目录                                       ║
  ║  ❌ 无法写入文件（除 download）                        ║
  ║                                                        ║
  ║  浏览器 File System Access API (新):                   ║
  ║  ✅ 可读写用户授权的目录                               ║
  ║  ❌ 仅 Chromium 支持，Safari/Firefox 不支持             ║
  ║  ❌ Tauri WebView 不一定支持                            ║
  ║                                                        ║
  ║  使用建议：                                            ║
  ║  - 应用内部数据 → Tauri FS + BaseDirectory.AppConfig   ║
  ║  - 用户文档处理 → Tauri FS + dialog.open               ║
  ║  - 临时文件上传 → 浏览器 FileReader + invoke 传给 Rust  ║
  ╚══════════════════════════════════════════════════════════╝
  `);
}

// ============================================================================
// 示例 7：大文件分块读写策略
// ============================================================================
// 场景：处理几百 MB 的大文件，需要分块读写避免内存不足
// Tauri V2 特性：利用 Channel 流式传输大文件

async function example7_largeFileStrategy() {
  console.log("=== 大文件处理策略 ===");
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║         大文件处理方案                            ║
  ╠══════════════════════════════════════════════════╣
  ║                                                  ║
  ║  方案 1：Rust 端分块 + Channel 传输（推荐）       ║
  ║  - Rust 负责文件 I/O（性能最优）                 ║
  ║  - 通过 Channel 逐块传给前端                     ║
  ║  - 前端可用 ReadableStream 模式处理              ║
  ║                                                  ║
  ║  方案 2：Tauri FS 单次读取（小文件 < 10MB）       ║
  ║  - readTextFile / readFile 直接读                ║
  ║  - 简单直接，适合配置文件、日志等                ║
  ║                                                  ║
  ║  方案 3：内存映射（Rust mmap）                    ║
  ║  - 仅 Rust 端处理，结果返回前端                  ║
  ║  - 适合数据库、搜索索引等场景                    ║
  ║                                                  ║
  ╚══════════════════════════════════════════════════╝
  `);

  // 对超大文件推荐使用方案 1 的 invoke 封装：
  // const channel = new Channel<Uint8Array>();
  // channel.onmessage = (chunk) => { ... };
  // await invoke("read_large_file", { path, chunkSize, channel });
}

// ============================================================================
// 【常见错误示例】
// ============================================================================

async function example8_commonMistakes() {
  console.log("=== 常见错误示例 ===");

  console.log(`
  ❌ 错误 1：忘记配置 scope，收到权限错误
  await readTextFile("/Users/me/document.txt")  // 没配 scope → 权限拒绝
  
  原因：fs 插件的 scope 没有覆盖这个路径
  修复：在 capabilities 中添加：
    { "identifier": "fs:scope", "allow": [{ "path": "$HOME/**" }] }

  ❌ 错误 2：baseDir 与路径组合错误
  await readTextFile("/data/config.json", {
    baseDir: BaseDirectory.AppConfig,  // 路径被解析为 AppConfig + /data/config.json
  })
  
  原因：baseDir 会作为路径前缀，文件路径应是相对路径
  修复：去掉开头的 /：
    await readTextFile("data/config.json", { baseDir: BaseDirectory.AppConfig })

  ❌ 错误 3：混淆 BaseDirectory.Resource 的读写权限
  await writeTextFile("new.txt", content, {
    baseDir: BaseDirectory.Resource,  // Resource 是只读的！
  })
  
  原因：BaseDirectory.Resource 映射到应用的资源目录（打包后不可写）
  修复：使用 BaseDirectory.AppConfig 或 AppData 保存数据
  `);
}

// ============================================================================
// 【本章小结】
// ============================================================================
/**
 * 1. Tauri V2 文件系统操作基于 tauri-plugin-fs 插件：
 *    - 必须先安装 npm 包 + cargo crate 并注册插件
 *    - 必须在 capabilities 中声明权限和 scope
 *
 * 2. BaseDirectory 枚举是安全操作的关键：
 *    - AppConfig / AppData → 应用专属数据目录
 *    - AppCache → 缓存目录（可被系统清理）
 *    - Resource → 只读资源目录（打包在安装包中）
 *    - Desktop / Document / Download → 用户目录
 *
 * 3. 文件操作 API：
 *    - readTextFile / writeTextFile → 文本文件
 *    - readFile / writeFile → 二进制文件（Uint8Array）
 *    - readDir / createDir / removeFile / renameFile → 目录和文件管理
 *    - exists / stat → 文件信息查询
 *
 * 4. 安全注意事项：
 *    - 始终通过 scope 限制可访问范围
 *    - 优先使用 BaseDirectory 而非绝对路径
 *    - 在 Rust 后端对路径做二次校验
 *    - 警惕路径遍历（Path Traversal）攻击
 */
