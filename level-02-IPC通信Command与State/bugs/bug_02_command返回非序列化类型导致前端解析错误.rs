// bug_02_command返回非序列化类型导致前端解析错误.rs
// WHAT：Command 返回了未实现 Serialize 的类型，前端 invoke() 收到 JSON 解析错误
// 这是什么错误：运行时错误，Rust 端可以编译通过但前端 Promise reject
// 运行后报什么错：
//
//   前端控制台：
//   Uncaught (in promise) Error: failed to deserialize response body
//   Caused by: data did not match any variant of untagged enum SerdeOutput
//
//   Rust 端 cargo check 不会报错（因为函数签名允许任何返回类型），
//   但 tauri::generate_handler! 宏会检查返回类型是否实现 Serialize
//   实际上 tauri v2 的宏会在此处报编译错误：
//
//   error[E0277]: the trait bound `NonSerializableType: serde::Serialize` is not satisfied
//     --> src/lib.rs:42:1
//      |
//   42 | #[tauri::command]
//      | ^^^^^^^^^^^^^^^^ the trait `serde::Serialize` is not implemented for `NonSerializableType`
//
// 为什么会这样：
//   Tauri v2 的 IPC 通信使用 serde_json 序列化返回值。
//   所有 Command 返回类型必须实现 serde::Serialize。
//   所有 Command 参数类型必须实现 serde::Deserialize。
//   这是 Tauri v2 的类型安全边界。
//
// 【对比 Electron】
//   Electron 使用 structured clone algorithm（类似 postMessage），
//   支持的类型有限（基本类型、ArrayBuffer、Blob 等），但不做编译期检查。
//   返回 undefined/function/WeakMap 等不支持类型时，运行时才报错。
//
// 【对比 NestJS】
//   NestJS 使用 class-transformer 或手动 JSON.stringify，
//   同样要求返回类型可序列化，但没有编译期检查（TypeScript 结构类型系统）。
//
// 如何修复：
//   1. 为类型实现 Serialize（derive 或手动）
//   2. 如果类型确实不能序列化，包装为 String 或 JSON Value


// ============ 错误代码 ============
use std::net::TcpStream; // TcpStream 未实现 Serialize

// ❌ 编译错误：TcpStream 未实现 serde::Serialize
#[tauri::command]
fn bad_return_type() -> TcpStream {
    TcpStream::connect("127.0.0.1:8080").unwrap()
}

// ❌ 编译错误：Command 参数类型必须实现 Deserialize
#[tauri::command]
fn bad_param_type(stream: TcpStream) -> String {
    format!("{:?}", stream)
}


// ============ 修复后的代码 ============
// derive 宏自动实现 Serialize/Deserialize
#[derive(serde::Serialize, serde::Deserialize)]
struct ConnectionInfo {
    host: String,
    port: u16,
}

#[tauri::command]
fn good_return_type() -> ConnectionInfo {
    ConnectionInfo {
        host: "127.0.0.1".into(),
        port: 8080,
    }
}

// 或者返回基本类型/JSON
#[tauri::command]
fn simple_return() -> Result<String, String> {
    Ok("序列化友好的字符串".into())
}
