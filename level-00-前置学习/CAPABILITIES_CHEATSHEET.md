# Tauri V2 Capabilities 权限速查表

> 快速查找常用权限标识符及其配置方式

---

## 📋 权限标识符格式

```
格式：插件名:权限操作

示例：
  core:default          → Tauri 核心默认权限
  fs:read-files         → 文件系统读取权限
  dialog:allow-open     → 对话框打开权限
  shell:allow-execute   → Shell 执行权限
```

---

## 🔑 核心权限 (core)

| 权限 ID | 作用 | 说明 |
|---------|------|------|
| `core:default` | 默认核心权限 | 包含 invoke、事件系统等基础功能 |

> core 权限无需单独配置 scope，一般总在 capabilities 中声明。

---

## 📁 文件系统 (fs)

| 权限 ID | 作用 | 需要 scope |
|---------|------|-----------|
| `fs:default` | 基础文件操作集合 | ✅ |
| `fs:read-files` | 读取文件 | ✅ 路径 |
| `fs:write-files` | 写入文件 | ✅ 路径 |
| `fs:read-dirs` | 读取目录 | ✅ 路径 |
| `fs:create-dirs` | 创建目录 | ✅ 路径 |
| `fs:remove` | 删除文件/目录 | ✅ 路径 |
| `fs:rename` | 重命名文件/目录 | ✅ 路径 |
| `fs:allow-exists` | 检查文件是否存在 | ✅ 路径 |
| `fs:allow-stat` | 获取文件信息 | ✅ 路径 |

### FS Scope 配置模板

```json
{
  "identifier": "fs:scope",
  "allow": [
    { "path": "$APPDATA/**" },
    { "path": "$DOCUMENT/**" },
    { "path": "$DOWNLOAD/**" },
    { "path": "$DESKTOP/*.txt" },
    { "path": "$HOME/.myapp/**" },
    { "path": "$TEMP/**" }
  ]
}
```

### FS 路径变量

| 变量 | 实际路径 (macOS) | 实际路径 (Windows) |
|------|-----------------|-------------------|
| `$APPDATA` | `~/Library/Application Support/<id>` | `C:\Users\<user>\AppData\Roaming\<id>` |
| `$APPCACHE` | `~/Library/Caches/<id>` | `C:\Users\<user>\AppData\Local\<id>` |
| `$APPCONFIG` | `~/Library/Application Support/<id>` | `C:\Users\<user>\AppData\Roaming\<id>` |
| `$APPLOCALDATA` | `~/Library/Application Support/<id>` | `C:\Users\<user>\AppData\Local\<id>` |
| `$HOME` | `~` | `C:\Users\<user>` |
| `$DESKTOP` | `~/Desktop` | `C:\Users\<user>\Desktop` |
| `$DOCUMENT` | `~/Documents` | `C:\Users\<user>\Documents` |
| `$DOWNLOAD` | `~/Downloads` | `C:\Users\<user>\Downloads` |
| `$TEMP` | `/tmp` 或 `$TMPDIR` | `C:\Users\<user>\AppData\Local\Temp` |
| `$RESOURCE` | 应用包内 `Resources/` | 应用安装目录 |
| `$CWD` | 当前工作目录 | 当前工作目录 |

---

## 💬 对话框 (dialog)

| 权限 ID | 作用 |
|---------|------|
| `dialog:default` | 默认对话框权限集合 |
| `dialog:allow-open` | 打开文件/目录对话框 |
| `dialog:allow-save` | 保存文件对话框 |
| `dialog:allow-message` | 消息提示对话框 |
| `dialog:allow-ask` | 询问对话框 |
| `dialog:allow-confirm` | 确认对话框 |

### Dialog Scope 配置模板

```json
{
  "identifier": "dialog:allow-open",
  "allow": [
    { "path": "$HOME/**" },
    { "path": "$DOCUMENT/**" }
  ]
}
```

---

## 💻 Shell / 进程 (shell)

| 权限 ID | 作用 |
|---------|------|
| `shell:default` | 默认 Shell 权限 |
| `shell:allow-execute` | 执行一次性命令 |
| `shell:allow-spawn` | 启动子进程 |
| `shell:allow-kill` | 终止进程 |
| `shell:allow-open` | 用默认程序打开文件/URL |
| `shell:allow-stdin-write` | 向子进程写入 stdin |

### Shell Scope 配置模板

