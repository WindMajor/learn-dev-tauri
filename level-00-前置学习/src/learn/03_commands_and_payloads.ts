/**
 * ============================================================================
 * 03_commands_and_payloads.ts —— 命令系统与数据传递
 * ============================================================================
 *
 * 【学习目标】
 *   1. 深入理解 #[tauri::command] 宏的强大功能
 *   2. 掌握前端传递/接收各种复杂数据类型
 *   3. 理解 Rust async command 与前端 await 的配合
 *   4. 学会命令的组织与命名规范
 *
 * 【与纯 Web 开发的核心差异】
 *   - 纯 Web：需要定义路由、HTTP 方法（GET/POST）、请求体格式
 *   - Tauri：命令就是"函数"，参数自动映射，无需路由定义
 *   - Tauri 命令可以被类型安全地导入（通过 ts-rs 等工具）
 *   - 不需要手动序列化/反序列化，serde + JSON 自动完成
 */

import { invoke } from "@tauri-apps/api/core";

// ============================================================================
// 示例 1：基础命令参数类型 —— 前端可以传递多种 Rust 原生类型
// ============================================================================
// 场景：理解前端 JS 类型如何映射到 Rust 类型

async function example1_basicTypes() {
  // ====== 字符串参数 ======
  // JS: string  →  Rust: &str 或 String
  const msg = await invoke<string>("echo", { text: "Hello Rust!" });

  // ====== 数字参数 ======
  // JS: number  →  Rust: i32, u64, f64 等
  const sum = await invoke<number>("add", { a: 42, b: 58 });

  // ====== 布尔参数 ======
  // JS: boolean  →  Rust: bool
  const enabled = await invoke<boolean>("toggle_feature", { enable: true });

  // ====== null/undefined ======
  // JS: null  →  Rust: Option::None（需配合 serde）
  // JS: undefined → Rust Option 字段需要 #[serde(default)]
  const result = await invoke<string>("process", {
    required: "hello",
    optional: null,
  });

  console.log({ msg, sum, enabled, result });
}

/**
 * // ======== 对应的 Rust 后端代码 ========
 *
 * #[tauri::command]
 * fn echo(text: String) -> String { text }
 *
 * #[tauri::command]
 * fn add(a: i32, b: i32) -> i32 { a + b }
 *
 * #[tauri::command]
 * fn toggle_feature(enable: bool) -> bool { !enable }
 *
 * #[derive(Deserialize)]
 * struct ProcessArgs {
 *     required: String,
 *     optional: Option<String>,  // Option 处理可选参数
 * }
 *
 * #[tauri::command]
 * fn process(args: ProcessArgs) -> String { ... }
 */

// ============================================================================
// 示例 2：复杂结构体传递 —— JS Object → Rust Struct
// ============================================================================
// 场景：前端传递嵌套对象，Rust 接收带派生宏的结构体

interface Address {
  street: string;
  city: string;
  zip: string;
}

interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
}

interface OrderRequest {
  customer: string;
  address: Address;
  items: OrderItem[];
  notes?: string; // 可选字段
}

interface OrderResponse {
  order_id: string;
  total: number;
  status: "pending" | "confirmed" | "shipped";
}

async function example2_complexStruct() {
  // JS 对象会自动序列化为 JSON，再反序列化为 Rust Struct
  const order: OrderRequest = {
    customer: "Bob",
    address: {
      street: "123 Main St",
      city: "Beijing",
      zip: "100000",
    },
    items: [
      { product_id: "P001", quantity: 2, price: 99.99 },
      { product_id: "P002", quantity: 1, price: 199.99 },
    ],
    notes: "请尽快发货",
  };

  const response = await invoke<OrderResponse>("place_order", {
    order: order,
  });

  console.log(`订单 ${response.order_id} 已创建，总金额: ¥${response.total}`);
}

