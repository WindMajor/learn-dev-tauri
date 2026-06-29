// src/router/index.ts
// WHAT：Vue Router 配置 —— Hash 模式（Tauri 桌面应用要求）
// WHY：Tauri 使用 file:// 协议加载前端，history 模式无法工作
// CONTRAST：
//   Web 端：createWebHistory()（干净 URL）
//   Tauri：  createWebHashHistory()（#/path 格式）
//   Electron：createWebHashHistory() 或 createMemoryHistory()

import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      redirect: "/dashboard",
    },
    {
      path: "/login",
      name: "Login",
      component: () => import("../views/Login.vue"),
      meta: { title: "登录", requiresAuth: false },
    },
    {
      path: "/dashboard",
      name: "Dashboard",
      component: () => import("../views/Dashboard.vue"),
      meta: { title: "工作台", requiresAuth: true },
    },
    {
      path: "/reports",
      name: "Reports",
      component: () => import("../views/Reports.vue"),
      meta: { title: "报表中心", requiresAuth: true },
    },
    {
      path: "/files",
      name: "FileManager",
      component: () => import("../views/FileManager.vue"),
      meta: { title: "文件管理", requiresAuth: true },
    },
    {
      path: "/settings",
      name: "Settings",
      component: () => import("../views/Settings.vue"),
      meta: { title: "设置", requiresAuth: true },
    },
  ],
});

// 路由守卫：检查认证状态
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    // 在 Tauri 中通过 IPC 检查 Rust 端的 session
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const isAuth = await invoke<boolean>("check_auth");
      if (!isAuth) {
        return { name: "Login", query: { redirect: to.fullPath } };
      }
    } catch {
      return { name: "Login" };
    }
  }
});

export default router;
