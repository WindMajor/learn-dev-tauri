/**
 * ============================================================================
 * 08_dialogs_and_notifications.ts —— 对话框与通知
 * ============================================================================
 *
 * 【学习目标】
 *   1. 掌握文件选择对话框（open / save）的使用
 *   2. 理解消息对话框（message / confirm / ask）的异同
 *   3. 学会系统通知的发送与权限管理
 *   4. 判断何时用原生对话框、何时用前端自定义对话框
 *
 * 【与纯 Web 开发的核心差异】
 *   - 纯 Web：对话框是浏览器层的（alert / confirm / prompt），样式固定且丑陋
 *   - Tauri：使用操作系统原生对话框，与桌面应用体验一致
 *   - 文件对话框在 Web 中是 `<input type="file">`，Tauri 中是系统原生
 *   - 系统通知在 Web 中需要用户授权，Tauri 中需要 capabilities 权限
 */

// 注意：需要安装 @tauri-apps/plugin-dialog 和 @tauri-apps/plugin-notification
// pnpm add @tauri-apps/plugin-dialog @tauri-apps/plugin-notification
// Cargo.toml: tauri-plugin-dialog = "2", tauri-plugin-notification = "2"
// lib.rs: .plugin(tauri_plugin_dialog::init()) .plugin(tauri_plugin_notification::init())

import { open, save, message, confirm, ask } from "@tauri-apps/plugin-dialog";
import {
  sendNotification,
  requestPermission,
  isPermissionGranted,
} from "@tauri-apps/plugin-notification";

// ============================================================================
// 示例 1：文件选择对话框（open）—— 打开文件或目录
// ============================================================================
// 场景：用户点击"打开文件"按钮，弹出系统原生文件选择器
// Tauri V2 特性：open 函数支持多种配置选项

async function example1_openFileDialog() {
  // ====== 场景 A：选择单个文件 ======
  const selectedFile = await open({
    title: "选择配置文件",
    multiple: false,
    filters: [
      {
        name: "配置文件",
        extensions: ["json", "yaml", "toml"],
      },
      {
        name: "所有文件",
        extensions: ["*"],
      },
    ],
  });

  if (selectedFile) {
    // selectedFile 是选中的文件路径（string | null）
    console.log("选中文件路径:", selectedFile);

    // 然后可以用 fs 插件读取
    // const content = await readTextFile(selectedFile);
  } else {
    console.log("用户取消了选择");
  }

  // ====== 场景 B：选择多个文件 ======
  const selectedFiles = await open({
    title: "选择多个图片",
    multiple: true,
    filters: [
      {
        name: "图片",
        extensions: ["png", "jpg", "jpeg", "webp", "gif"],
      },
    ],
  });

  if (Array.isArray(selectedFiles)) {
    console.log(`选中了 ${selectedFiles.length} 个文件:`, selectedFiles);
  }

  // ====== 场景 C：选择目录 ======
  const selectedDir = await open({
    title: "选择工作目录",
    directory: true,
    multiple: false,
  });

  if (selectedDir) {
    console.log("选中目录:", selectedDir);
  }
}

