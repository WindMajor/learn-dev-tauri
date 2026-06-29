// ============================================================================
// 08_rust_integrated_example.rs —— 综合实战：待办事项应用后端
// ============================================================================
//
// 【对应前端章节】全章综合练习
//
// 【学习目标】
//   1. 整合前 7 章所学，实现一个完整的后端 CRUD 系统
//   2. 使用 State 管理内存数据
//   3. 实现文件持久化存储（JSON 文件）
//   4. 学习前端如何调用这些命令
//
// 【应用架构】
//   前端 (Vue/React)                   后端 (Rust)
//   ┌──────────────────────┐         ┌──────────────────────┐
//   │  TodoList.vue         │  invoke │ #[tauri::command]    │
//   │  - 显示待办列表       │ ◄──────►│ - add_todo          │
//   │  - 添加/编辑/删除    │         │ - list_todos        │
//   │  - 标记完成           │  emit   │ - update_todo       │
//   │  - 过滤/搜索          │ ◄───────│ - remove_todo       │
//   └──────────────────────┘         │ - search_todos      │
//                                     └──────────────────────┘
//                                              │
//                                    ┌─────────▼──────────┐
//                                    │  Mutex<Vec<Todo>>  │ ← 内存 State
//                                    │ save_todos_to_file │ ← 持久化到磁盘
//                                    └────────────────────┘

use serde::{Deserialize, Serialize};
use std::sync::Mutex;

// ============================================================================
// 第一步：定义数据模型
// ============================================================================

// 单个待办事项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub description: String,
    pub completed: bool,
    pub created_at: String,
    pub updated_at: String,
    pub priority: Priority,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Priority {
    Low,
    Medium,
    High,
}

// 创建待办的请求体（前端传来）
#[derive(Debug, Deserialize)]
pub struct CreateTodoRequest {
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<Priority>,
    pub tags: Option<Vec<String>>,
}

// 更新待办的请求体
#[derive(Debug, Deserialize)]
pub struct UpdateTodoRequest {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub completed: Option<bool>,
    pub priority: Option<Priority>,
    pub tags: Option<Vec<String>>,
}

// 搜索结果
#[derive(Debug, Serialize)]
pub struct TodoListResponse {
    pub todos: Vec<Todo>,
    pub total: usize,
}

// ============================================================================
// 第二步：创建全局状态
// ============================================================================

// 全局待办列表状态
pub struct TodoStore {
    pub todos: Vec<Todo>,
    pub data_dir: std::path::PathBuf,
}

impl TodoStore {
    /// 创建新的 TodoStore
    pub fn new(data_dir: std::path::PathBuf) -> Self {
        let mut store = Self {
            todos: Vec::new(),
            data_dir,
        };
        // 尝试从文件加载已有数据
        store.load_from_file();
        store
    }

    /// 从文件加载数据
    fn load_from_file(&mut self) {
        let file_path = self.data_dir.join("todos.json");
        if let Ok(content) = std::fs::read_to_string(&file_path) {
            if let Ok(todos) = serde_json::from_str::<Vec<Todo>>(&content) {
                self.todos = todos;
                println!("从文件加载了 {} 个待办事项", self.todos.len());
            }
        }
    }

    /// 保存数据到文件
    fn save_to_file(&self) -> Result<(), String> {
        // 确保目录存在
        std::fs::create_dir_all(&self.data_dir)
            .map_err(|e| format!("创建数据目录失败: {}", e))?;

        let file_path = self.data_dir.join("todos.json");
        let json = serde_json::to_string_pretty(&self.todos)
            .map_err(|e| format!("序列化失败: {}", e))?;

        std::fs::write(&file_path, json)
            .map_err(|e| format!("保存文件失败: {}", e))
    }
}

// ============================================================================
// 第三步：实现命令
// ============================================================================

