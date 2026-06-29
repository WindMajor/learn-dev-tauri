// bug_03_前端invoke参数名不匹配导致默认值.ts
// WHAT：前端 invoke 的参数 key 与 Rust 函数参数名不匹配，导致 Rust 端收到默认值
// 这是什么错误：运行时逻辑错误，不会抛出异常，但业务数据错误（最难排查！）
// 运行后报什么错：没有报错！但 Rust 端收到的参数是默认值/零值，业务逻辑静默失败。
//
// Rust Command 定义：
//   #[tauri::command]
//   fn calculate(a: f64, b: f64, operation: String) -> Result<f64, String> { ... }
//
// 前端正确调用：
//   await invoke('calculate', { a: 10, b: 5, operation: 'add' });
//   // → Rust 端收到 a=10.0, b=5.0, operation="add"  ✅
//
// 前端错误调用（参数名拼写错误）：
//   await invoke('calculate', { aa: 10, bb: 5, operation: 'add' });
//   // → Rust 端收到 a=0.0, b=0.0, operation="add"     ❌
//   // Rust 端 a 和 b 没匹配到值 → serde_json 自动填充默认值 0.0！
//
// 为什么会这样：
//   1. serde_json 的 Deserialize 对缺失字段使用 Default::default()
//   2. f64 的默认值是 0.0
//   3. String 的默认值是 ""（空字符串）
//   4. i32 的默认值是 0
//   5. bool 的默认值是 false
//
//   【对比 Electron】
//   Electron 的 ipcRenderer.invoke('name', arg1, arg2) 是按位置传参，
//   不存在 key 不匹配问题，但类型安全问题同样存在。
//
//   【对比 NestJS】
//   NestJS + class-validator 可以通过 @IsDefined() 装饰器检测缺失字段，
//   Tauri v2 需要手动在 Rust 端校验参数有效性。
//
//   【WARNING】这是 Tauri v2 开发中最常见的静默 Bug！
//   建议：在 Rust Command 中显式校验所有业务关键参数。
//
// 如何修复：
//   方案1：前端确保参数 key 精确匹配 Rust 函数参数名
//   方案2：在 Rust 端使用自定义 Deserialize 拒绝默认值
//   方案3：使用 #[serde(deny_unknown_fields)] 拒绝未知字段


// ─── 错误代码（前端 TypeScript） ───
import { invoke } from "@tauri-apps/api/core";

// ❌ 错误：参数 key 拼写错误 'frist' 应为 'first'
async function badExample() {
  // Rust 端 fn add(first: f64, second: f64)
  const result = await invoke<number>("add_numbers", {
    frist: 10,   // ❌ 拼写错误：Rust 端收到 first=0.0（默认值）
    second: 5,
  });
  // result = 5（实际是 0 + 5，而非预期的 10 + 5 = 15）
  console.log("错误结果:", result); // 5 —— 但预期是 15！
}

// ❌ 错误：多余字段不会报错
async function extraFieldsExample() {
  const result = await invoke<number>("add_numbers", {
    first: 10,
    second: 5,
    unneeded_field: "这个字段被忽略", // Rust 端不会报错，只是忽略
  });
}

// ─── 修复方案 1：前端封装确保类型安全 ───
// WHAT：封装 invoke 调用，TypeScript 类型检查参数 key
// WHY：虽然不能保证 key 与 Rust 端匹配，但 TypeScript 类型能避免拼写错误
interface CalculateArgs {
  a: number;
  b: number;
  operation: string;
}

async function fixedExample1(): Promise<number> {
  const args: CalculateArgs = { a: 10, b: 5, operation: "add" };
  // ✅ TypeScript 保证参数结构和类型
  return invoke<number>("calculate", args);
}

// ─── 修复方案 2：Rust 端拒绝默认值 ───
// #[derive(Deserialize)]
// struct CalculateArgs {
//     #[serde(deserialize_with = "reject_zero")]
//     a: f64,
//     #[serde(deserialize_with = "reject_zero")]
//     b: f64,
//     operation: String,
// }
//
// fn reject_zero<'de, D: serde::Deserializer<'de>>(d: D) -> Result<f64, D::Error> {
//     let value = f64::deserialize(d)?;
//     if value == 0.0 {
//         Err(serde::de::Error::custom("参数不能为 0（可能是参数名不匹配导致的默认值）"))
//     } else {
//         Ok(value)
//     }
// }

export {}; // 确保此文件被视为模块