/**
 * // ====== capabilities 权限配置 ======
 * {
 *   "identifier": "dialog-capability",
 *   "permissions": [
 *     "dialog:allow-open",
 *     {
 *       "identifier": "dialog:allow-open",
 *       "allow": [
 *         {
 *           "path": "$HOME/**"   // scope 限定可访问的目录
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

// ============================================================================
// 示例 2：保存文件对话框（save）—— 选择保存路径
// ============================================================================
// 场景：导出数据时让用户选择保存位置和文件名

async function example2_saveFileDialog() {
  // ====== 保存文本文件 ======
  const savePath = await save({
    title: "导出数据",
    defaultPath: "exported-data.json", // 默认文件名
    filters: [
      {
        name: "JSON 文件",
        extensions: ["json"],
      },
      {
        name: "CSV 文件",
        extensions: ["csv"],
      },
      {
        name: "所有文件",
        extensions: ["*"],
      },
    ],
  });

  if (savePath) {
    console.log("用户选择的保存路径:", savePath);

    // 写入文件内容
    // 注意：tauri-plugin-fs 的 scope 可能需要同步配置
    // await writeTextFile(savePath, JSON.stringify(data, null, 2));
  } else {
    console.log("用户取消了保存");
  }
}

// ============================================================================
// 示例 3：消息/确认/询问对话框 —— 三种原生对话框
// ============================================================================
// 场景：需要用户确认操作、显示信息、或询问选项

async function example3_messageDialogs() {
  // ====== 1. message —— 简单信息通知 ======
  // 类似 alert() 但使用系统原生样式
  await message("操作已成功完成！", {
    title: "提示",
    kind: "info", // "info" | "warning" | "error"
  });

  // ====== 2. confirm —— 确认/取消对话框 ======
  // 类似 confirm()，返回 true/false
  const confirmed = await confirm("确定要删除选中的 3 个文件吗？此操作不可撤销。", {
    title: "确认删除",
    kind: "warning", // 黄色警告图标
    okLabel: "删除",
    cancelLabel: "取消",
  });

  if (confirmed) {
    console.log("用户确认删除");
    // 执行删除操作
  } else {
    console.log("用户取消删除");
  }

  // ====== 3. ask —— 带自定义按钮的询问对话框 ======
  // 比 confirm 更灵活，可以自定义按钮文字
  const answer = await ask("文件有未保存的更改，你想要？", {
    title: "保存更改",
    kind: "warning",
    okLabel: "保存",
    cancelLabel: "不保存",
  });

  if (answer) {
    console.log("用户选择保存");
  } else {
    console.log("用户选择不保存");
  }

  // ====== 三种对话框对比 ======
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║         三种原生对话框对比                         ║
  ╠══════════════════════════════════════════════════╣
  ║ message:  显示信息，只有一个"确定"按钮             ║
  ║ confirm:  确认/取消，返回 boolean                  ║
  ║ ask:      自定义两按钮文字，返回 boolean            ║
  ║           (okLabel / cancelLabel)                ║
  ╚══════════════════════════════════════════════════╝
  `);
}

// ============================================================================
// 示例 4：系统通知 —— 桌面级推送
// ============================================================================
// 场景：后台任务完成、收到消息时发送系统通知
// Tauri V2 特性：系统通知独立于浏览器 Notification API

async function example4_systemNotification() {
  // ====== 步骤 1：检查权限状态 ======
  let permissionGranted = await isPermissionGranted();

  // ====== 步骤 2：如果未授权，请求权限 ======
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
    console.log("通知权限状态:", permission);
  }

  // ====== 步骤 3：发送系统通知 ======
  if (permissionGranted) {
    sendNotification({
      title: "Tauri V2 学习",
      body: "恭喜！你已学会文件系统操作。",
      // icon: "icon.png",  // 自定义通知图标（可选）
    });
    console.log("系统通知已发送");

    // ====== 带声音的通知（macOS） ======
    // 可以传递更多系统特定参数
  } else {
    console.warn("通知权限未授予，无法发送通知");

    // 降级方案：使用前端对话框作为替代
    await message("通知权限未开启，请前往系统设置中授权。", {
      title: "权限提示",
      kind: "info",
    });
  }
}

/**
 * // ====== capabilities 权限配置 ======
 * {
 *   "identifier": "notification-capability",
 *   "permissions": [
 *     "notification:default",
 *     "notification:allow-notify",
 *     "notification:allow-request-permission",
 *     "notification:allow-is-permission-granted"
 *   ]
 * }
 */

// ============================================================================
// 示例 5：原生对话框 vs 前端自定义对话框的选择策略
// ============================================================================
// 场景：理解何时用原生、何时用前端 UI 实现

console.log("=== 示例 5：对话框选择策略 ===");
console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║        原生对话框 vs 前端对话框选择指南               ║
  ╠══════════════════════════════════════════════════════╣
  ║                                                    ║
  ║  使用原生对话框（dialog 插件）的场景：              ║
  ║  ✅ 文件选择/保存 → 必须原生（操作系统体验）       ║
  ║  ✅ 简单确认 → 用户习惯系统原生样式                 ║
  ║  ✅ 错误提示 → 需要系统级注意力的场景               ║
  ║  ✅ 删除确认 → 防止用户误操作                       ║
  ║                                                    ║
  ║  使用前端自定义对话框的场景：                      ║
  ║  ✅ 需要输入表单 → 原生对话框不支持复杂输入         ║
  ║  ✅ 自定义样式 → 需要匹配应用 UI 主题              ║
  ║  ✅ 复杂交互 → 多步骤、带进度条、图片预览等         ║
  ║  ✅ 非阻塞提示 → Toast / Snackbar 轻量提示         ║
  ║                                                    ║
  ║  混合方案（推荐）：                                ║
  ║  - 文件操作 → 原生 dialog.open / dialog.save       ║
  ║  - 删除确认 → 原生 dialog.confirm                  ║
  ║  - 设置面板 → 前端自定义 Modal                     ║
  ║  - 操作反馈 → 前端 Toast + 原生通知（长时间任务）   ║
  ║                                                    ║
  ╚══════════════════════════════════════════════════════╝