/**
 * // ======== 对应的 Rust 后端代码 ========
 *
 * #[derive(Deserialize)]
 * struct Address {
 *     street: String,
 *     city: String,
 *     zip: String,
 * }
 *
 * #[derive(Deserialize)]
 * struct OrderItem {
 *     product_id: String,
 *     quantity: u32,
 *     price: f64,
 * }
 *
 * #[derive(Deserialize)]
 * struct OrderRequest {
 *     customer: String,
 *     address: Address,
 *     items: Vec<OrderItem>,
 *     notes: Option<String>,  // 可选字段
 * }
 *
 * #[derive(Serialize)]
 * struct OrderResponse {
 *     order_id: String,
 *     total: f64,
 *     status: String,
 * }
 *
 * #[tauri::command]
 * fn place_order(order: OrderRequest) -> OrderResponse {
 *     let total: f64 = order.items.iter()
 *         .map(|item| item.quantity as f64 * item.price)
 *         .sum();
 *     OrderResponse {
 *         order_id: uuid::Uuid::new_v4().to_string(),
 *         total,
 *         status: "confirmed".into(),
 *     }
 * }
 */

// ============================================================================
// 示例 3：Rust 异步命令与前端 await 的配合
// ============================================================================
// 场景：Rust 端执行耗时操作（如数据库查询、文件处理）时，不阻塞主线程
// Tauri V2 特性：async command 在后台线程执行，前端可以继续交互

async function example3_asyncCommands() {
  console.log("开始调用异步命令...");
  const start = performance.now();

  // Rust async 命令不会阻塞前端的 UI 线程
  // 前端可以同时调用多个 async 命令
  const [result1, result2, result3] = await Promise.all([
    invoke<string>("slow_operation", { delayMs: 1000 }),
    invoke<string>("slow_operation", { delayMs: 2000 }),
    invoke<string>("slow_operation", { delayMs: 1500 }),
  ]);

  const elapsed = performance.now() - start;
  console.log(`三个异步命令并行执行耗时: ${elapsed.toFixed(0)}ms`);
  // 预期约 2000ms（最长的那个），而非 4500ms（串行）
  console.log("结果:", { result1, result2, result3 });

  // ====== Rust async vs 同步 command ======
  // 同步 command（不含 async）在新线程执行，也是非阻塞的
  // async command 的优势是可以配合 tokio 进行异步 I/O
}

/**
 * // ======== 对应的 Rust 后端代码 ========
 *
 * #[tauri::command]
 * async fn slow_operation(delay_ms: u64) -> Result<String, String> {
 *     // 使用 tokio 的异步 sleep，不阻塞异步运行时
 *     tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
 *     Ok(format!("操作完成（耗时 {}ms）", delay_ms))
 * }
 *
 * // 注意：在 lib.rs 中注册时，异步命令的注册方式相同
 * // .invoke_handler(tauri::generate_handler![slow_operation])
 */

// ============================================================================
// 示例 4：命令返回值类型详解
// ============================================================================
// 场景：理解 Rust 可以返回的各种类型及其前端接收方式

async function example4_returnTypes() {
  // ====== 返回 Result<T, String>（推荐） ======
  // 成功时 TS 拿到 T 类型的值，失败时 catch 到 Error
  try {
    const data: string = await invoke<string>("read_file_safe", {
      path: "/data/config.json",
    });
    console.log("读取成功:", data);
  } catch (e) {
    console.error("读取失败（Rust 返回了 Err）:", e);
  }

  // ====== 返回泛型 JSON（serde_json::Value） ======
  // 适合返回动态结构的数据
  const dynamic = await invoke<Record<string, unknown>>("get_dynamic_data");
  console.log("动态数据:", dynamic);

  // ====== 返回空元组（() / void） ======
  // 不关心返回值，只需确认命令执行完成
  await invoke("save_data", { key: "settings", value: "dark-mode" });

  // ====== 返回枚举 —— 使用 tagged 联合类型 ======
  // Rust 的 enum 序列化后与 TS discriminant union 对应
}

