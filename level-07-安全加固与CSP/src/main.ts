// src/main.ts
// WHAT：Vue3 应用的入口文件 —— Tauri 前端初始化
// WHY：Tauri 前端就是标准 Vue3 + Vite，唯一的区别是路由必须用 Hash 模式（文件协议限制）
// CONTRAST：
//   - 纯 Web 项目：main.ts 完全一样，Vue Router 可用 history 模式
//   - Electron：    main.ts 在 Renderer 进程中运行，可通过 preload 暴露的 API 访问 Node
//   - Tauri：       main.ts 在 WebView 中运行，只能通过 @tauri-apps/api 调用 Rust 后端

import { createApp } from "vue";
import App from "./App.vue";

const app = createApp(App);
app.mount("#app");
