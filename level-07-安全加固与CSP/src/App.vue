<script setup lang="ts">
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";

const fileResult = ref("");
const dbResult = ref("");
const attackResult = ref("");

async function testSecureRead(path: string) {
  try {
    fileResult.value = await invoke<string>("secure_read_file", { path });
  } catch (e) { fileResult.value = `被拦截: ${e}`; }
}
async function testSecureDb() {
  try {
    dbResult.value = await invoke<string>("secure_db_query", { table: "users", filterField: "name", filterValue: "张三" });
  } catch (e) { dbResult.value = `被拦截: ${e}`; }
}
async function testSqlInjection() {
  try {
    const r = await invoke<string>("secure_db_query", { table: "users", filterField: "name", filterValue: "'; DROP TABLE users; --" });
    attackResult.value = `⚠️ SQL 注入未拦截: ${r}`;
  } catch (e) { attackResult.value = `✅ 注入被拦截: ${e}`; }
}
</script>

<template>
  <div class="app">
    <header><h1>🛡️ Level 07：安全加固与 CSP</h1></header>
    <div class="grid">
      <div class="card">
        <h3>安全的文件读取</h3>
        <button @click="testSecureRead('/Users/wangmeng/Documents/test.txt')">读取合法路径</button>
        <button class="btn-warn" @click="testSecureRead('/etc/passwd')">路径遍历攻击</button>
        <button class="btn-warn" @click="testSecureRead('../.env')">目录穿越攻击</button>
        <p v-if="fileResult">{{ fileResult }}</p>
      </div>
      <div class="card">
        <h3>SQL 注入防护</h3>
        <button @click="testSecureDb">正常查询</button>
        <button class="btn-warn" @click="testSqlInjection">SQL 注入攻击</button>
        <p v-if="dbResult">{{ dbResult }}</p>
        <p v-if="attackResult" :class="{ danger: attackResult.includes('⚠️') }">{{ attackResult }}</p>
      </div>
      <div class="card">
        <h3>Tauri v2 三层防御</h3>
        <pre>
1️⃣ Capabilities（IPC 白名单）
2️⃣ Scope（文件/URL 白名单）
3️⃣ CSP（内容安全策略）

🔒 默认拒绝，显式授权
vs Electron 默认开放</pre>
      </div>
    </div>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #0f1419; color: #e1e4e8; }
.app { max-width: 900px; margin: 0 auto; padding: 24px; }
header h1 { font-size: 24px; background: linear-gradient(135deg,#58a6ff,#bc8cff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px; }
.grid { display: grid; gap: 14px; }
.card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 16px; }
.card h3 { color: #f0883e; margin-bottom: 10px; font-size: 14px; }
button { background: linear-gradient(135deg,#238636,#2ea043); color: #fff; border: 1px solid #3fb950; padding: 7px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; margin: 3px; }
.btn-warn { background: linear-gradient(135deg,#b62324,#da3633); border-color: #f85149; }
.danger { color: #f85149 !important; font-weight: 700; }
p { margin-top: 8px; font-size: 13px; color: #7ee787; }
pre { background: #0d1117; padding: 12px; border-radius: 6px; font-size: 12px; line-height: 1.8; color: #c9d1d9; margin-top: 8px; }
</style>
