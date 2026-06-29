# Level 10：毕业设计 —— 企业数据汇总办公桌面端

## 通关标准

**独立交付一个完整的企业级 Tauri v2 桌面应用，包含：**
Rust 后端（Command + State + Event + 插件）+ Vue3 前端 + Capabilities + 托盘 + 通知 + 多窗口 + 文件 IO + 打包 + 自动更新

## 应用场景

企业内部数据汇总办公软件（DataHub Desktop）：
- 与 `learn-lib-ts-nestjs` 后端联动（调用 NestJS API 获取报表数据）
- 与 `learn-lib-ts-vue` 前端联动（复用 Vue3 组件，适配桌面端）
- 支持离线模式（SQLite 本地缓存）
- 支持自动更新

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面壳 | Tauri v2 |
| Rust 后端 | Command/State/Plugin/Tray/Menu/GlobalShortcut |
| 前端 | Vue3 + Pinia + Vue Router (Hash) + Vite |
| IPC | invoke() + Event + Channel |
| 本地存储 | rusqlite (SQLite) |
| 安全 | Capabilities 最小权限 + CSP + 参数校验 |
| 打包 | DMG/MSI/AppImage + 代码签名 + Updater |

## 核心功能

```
登录认证 → 数据汇总报表 → 文件导入/导出 → 系统通知 → 托盘常驻 → 多窗口 → 自动更新
```

## 运行方式

```bash
cd level-10-毕业设计-企业数据汇总办公桌面端
pnpm install
cargo tauri dev
```

## 构建

```bash
# MacOS
cargo tauri build --target universal-apple-darwin

# 或使用 Makefile
make build-macos
```

## 项目结构

```
src-tauri/src/
├── lib.rs          # 主入口（注册 Commands, State, Plugins, Menu, Tray）
├── main.rs         # 启动入口
├── state.rs        # 应用状态（用户会话、配置、缓存）
├── commands/
│   ├── auth.rs     # 登录认证、Token 管理
│   ├── report.rs   # 报表数据（API 调用 + 离线缓存）
│   ├── file.rs     # 文件导入/导出
│   └── system.rs   # 系统信息、快捷键
└── plugins/
    └── custom.rs   # 自定义 Rust 插件

src/
├── main.ts
├── App.vue
├── router/         # Hash 路由
├── stores/         # Pinia 状态管理
├── views/          # 页面组件
├── components/     # 通用组件
├── composables/    # useTauri 等组合式函数
└── api/            # IPC 封装层
```

## 自检清单

- [ ] 能独立运行 `cargo tauri dev` 看到完整登录/报表/文件/通知/托盘流程
- [ ] 能 `cargo tauri build` 生成可分发的安装包
- [ ] 能解释 Capabilities 每个文件的权限范围
- [ ] 能向 Electron 开发者解释 Tauri v2 的安全优势
- [ ] 能评估 Tauri v2 在生产环境中的适用性
