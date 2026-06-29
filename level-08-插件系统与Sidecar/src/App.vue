<script setup lang="ts">
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";

const textInput = ref("这是一个测试。Tauri v2 的插件系统非常灵活！可以封装可复用的 Rust 功能。");
const analysis = ref<Record<string, number> | null>(null);
const wordStats = ref<Record<string, number> | null>(null);
const sidecarResult = ref("");

async function analyze() {
  analysis.value = await invoke("analyze_text", { text: textInput.value });
}
async function countWords() {
  wordStats.value = await invoke("word_count", { text: textInput.value });
}
async function callSidecar() {
  sidecarResult.value = await invoke<string>("call_sidecar");
}
</script>

<template>
  <div class="app">
    <header><h1>🧩 Level 08：插件系统与 Sidecar</h1></header>
    <div class="grid">
      <div class="card">
        <h3>自定义插件：文本分析</h3>
        <textarea v-model="textInput" rows="3"></textarea>
        <div class="btn-row">
          <button @click="analyze">📊 分析文本</button>
          <button @click="countWords">📝 词频统计</button>
        </div>
        <pre v-if="analysis">{{ JSON.stringify(analysis, null, 2) }}</pre>
        <pre v-if="wordStats">{{ JSON.stringify(wordStats, null, 2) }}</pre>
      </div>
      <div class="card">
        <h3>Sidecar：外部二进制</h3>
        <p class="hint">通过 tauri-plugin-shell 调用外部二进制工具（如 Python/Go/Rust CLI），独立进程安全隔离</p>
        <button @click="callSidecar">🚀 调用 Sidecar</button>
        <p v-if="sidecarResult">{{ sidecarResult }}</p>
      </div>
      <div class="card">
        <h3>插件 vs Sidecar</h3>
        <table>
          <tr><td>插件</td><td>进程内，Rust 代码</td></tr>
          <tr><td>Sidecar</td><td>进程外，任意语言</td></tr>
          <tr><td>安全</td><td>类型安全 + Capabilities</td></tr>
          <tr><td>适用</td><td>高性能/频繁调用</td></tr>
        </table>
      </div>
    </div>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #0f1419; color: #e1e4e8; }
.app { max-width: 900px; margin: 0 auto; padding: 24px; }
header h1 { font-size: 24px; background: linear-gradient(135deg,#58a6ff,#bc8cff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px; }
.grid { display: grid; gap: 14px; }
.card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 16px; }
.card h3 { color: #f0883e; margin-bottom: 10px; font-size: 14px; }
textarea { width: 100%; background: #0d1117; border: 1px solid #30363d; color: #e1e4e8; padding: 10px; border-radius: 6px; font-size: 13px; font-family: inherit; resize: vertical; }
.btn-row { display: flex; gap: 8px; margin-top: 8px; }
button { background: linear-gradient(135deg,#238636,#2ea043); color: #fff; border: 1px solid #3fb950; padding: 7px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
.hint { color: #8b949e; font-size: 12px; margin-bottom: 8px; }
pre { background: #0d1117; padding: 10px; border-radius: 6px; font-size: 12px; white-space: pre-wrap; margin-top: 8px; color: #c9d1d9; }
p { margin-top: 8px; font-size: 13px; color: #7ee787; }
table { width: 100%; font-size: 12px; margin-top: 8px; }
table td { padding: 4px 8px; border-bottom: 1px solid #21262d; }
table td:first-child { color: #f0883e; font-weight: 600; width: 60px; }
</style>