/**
 * // ======== 对应的 Rust 后端代码 ========
 *
 * #[tauri::command]
 * fn read_file_safe(path: String) -> Result<String, String> {
 *     std::fs::read_to_string(&path)
 *         .map_err(|e| format!("读文件失败: {}", e))
 * }
 *
 * #[tauri::command]
 * fn get_dynamic_data() -> serde_json::Value {
 *     serde_json::json!({
 *         "version": "2.0",
 *         "features": ["a", "b", "c"],
 *         "config": { "timeout": 30 }
 *     })
 * }
 *
 * #[tauri::command]
 * fn save_data(key: String, value: String) {
 *     // 不返回值，前端 await 后得到 undefined
 *     println!("保存: {} = {}", key, value);
 * }
 */

// ============================================================================
// 示例 5：命令的窗口和 AppHandle 参数（V2 自动注入）
// ============================================================================
// 场景：命令中需要操作窗口或应用实例时，声明对应参数即可自动注入
// Tauri V2 特性：某些参数类型由 Tauri 运行时自动注入，前端无需传递

async function example5_injectedParams() {
  // 前端调用时不需要传 window 参数，Rust 端自动获取
  await invoke("set_window_title", { title: "我的新标题" });

  // 注意：前端看不到 window 参数，但 Rust 端可以声明它
  console.log("窗口标题已更新（Rust 自动获取当前窗口引用）");
}

/**
 * // ======== 对应的 Rust 后端代码 ========
 *
 * use tauri::WebviewWindow;
 *
 * #[tauri::command]
 * fn set_window_title(window: tauri::WebviewWindow, title: String) {
 *     // window 参数由 Tauri 自动注入，前端不需要传
 *     window.set_title(&title).unwrap();
 * }
 *
 * // 也可以注入 AppHandle：
 * #[tauri::command]
 * fn get_app_info(app: tauri::AppHandle) -> String {
 *     format!("应用版本: {}", app.package_info().version)
 * }
 */

// ============================================================================
// 示例 6：命令命名规范与模块化组织
// ============================================================================
// 场景：当命令数量增多时，如何保持代码组织清晰
// Tauri V2 特性：命令可以分散在多个文件/模块中，统一注册

async function example6_namingConventions() {
  // ====== 推荐命名规范 ======
  // 使用前缀表示模块，下划线分隔单词
  // 好的命名：
  // - file_read、file_write、file_delete      ← 模块前缀 + 操作
  // - user_create、user_update、user_delete
  // - db_query、db_execute
  // - app_get_version、app_get_config

  // 前端调用示例：
  const files = await invoke<string[]>("file_list_dir", { dir: "/documents" });
  const user = await invoke("user_get_by_id", { id: "user_123" });
  const version = await invoke<string>("app_get_version");

  console.log({ files, user, version });

  // ====== 模块化组织建议 ======
  // Rust 端：
  // src-tauri/src/
  //   ├── lib.rs           ← 主入口，注册所有命令
  //   ├── commands/
  //   │   ├── mod.rs       ← 命令模块入口
  //   │   ├── file.rs      ← 文件操作命令
  //   │   ├── user.rs      ← 用户相关命令
  //   │   └── app.rs       ← 应用级命令
  //
  // 前端：
  // src/
  //   ├── api/
  //   │   ├── file.ts      ← 封装文件相关 invoke
  //   │   ├── user.ts      ← 封装用户相关 invoke
  //   │   └── app.ts       ← 封装应用相关 invoke
}

// ============================================================================
// 示例 7：前端封装命令 —— 建立类型安全的 API 层
// ============================================================================
// 场景：封装原始 invoke，提供类型安全的 API 给组件使用
// Tauri V2 特性：TS 类型定义无法自动从 Rust 生成，需手动维护

// ====== 文件操作 API 封装示例 ======
export async function fileReadText(path: string): Promise<string> {
  return invoke<string>("file_read_text", { path });
}

export async function fileWriteText(
  path: string,
  content: string
): Promise<void> {
  await invoke("file_write_text", { path, content });
}

export async function fileDelete(path: string): Promise<void> {
  await invoke("file_delete", { path });
}

