<!--
  src/App.vue
  WHAT：Level 01 的主 Vue 组件 —— 展示 Tauri v2 架构信息和 IPC 调用
  WHY：验证 Tauri v2 的 IPC 通道正常工作：前端 invoke() → Rust Command → 返回数据
  CONTRAST：
    - Electron：需要在 preload.js 中通过 contextBridge.exposeInMainWorld 暴露 API，
                然后才能在前端调用。Tauri v2 自动通过 @tauri-apps/api 暴露 invoke()
    - 纯 Web：fetch() 调用 HTTP API → 网络 → 服务端
    - Tauri：  invoke() → IPC（进程内通信，零网络开销）→ Rust Command
  WARNING：invoke() 返回 Promise，Rust 端是同步函数但在 JS 侧被封装为异步调用。
           这与 Electron 的 ipcRenderer.invoke() 相同，都是 Promise-based。
-->
<script setup lang="ts">
import { ref, onMounted } from "vue";
// @tauri-apps/api 是 Tauri v2 的前端 SDK
// 【对比 Electron】Electron 通过 window.require('electron') 或 preload 暴露的全局变量调用
// Tauri v2 通过标准 ES Module import，类型安全，Tree-shaking 友好
import { invoke } from "@tauri-apps/api/core";

// ─── 响应式状态 ───
const greeting = ref("");
const archInfo = ref<Record<string, unknown> | null>(null);
const isLoading = ref(false);
const error = ref("");

// ─── 调用 Rust Command：greet ───
// WHAT：前端通过 invoke('greet', { name }) 调用 Rust 后端的 #[tauri::command] fn greet
// WHY：这是 Tauri v2 最基础的 IPC 调用模式
// CONTRAST：
//   - NestJS：await fetch('/api/greet?name=xxx') → HTTP 请求 → NestJS Controller
//   - Electron：await window.electronAPI.greet('xxx') → preload 暴露的 API
//   - Tauri：   await invoke('greet', { name: 'xxx' }) → IPC → Rust Command
async function callGreet() {
  try {
    isLoading.value = true;
    error.value = "";
    // invoke 的第一个参数是 Command 名称（与 Rust 函数名对应）
    // 第二个参数是 JSON 对象，key 必须与 Rust 函数参数名完全匹配
    // 【WARNING】参数名不匹配不会编译报错，但会在运行时被忽略或导致反序列化失败！
    greeting.value = await invoke<string>("greet", { name: "学习者" });
  } catch (e) {
    error.value = `IPC 调用失败: ${e}`;
    console.error("[IPC Error]", e);
  } finally {
    isLoading.value = false;
  }
}

// ─── 调用 Rust Command：get_architecture_info ───
async function loadArchInfo() {
  try {
    archInfo.value = await invoke<Record<string, unknown>>("get_architecture_info");
  } catch (e) {
    error.value = `获取架构信息失败: ${e}`;
    console.error("[IPC Error]", e);
  }
}

onMounted(() => {
  loadArchInfo();
});
</script>

<template>
  <div class="app-container">
    <!-- 头部 -->
    <header class="app-header">
      <h1>🦀 Level 01：Tauri v2 架构与权限模型</h1>
      <p class="subtitle">站在已知看未知 —— 建立 Tauri v2 与其他桌面方案的差异地图</p>
    </header>

    <!-- 核心概念卡片 -->
    <section class="section">
      <h2>📐 Tauri v2 进程架构</h2>
      <div class="arch-diagram">
        <pre class="diagram-code">
