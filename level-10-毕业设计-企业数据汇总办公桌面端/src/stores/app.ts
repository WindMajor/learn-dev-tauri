// src/stores/app.ts
// WHAT：应用全局配置 Store
import { defineStore } from "pinia";
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";

interface AppConfig {
  api_base_url: string;
  auto_sync_enabled: boolean;
  sync_interval_secs: number;
  theme: string;
  language: string;
}

export const useAppStore = defineStore("app", () => {
  const config = ref<AppConfig>({
    api_base_url: "https://api.datahub.example.com",
    auto_sync_enabled: true,
    sync_interval_secs: 300,
    theme: "dark",
    language: "zh-CN",
  });
  const syncStatus = ref("");

  async function loadConfig() {
    try {
      config.value = await invoke<AppConfig>("get_config");
    } catch (e) {
      console.error("加载配置失败:", e);
    }
  }

  async function updateConfig(updates: Record<string, unknown>) {
    await invoke("update_config", { updates });
    await loadConfig();
  }

  async function updateSyncStatus() {
    try {
      const status = await invoke<{ last_sync_time: string | null; api_call_count: number }>("get_sync_status");
      syncStatus.value = status.last_sync_time || "未同步";
    } catch {
      syncStatus.value = "获取失败";
    }
  }

  return { config, syncStatus, loadConfig, updateConfig, updateSyncStatus };
});
