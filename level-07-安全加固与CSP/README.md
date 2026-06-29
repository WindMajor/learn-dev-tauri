# Level 07：安全加固与 CSP

## 通关标准
能配置最小权限 Capabilities、严格 Scope、CSP 策略、Command 参数校验、防止路径遍历和注入攻击。

## 核心安全原则

```
Tauri v2 安全哲学："默认拒绝，显式授权"
Electron 安全哲学："默认开放，需要时关闭"（历史上曾 nodeIntegration 默认 true）

三层防御：
  1. Capabilities（IPC 白名单）—— 哪些 Command/Plugin 可用
  2. Scope（数据白名单）—— 哪些文件/URL 可访问
  3. CSP（内容安全策略）—— 哪些脚本/样式可执行
```

### 必检查清单
- [ ] 每个 Command 校验所有输入参数
- [ ] 路径参数检查 "../" 和 "~"（防止路径遍历）
- [ ] CSP 禁止 `eval()`、内联脚本
- [ ] Capabilities 按功能模块拆分（非单一 default.json）
- [ ] 禁止前端直接访问系统 API（必须通过 Rust Command）
