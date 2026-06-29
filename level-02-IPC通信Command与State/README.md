# Level 02：IPC 通信 —— Command 与 State

## 通关标准

**本关结束后，你能独立完成：**
- 编写带类型约束的 `#[tauri::command]`（多种参数类型、返回值类型）
- 使用 `tauri::State<T>` 管理应用级共享状态
- 处理 Command 的错误返回（`Result<T, String>` → 前端 Promise reject）
- 向 NestJS 开发者解释 Tauri State 与 NestJS Provider 的异同

## 核心概念速查

### Command 参数类型

```rust
// ─── 标量类型（直接反序列化） ───
#[tauri::command]
fn cmd_scalar(name: String, age: u32) -> String { ... }

// ─── 复杂类型（需要 Serialize/Deserialize） ───
#[derive(serde::Deserialize)]
struct CreateUserArgs { name: String, email: String }

#[tauri::command]
fn cmd_complex(args: CreateUserArgs) -> Result<User, String> { ... }

// ─── State 注入 ───
#[tauri::command]
fn cmd_with_state(state: tauri::State<'_, AppState>) -> String { ... }
```

### Tauri State 模式

```
【对比 NestJS】
NestJS 的 @Injectable() Provider：
  - 通过 DI 容器管理生命周期（Request/Transient/Singleton）
  - 使用 @Injectable() 装饰器 + constructor 注入
  - 支持 Module 作用域隔离

Tauri 的 tauri::State<T>：
  - 应用级单例（全局共享）
  - 通过 tauri::Builder::manage() 注册
  - Command 参数中声明 tauri::State<'_, T> 即可注入
  - 必须 Send + Sync（多线程访问安全）

【对比 Electron】
Electron 无内置 State 管理：
  - 全局变量或模块级变量（无生命周期管理）
  - ipcMain.handle 中自由访问，无约束
  - 开发者需要自行处理并发安全（Node.js 单线程但异步）
```

---

## 对比表

| 概念 | Tauri v2 | Electron | NestJS | Rust std |
|------|----------|----------|--------|----------|
| IPC 调用 | `invoke('name', args)` → Promise | `ipcRenderer.invoke('name', args)` → Promise | `fetch('/api/name')` → Promise | 无（原生函数调用） |
| 类型安全 | serde 编译期检查 | 无（any） | class-validator 运行时 | 编译期 |
| 状态管理 | `tauri::State<T>` | 无内置 | `@Injectable()` DI | 全局 static / lazy_static |
| 错误处理 | `Result<T, String>` → Promise reject | try-catch + 自定义 | ExceptionFilter | `Result<T, E>` |
| 参数校验 | serde 反序列化 + 手动校验 | 手动 | class-validator + DTO | 编译期类型 |

---

## 编译/运行命令

```bash
cd level-02-IPC通信Command与State
pnpm install
cargo tauri dev
```

---

## 自检清单

- [ ] 能手写出 5 种不同参数类型的 Rust Command + 对应的前端 invoke 调用
- [ ] 能使用 `tauri::State<T>` 在多个 Command 间共享数据
- [ ] 能正确处理 Command 的 `Result::Err` → 前端 Promise reject 的映射
- [ ] 能独立修复 `bugs/` 目录下的 3 个错误
- [ ] 能向 NestJS 开发者解释：Tauri State vs NestJS Provider 的 DI 差异
