<!--
  src/playground.vue
  WHAT：沙盒组件 —— 供学习者随意修改、实验 Tauri IPC 调用的安全区域
  WHY：提供无风险的实验环境，可以故意改错参数、测试边界情况
  WARNING：修改此文件不会影响核心学习流程，放心玩！
-->
<script setup lang="ts">
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";

const customName = ref("");
const result = ref("");

// 自由实验：修改参数名、传入非法类型、修改 Command 名称
async function experiment() {
  try {
    // 试试改成 invoke('greet', { wrongParam: 'xxx' }) 会怎样？
    result.value = await invoke<string>("greet", {
      name: customName.value || "实验者",
    });
  } catch (e) {
    result.value = `实验失败: ${e}`;
  }
}
</script>

<template>
  <div class="playground">
    <h3>🧪 沙盒实验区</h3>
    <p>随意修改代码，测试 Tauri IPC 行为</p>
    <input v-model="customName" placeholder="输入名字..." @keyup.enter="experiment" />
    <button @click="experiment">invoke('greet')</button>
    <pre v-if="result">{{ result }}</pre>
  </div>
</template>

<style scoped>
.playground {
  background: #1a1a2e;
  border: 2px dashed #e94560;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
}
.playground h3 {
  color: #e94560;
  margin-bottom: 8px;
}
.playground p {
  color: #a0a0b0;
  font-size: 13px;
  margin-bottom: 12px;
}
.playground input {
  background: #16213e;
  border: 1px solid #0f3460;
  color: #eee;
  padding: 8px 12px;
  border-radius: 6px;
  margin-right: 8px;
  font-size: 14px;
}
.playground button {
  background: #e94560;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.playground pre {
  background: #0d1117;
  padding: 12px;
  border-radius: 8px;
  margin-top: 12px;
  color: #7ee787;
  font-family: monospace;
  font-size: 13px;
  white-space: pre-wrap;
}
</style>