// 添加待办事项
//
// 前端调用：
// ```typescript
// const todo = await invoke<Todo>("add_todo", {
//     request: {
//         title: "学习 Tauri V2",
//         description: "完成第 8 章综合实战",
//         priority: "high",
//         tags: ["学习", "Tauri"]
//     }
// });
// ```
#[tauri::command]
pub fn add_todo(
    store: tauri::State<'_, Mutex<TodoStore>>,
    request: CreateTodoRequest,
) -> Result<Todo, String> {
    // 验证输入
    let title = request.title.trim().to_string();
    if title.is_empty() {
        return Err("标题不能为空".into());
    }
    if title.len() > 200 {
        return Err("标题不能超过 200 个字符".into());
    }

    let now = chrono::Utc::now().to_rfc3339();

    let todo = Todo {
        id: uuid::Uuid::new_v4().to_string(),
        title,
        description: request.description.unwrap_or_default(),
        completed: false,
        created_at: now.clone(),
        updated_at: now,
        priority: request.priority.unwrap_or(Priority::Medium),
        tags: request.tags.unwrap_or_default(),
    };

    // 更新内存数据
    {
        let mut data = store.lock().map_err(|e| e.to_string())?;
        data.todos.push(todo.clone());
        // 保存到文件
        data.save_to_file()?;
    }

    Ok(todo)
}

// 获取所有待办事项
//
// 前端调用：
// ```typescript
// const result = await invoke<TodoListResponse>("list_todos", {
//     filter: "all" // "all" | "active" | "completed"
// });
// console.log(`共有 ${result.total} 个待办`);
// ```
#[tauri::command]
pub fn list_todos(
    store: tauri::State<'_, Mutex<TodoStore>>,
    filter: Option<String>,
) -> Result<TodoListResponse, String> {
    let data = store.lock().map_err(|e| e.to_string())?;

    let filtered: Vec<Todo> = match filter.as_deref() {
        Some("active") => data.todos.iter()
            .filter(|t| !t.completed)
            .cloned()
            .collect(),
        Some("completed") => data.todos.iter()
            .filter(|t| t.completed)
            .cloned()
            .collect(),
        _ => data.todos.clone(), // "all" 或默认
    };

    let total = filtered.len();
    // 按创建时间倒序排列（最新的在前面）
    let mut todos = filtered;
    todos.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(TodoListResponse { todos, total })
}

// 更新待办事项
//
// 前端调用：
// ```typescript
// const updated = await invoke<Todo>("update_todo", {
//     request: { id: "xxx", completed: true }
// });
// ```
#[tauri::command]
pub fn update_todo(
    store: tauri::State<'_, Mutex<TodoStore>>,
    request: UpdateTodoRequest,
) -> Result<Todo, String> {
    let mut data = store.lock().map_err(|e| e.to_string())?;

    // 查找要更新的 Todo
    let todo = data.todos.iter_mut()
        .find(|t| t.id == request.id)
        .ok_or_else(|| format!("待办事项 '{}' 不存在", request.id))?;

    // 部分更新（只更新提供的字段）
    if let Some(title) = request.title {
        if title.trim().is_empty() {
            return Err("标题不能为空".into());
        }
        todo.title = title;
    }
    if let Some(description) = request.description {
        todo.description = description;
    }
    if let Some(completed) = request.completed {
        todo.completed = completed;
    }
    if let Some(priority) = request.priority {
        todo.priority = priority;
    }
    if let Some(tags) = request.tags {
        todo.tags = tags;
    }

    todo.updated_at = chrono::Utc::now().to_rfc3339();

    let result = todo.clone();

    // 持久化
    data.save_to_file()?;

    Ok(result)
}

// 删除待办事项
//
// 前端调用：
// ```typescript
// await invoke("remove_todo", { id: "xxx" });
// ```
#[tauri::command]
pub fn remove_todo(
    store: tauri::State<'_, Mutex<TodoStore>>,
    id: String,
) -> Result<(), String> {
    let mut data = store.lock().map_err(|e| e.to_string())?;

    let before_len = data.todos.len();
    data.todos.retain(|t| t.id != id);

    if data.todos.len() == before_len {
        return Err(format!("待办事项 '{}' 不存在", id));
    }

    // 持久化
    data.save_to_file()?;

    Ok(())
}

