<script setup lang="ts">
import { ref, onMounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../stores/app";

const appStore = useAppStore();
const sysInfo = ref<Record<string, string>>({});

onMounted(async () => {
  await appStore.loadConfig();
  sysInfo.value = await invoke("get_system_info");
  await appStore.updateSyncStatus();
});

async function updateSetting(key: string, value: unknown) {
  await appStore.updateConfig({ [key]: value });
}
async function checkUpdate() {
  const result = await invoke("check_update");
  alert(JSON.stringify(result, null, 2));
}
</script>

<template>
  <div>
    <h1>⚙️ 系统设置</h1>
    <div class="settings-grid">
      <div class="setting-card">
        <h3>外观</h3>
        <label>主题</label>
        <select :value="appStore.config.theme" @change="updateSetting('theme', ($event.target as HTMLSelectElement).value)">
          <option value="dark">深色</option>
          <option value="light">浅色</option>
          <option value="system">跟随系统</option>
        </select>
        <label>语言</label>
        <select :value="appStore.config.language" @change="updateSetting('language', ($event.target as HTMLSelectElement).value)">
          <option value="zh-CN">简体中文</option>
          <option value="en-US">English</option>
        </select>
      </div>
      <div class="setting-card">
        <h3>同步</h3>
        <label class="switch-label">
          <input type="checkbox" :checked="appStore.config.auto_sync_enabled" @change="updateSetting('auto_sync_enabled', ($event.target as HTMLInputElement).checked)" />
          自动同步
        </label>
        <p>同步间隔: {{ appStore.config.sync_interval_secs }}秒</p>
      </div>
      <div class="setting-card">
        <h3>系统信息</h3>
        <table>
          <tr v-for="(v,k) in sysInfo" :key="k"><td class="k">{{ k }}</td><td>{{ v }}</td></tr>
        </table>
      </div>
      <div class="setting-card">
        <h3>更新</h3>
        <p>当前版本: {{ sysInfo.app_version }}</p>
        <button @click="checkUpdate">检查更新</button>
        <p style="margin-top:8px;color:var(--text-secondary);font-size:12px">最后同步: {{ appStore.syncStatus }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
h1 { font-size: 24px; margin-bottom: 20px; }
.settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; }
.setting-card {
  background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 18px;
}
.setting-card h3 { color: var(--accent-orange); font-size: 14px; margin-bottom: 12px; }
label { display: block; color: var(--text-secondary); font-size: 12px; font-weight: 600; margin-bottom: 4px; margin-top: 8px; }
select, button {
  width: 100%; background: var(--bg-tertiary); border: 1px solid var(--border); color: var(--text-primary);
  padding: 8px 12px; border-radius: 6px; font-size: 13px; cursor: pointer;
}
button { background: linear-gradient(135deg, #238636, #2ea043); border-color: #3fb950; color: #fff; font-weight: 600; margin-top: 8px; }
.switch-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
table { width: 100%; font-size: 12px; }
table td { padding: 3px 0; } .k { color: var(--text-secondary); width: 100px; }
p { color: var(--text-primary); font-size: 13px; }
</style>
