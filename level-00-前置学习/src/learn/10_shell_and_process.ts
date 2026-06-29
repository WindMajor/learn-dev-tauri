/**
 * ============================================================================
 * 10_shell_and_process.ts —— 进程管理
 * ============================================================================
 *
 * 【学习目标】
 *   1. 掌握执行系统命令（execute）和启动子进程（spawn）
 *   2. 理解 Channel 用于实时读取子进程输出
 *   3. 学会进程的生命周期管理（启动、监控、终止）
 *   4. 了解进程操作的安全风险和防范措施
 *
 * 【与纯 Web 开发的核心差异】
 *   - 纯 Web：浏览器完全无法执行系统命令（这是安全边界）
 *   - Tauri：可以通过 shell 插件执行系统命令（这是桌面应用的核心能力）
 *   - 纯 Web：子进程概念不存在于浏览器
 *   - Tauri：spawn 可以启动长期运行的进程并监控输出
 *   - 安全风险远高于 Web 开发，必须严格限制可执行命令
 */

// 注意：需要安装 @tauri-apps/plugin-shell
// pnpm add @tauri-apps/plugin-shell
// Cargo.toml: tauri-plugin-shell = "2"
// lib.rs: .plugin(tauri_plugin_shell::init())

import { Command, open as shellOpen } from "@tauri-apps/plugin-shell";

// ============================================================================
// 示例 1：执行简单命令（execute）—— 一次性执行，等待结果
// ============================================================================
// 场景：执行一个短期命令，获取其输出和退出码
// Tauri V2 特性：execute 会阻塞直到命令完成

async function example1_executeCommand() {
  // ====== 执行 git 命令检查状态 ======
  try {
    const gitStatus = Command.create("execute-git-status", "git", [
      "status",
      "--short",
    ]);
    const output = await gitStatus.execute();

    console.log("Git 状态输出:");
    console.log(output.stdout);
    console.log("退出码:", output.code);
    console.log("stderr:", output.stderr || "(无)");
  } catch (error) {
    console.error("命令执行失败（可能 git 未安装或不在 scope 中）:", error);
  }

  // ====== 执行 node 命令获取版本 ======
  try {
    const nodeVersion = Command.create("node-version-check", "node", [
      "--version",
    ]);
    const output = await nodeVersion.execute();

    if (output.code === 0) {
      console.log("Node.js 版本:", output.stdout.trim());
    } else {
      console.error("Node.js 命令失败:", output.stderr);
    }
  } catch (error) {
    console.error("node 命令执行失败:", error);
  }

  // ====== 执行系统命令（跨平台注意） ======
  // Windows 和 Unix 命令差异很大，需要做平台判断
  // const isWindows = navigator.platform.includes("Win");
  // const cmd = isWindows ? "cmd" : "sh";
  // const args = isWindows ? ["/C", "dir"] : ["-c", "ls -la"];
}