// 搜索待办事项
//
// 前端调用：
// ```typescript
// const results = await invoke<TodoListResponse>("search_todos", {
//     query: "Tauri"
// });
// ```
#[tauri::command]
pub fn search_todos(
    store: tauri::State<'_, Mutex<TodoStore>>,
    query: String,
) -> Result<TodoListResponse, String> {
    let data = store.lock().map_err(|e| e.to_string())?;

    let query_lower = query.to_lowercase();
    let results: Vec<Todo> = data.todos.iter()
        .filter(|t| {
            t.title.to_lowercase().contains(&query_lower) ||
            t.description.to_lowercase().contains(&query_lower) ||
            t.tags.iter().any(|tag| tag.to_lowercase().contains(&query_lower))
        })
        .cloned()
        .collect();

    let total = results.len();
    Ok(TodoListResponse { todos: results, total })
}

// 清除所有已完成的待办事项
//
// 前端调用：
// ```typescript
// const count = await invoke<number>("clear_completed");
// console.log(`清除了 ${count} 个已完成的待办`);
// ```
#[tauri::command]
pub fn clear_completed(
    store: tauri::State<'_, Mutex<TodoStore>>,
) -> Result<usize, String> {
    let mut data = store.lock().map_err(|e| e.to_string())?;

    let before_count = data.todos.len();
    data.todos.retain(|t| !t.completed);
    let cleared_count = before_count - data.todos.len();

    data.save_to_file()?;

    Ok(cleared_count)
}

// 获取待办统计
#[derive(Debug, Serialize)]
pub struct TodoStats {
    pub total: usize,
    pub active: usize,
    pub completed: usize,
    pub high_priority: usize,
}

#[tauri::command]
pub fn get_todo_stats(
    store: tauri::State<'_, Mutex<TodoStore>>,
) -> Result<TodoStats, String> {
    let data = store.lock().map_err(|e| e.to_string())?;

    let total = data.todos.len();
    let active = data.todos.iter().filter(|t| !t.completed).count();
    let completed = total - active;
    let high_priority = data.todos.iter()
        .filter(|t| t.priority == Priority::High)
        .count();

    Ok(TodoStats {
        total,
        active,
        completed,
        high_priority,
    })
}

// ============================================================================
// 第四步：在 lib.rs 中集成 Todo 应用
// ============================================================================
//
// 将以下代码放入 lib.rs 的 run() 函数中：
//
// ```rust
// pub fn run() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_opener::init())
//         // 设置数据目录
//         .setup(|app| {
//             // 获取应用数据目录
//             let data_dir = app.path()
//                 .app_data_dir()
//                 .expect("无法获取应用数据目录");
//
//             // 注入 Todo 状态
//             app.manage(Mutex::new(TodoStore::new(data_dir)));
//
//             Ok(())
//         })
//         .invoke_handler(tauri::generate_handler![
//             add_todo,
//             list_todos,
//             update_todo,
//             remove_todo,
//             search_todos,
//             clear_completed,
//             get_todo_stats,
//         ])
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }
// ```
//
// 和前端 greet 命令共存：
// ```rust
// .invoke_handler(tauri::generate_handler![
//     greet,              // ← 原有的 greet 命令
//     add_todo,           // ← 新增的 Todo 命令
//     list_todos,
//     update_todo,
//     remove_todo,
//     search_todos,
//     clear_completed,
//     get_todo_stats,
// ])
// ```

// ============================================================================
// 第五步：前端调用示例（放在 Vue 组件的注释中）
// ============================================================================
// 以下为前端 Vue 3 组件 TodoApp.vue 的代码示例：

