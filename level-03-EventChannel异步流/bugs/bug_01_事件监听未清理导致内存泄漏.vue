<!--
  bug_01_事件监听未清理导致内存泄漏.vue
  WHAT：组件 onMounted 中 listen() 但 onUnmounted 中忘记调用 unlisten()，导致内存泄漏
  这是什么错误：运行时内存泄漏，前端事件处理器持续存在，即使组件已销毁
  运行后报什么错：
    没有直接的错误提示！但会观察到：
    1. 应用内存使用量持续增长
    2. 切换路由/组件后，旧组件的事件处理器仍然触发
    3. 控制台可能出现 "Cannot read property of undefined" 错误
       （组件销毁后事件回调尝试访问已销毁的响应式状态）
  
  为什么会这样：
    Tauri v2 的 listen() 返回 UnlistenFn，但不会自动在组件销毁时清理。
    Vue3 的组件生命周期结束 ≠ 事件监听器自动移除。
    必须手动在 onUnmounted 中调用 unlisten()。
  
  【对比 Electron】
    Electron 的 ipcRenderer.on() 同样存在此问题，
    但 Electron 中更常见的是使用 ipcRenderer.removeAllListeners('channel') 批量清理。
  
  【对比 Vue3 纯前端】
    Vue3 的 watchEffect/watch 会在组件卸载时自动清理，
    但 Tauri 的 listen() 是独立的系统级事件，不归 Vue 管理。
  
  如何修复：
    onUnmounted(() => { unlisten(); });
-->

<script setup lang="ts">
import { ref, onMounted } from "vue";
// ❌ 缺少 onUnmounted 导入！
import { listen } from "@tauri-apps/api/event";

const count = ref(0);

onMounted(async () => {
  // ❌ 错误：listen() 返回 UnlistenFn，但未保存和清理！
  await listen("heartbeat", (event) => {
    count.value = (event.payload as { count: number }).count;
    console.log("[心跳]", count.value);
    // 组件销毁后，此回调仍然会执行！
    // 如果 count 已被 Vue 回收，调用 count.value 可能报错
  });

  // ❌ 如果有 5 个 listen，全部泄漏！
  await listen("notification", (event) => {
    console.log("[通知]", event.payload);
  });
});

// ❌ 错误：缺少 onUnmounted 清理
// onUnmounted(() => {
//   unlisten1();
//   unlisten2();
// });

// ─── 修复后的正确代码 ───
// import { ref, onMounted, onUnmounted } from "vue";
// import { listen, type UnlistenFn } from "@tauri-apps/api/event";
//
// const unlisteners: UnlistenFn[] = [];
//
// onMounted(async () => {
//   const unlisten1 = await listen('heartbeat', (event) => { ... });
//   unlisteners.push(unlisten1);
//
//   const unlisten2 = await listen('notification', (event) => { ... });
//   unlisteners.push(unlisten2);
// });
//
// onUnmounted(() => {
//   unlisteners.forEach(fn => fn());  // ✅ 清理所有监听器
//   unlisteners = [];
// });
</script>

<template>
  <div>
    <p>心跳计数: {{ count }}</p>
    <p style="color: red;">⚠️ 此组件的事件监听器未清理！</p>
  </div>
</template>