`);

// ============================================================================
// 示例 6：前端自定义对话框实现思路
// ============================================================================
// 场景：需要一个带设置选项的对话框，原生对话框无法满足

// 这是一个概念示例，展示如何用 Vue/React 实现自定义对话框
// 并最终调用 invoke 将结果传递给 Rust 后端

interface CustomDialogResult {
  action: "save" | "discard" | "cancel";
  format?: "json" | "csv";
}

// 自定义对话框的使用流程（伪代码）：
// function showExportDialog() {
//   // 1. 显示前端自定义 Modal
//   // 2. 用户填写选项（文件名、格式、路径等）
//   // 3. 用户点击确认
//   // 4. 调用 invoke 执行后端导出逻辑
//   // 5. 关闭 Modal，显示结果 Toast
// }

console.log(`
自定义对话框实现建议：
1. 使用 Vue Teleport 或 React Portal 将对话框渲染到 body
2. 使用 CSS transition/animation 实现入场动画
3. 管理 z-index 栈，确保最高层对话框不被遮挡
4. 按 ESC 或点击遮罩层可关闭
5. 防止背景滚动（body overflow: hidden）
`);

// ============================================================================
// 示例 7：实用组合案例 —— 导出数据工作流
// ============================================================================
// 场景：用户点击导出 → 弹出确认对话框 → 选择保存路径 → 显示通知

async function example7_exportWorkflow() {
  // ====== 步骤 1：确认导出 ======
  const exportConfirmed = await confirm("导出当前数据？", {
    title: "导出数据",
    kind: "info",
  });

  if (!exportConfirmed) {
    console.log("用户取消了导出");
    return;
  }

  // ====== 步骤 2：选择保存路径 ======
  const savePath = await save({
    title: "选择导出位置",
    defaultPath: `export-${Date.now()}.json`,
    filters: [
      { name: "JSON", extensions: ["json"] },
      { name: "CSV", extensions: ["csv"] },
    ],
  });

  if (!savePath) {
    console.log("用户取消了保存");
    return;
  }

  // ====== 步骤 3：执行导出（调用 Rust 命令） ======
  try {
    // 这里调用后端命令执行实际导出
    // await invoke("export_data", { path: savePath, format: "json" });

    // ====== 步骤 4：通知用户 ======
    const permissionGranted = await isPermissionGranted();
    if (permissionGranted) {
      sendNotification({
        title: "导出完成",
        body: `数据已成功导出到 ${savePath}`,
      });
    } else {
      await message("数据导出成功！", { title: "完成", kind: "info" });
    }

    console.log(`数据已导出到: ${savePath}`);
  } catch (error) {
    // ====== 错误处理 ======
    await message(`导出失败: ${error}`, {
      title: "错误",
      kind: "error",
    });
  }
}

// ============================================================================
// 【常见错误示例】
// ============================================================================

console.log("=== 常见错误示例 ===");

console.log(`
  ❌ 错误 1：open() 返回值类型混淆
  const result = await open({ multiple: true });
  // result 类型是 string | string[] | null
  // 需要判断是单文件还是多文件
  
  // 修复：检查是否为数组
  if (Array.isArray(result)) {
    result.forEach(f => console.log(f));
  } else if (result) {
    console.log(result);
  }

  ❌ 错误 2：忘记添加 dialog scope 权限
  await open({ title: "选择文件" });
  // 报错：permission 'dialog:allow-open' not granted
  
  原因：capabilities 中没有 dialog 权限
  修复：添加 "dialog:allow-open" 权限到 capabilities 文件

  ❌ 错误 3：在 Tauri 环境中混用浏览器 Notification
  new Notification("标题", { body: "内容" });  // 浏览器通知
  sendNotification({ title: "标题", body: "内容" }); // Tauri 通知
  
  原因：两者是不同的实现，权限模型也不同
  修复：统一使用 Tauri 的通知 API（sendNotification），体验更一致
`);

// ============================================================================
// 【本章小结】
// ============================================================================
/**
 * 1. Tauri V2 对话框系统（tauri-plugin-dialog）：
 *    - open(options)：打开文件/目录选择器
 *    - save(options)：保存文件路径选择器
 *    - message(msg, opts)：信息通知对话框
 *    - confirm(msg, opts)：确认/取消对话框
 *    - ask(msg, opts)：自定义按钮询问对话框
 *
 * 2. 系统通知（tauri-plugin-notification）：
 *    - isPermissionGranted()：检查通知权限
 *    - requestPermission()：请求通知权限
 *    - sendNotification(opts)：发送系统通知
 *    - 需要通知权限的 capabilities 配置
 *
 * 3. 对话框选择策略：
 *    - 文件操作 → 原生的 open / save
 *    - 简单确认 → 原生的 confirm / ask / message
 *    - 复杂表单 → 前端自定义 Modal / Dialog 组件
 *    - 轻量提示 → 前端 Toast / Snackbar
 *    - 后台任务完成 → 系统通知（sendNotification）
 *
 * 4. 最佳实践：
 *    - 导出工作流：confirm → save → invoke → sendNotification
 *    - 删除工作流：confirm → invoke → message(结果)
 *    - 错误处理：catch 后使用 message(kind: "error") 提示
 */
