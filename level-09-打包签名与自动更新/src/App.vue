<script setup lang="ts">
import { ref, onMounted } from "vue";
import { invoke } from "@tauri-apps/api/core";

const buildInfo = ref<Record<string, unknown> | null>(null);
const updateResult = ref<Record<string, unknown> | null>(null);

onMounted(async () => { buildInfo.value = await invoke("get_build_info"); });
async function checkUpdate() {
  updateResult.value = await invoke("check_for_update");
}
</script>

<template>
  <div class="app">
    <header><h1>📦 Level 09：打包、签名与自动更新</h1></header>
    <div class="grid">
      <div class="card" v-if="buildInfo">
        <h3>构建信息</h3>
        <table>
          <tr v-for="(v,k) in buildInfo" :key="k"><td>{{ k }}</td><td>{{ v }}</td></tr>
        </table>
      </div>
      <div class="card">
        <h3>打包命令</h3>
        <pre>
# 开发构建
cargo tauri dev

# 生产构建
cargo tauri build

# MacOS Universal Binary
cargo tauri build --target universal-apple-darwin

# Windows
cargo tauri build --target x86_64-pc-windows-msvc

# Linux AppImage
cargo tauri build --target x86_64-unknown-linux-gnu</pre>
      </div>
      <div class="card">
        <h3>自动更新</h3>
        <button @click="checkUpdate">检查更新</button>
        <pre v-if="updateResult">{{ JSON.stringify(updateResult, null, 2) }}</pre>
      </div>
      <div class="card">
        <h3>Tauri vs Electron 打包体积</h3>
        <table>
          <tr><td>Tauri</td><td>~3-5 MB</td><td>系统原生 WebView</td></tr>
          <tr><td>Electron</td><td>~150 MB</td><td>捆绑 Chromium</td></tr>
          <tr><td>Swift</td><td>~10 MB</td><td>仅 Apple 平台</td></tr>
          <tr><td>egui</td><td>~3 MB</td><td>纯 Rust 自绘</td></tr>
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
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 14px; }
.card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 16px; }
.card h3 { color: #f0883e; margin-bottom: 10px; font-size: 14px; }
pre { background: #0d1117; padding: 12px; border-radius: 6px; font-size: 12px; white-space: pre-wrap; color: #c9d1d9; font-family: "SF Mono", monospace; }
button { background: linear-gradient(135deg,#238636,#2ea043); color: #fff; border: 1px solid #3fb950; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; margin-bottom: 10px; }
table { width: 100%; font-size: 12px; }
table td { padding: 4px 8px; border-bottom: 1px solid #21262d; }
table td:first-child { color: #f0883e; font-weight: 600; width: 100px; }
</style>
