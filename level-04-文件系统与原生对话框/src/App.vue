<script setup lang="ts">
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open, save, message } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

const fileContent = ref("");
const filePath = ref("");
const dirList = ref<string[]>([]);
const status = ref("");

async function pickAndReadFile() {
  const selected = await open({ multiple: false, filters: [{ name: "文本", extensions: ["txt","md","json","rs","ts","vue"] }] });
  if (!selected) return;
  filePath.value = selected as string;
  fileContent.value = await readTextFile(filePath.value);
  status.value = `已加载: ${filePath.value} (${fileContent.value.length} 字符)`;
}

async function writeToFile() {
  const savePath = await save({ defaultPath: "output.txt", filters: [{ name: "文本", extensions: ["txt"] }] });
  if (!savePath) return;
  await writeTextFile(savePath, fileContent.value);
  await message(`文件已保存到:\n${savePath}`, { title: "保存成功", kind: "info" });
  status.value = `已保存: ${savePath}`;
}

async function browseDir() {
  const dir = await open({ directory: true, multiple: false });
  if (!dir) return;
  const entries = await invoke<string[]>("list_directory", { path: dir as string });
  dirList.value = entries;
}

async function pathTraversalAttack() {
  try {
    // 尝试路径遍历 —— Scope 会拦截！
    const result = await invoke<string>("read_file_content", { path: "/etc/passwd" });
    status.value = `⚠️ 路径遍历成功（不应该！）: ${result.slice(0, 50)}`;
  } catch (e) {
    status.value = `✅ Scope 正确拦截了路径遍历: ${e}`;
  }
}
</script>

<template>
  <div class="app">
    <header><h1>📂 Level 04：文件系统与原生对话框</h1></header>
    <div class="grid">
      <div class="card"><button @click="pickAndReadFile">📖 打开文件</button><button @click="writeToFile">💾 保存文件</button><button @click="browseDir">📁 浏览目录</button><button class="btn-warn" @click="pathTraversalAttack">🛡️ 测试 Scope 防护</button></div>
      <div class="card"><h3>文件内容</h3><p class="path">{{ filePath || '未选择文件' }}</p><pre>{{ fileContent.slice(0, 500) }}{{ fileContent.length > 500 ? '\n...' : '' }}</pre></div>
      <div class="card"><h3>目录内容</h3><ul><li v-for="e in dirList" :key="e">{{ e }}</li></ul></div>
    </div>
    <footer><p>{{ status }}</p></footer>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #0f1419; color: #e1e4e8; }
.app { max-width: 1000px; margin: 0 auto; padding: 20px; }
header { text-align: center; margin-bottom: 24px; }
header h1 { background: linear-gradient(135deg, #58a6ff, #bc8cff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 24px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 16px; }
.card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 16px; }
.card h3 { color: #f0883e; margin-bottom: 8px; font-size: 14px; }
button {
  background: linear-gradient(135deg, #238636, #2ea043); color: #fff; border: 1px solid #3fb950;
  padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; margin: 4px; font-weight: 600;
}
button:hover { filter: brightness(1.1); }
.btn-warn { background: linear-gradient(135deg, #b62324, #da3633); border-color: #f85149; }
.path { color: #8b949e; font-size: 12px; word-break: break-all; margin-bottom: 6px; }
pre { background: #0d1117; padding: 10px; border-radius: 6px; font-size: 12px; max-height: 200px; overflow: auto; white-space: pre-wrap; }
ul { list-style: none; } li { padding: 3px 0; border-bottom: 1px solid #21262d; font-size: 13px; }
footer { text-align: center; margin-top: 20px; padding: 12px; color: #8b949e; font-size: 13px; }
</style>