// ====== 使用封装后的 API ======
async function example7_useEncapsulatedAPI() {
  try {
    await fileWriteText("/data/hello.txt", "Hello Tauri V2!");
    const content = await fileReadText("/data/hello.txt");
    console.log("读取到的文件内容:", content);
    await fileDelete("/data/hello.txt");
  } catch (error) {
    console.error("文件操作失败:", error);
  }
}

/**
 * // ======== 对应的 Rust 后端代码（建议放在 src-tauri/src/commands/file.rs） ========
 *
 * #[tauri::command]
 * fn file_read_text(path: String) -> Result<String, String> {
 *     std::fs::read_to_string(&path).map_err(|e| e.to_string())
 * }
 *
 * #[tauri::command]
 * fn file_write_text(path: String, content: String) -> Result<(), String> {
 *     std::fs::write(&path, &content).map_err(|e| e.to_string())
 * }
 *
 * #[tauri::command]
 * fn file_delete(path: String) -> Result<(), String> {
 *     std::fs::remove_file(&path).map_err(|e| e.to_string())
 * }
 */

// ============================================================================
// 【常见错误示例】
// ============================================================================

async function example8_commonMistakes() {
  // 错误 1：前端传了 Rust 不认识的字段
  console.log(`
  ❌ 错误：前端多传了字段
  await invoke("create_user", {
    name: "Alice",
    age: 30,
    extra_field: "Rust 结构体里没有这个字段"  // ← serde 默认忽略未知字段
  });
  
  原因：serde 默认忽略 JSON 中的未知字段（deny_unknown_fields 例外）
  影响：不会报错，但字段被无声丢弃，可能导致逻辑错误
  修复：在 Rust struct 上添加 #[serde(deny_unknown_fields)] 使未知字段报错
  `);

  // 错误 2：类型不匹配导致 serde 反序列化失败
  console.log(`
  ❌ 错误：数字类型不匹配
  await invoke("add", { a: "42", b: "58" });  // 传了字符串而非数字
  
  原因：Rust 期望 i32，但前端传了字符串 "42"
  现象：invoke 抛出错误 "invalid type: string '42', expected i32"
  修复：确保 JS 传递的类型与 Rust 接收的类型一致
  `);

  // 错误 3：Rust 端命令未注册
  console.log(`
  ❌ 错误：忘记在 lib.rs 中注册命令
  #[tauri::command]
  fn my_command() { ... }
  
  // lib.rs 中：
  .invoke_handler(tauri::generate_handler![greet])  // ← 忘记加 my_command
  
  现象：前端调用 invoke("my_command") 时报错 "command not found"
  修复：将所有需要暴露的命令添加到 generate_handler![] 宏中
  `);
}

// ============================================================================
// 【本章小结】
// ============================================================================
/**
 * 1. #[tauri::command] 是前后端数据传递的桥梁：
 *    - 参数自动反序列化（serde Deserialize）
 *    - 返回值自动序列化（serde Serialize）
 *    - JS Object ↔ Rust Struct 无缝转换
 *
 * 2. 参数类型映射：
 *    - string → &str / String
 *    - number → i32 / u64 / f64
 *    - boolean → bool
 *    - null / undefined → Option<T>（需 serde 配置）
 *    - object → struct（derive Deserialize）
 *    - array → Vec<T>
 *
 * 3. 返回值建议使用 Result<T, String>：
 *    - 成功：前端拿到 T 类型的值
 *    - 失败：前端 catch 到 Error，message 为 Rust 的错误字符串
 *
 * 4. 异步命令的优势：
 *    - Rust async command 不阻塞 tokio 运行时
 *    - 前端可以并行调用多个 async 命令
 *    - 同步 command 在后台线程执行，也不会阻塞 UI
 *
 * 5. 最佳实践：
 *    - 命令名用蛇形命名（snake_case）与 Rust 函数名保持一致
 *    - 用模块前缀分组（file_xxx, user_xxx）
 *    - 前端封装 API 层，对组件暴露类型安全的接口
 */