/**
 * // ====== capabilities 中 Shell scope 配置（关键！） ======
 * {
 *   "identifier": "shell-capability",
 *   "permissions": [
 *     "shell:default",
 *     {
 *       "identifier": "shell:allow-execute",
 *       "allow": [
 *         {
 *           "name": "git-status",
 *           "cmd": "git",                    // 允许执行 git
 *           "args": [
 *             { "validator": "status" },      // 仅允许 status 子命令
 *             { "validator": "--short" }       // 仅允许 --short 参数
 *           ]
 *         },
 *         {
 *           "name": "node-version-check",
 *           "cmd": "node",
 *           "args": [
 *             { "validator": "--version" }     // 仅允许 --version
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

// ============================================================================
// 示例 2：启动长期进程（spawn）—— 子进程管理
// ============================================================================
// 场景：启动一个长期运行的服务（如本地开发服务器、数据库）
// Tauri V2 特性：spawn 返回子进程句柄，可监控和控制

async function example2_spawnProcess() {
  // ====== 启动一个子进程（以 ping 为例） ======
  const pingProcess = Command.sidecar("ping-process"); // sidecar 需要特殊配置

  // 使用普通命令 spawn（需要 scope 配置）：
  // const sidecarPath = "path/to/sidecar"; // sidecar 的可执行文件
  // const command = Command.sidecar(pingProcess);
  // command.on("close", (data) => {
  //   console.log(`进程结束，退出码: ${data.code}`);
  // });
  // command.on("error", (error) => {
  //   console.error("进程错误:", error);
  // });
  // const child = await command.spawn();

  console.log("=== spawn vs execute 对比 ===");
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║         execute vs spawn 选择指南                     ║
  ╠══════════════════════════════════════════════════════╣
  ║                                                    ║
  ║  execute（一次性执行）：                              ║
  ║  - 等待命令完成后返回结果                             ║
  ║  - 适合：获取版本号、执行脚本、文件转换               ║
  ║  - 不适合长时间运行的命令                             ║
  ║  - 如：git status, node --version, convert img.png   ║
  ║                                                    ║
  ║  spawn（启动子进程）：                                ║
  ║  - 立即返回子进程句柄，命令在后台运行                  ║
  ║  - 适合：开发服务器、数据库、持续监控、流式输出        ║
  ║  - 可以通过事件监听 stdout/stderr                     ║
  ║  - 可以随时 kill/terminate                            ║
  ║  - 如：npm run dev, mongod, tail -f logs.txt          ║
  ║                                                    ║
  ╚══════════════════════════════════════════════════════╝
  `);
}

// ============================================================================
// 示例 3：实时读取子进程输出（使用 Channel）
// ============================================================================
// 场景：监控子进程的实时日志输出，如构建日志、服务器日志
// Tauri V2 特性：Channel 将子进程的 stdout/stderr 实时推送到前端

async function example3_realtimeOutput() {
  // ====== 概念演示：通过 Channel 获取实时输出 ======
  // 注意：实际使用需要配合 Rust 端的自定义命令

  console.log("=== 实时输出读取方案 ===");
  console.log(`
  方案 1：Shell 插件自带的 stdout/stderr 事件
  const command = Command.create("my-label", "some-cmd");
  command.stdout.on("data", (line) => {
    console.log("stdout:", line);
  });
  command.stderr.on("data", (line) => {
    console.error("stderr:", line);
  });
  command.on("close", (data) => {
    console.log("进程结束，退出码:", data.code);
  });
  const child = await command.spawn();
  
  // 稍后终止进程
  // await child.kill();

  方案 2：Rust 自定义命令 + Channel
  // 适合处理更复杂的输出解析和格式化
  // 见 backend 学习文件的 03_rust_events_and_channels.rs
  `);
}

/**
 * // ====== 对应的 Rust 后端进程管理代码 ======
 *
 * use tauri::ipc::Channel;
 *
 * #[tauri::command]
 * async fn run_dev_server(on_output: Channel<String>) -> Result<(), String> {
 *     use tokio::process::Command;
 *     
 *     let mut child = Command::new("npm")
 *         .args(["run", "dev"])
 *         .stdout(std::process::Stdio::piped())
 *         .stderr(std::process::Stdio::piped())
 *         .spawn()
 *         .map_err(|e| e.to_string())?;
 *     
 *     let stdout = child.stdout.take().unwrap();
 *     let mut reader = tokio::io::BufReader::new(stdout);
 *     let mut line = String::new();
 *     
 *     use tokio::io::AsyncBufReadExt;
 *     loop {
 *         line.clear();
 *         match reader.read_line(&mut line).await {
 *             Ok(0) => break,  // EOF
 *             Ok(_) => { on_output.send(line.clone()).unwrap(); }
 *             Err(e) => { on_output.send(format!("Error: {}", e)).unwrap(); break; }
 *         }
 *     }
 *     
 *     Ok(())
 * }
 */

// ============================================================================
// 示例 4：用默认程序打开文件/URL
// ============================================================================
// 场景：用系统默认浏览器打开链接，用默认程序打开文件
// Tauri V2 特性：shellOpen 调用系统默认程序

