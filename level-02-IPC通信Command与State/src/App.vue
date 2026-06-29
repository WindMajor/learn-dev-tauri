<!--
  src/App.vue —— Level 02：IPC Command 与 State 前端演示
  WHAT：展示 invoke() 调用 Rust Command 的多种模式
  WHY：理解前后端类型契约、错误处理、State 共享
  CONTRAST：
    - Electron：ipcRenderer.invoke('name', ...args)，args 是 any[]
    - NestJS：  fetch() 调用 REST API，类型由 openapi-typescript 等工具生成
    - Tauri v2：invoke<T>('name', args)，T 由开发者显式标注（或推断）

  WARNING：
    - invoke 的第二参数 key 必须与 Rust 函数参数名完全匹配
    - 参数名拼写错误不会编译报错，但会导致 Rust 端收到默认值或反序列化失败
    - Result::Err 会触发前端 Promise reject，必须 try-catch
-->
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { invoke } from "@tauri-apps/api/core";

// ─── TypeScript 类型定义（与 Rust 结构体对应） ───
// WHAT：前端类型定义 —— 最佳实践是定义与 Rust 结构体对应的 TS 接口
// WHY：提供 invoke 调用处的类型智能提示和编译期检查
// 【对比 NestJS】类似 shared-types 包，但 Tauri 项目通常手动维护两端类型一致
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  role: string;
  created_at: string;
}

interface CreateUserArgs {
  name: string;
  email: string;
  age: number;
  role: string;
}

// ─── 响应式状态 ───
const greeting = ref("");
const calcResult = ref("");
const userList = ref<User[]>([]);
const createResult = ref("");
const appConfig = ref<Record<string, unknown> | null>(null);
const visitCount = ref(0);
const loading = ref("");

async function testGreet() {
  loading.value = "greet";
  try {
    greeting.value = await invoke<string>("greet", { name: "IPC学习者" });
  } catch (e) {
    greeting.value = `错误: ${e}`;
  } finally {
    loading.value = "";
  }
}

async function testCalculate(op: string) {
  loading.value = "calculate";
  try {
    const a = Number.parseFloat((Math.random() * 100).toFixed(2));
    const b = Number.parseFloat((Math.random() * 50).toFixed(2));
    calcResult.value = `${a} ${op} ${b} = ${await invoke<number>("calculate", { a, b, operation: op })}`;
  } catch (e) {
    calcResult.value = `错误: ${e}`;
  } finally {
    loading.value = "";
  }
}

async function testCreateUser() {
  loading.value = "create_user";
  const args: CreateUserArgs = {
    name: "新用户_" + Date.now().toString().slice(-4),
    email: `user${Date.now().toString().slice(-4)}@example.com`,
    age: 25,
    role: "user",
  };
  try {
    const user = await invoke<User>("create_user", { args });
    createResult.value = JSON.stringify(user, null, 2);
    // 创建成功后刷新列表
    await testListUsers();
  } catch (e) {
    createResult.value = `创建失败: ${e}`;
  } finally {
    loading.value = "";
  }
}

async function testListUsers() {
  loading.value = "list_users";
  try {
    userList.value = await invoke<User[]>("list_users");
  } catch (e) {
    console.error("list_users 失败:", e);
  } finally {
    loading.value = "";
  }
}

async function testGetConfig() {
  loading.value = "config";
  try {
    appConfig.value = await invoke<Record<string, unknown>>("get_app_config");
  } catch (e) {
    console.error("get_app_config 失败:", e);
  } finally {
    loading.value = "";
  }
}

async function testGetVisitCount() {
  try {
    visitCount.value = await invoke<number>("increment_visit_count");
  } catch (e) {
    console.error("visit_count 失败:", e);
  }
}

