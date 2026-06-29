<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const auth = useAuthStore();

const username = ref("admin");
const password = ref("admin123");
const error = ref("");
const loading = ref(false);

async function handleLogin() {
  error.value = "";
  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    router.push("/dashboard");
  } catch (e) {
    error.value = String(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1>DataHub Desktop</h1>
      <p class="subtitle">企业数据汇总办公桌面端</p>
      <form @submit.prevent="handleLogin">
        <label>用户名</label>
        <input v-model="username" placeholder="输入用户名" autocomplete="username" />
        <label>密码</label>
        <input v-model="password" type="password" placeholder="输入密码" autocomplete="current-password" />
        <div v-if="error" class="error">{{ error }}</div>
        <button type="submit" :disabled="loading">
          {{ loading ? "登录中..." : "登录 (admin/admin123)" }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page { display: flex; align-items: center; justify-content: center; height: calc(100vh - 100px); padding-left: 0; }
.login-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 40px; width: 400px; text-align: center; }
.login-card h1 { font-size: 28px; background: linear-gradient(135deg, #58a6ff, #bc8cff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 4px; }
.subtitle { color: var(--text-secondary); font-size: 14px; margin-bottom: 28px; }
form { display: flex; flex-direction: column; gap: 10px; text-align: left; }
label { color: var(--text-secondary); font-size: 13px; font-weight: 600; }
input {
  background: var(--bg-tertiary); border: 1px solid var(--border); color: var(--text-primary);
  padding: 10px 14px; border-radius: 6px; font-size: 14px; outline: none;
}
input:focus { border-color: var(--accent-blue); }
.error { background: #3d1522; border: 1px solid #da3633; color: #f85149; padding: 10px; border-radius: 6px; font-size: 13px; }
button {
  background: linear-gradient(135deg, #238636, #2ea043); color: #fff; border: 1px solid #3fb950;
  padding: 12px; border-radius: 8px; font-size: 15px; cursor: pointer; font-weight: 600; margin-top: 8px;
}
button:hover:not(:disabled) { filter: brightness(1.1); }
button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
