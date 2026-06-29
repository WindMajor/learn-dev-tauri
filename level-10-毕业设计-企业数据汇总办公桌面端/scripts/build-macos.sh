#!/bin/bash
# WHAT：MacOS 生产构建脚本（Universal Binary + 代码签名）
# WHY：自动化 MacOS 构建流程，包括 target 安装、Universal Binary 编译、签名
# CONTRAST：
#   Electron：electron-builder --mac --universal
#   Swift：   xcodebuild archive + codesign

set -euo pipefail

echo "=== DataHub Desktop MacOS 构建 ==="

# 1. 安装必要 target
echo "[1/4] 安装 Rust targets..."
rustup target add aarch64-apple-darwin x86_64-apple-darwin

# 2. 安装前端依赖
echo "[2/4] 安装前端依赖..."
npm install

# 3. 构建 Universal Binary
echo "[3/4] 构建 Universal Binary..."
cargo tauri build --target universal-apple-darwin

# 4. 验证产物
echo "[4/4] 验证构建产物..."
DMG_PATH=$(find src-tauri/target/universal-apple-darwin/release/bundle/dmg -name "*.dmg" 2>/dev/null | head -1)

if [ -n "$DMG_PATH" ]; then
    echo "✅ DMG 构建成功: $DMG_PATH"
    echo "📦 文件大小: $(du -h "$DMG_PATH" | cut -f1)"
else
    echo "⚠️  未找到 DMG 文件，请检查构建输出"
fi

echo "=== 构建完成 ==="