┌──────────────────────────────────────────┐
│  Tauri App Process（单进程）               │
│  ┌────────────────┐  ┌─────────────────┐ │
│  │ Rust Core      │  │ WebView（原生）  │ │
│  │ • Commands ◄───┼──┤ • Vue3 前端     │ │
│  │ • State        │  │ • @tauri-apps/api│ │
│  │ • Plugins      │  │ • HTML/CSS/JS    │ │
│  │ • Events       │  │                  │ │
│  └────────────────┘  └─────────────────┘ │
│         ▲                    ▲            │
│         │  IPC（进程内通信）  │            │
│         └────────────────────┘            │
└──────────────────────────────────────────┘</pre>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <h3>🔒 权限模型</h3>
          <p><strong>Capabilities 白名单</strong>（v2 全新系统）</p>
          <p>每个 IPC 调用必须在 <code>capabilities/*.json</code> 中显式声明</p>
          <p class="contrast">
            【对比 Electron】Electron 无强制权限模型，依赖开发者自觉限制<br />
            【对比 Swift】类似 App Sandbox 但跨平台
          </p>
        </div>
        <div class="info-card">
          <h3>🧩 Context Isolation</h3>
          <p><strong>强制开启，不可关闭</strong></p>
          <p>前端 JS 无法直接访问系统 API，只能通过 @tauri-apps/api 调用</p>
          <p class="contrast">
            【对比 Electron】contextIsolation 可选（v12+ 默认开启），
            但 preload 仍可暴露任意 Node API
          </p>
        </div>
        <div class="info-card">
          <h3>📦 打包体积</h3>
          <p><strong>~3-5MB vs Electron ~150MB</strong></p>
          <p>不捆绑浏览器引擎，使用系统原生 WebView</p>
          <p class="contrast">
            【对比 egui】类似（~3MB），但 Tauri 使用 Web 技术渲染<br />
            【对比 Swift】~10MB，但 Swift 仅支持 Apple 平台
          </p>
        </div>
      </div>
    </section>

    <!-- IPC 演示 -->
    <section class="section">
      <h2>🔌 IPC 通信演示</h2>
      <p class="description">
        点击下方按钮，Vue3 前端通过 <code>invoke()</code> 调用 Rust 后端的
        <code>#[tauri::command] fn greet</code>。这是 Tauri v2 最基础的 IPC 模式。
      </p>

      <div class="ipc-demo">
        <button class="btn-primary" :disabled="isLoading" @click="callGreet">
          {{ isLoading ? "调用中..." : "invoke('greet') → Rust 后端" }}
        </button>

        <div v-if="greeting" class="result-box success">
          {{ greeting }}
        </div>

        <div v-if="error" class="result-box error">
          {{ error }}
        </div>
      </div>

      <p class="flow-hint">
        💡 打开终端查看 <code>cargo tauri dev</code> 的输出，你会看到
        <code>[IPC] greet 被调用</code> 日志 —— 这就是前后端边界的直观标记。
      </p>
    </section>

    <!-- 架构信息 -->
    <section class="section">
      <h2>📋 Rust 后端返回的架构信息</h2>
      <div v-if="archInfo" class="arch-info-json">
        <table>
          <tbody>
            <tr v-for="(value, key) in archInfo" :key="key">
              <td class="key">{{ key }}</td>
              <td class="value">
                <template v-if="Array.isArray(value)">
                  <ul>
                    <li v-for="(item, i) in value" :key="i">{{ item }}</li>
                  </ul>
                </template>
                <template v-else>
                  {{ value }}
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 关键对比 -->
    <section class="section">
      <h2>⚖️ Tauri v2 vs Electron 安全哲学对比</h2>
      <table class="compare-table">
        <thead>
          <tr>
            <th>维度</th>
            <th>Electron</th>
            <th>Tauri v2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>IPC 模型</td>
            <td>ipcMain/ipcRenderer（无边界）</td>
            <td>#[command] + invoke（白名单）</td>
          </tr>
          <tr>
            <td>权限控制</td>
            <td>无强制（开发者自觉）</td>
            <td>Capabilities 强制白名单</td>
          </tr>
          <tr>
            <td>前端能力</td>
            <td>可访问完整 Node API（如有 nodeIntegration）</td>
            <td>仅 @tauri-apps/api 暴露的能力</td>
          </tr>
          <tr>
            <td>安全哲学</td>
            <td>"默认开放，需要时关闭"</td>
            <td>"默认拒绝，显式授权"</td>
          </tr>
          <tr>
            <td>CSP</td>
            <td>默认无</td>
            <td>默认启用严格 CSP</td>
          </tr>
        </tbody>
      </table>
    </section>

    <footer class="app-footer">
      <p>
        通关标准：能手写出 Tauri v2 项目结构 + 配置 Capabilities + 解释安全边界
      </p>
      <p>
        下一步 → <a href="../level-02-IPC通信Command与State/README.md">Level 02：IPC 通信深度</a>
      </p>
    </footer>
  </div>
</template>

<style>
/* ─── 全局样式（桌面端应用，独立样式不依赖外部库） ─── */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial,
    "Noto Sans SC", sans-serif;
  background: #0f1419;
  color: #e1e4e8;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.app-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px;
}

