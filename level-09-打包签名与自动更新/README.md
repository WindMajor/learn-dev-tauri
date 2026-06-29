# Level 09：打包、签名与自动更新

## 通关标准
能配置多平台打包（DMG/MSI/AppImage）、代码签名、Universal Binary、自动更新 Updater。

## 核心配置

```json
// tauri.conf.json bundle 配置
{
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns", "icons/icon.ico"],
    "macOS": {
      "entitlements": "./entitlements.plist",
      "minimumSystemVersion": "11.0"
    },
    "windows": {
      "webviewInstallMode": { "type": "fixedInstallerRuntimes" },
      "wix": { "language": "zh-CN" },
      "nsis": { "installMode": "currentUser" }
    },
    "linux": { "deb": { "depends": ["libwebkit2gtk-4.1-0"] } }
  }
}
```

### MacOS Universal Binary
```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
cargo tauri build --target universal-apple-darwin
```

### 自动更新
```json
{
  "plugins": {
    "updater": {
      "endpoints": ["https://releases.example.com/updater/{{target}}/{{current_version}}"],
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

## 构建命令速查

```bash
# 开发构建（仅当前平台，未优化）
cargo tauri build --debug

# 生产构建（优化 + 当前平台）
cargo tauri build

# MacOS Universal Binary
cargo tauri build --target universal-apple-darwin

# Windows MSI
cargo tauri build --target x86_64-pc-windows-msvc
```

## 自检清单
- [ ] 能配置正确的 `identifier`（反向域名格式）
- [ ] 能配置 MacOS entitlements.plist
- [ ] 能配置 Windows WebView2 安装模式
- [ ] 能配置 Updater 自动更新
- [ ] 能用 `cargo tauri build` 生成可分发的安装包