async function example4_openExternally() {
  // ====== 在默认浏览器中打开 URL ======
  await shellOpen("https://tauri.app");
  console.log("已在默认浏览器中打开 Tauri 官网");

  // ====== 用默认程序打开本地文件 ======
  // await shellOpen("/path/to/document.pdf");
  // 会用系统的默认 PDF 阅读器打开

  // ====== 用默认文件管理器打开目录 ======
  // await shellOpen("/path/to/folder");

  // ====== 也可以在 Rust 端实现 ======
  // #[tauri::command]
  // fn open_in_browser(url: String) {
  //     opener::open(url).unwrap();
  // }
}

/**
 * // ====== capabilities 权限配置 ======
 * {
 *   "permissions": [
 *     "shell:allow-open"  // 允许用默认程序打开
 *   ]
 * }
 */

// ============================================================================
// 示例 5：Sidecar 模式（Sidecar —— 随应用分发的可执行文件）
// ============================================================================
// 场景：打包独立的可执行文件（如 ffmpeg、Python 脚本）随应用分发

console.log("=== 示例 5：Sidecar 模式 ===");
console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║              Sidecar 模式详解                         ║
  ╠══════════════════════════════════════════════════════╣
  ║                                                    ║
  ║  什么是 Sidecar：                                    ║
  ║  - 一个独立的可执行文件，随 Tauri 应用一起打包分发    ║
  ║  - 可以是用任何语言写的（Go, Python, C++, Rust 等）  ║
  ║  - 通过 Command.sidecar("binary-name") 调用          ║
  ║                                                    ║
  ║  Sidecar 使用场景：                                  ║
  ║  ✅ 依赖特定原生库的工具（如 ffmpeg）                ║
  ║  ✅ 需要隔离的微服务                                  ║
  ║  ✅ 用其他语言编写的辅助程序                         ║
  ║  ✅ 性能敏感的计算模块                               ║
  ║                                                    ║
  ║  配置步骤：                                          ║
  ║  1. 在 src-tauri 同级或子目录放置可执行文件          ║
  ║  2. 在 tauri.conf.json 中配置：                      ║
  ║     {                                                ║
  ║       "bundle": {                                    ║
  ║         "externalBin": ["binaries/my-sidecar"]       ║
  ║       }                                              ║
  ║     }                                                ║
  ║  3. 命名规范：binaries/my-sidecar-{target-triple}    ║
  ║     例如: my-sidecar-x86_64-apple-darwin            ║
  ║  4. 调用：                                           ║
  ║     const command = Command.sidecar("my-sidecar");  ║
  ║     const output = await command.execute();         ║
  ║                                                    ║
  ║  capabilities 配置：                                 ║
  ║  {                                                  ║
  ║    "identifier": "shell:allow-execute",              ║
  ║    "allow": [                                       ║
  ║      { "name": "my-sidecar", "sidecar": true }      ║
  ║    ]                                                ║
  ║  }                                                  ║
  ║                                                    ║
  ╚══════════════════════════════════════════════════════╝
