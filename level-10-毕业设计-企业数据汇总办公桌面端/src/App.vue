<!--
  src/App.vue —— DataHub Desktop 主布局
  WHAT：侧边栏 + 路由视图的应用壳
  WHY：桌面端应用需要持久化的导航结构（侧边栏），而非 Web 端的顶部导航
  CONTRAST：
    Web 端：   顶部导航 + 面包屑 + 响应式汉堡菜单
    桌面端：   固定侧边栏（类似 VSCode/Finder 的持久导航）
-->
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useAuthStore } from "./stores/auth";
import { useAppStore } from "./stores/app";
import Sidebar from "./components/Sidebar.vue";

const router = useRouter();
const auth = useAuthStore();
const appStore = useAppStore();
const sysInfo = ref<Record<string, string>>({});

let unlisteners: UnlistenFn[] = [];

onMounted(async () => {
  try {
    sysInfo.value = await invoke<Record<string, string>>("get_system_info");
    await auth.checkSession();
    await appStore.loadConfig();
  } catch (e) {
    console.error("初始化失败:", e);
  }

  // 监听导航事件（托盘菜单触发）
  const u1 = await listen("navigate", (e) => {
    router.push(e.payload as string);
  });
  unlisteners.push(u1);
});

onUnmounted(() => unlisteners.forEach((fn) => fn()));
</script>

<template>
  <div class="app-layout" :class="`theme-${appStore.config.theme}`">
    <Sidebar />
    <main class="main-content">
      <router-view />
    </main>
    <footer class="status-bar">
      <span>{{ sysInfo.os }} / {{ sysInfo.arch }}</span>
      <span>v{{ sysInfo.app_version }}</span>
      <span v-if="appStore.syncStatus">上次同步: {{ appStore.syncStatus }}</span>
    </footer>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg-primary: #0f1419;
  --bg-secondary: #161b22;
  --bg-tertiary: #0d1117;
  --border: #30363d;
  --text-primary: #e1e4e8;
  --text-secondary: #8b949e;
  --accent-blue: #58a6ff;
  --accent-purple: #bc8cff;
  --accent-green: #3fb950;
  --accent-orange: #f0883e;
  --accent-red: #f85149;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  overflow: hidden;
  height: 100vh;
}

.app-layout {
  display: flex;
  height: 100vh;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: var(--bg-primary);
}

.status-bar {
  position: fixed;
  bottom: 0;
  left: 240px;
  right: 0;
  height: 28px;
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-size: 11px;
  color: var(--text-secondary);
  z-index: 100;
}

/* 滚动条 */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--bg-tertiary); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #484f58; }
</style>
