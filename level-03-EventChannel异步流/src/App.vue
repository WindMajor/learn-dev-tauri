<!--
  src/App.vue —— Level 03：Event、Channel 与异步流
  WHAT：演示 Tauri v2 的事件系统（emit/listen）和 Channel 流式传输
  WHY：事件和流是实时桌面应用的基石（通知推送、进度条、聊天、监控）
  WARNING：
    - listen() 返回的 unlisten 函数必须在 onUnmounted 中调用，否则内存泄漏！
    - Channel 是单向（Rust→前端），前端不能向 Channel 写数据
    - async Command 在 Tokio 运行时执行，不会阻塞 UI 线程
-->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// ─── 通知事件 ───
const notification = ref("");
async function sendNotification() {
  await invoke("send_notification", {
    title: "测试通知",
    body: `来自前端的事件 - ${new Date().toLocaleTimeString()}`,
  });
}

// ─── Channel 流式进度 ───
const progressMessages = ref<string[]>([]);
const progressPercent = ref(0);

async function startProgressStream() {
  progressMessages.value = ["启动流式传输..."];
  progressPercent.value = 0;

  try {
    // Tauri v2 Channel —— Rust 端推送多条消息到前端
    const { Channel } = await import("@tauri-apps/api/core");
    const channel = new Channel<string>();
    
    // 监听 Channel 消息
    channel.onmessage = (msg: string) => {
      progressMessages.value.push(`[Channel] ${msg}`);
    };

    // 启动 Rust 端流
    await invoke("start_progress_stream", { channel });
  } catch (e) {
    progressMessages.value.push(`错误: ${e}`);
  }
}

// ─── 异步命令 ───
const asyncTaskResult = ref("");

async function runAsyncTask() {
  asyncTaskResult.value = "执行中...";
  try {
    const result = await invoke<string>("simulate_heavy_task", { durationMs: 2000 });
    asyncTaskResult.value = result;
  } catch (e) {
    asyncTaskResult.value = `失败: ${e}`;
  }
}

// ─── 事件监听器管理 ───
const heartbeatCount = ref(0);
const eventLog = ref<string[]>([]);

let unlisteners: UnlistenFn[] = [];

onMounted(async () => {
  // listen() 返回 Promise<UnlistenFn>
  // 【WARNING】unlisten 必须在 onUnmounted 中调用！
  //   Electron 的 ipcRenderer.on() 需要手动 removeListener，
  //   Tauri v2 的 listen 返回 unlisten 函数更方便

  const unlisten1 = await listen<{ count: number; msg: string }>("heartbeat", (event) => {
    const { count, msg } = event.payload;
    heartbeatCount.value = count;
    eventLog.value.unshift(`[心跳#${count}] ${msg}`);
    if (eventLog.value.length > 100) eventLog.value.pop();
  });
  unlisteners.push(unlisten1);

  const unlisten2 = await listen("notification", (event) => {
    const data = event.payload as { title: string; body: string };
    notification.value = `📢 ${data.title}: ${data.body}`;
    eventLog.value.unshift(`[通知] ${data.title}`);
    if (eventLog.value.length > 100) eventLog.value.pop();
  });
  unlisteners.push(unlisten2);

  const unlisten3 = await listen("progress", (event) => {
    progressPercent.value = Math.round(event.payload as number);
  });
  unlisteners.push(unlisten3);

  const unlisten4 = await listen("task-completed", (event) => {
    const data = event.payload as { duration_ms: number; result: string };
    eventLog.value.unshift(`[任务] ${data.result} (${data.duration_ms}ms)`);
  });
  unlisteners.push(unlisten4);

  // 监听 Rust 对前端事件的响应
  const unlisten5 = await listen("rust-response", (event) => {
    eventLog.value.unshift(`[Rust 响应] ${(event.payload as { msg: string }).msg}`);
  });
  unlisteners.push(unlisten5);
});

// 【WARNING】组件卸载时必须清理所有监听器！
// 不清理的后果：
//   - 内存泄漏（事件处理器一直存在）
//   - Rust 端 emit 后前端已销毁的组件仍尝试更新状态 → 可能导致错误
// 【对比 Electron】
//   Electron 中 ipcRenderer.removeAllListeners('channel') 清理，
//   Tauri v2 的 unlisten() 语义更清晰
onUnmounted(() => {
  unlisteners.forEach((fn) => fn());
  unlisteners = [];
  console.log("[Cleanup] 已清理所有事件监听器");
});

