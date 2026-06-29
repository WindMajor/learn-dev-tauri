<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

const appInfo = ref<Record<string, unknown> | null>(null);
const notifStatus = ref("");
const eventLog = ref<string[]>([]);
let u: UnlistenFn[] = [];

async function sendNotification() {
  try {
    await invoke("send_system_notification", {
      title: "Level 06 通知",
      body: `来自前端的测试通知 - ${new Date().toLocaleTimeString()}`
    });
    notifStatus.value = "通知已发送 ✅";
  } catch (e) { notifStatus.value = `失败: ${e}`; }
}

onMounted(async () => {
  try { appInfo.value = await invoke("get_app_info"); } catch {}
  const un = await listen<{ msg: string }>("rust-response", (e) => {
    eventLog.value.unshift(`[Rust] ${e.payload.msg}`);
    if (eventLog.value.length > 30) eventLog.value.pop();
  });
  u.push(un);
});
onUnmounted(() => u.forEach(fn => fn()));
</script>

<template>
  <div class="app">
    <header><h1>🔔 Level 06：菜单、托盘与系统集成</h1></header>
    <div class="grid">
      <div class="card">
        <h3>系统托盘</h3>
        <p>查看系统状态栏（顶部 macOS / 右下角 Windows）— 托盘图标已创建</p>
        <p class="hint">左键点击托盘图标可切换显示/隐藏主窗口</p>
      </div>
      <div class="card">
        <h3>系统通知</h3>
        <button @click="sendNotification">📢 发送系统通知</button>
        <p v-if="notifStatus">{{ notifStatus }}</p>
      </div>
      <div class="card">
        <h3>全局快捷键</h3>
        <p><kbd>Cmd+Shift+D</kbd>（macOS）/ <kbd>Ctrl+Shift+D</kbd>（Win/Linux）— 呼出主窗口</p>
        <p class="hint">快捷键在 Rust 端注册，系统级生效</p>
      </div>
      <div class="card" v-if="appInfo">
        <h3>应用信息</h3>
        <pre>{{ JSON.stringify(appInfo, null, 2) }}</pre>
      </div>
    </div>
    <div class="log">
      <h3>事件日志</h3>
      <div v-for="(e,i) in eventLog" :key="i">{{ e }}</div>
    </div>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #0f1419; color: #e1e4e8; }
.app { max-width: 900px; margin: 0 auto; padding: 24px; }
header h1 { font-size: 24px; background: linear-gradient(135deg,#58a6ff,#bc8cff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 14px; margin: 20px 0; }
.card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 16px; }
.card h3 { color: #f0883e; margin-bottom: 10px; font-size: 14px; }
button { background: linear-gradient(135deg,#238636,#2ea043); color: #fff; border: 1px solid #3fb950; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
.hint { color: #8b949e; font-size: 12px; margin-top: 6px; }
kbd { background: #0d1117; border: 1px solid #30363d; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 12px; }
pre { background: #0d1117; padding: 10px; border-radius: 6px; font-size: 12px; white-space: pre-wrap; margin-top: 8px; }
.log { background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 12px; margin-top: 16px; max-height: 150px; overflow: auto; font-size: 12px; font-family: monospace; }
.log h3 { color: #f0883e; margin-bottom: 8px; }
.log div { padding: 2px 0; color: #c9d1d9; }
</style>
