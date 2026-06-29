# Level 04：文件系统与原生对话框

## 通关标准

能独立完成：使用 Tauri v2 插件实现文件打开/保存对话框、文件读写、Scope 路径约束、文件拖拽。

## 核心概念

- `tauri-plugin-dialog`：原生文件对话框（open/save/message）
- `tauri-plugin-fs`：文件系统读写 + Scope 路径限制
- **Scope**：Tauri v2 的文件访问白名单，防止路径遍历攻击
- `drag-drop` 事件：监听文件拖拽

### Scope 关键对比

```
【对比 Electron】
Electron 的 fs 模块：可访问任意路径（默认无限制），开发者需自行实现路径校验。
Tauri v2 的 Scope：必须在 capabilities 中声明 allow 路径，超范围访问被拒绝。

【对比 Web File API】
Web 的 File API：仅能访问用户主动选择的文件（沙盒隔离）。
Tauri v2：通过 Scope 约束，可在声明范围内自由读写。
```

## 编译/运行

```bash
cd level-04-文件系统与原生对话框
pnpm install
cargo tauri dev
```

## 自检清单

- [ ] 能使用 tauri-plugin-dialog 打开/保存文件
- [ ] 能读写文件并理解 Scope 路径限制
- [ ] 能处理文件拖拽事件
- [ ] 能独立修复 bugs/ 中的错误