/*
// ====== Vue 3 组件：TodoApp.vue ======

 * ```vue
 * <script setup lang="ts">
 * import { ref, onMounted } from "vue";
 * import { invoke } from "@tauri-apps/api/core";
 *
 * // ====== 类型定义（对应 Rust 结构体） ======
 * interface Todo {
 *     id: string;
 *     title: string;
 *     description: string;
 *     completed: boolean;
 *     created_at: string;
 *     priority: "low" | "medium" | "high";
 *     tags: string[];
 * }
 *
 * interface TodoListResponse {
 *     todos: Todo[];
 *     total: number;
 * }
 *
 * // ====== 响应式数据 ======
 * const todos = ref<Todo[]>([]);
 * const newTodoTitle = ref("");
 * const filter = ref<"all" | "active" | "completed">("all");
 * const loading = ref(false);
 * const error = ref("");
 *
 * // ====== 操作方法 ======
 *
 * // 加载待办列表
 * async function loadTodos() {
 *     loading.value = true;
 *     error.value = "";
 *     try {
 *         const result = await invoke<TodoListResponse>("list_todos", {
 *             filter: filter.value
 *         });
 *         todos.value = result.todos;
 *     } catch (e) {
 *         error.value = `加载失败: ${e}`;
 *     } finally {
 *         loading.value = false;
 *     }
 * }
 *
 * // 添加待办
 * async function addTodo() {
 *     if (!newTodoTitle.value.trim()) return;
 *     try {
 *         const todo = await invoke<Todo>("add_todo", {
 *             request: {
 *                 title: newTodoTitle.value,
 *                 priority: "medium",
 *             }
 *         });
 *         todos.value.unshift(todo);  // 乐观更新
 *         newTodoTitle.value = "";
 *     } catch (e) {
 *         error.value = `添加失败: ${e}`;
 *     }
 * }
 *
 * // 切换完成状态
 * async function toggleTodo(id: string, completed: boolean) {
 *     try {
 *         await invoke("update_todo", {
 *             request: { id, completed: !completed }
 *         });
 *         await loadTodos();  // 刷新列表
 *     } catch (e) {
 *         error.value = `更新失败: ${e}`;
 *     }
 * }
 *
 * // 删除待办
 * async function deleteTodo(id: string) {
 *     try {
 *         await invoke("remove_todo", { id });
 *         todos.value = todos.value.filter(t => t.id !== id);
 *     } catch (e) {
 *         error.value = `删除失败: ${e}`;
 *     }
 * }
 *
 * // 清除已完成
 * async function clearDone() {
 *     try {
 *         await invoke("clear_completed");
 *         await loadTodos();
 *     } catch (e) {
 *         error.value = `清除失败: ${e}`;
 *     }
 * }
 *
 * // 组件挂载时加载数据
 * onMounted(() => {
 *     loadTodos();
 * });
 * </script>
 * ```
 */

// ============================================================================
// 【本章小结】
// ============================================================================
//
// 1. 本综合示例整合了 Tauri V2 后端开发的核心概念：
//    - 数据模型定义（derive Serialize/Deserialize）
//    - 全局状态管理（State<Mutex<TodoStore>>）
//    - CRUD 命令实现（Create, Read, Update, Delete）
//    - 文件持久化（JSON 文件存储）
//    - 输入验证与错误处理
//
// 2. 前端与后端的协作模式：
//    - 前端通过 invoke 调用 Rust 命令
//    - 前端定义与 Rust 结构体匹配的 TypeScript 接口
//    - 使用 try/catch 处理 Result::Err
//    - 乐观更新提升用户体验
//
// 3. 架构要点：
//    - Mutex 确保并发安全
//    - 数据修改后立即持久化
//    - 支持部分更新（UpdateTodoRequest 所有字段 Option）
//    - 搜索支持标题、描述、标签多字段匹配
//
// 4. 扩展方向：
//    - 接入 SQLite（tauri-plugin-sql）替代 JSON 文件
//    - 添加事件通知（添加/修改/删除时 emit）
//    - 实现撤销/重做功能
//    - 添加标签管理和统计面板
//    - 支持数据导出/导入
