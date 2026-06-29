# DataHub Desktop - 构建与开发 Makefile
# WHAT：统一构建命令入口，支持 dev/build/clean/check 等操作
# WHY：简化多平台开发流程

.PHONY: dev build build-macos build-windows build-linux check clean test lint

# 开发模式（热更新）
dev:
	cargo tauri dev

# 生产构建（当前平台）
build:
	cargo tauri build

# MacOS Universal Binary (Apple Silicon + Intel)
build-macos:
	cargo tauri build --target universal-apple-darwin

# Windows (交叉编译需要相应 target)
build-windows:
	cargo tauri build --target x86_64-pc-windows-msvc

# Linux
build-linux:
	cargo tauri build --target x86_64-unknown-linux-gnu

# Rust 代码检查
check:
	cargo check --manifest-path src-tauri/Cargo.toml

# Rust 单元测试
test:
	cargo test --manifest-path src-tauri/Cargo.toml

# 前端构建检查
lint:
	npm run build

# 清理构建产物
clean:
	cargo clean
	rm -rf dist/
	rm -rf src-tauri/target/

# 安装前端依赖
install:
	npm install

# 显示帮助
help:
	@echo "DataHub Desktop 构建命令:"
	@echo "  make dev          启动开发模式"
	@echo "  make build        生产构建"
	@echo "  make build-macos  MacOS Universal Binary"
	@echo "  make check        Rust 代码检查"
	@echo "  make test         Rust 单元测试"
	@echo "  make clean        清理构建产物"
