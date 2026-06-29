# Level 06：菜单、托盘与系统集成

## 通关标准
能创建系统托盘、全局快捷键、系统通知、自定义菜单栏。

## 核心概念
- `TrayIconBuilder`：系统托盘图标 + 菜单
- `tauri-plugin-global-shortcut`：全局快捷键
- `tauri-plugin-notification`：系统通知
- `tauri::menu`：自定义菜单栏

### 对比
| 功能 | Tauri v2 | Electron | Swift |
|------|----------|----------|-------|
| 托盘 | TrayIconBuilder | new Tray() | NSStatusBar |
| 全局快捷键 | plugin-global-shortcut | globalShortcut | CGEvent |
| 通知 | plugin-notification | Notification | UNUserNotificationCenter |
