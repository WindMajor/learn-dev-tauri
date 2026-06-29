// src/main.ts
// WHAT：DataHub Desktop 前端入口
// WHY：Vue3 + Pinia + Vue Router (Hash模式) —— 标准组合，适配 Tauri 文件协议
// CONTRAST：Web 应用用 history 模式，Tauri 桌面应用用 Hash 模式（兼容 file:// 协议）

import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.mount("#app");
