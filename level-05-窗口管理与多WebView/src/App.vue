<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

interface WinConfig { label: string; title: string; width: number; height: number; url: string }
const windows = ref<WinConfig[]>([]);
const msg = ref("");
const msgs = ref<string[]>([]);
let u: UnlistenFn[] = [];

async function refresh() { windows.value = await invoke<WinConfig[]>("list_windows"); }
async function createWin() {
  const id = "win_" + Date.now().toString(36);
  await invoke("create_child_window", { label: id, title: `子窗口 ${id}` });
  await refresh();
}
async function closeWin(label: string) { await invoke("close_window", { label }); await refresh(); }
async function broadcast() { await invoke("broadcast_message", { msg: msg.value || "你好!" }); msg.value = ""; }

onMounted(async () => {
  await refresh();
  const un = await listen<{ from: string; message: string }>("cross-window-msg", (e) => {
    msgs.value.unshift(`[${e.payload.from}] ${e.payload.message}`);
    if (msgs.value.length > 50) msgs.value.pop();
  });
  u.push(un);
});
onUnmounted(() => u.forEach(fn => fn()));
</script>

<template>
  <div class="app">
    <header><h1>🪟 Level 05：窗口管理与多 WebView</h1></header>
    <div class="toolbar">
      <button @click="createWin">➕ 新建窗口</button>
      <button @click="refresh">🔄 刷新列表</button>
    </div>
    <div class="win-list">
      <div v-for="w in windows" :key="w.label" class="win-card">
        <strong>{{ w.title }}</strong>
        <span>{{ w.width }}×{{ w.height }}</span>
        <code>{{ w.label }}</code>
        <button class="btn-close" @click="closeWin(w.label)" :disabled="w.label === 'main'">✕</button>
      </div>
    </div>
    <div class="broadcast">
      <input v-model="msg" placeholder="广播消息..." @keyup.enter="broadcast" />
      <button @click="broadcast">📡 广播到所有窗口</button>
    </div>
    <div class="msg-log">
      <div v-for="(m,i) in msgs" :key="i">{{ m }}</div>
    </div>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #0f1419; color: #e1e4e8; }
.app { max-width: 900px; margin: 0 auto; padding: 20px; }
header { text-align: center; margin-bottom: 20px; }
header h1 { font-size: 24px; background: linear-gradient(135deg,#58a6ff,#bc8cff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.toolbar { display: flex; gap: 8px; margin-bottom: 16px; }
button { background: linear-gradient(135deg,#238636,#2ea043); color: #fff; border: 1px solid #3fb950; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
button:hover { filter: brightness(1.1); }
button:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-close { background: #da3633; border-color: #f85149; padding: 2px 8px; font-size: 12px; }
.win-list { display: grid; gap: 8px; margin-bottom: 16px; }
.win-card { display: flex; align-items: center; gap: 12px; background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 10px 14px; }
.win-card strong { color: #58a6ff; } .win-card span { color: #8b949e; font-size: 12px; } .win-card code { color: #d2a8ff; font-size: 11px; background: #0d1117; padding: 2px 6px; border-radius: 4px; }
.broadcast { display: flex; gap: 8px; margin-bottom: 16px; }
.broadcast input { flex: 1; background: #0d1117; border: 1px solid #30363d; color: #e1e4e8; padding: 8px 12px; border-radius: 6px; font-size: 13px; }
.msg-log { background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 12px; max-height: 200px; overflow: auto; font-size: 12px; font-family: monospace; }
.msg-log div { padding: 2px 0; border-bottom: 1px solid #21262d; color: #c9d1d9; }
</style>