.app-header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 24px;
  border-bottom: 2px solid #30363d;
}

.app-header h1 {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #58a6ff, #bc8cff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: #8b949e;
  margin-top: 8px;
  font-size: 14px;
}

.section {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
}

.section h2 {
  font-size: 20px;
  margin-bottom: 16px;
  color: #58a6ff;
}

.description {
  color: #8b949e;
  margin-bottom: 16px;
  font-size: 14px;
}

/* ─── 架构图 ─── */
.arch-diagram {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  overflow-x: auto;
}

.diagram-code {
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  font-size: 13px;
  color: #c9d1d9;
  white-space: pre;
}

/* ─── 信息卡片 ─── */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.info-card {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 16px;
}

.info-card h3 {
  font-size: 16px;
  margin-bottom: 8px;
  color: #f0883e;
}

.info-card p {
  font-size: 13px;
  color: #c9d1d9;
  margin-bottom: 6px;
}

.info-card code {
  background: #1f242e;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #d2a8ff;
}

.contrast {
  color: #8b949e !important;
  font-size: 12px !important;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #21262d;
}

/* ─── IPC 演示 ─── */
.ipc-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.btn-primary {
  background: linear-gradient(135deg, #238636, #2ea043);
  color: #fff;
  border: 1px solid #3fb950;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2ea043, #3fb950);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result-box {
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 15px;
  max-width: 100%;
  word-break: break-all;
}

.result-box.success {
  background: #0d3320;
  border: 1px solid #238636;
  color: #7ee787;
}

.result-box.error {
  background: #3d1522;
  border: 1px solid #da3633;
  color: #f85149;
}

.flow-hint {
  color: #8b949e;
  font-size: 13px;
  margin-top: 8px;
}

.flow-hint code {
  background: #1f242e;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #d2a8ff;
}

/* ─── 架构信息表格 ─── */
.arch-info-json {
  overflow-x: auto;
}

.arch-info-json table {
  width: 100%;
  border-collapse: collapse;
}

.arch-info-json td {
  padding: 10px 14px;
  border-bottom: 1px solid #21262d;
  font-size: 13px;
  vertical-align: top;
}

.arch-info-json .key {
  color: #f0883e;
  font-weight: 600;
  white-space: nowrap;
  width: 180px;
}

.arch-info-json .value {
  color: #c9d1d9;
}

.arch-info-json ul {
  list-style: none;
  padding: 0;
}

.arch-info-json li {
  padding: 2px 0;
}

/* ─── 对比表格 ─── */
.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.compare-table th {
  background: #0d1117;
  padding: 10px 14px;
  text-align: left;
  font-weight: 600;
  color: #58a6ff;
  border-bottom: 2px solid #30363d;
}

.compare-table td {
  padding: 10px 14px;
  border-bottom: 1px solid #21262d;
  color: #c9d1d9;
}

.compare-table tr:hover td {
  background: rgba(88, 166, 255, 0.05);
}

/* ─── 页脚 ─── */
.app-footer {
  text-align: center;
  padding: 24px;
  color: #8b949e;
  font-size: 13px;
}

.app-footer a {
  color: #58a6ff;
  text-decoration: none;
}

.app-footer a:hover {
  text-decoration: underline;
}
</style>