```json
{
  "identifier": "shell:allow-execute",
  "allow": [
    {
      "name": "git-status",
      "cmd": "/usr/bin/git",
      "args": [
        { "validator": "status" },
        { "validator": "--short" }
      ]
    },
    {
      "name": "node-version",
      "cmd": "/usr/local/bin/node",
      "args": [{ "validator": "--version" }]
    }
  ]
}
```

### Shell Sidecar 配置

```json
{
  "identifier": "shell:allow-execute",
  "allow": [
    {
      "name": "my-sidecar",
      "sidecar": true
    }
  ]
}
```

---

## 🔔 通知 (notification)

| 权限 ID | 作用 |
|---------|------|
| `notification:default` | 通知默认权限 |
| `notification:allow-notify` | 发送系统通知 |
| `notification:allow-request-permission` | 请求通知权限 |
| `notification:allow-is-permission-granted` | 检查通知权限状态 |

---

## 📋 剪贴板 (clipboard-manager)

| 权限 ID | 作用 |
|---------|------|
| `clipboard-manager:default` | 默认剪贴板权限 |
| `clipboard-manager:allow-read-text` | 读取剪贴板文本 |
| `clipboard-manager:allow-write-text` | 写入剪贴板文本 |
| `clipboard-manager:allow-read-image` | 读取剪贴板图片 |
| `clipboard-manager:allow-write-image` | 写入剪贴板图片 |

---

## 🌐 HTTP (http)

| 权限 ID | 作用 |
|---------|------|
| `http:default` | HTTP 默认权限 |
| `http:allow-fetch` | 发起 HTTP 请求 |

### HTTP Scope 配置模板

```json
{
  "identifier": "http:allow-fetch",
  "allow": [
    { "url": "https://api.myapp.com/**" },
    { "url": "https://api.github.com/**" }
  ]
}
```

---

## ⚙️ 其他插件

| 插件 | 权限 ID | 作用 |
|------|---------|------|
| opener | `opener:default` | 用默认程序打开 URL/文件 |
| opener | `opener:allow-open-url` | 允许打开 URL |
| opener | `opener:allow-open-path` | 允许打开文件路径 |
| updater | `updater:default` | 自动更新 |
| updater | `updater:allow-check` | 检查更新 |
| updater | `updater:allow-download-and-install` | 下载并安装更新 |
| process | `process:default` | 进程管理 |
| process | `process:allow-restart` | 重启应用 |
| process | `process:allow-exit` | 退出应用 |
| store | `store:default` | 键值存储 |

---

## 📝 完整 capabilities 文件模板

### 基础模板（最小化权限）

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "默认能力 - 主窗口",
  "windows": ["main"],
  "permissions": [
    "core:default"
  ]
}
```

### 完整模板（生产环境应用）

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "main-capability",
  "description": "主窗口完整能力",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "opener:default",
    
    "fs:read-files",
    "fs:write-files",
    "fs:read-dirs",
    "fs:create-dirs",
    {
      "identifier": "fs:scope",
      "allow": [
        { "path": "$APPDATA/**" },
        { "path": "$DOCUMENT/**" }
      ]
    },
    
    "dialog:allow-open",
    "dialog:allow-save",
    "dialog:allow-message",
    "dialog:allow-confirm",
    
    {
      "identifier": "dialog:allow-open",
      "allow": [
        { "path": "$HOME/**" }
      ]
    },
    
    "notification:default",
    
    {
      "identifier": "http:allow-fetch",
      "allow": [
        { "url": "https://api.myapp.com/**" }
      ]
    }
  ]
}
```

### 子窗口低权限模板

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "settings-capability",
  "description": "设置窗口 - 仅读取权限",
  "windows": ["settings"],
  "permissions": [
    "core:default",
    "fs:read-files",
    {
      "identifier": "fs:scope",
      "allow": [
        { "path": "$APPDATA/**" }
      ]
    }
  ]
}
```

---

## 🚨 安全提醒

1. **最小权限原则**：只声明应用真正需要的权限
2. **Scope 精确化**：不要使用 `"$HOME/**"` 如果你只需要 `"$DOCUMENT/**"`
3. **Shell 命令白名单**：精确到可执行文件路径和允许的参数
4. **deny 优先于 allow**：deny 列表可以精确排除敏感路径
5. **窗口绑定**：子窗口只给必要的权限，不要滥用 `"windows": ["*"]`

---

> 完整权限参考：[Tauri V2 官方安全文档](https://v2.tauri.app/security/)