// 前端 emit 事件到 Rust 端
async function emitToRust() {
  const { emit } = await import("@tauri-apps/api/event");
  await emit("frontend-hello", { message: "你好 Rust!", time: Date.now() });
  eventLog.value.unshift("[前端] emit → Rust");
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1>📡 Level 03：Event、Channel 与异步流</h1>
      <p class="subtitle">emit ↔ listen ▪ Channel 流式传输 ▪ async Command ▪ 心跳</p>
    </header>

    <div class="dashboard">
      <!-- 心跳指示器 -->
      <div class="heartbeat-card">
        <span class="pulse" :class="{ active: heartbeatCount > 0 }"></span>
        <div>
          <h3>后台心跳</h3>
          <p class="big-count">#{{ heartbeatCount }}</p>
          <span class="hint">每 5 秒 Rust 端自动推送</span>
        </div>
      </div>

      <!-- 通知 -->
      <div class="action-card">
        <button class="btn" @click="sendNotification">📢 发送通知</button>
        <p v-if="notification" class="notif-result">{{ notification }}</p>
      </div>

      <!-- 前端 → Rust 事件 -->
      <div class="action-card">
        <button class="btn btn-alt" @click="emitToRust">📤 前端 emit → Rust</button>
        <span class="hint">Rust 端 listen 并响应</span>
      </div>
    </div>

    <!-- Channel 流式传输 -->
    <section class="section">
      <h2>🌊 Channel 流式传输</h2>
      <div class="channel-area">
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="progress-text">{{ progressPercent }}%</span>
        <button class="btn" @click="startProgressStream">启动流式传输</button>
      </div>
      <div v-if="progressMessages.length" class="channel-log">
        <div v-for="(msg, i) in progressMessages" :key="i" class="log-line">{{ msg }}</div>
      </div>
    </section>

    <!-- 异步命令 -->
    <section class="section">
      <h2>⏳ Async Command</h2>
      <button class="btn" @click="runAsyncTask">模拟 2 秒异步任务</button>
      <p v-if="asyncTaskResult" class="result">{{ asyncTaskResult }}</p>
    </section>

    <!-- 事件日志 -->
    <section class="section">
      <h2>📋 事件日志</h2>
      <div class="event-log">
        <div v-for="(log, i) in eventLog" :key="i" class="log-line">{{ log }}</div>
        <div v-if="eventLog.length === 0" class="empty-log">等待事件...</div>
      </div>
    </section>

    <footer class="app-footer">
      <p>监听器: {{ unlisteners.length }} 个 | 心跳 #{{ heartbeatCount }}</p>
    </footer>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif;
  background: #0f1419; color: #e1e4e8; line-height: 1.6;
}
.app-container { max-width: 960px; margin: 0 auto; padding: 24px; }
.app-header { text-align: center; margin-bottom: 28px; padding-bottom: 18px; border-bottom: 2px solid #30363d; }
.app-header h1 { font-size: 24px; background: linear-gradient(135deg, #58a6ff, #bc8cff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { color: #8b949e; font-size: 13px; margin-top: 4px; }

.dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px; margin-bottom: 20px; }
.heartbeat-card, .action-card {
  background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 16px;
  display: flex; align-items: center; gap: 14px;
}
.action-card { flex-direction: column; align-items: flex-start; }
.pulse {
  width: 16px; height: 16px; border-radius: 50%; background: #30363d; flex-shrink: 0;
  transition: all 0.3s;
}
.pulse.active { background: #3fb950; box-shadow: 0 0 12px rgba(63, 185, 80, 0.5); animation: pulse-anim 2s infinite; }
@keyframes pulse-anim { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.big-count { font-size: 36px; font-weight: 800; color: #58a6ff; }
.hint { color: #8b949e; font-size: 12px; }

.section { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 20px; margin-bottom: 18px; }
.section h2 { font-size: 18px; color: #58a6ff; margin-bottom: 12px; }

.channel-area { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.progress-bar-container {
  flex: 1; height: 20px; background: #0d1117; border-radius: 10px; overflow: hidden; border: 1px solid #30363d;
}
.progress-bar { height: 100%; background: linear-gradient(90deg, #238636, #3fb950); border-radius: 10px; transition: width 0.3s; min-width: 0; }
.progress-text { font-size: 14px; color: #7ee787; font-weight: 600; min-width: 40px; }

.channel-log, .event-log {
  background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 12px;
  max-height: 250px; overflow-y: auto; font-family: "SF Mono", "Consolas", monospace; font-size: 12px;
}
.log-line { padding: 3px 0; color: #c9d1d9; border-bottom: 1px solid #21262d; }
.empty-log { color: #8b949e; font-style: italic; }
.notif-result { color: #7ee787; font-size: 13px; margin-top: 6px; }

.btn {
  background: linear-gradient(135deg, #238636, #2ea043); color: #fff; border: 1px solid #3fb950;
  padding: 9px 20px; border-radius: 7px; font-size: 14px; cursor: pointer; font-weight: 600;
  transition: all 0.2s;
}
.btn:hover { transform: translateY(-1px); filter: brightness(1.1); }
.btn-alt { background: linear-gradient(135deg, #1f6feb, #388bfd); border-color: #58a6ff; }
.result { background: #0d3320; border: 1px solid #238636; color: #7ee787; padding: 10px 14px; border-radius: 6px; margin-top: 10px; font-size: 14px; }
.app-footer { text-align: center; padding: 14px; color: #8b949e; font-size: 12px; }
</style>
