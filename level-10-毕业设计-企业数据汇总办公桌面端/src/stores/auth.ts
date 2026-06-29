// src/stores/auth.ts
// WHAT：认证状态管理（Pinia Store）
// WHY：前端需要感知 Rust 端的登录状态，Pinia 作为前端状态容器
// CONTRAST：
//   NestJS：服务端管理 Session（无前端 Store 概念）
//   Tauri：  Rust State 是权威数据源，Pinia Store 是前端缓存
//   WARNING：Pinia Store 不是认证的权威源！始终通过 IPC 与 Rust State 同步

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { invoke } from "@tauri-apps/api/core";

interface User {
  user_id: string;
  username: string;
  role: string;
  token: string;
  token_expiry: string;
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === "admin");

  async function login(username: string, password: string) {
    const result = await invoke<User>("login", { args: { username, password } });
    user.value = result;
    return result;
  }

  async function logout() {
    await invoke<string>("logout");
    user.value = null;
  }

  async function checkSession() {
    try {
      const result = await invoke<User | null>("get_session");
      user.value = result;
    } catch {
      user.value = null;
    }
  }

  return { user, isAuthenticated, isAdmin, login, logout, checkSession };
});
