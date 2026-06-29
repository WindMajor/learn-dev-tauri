import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// WHAT：Vite 配置 —— Tauri 前端开发服务器
// WHY：Tauri dev 模式下 Vite 启动在 http://localhost:1420，Tauri 的 WebView 指向该地址
// CONTRAST：纯 Web 项目的 Vite 配置无需 Tauri 特定设置，但需要注意：
//   - VITE_DEV_SERVER_URL 由 Tauri CLI 注入
//   - build.target 建议 ES2021（兼容系统 WebView）
//   - clearScreen: false（保留 Cargo 编译输出）
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
