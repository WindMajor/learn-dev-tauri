<script setup lang="ts">
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open, save, message } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

const fileContent = ref("");
const filePath = ref("");
const status = ref("");
const importResult = ref("");

async function pickAndRead() {
  const p = await open({ multiple: false, filters: [{ name: "数据文件", extensions: ["csv","json","txt","md"] }] });
  if (!p) return;
  filePath.value = p as string;
  fileContent.value = await readTextFile(filePath.value);
  status.value = `已加载: ${filePath.value}`;
}

async function saveFile() {
  const p = await save({ defaultPath: "export.csv", filters: [{ name: "CSV", extensions: ["csv"] }] });
  if (!p) return;
  await writeTextFile(p, fileContent.value);
  await message(`已保存到 ${p}`, { title: "保存成功", kind: "info" });
}

async function importCsv() {
  const p = await open({ filters: [{ name: "CSV", extensions: ["csv"] }] });
  if (!p) return;
  try {
    const result = await invoke<{ success: boolean; message: string }>("import_csv", { filePath: p as string });
    importResult.value = result.message;
    await message(result.message, { title: "导入结果", kind: result.success ? "info" : "error" });
  } catch (e) {
    importResult.value = `导入失败: ${e}`;
  }
}

async function testScope() {
  try {
    await readTextFile("/etc/passwd");
    status.value = "⚠️ Scope 未正确拦截！";
  } catch (e) {
    status.value = `✅ Scope 正确拦截: ${e}`;
  }
}
</script>

<template>
  <div>
    <h1>📂 文件管理</h1>
    <div class="toolbar">
      <button @click="pickAndRead">📖 打开文件</button>
      <button @click="saveFile">💾 保存</button>
      <button @click="importCsv">📥 导入 CSV</button>
      <button class="btn-warn" @click="testScope">🛡️ Scope 测试</button>
    </div>
    <p v-if="status" class="status">{{ status }}</p>
    <p v-if="importResult" class="result">{{ importResult }}</p>
    <div class="editor">
      <p v-if="filePath" class="path">{{ filePath }}</p>
      <textarea v-model="fileContent" placeholder="文件内容..."></textarea>
    </div>
  </div>
</template>

<style scoped>
h1 { font-size: 24px; margin-bottom: 14px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
button {
  background: linear-gradient(135deg, #238636, #2ea043); color: #fff;
  border: 1px solid #3fb950; padding: 7px 15px; border-radius: 6px;
  font-size: 13px; cursor: pointer; font-weight: 600;
}
button:hover { filter: brightness(1.1); }
.btn-warn { background: linear-gradient(135deg, #b62324, #da3633); border-color: #f85149; }
.status { color: var(--accent-green); font-size: 13px; margin-bottom: 8px; }
.result { color: var(--accent-blue); font-size: 13px; margin-bottom: 8px; }
.editor { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.path { color: var(--text-secondary); font-size: 11px; padding: 6px 14px; background: var(--bg-tertiary); border-bottom: 1px solid var(--border); }
textarea {
  width: 100%; height: 400px; background: var(--bg-tertiary); color: var(--text-primary);
  border: none; padding: 14px; font-family: "SF Mono", "Consolas", monospace;
  font-size: 13px; resize: vertical; outline: none;
}
</style>