`);

// ============================================================================
// 示例 6：进程终止与清理
// ============================================================================
// 场景：用户关闭应用时，确保所有子进程被正确终止

async function example6_processCleanup() {
  console.log("=== 进程生命周期管理 ===");
  console.log(`
  进程清理的最佳实践：

  1. 应用退出时清理所有子进程：
     // 在 Rust 端监听窗口关闭事件
     .on_window_event(|window, event| {
         if let tauri::WindowEvent::Destroyed = event {
             // 清理该窗口相关的子进程
         }
     })

  2. 使用进程池管理：
     // 维护一个 Vec<Child> 存储所有子进程
     // 在应用退出前遍历 kill()

  3. 优雅关闭：
     // 先发送 SIGTERM（Unix）或 taskkill（Windows）
     // 等待超时后强制 kill

  4. 僵尸进程检查：
     // 定期检查子进程是否仍在运行
     // if let Ok(Some(status)) = child.try_wait() { ... }

  5. 前端：监听窗口关闭，通过 invoke 通知 Rust 清理
     import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
     const win = getCurrentWebviewWindow();
     win.onCloseRequested(async () => {
       await invoke("cleanup_processes"); // 通知 Rust 清理
       await win.close(); // 然后真正关闭
     });
  `);
}

// ============================================================================
// 示例 7：安全警告 —— 绝对不能做的事
// ============================================================================
// 场景：理解进程执行的安全边界

console.log("=== 示例 7：安全红线 ===");
console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║         🚨 进程操作安全红线（绝对不能做）             ║
  ╠══════════════════════════════════════════════════════╣
  ║                                                    ║
  ║  ❌ 第 1 条：绝对禁止执行用户输入的命令              ║
  ║  // 危险代码（永远不要这样写！）                     ║
  ║  const userInput = inputElement.value;              ║
  ║  const cmd = Command.create("user-cmd", userInput); ║
  ║  // ← 用户可以输入 "rm -rf /"，后果不堪设想        ║
  ║                                                    ║
  ║  ❌ 第 2 条：绝对禁止动态拼接命令参数                ║
  ║  const filename = userInput;                        ║
  ║  execute("rm", ["-rf", filename]);                  ║
  ║  // 攻击者可输入 "; cat /etc/passwd" 注入命令       ║
  ║                                                    ║
  ║  ❌ 第 3 条：不在 scope 中配置宽松的命令白名单       ║
  ║  { "cmd": "*", "args": true }  ← 极度危险！         ║
  ║                                                    ║
  ║  ✅ 安全实践：                                       ║
  ║  1. scope 中精确限制可执行命令路径和参数             ║
  ║  2. 参数使用白名单验证（预定义的值才允许）           ║
  ║  3. 在 Rust 后端对参数做二次消毒                     ║
  ║  4. 记录所有命令执行日志（审计用途）                 ║
  ║  5. 考虑用自定义 Rust 命令替代 shell 执行            ║
  ║     例如：用 std::fs 替代 rm 命令                    ║
  ║                                                    ║
  ╚══════════════════════════════════════════════════════╝
`);

// ============================================================================
// 【常见错误示例】
// ============================================================================

console.log("=== 常见错误示例 ===");

console.log(`
  ❌ 错误 1：忘记配置 shell scope
  Command.create("my-label", "ls", ["-la"])
  // 报错：shell:allow-execute not granted for command "ls"
  
  原因：没有在 capabilities 中声明此命令的权限
  修复：添加对应的 scope 配置（命令路径 + 允许的参数）

  ❌ 错误 2：混淆 execute 和 spawn 的返回值
  const output = await command.execute();  // output 有 stdout/stderr/code
  const child = await command.spawn();     // child 是进程句柄，没有 stdout
  
  原因：execute 返回命令结果，spawn 返回进程控制句柄
  修复：如果需要输出，用 execute 或监听 spawn 的 stdout 事件

  ❌ 错误 3：硬编码平台特定的命令
  const cmd = Command.create("my-cmd", "ls", ["-la"]);
  // 这在 Windows 上会失败！
  
  原因：ls 是 Unix 命令，Windows 用 dir
  修复：做平台判断或使用跨平台的 Rust 实现：
    #[cfg(target_os = "windows")] { ... }
    #[cfg(not(target_os = "windows"))] { ... }
`);

// ============================================================================
// 【本章小结】
// ============================================================================
/**
 * 1. Tauri V2 Shell 插件提供三种核心能力：
 *    - execute：一次性执行命令，等待完整输出
 *    - spawn：启动子进程，返回进程句柄可监控控制
 *    - open：用系统默认程序打开文件/URL
 *
 * 2. Sidecar 模式：
 *    - 将独立可执行文件随应用打包分发
 *    - 通过 externalBin 配置声明
 *    - 适合携带 ffmpeg、Python 等外部工具
 *
 * 3. 进程安全（极其重要）：
 *    - 绝对禁止执行用户输入的命令
 *    - scope 必须精确到具体的可执行文件路径和参数
 *    - 在 Rust 后端对参数做二次验证
 *    - 记录操作日志用于审计
 *
 * 4. 跨平台注意事项：
 *    - 命令名称和参数格式在 Windows/Unix 完全不同
 *    - 路径分隔符不同（\\ vs /）
 *    - 尽量使用 Rust 的标准库功能替代 shell 命令
 *    - 当必须用 shell 时，提供 Windows 和 Unix 两套实现
 */