onMounted(async () => {
  await Promise.all([testListUsers(), testGetConfig(), testGetVisitCount()]);
});
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1>🔌 Level 02：IPC 通信 —— Command 与 State</h1>
      <p class="subtitle">
        invoke() ↔ #[tauri::command] ▪ serde 类型契约 ▪ State 共享
      </p>
    </header>

    <!-- IPC 命令演示面板 -->
    <div class="cmd-grid">
      <!-- greet -->
      <div class="cmd-card">
        <div class="cmd-header">
          <span class="cmd-label">Command</span>
          <code>greet(name: String) → String</code>
        </div>
        <button class="btn" :disabled="!!loading" @click="testGreet">调用 greet</button>
        <div v-if="greeting" class="result">{{ greeting }}</div>
      </div>

      <!-- calculate -->
      <div class="cmd-card">
        <div class="cmd-header">
          <span class="cmd-label">Command</span>
          <code>calculate(a, b, operation) → Result&lt;f64, String&gt;</code>
        </div>
        <div class="btn-row">
          <button class="btn btn-sm" @click="testCalculate('add')">+加法</button>
          <button class="btn btn-sm" @click="testCalculate('subtract')">-减法</button>
          <button class="btn btn-sm" @click="testCalculate('multiply')">×乘法</button>
          <button class="btn btn-sm" @click="testCalculate('divide')">÷除法</button>
        </div>
        <div v-if="calcResult" class="result">{{ calcResult }}</div>
      </div>

      <!-- create_user -->
      <div class="cmd-card">
        <div class="cmd-header">
          <span class="cmd-label">Command</span>
          <code>create_user(args: CreateUserArgs) → Result&lt;User, String&gt;</code>
        </div>
        <button class="btn" :disabled="!!loading" @click="testCreateUser">创建随机用户</button>
        <pre v-if="createResult" class="json-result">{{ createResult }}</pre>
      </div>

      <!-- list_users -->
      <div class="cmd-card">
        <div class="cmd-header">
          <span class="cmd-label">Command</span>
          <code>list_users() → Result&lt;Vec&lt;User&gt;, String&gt;</code>
        </div>
        <ul v-if="userList.length" class="user-list">
          <li v-for="u in userList" :key="u.id">
            <strong>{{ u.name }}</strong>
            <span class="role-tag">{{ u.role }}</span>
            <span class="email">{{ u.email }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- State 演示 -->
    <section class="section">
      <h2>📦 State 管理演示</h2>
      <div class="state-grid">
        <div class="state-card">
          <h3>访问计数（AtomicU64）</h3>
          <p class="big-number">{{ visitCount }}</p>
          <button class="btn" @click="testGetVisitCount">递增并刷新</button>
        </div>
        <div class="state-card">
          <h3>应用配置（Mutex&lt;JsonValue&gt;）</h3>
          <pre v-if="appConfig" class="config-json">{{ JSON.stringify(appConfig, null, 2) }}</pre>
          <button class="btn btn-sm" @click="testGetConfig">刷新配置</button>
        </div>
      </div>
    </section>

    <!-- 调用流程图 -->
    <section class="section">
      <h2>📐 IPC 调用流程</h2>
      <pre class="flow-diagram">
前端 Vue3                     IPC 边界                      Rust 后端
  │                             │                             │
  │ invoke('greet', {name}) ───►│─── serde 反序列化 ──────►  │
  │                             │   JSON → Rust 类型          │
  │                             │                             │
  │                             │   #[tauri::command]         │
  │                             │   fn greet(name: String)    │
  │                             │                             │
  │                             │◄── serde 序列化 ──────────  │
  │◄─── Promise&lt;string&gt; ──────│   Rust 类型 → JSON          │
  │                             │                             │
  【关键差异】
  - Electron：Main Process ↔ Renderer Process（跨进程 IPC）
  - Tauri v2：WebView ↔ Rust Core（同进程 IPC，零网络开销）
  - NestJS：   Browser ↔ HTTP Server（跨网络 HTTP）</pre>
    </section>

    <footer class="app-footer">
      <p>访问计数 {{ visitCount }} 次 | 状态: {{ loading || '就绪' }}</p>
    </footer>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif;
  background: #0f1419; color: #e1e4e8; line-height: 1.6;
}
.app-container { max-width: 1000px; margin: 0 auto; padding: 24px; }
.app-header { text-align: center; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #30363d; }
.app-header h1 { font-size: 26px; background: linear-gradient(135deg, #58a6ff, #bc8cff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { color: #8b949e; font-size: 14px; margin-top: 6px; }
.cmd-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 16px; margin-bottom: 24px; }
.cmd-card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 16px; }
.cmd-header { margin-bottom: 10px; }
.cmd-label { color: #f0883e; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-right: 8px; }
.cmd-header code { background: #0d1117; padding: 2px 8px; border-radius: 4px; font-size: 12px; color: #d2a8ff; }
.btn {
  background: linear-gradient(135deg, #238636, #2ea043); color: #fff; border: 1px solid #3fb950;
  padding: 8px 18px; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 600;
  margin: 4px; transition: all 0.2s;
}
.btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sm { font-size: 12px; padding: 5px 10px; }
.btn-row { display: flex; flex-wrap: wrap; gap: 4px; }
.result { background: #0d3320; border: 1px solid #238636; color: #7ee787; padding: 10px 14px; border-radius: 6px; margin-top: 10px; font-size: 14px; }
.json-result, .config-json {
  background: #0d1117; border: 1px solid #30363d; padding: 12px; border-radius: 6px;
  margin-top: 10px; font-size: 12px; font-family: "SF Mono", "Consolas", monospace;
  color: #c9d1d9; white-space: pre-wrap; max-height: 200px; overflow-y: auto;
}
.user-list { list-style: none; margin-top: 8px; }
.user-list li {
  display: flex; align-items: center; gap: 8px; padding: 6px 0;
  border-bottom: 1px solid #21262d; font-size: 13px;
}
.role-tag {
  background: #1f242e; padding: 1px 8px; border-radius: 10px; font-size: 11px;
  color: #d2a8ff;
}
.email { color: #8b949e; font-size: 12px; }
.section { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
.section h2 { font-size: 18px; color: #58a6ff; margin-bottom: 14px; }
.state-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
.state-card { background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 14px; }
.state-card h3 { font-size: 14px; color: #f0883e; margin-bottom: 8px; }
.big-number { font-size: 42px; font-weight: 800; color: #58a6ff; text-align: center; margin: 10px 0; }
.flow-diagram {
  background: #0d1117; padding: 16px; border-radius: 8px;
  font-family: "SF Mono", "Consolas", monospace; font-size: 13px;
  color: #c9d1d9; white-space: pre; overflow-x: auto;
}
.app-footer { text-align: center; padding: 16px; color: #8b949e; font-size: 13px; }
</style>
