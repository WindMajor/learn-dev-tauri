<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useAuthStore } from "../stores/auth";
import { useAppStore } from "../stores/app";

const auth = useAuthStore();
const appStore = useAppStore();
const stats = ref({ reports: 42, synced: 0, apiCalls: 0, storage: "0 MB" });
const recentEvents = ref<string[]>([]);
let u: UnlistenFn[] = [];

onMounted(async () => {
  try { stats.value.apiCalls = (await invoke<{ api_call_count: number }>("get_sync_status")).api_call_count; } catch {}
  const u1 = await listen("data-synced", (e) => {
    const d = e.payload as { count: number };
    recentEvents.value.unshift(`数据同步完成: ${d.count} 条报表`);
    if (recentEvents.value.length > 20) recentEvents.value.pop();
    stats.value.synced += d.count;
  });
  u.push(u1);
});
onUnmounted(() => u.forEach(fn => fn()));
</script>

<template>
  <div>
    <h1>📊 工作台</h1>
    <p style="color:var(--text-secondary);margin-bottom:20px">欢迎, {{ auth.user?.username }}（{{ auth.user?.role }}）</p>
    <div class="stats-grid">
      <div class="stat-card"><h3>📋</h3><p class="num">{{ stats.reports }}</p><span>报表总数</span></div>
      <div class="stat-card"><h3>🔄</h3><p class="num">{{ stats.synced }}</p><span>已同步</span></div>
      <div class="stat-card"><h3>🔌</h3><p class="num">{{ stats.apiCalls }}</p><span>API 调用</span></div>
      <div class="stat-card"><h3>💾</h3><p class="num">{{ stats.storage }}</p><span>本地存储</span></div>
    </div>
    <div class="panel">
      <h3>最近事件</h3>
      <div v-if="recentEvents.length">
        <div v-for="(e,i) in recentEvents" :key="i" class="event-line">{{ e }}</div>
      </div>
      <p v-else style="color:var(--text-secondary)">暂无事件</p>
    </div>
  </div>
</template>

<style scoped>
h1 { font-size: 24px; margin-bottom: 4px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 24px; }
.stat-card {
  background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px;
  padding: 18px; text-align: center;
}
.stat-card .num { font-size: 32px; font-weight: 800; color: var(--accent-blue); }
.stat-card span { color: var(--text-secondary); font-size: 13px; }
.panel { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 18px; }
.panel h3 { color: var(--accent-orange); font-size: 14px; margin-bottom: 10px; }
.event-line { padding: 5px 0; border-bottom: 1px solid var(--border); font-size: 13px; font-family: monospace; color: var(--text-primary); }
</style>
