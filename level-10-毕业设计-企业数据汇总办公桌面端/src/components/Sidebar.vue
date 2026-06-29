<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const navItems = [
  { path: "/dashboard", icon: "📊", label: "工作台" },
  { path: "/reports", icon: "📋", label: "报表中心" },
  { path: "/files", icon: "📂", label: "文件管理" },
  { path: "/settings", icon: "⚙️", label: "系统设置" },
];

function isActive(path: string) {
  return route.path.startsWith(path);
}

async function handleLogout() {
  await auth.logout();
  router.push("/login");
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2>DataHub</h2>
      <span class="version">v1.0.0</span>
    </div>
    <nav class="nav-list">
      <button
        v-for="item in navItems"
        :key="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        @click="router.push(item.path)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </nav>
    <div class="sidebar-footer">
      <div v-if="auth.user" class="user-info">
        <span class="user-avatar">{{ auth.user.username[0].toUpperCase() }}</span>
        <span class="user-name">{{ auth.user.username }}</span>
      </div>
      <button class="logout-btn" @click="handleLogout">退出</button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  height: 100vh;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.sidebar-header h2 {
  font-size: 20px;
  background: linear-gradient(135deg, #58a6ff, #bc8cff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.version { color: var(--text-secondary); font-size: 11px; }
.nav-list { flex: 1; padding: 8px; }
.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.15s;
  margin-bottom: 2px;
}
.nav-item:hover { background: rgba(88, 166, 255, 0.1); color: var(--accent-blue); }
.nav-item.active { background: rgba(88, 166, 255, 0.15); color: var(--accent-blue); font-weight: 600; }
.nav-icon { font-size: 18px; }
.sidebar-footer {
  padding: 14px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.user-info { display: flex; align-items: center; gap: 8px; }
.user-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--accent-purple); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
}
.user-name { font-size: 13px; color: var(--text-primary); }
.logout-btn {
  background: transparent; border: 1px solid var(--border);
  color: var(--text-secondary); padding: 4px 10px; border-radius: 4px;
  font-size: 12px; cursor: pointer;
}
.logout-btn:hover { border-color: var(--accent-red); color: var(--accent-red); }
</style>
