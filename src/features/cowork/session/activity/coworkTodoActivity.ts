/**
 * Official residual todo/task progress map (index-BELzQL5P $he / Vhe):
 * - TodoWrite replaces map with todos[] (+ activeForm)
 * - TaskCreate seeds pending item from subject
 * - TaskUpdate patches status/subject/activeForm (status deleted removes)
 * Progress rail only consumes this map (vZt), not agent background tasks.
 */
import type { CoworkTodoItem } from "./coworkActivityTypes";
import type { CoworkRawMessage } from "../types";

const TASK_PROGRESS_TOOLS = new Set([
  "TodoWrite",
  "TaskCreate",
  "TaskUpdate",
  "TaskGet",
  "TaskList",
  "TaskStop",
]);

export function parseCoworkTodos(messages: CoworkRawMessage[]): CoworkTodoItem[] {
  const todos = new Map<string, CoworkTodoItem>();
  const toolUseToTaskId = new Map<string, string>();

  for (const message of messages) {
    const raw = asRecord(message.raw);
    // Residual Vhe: skip child messages with parent_tool_use_id
    if (raw.parent_tool_use_id != null) continue;

    const content = rawMessageContent(raw);
    if (content.length === 0) continue;

    for (const item of content) {
      const record = asRecord(item);
      const itemType = stringValue(record.type);
      if (itemType === "tool_use") {
        const name = stringValue(record.name) ?? stringValue(record.tool_name);
        const toolUseId = stringValue(record.id) ?? "";
        const input = asRecord(record.input);
        if (!name || !TASK_PROGRESS_TOOLS.has(name)) continue;
        applyTaskProgressTool(todos, toolUseToTaskId, name, toolUseId, input);
      }
    }
  }

  return [...todos.values()];
}

function applyTaskProgressTool(
  todos: Map<string, CoworkTodoItem>,
  toolUseToTaskId: Map<string, string>,
  name: string,
  toolUseId: string,
  input: Record<string, unknown>,
) {
  if (name === "TodoWrite") {
    // Residual $he TodoWrite: e.clear() then reseed
    todos.clear();
    const list = Array.isArray(input.todos) ? input.todos : [];
    list.forEach((todo, index) => {
      const record = asRecord(todo);
      const content = stringValue(record.content) ?? stringValue(record.text);
      if (!content) return;
      const id = stringValue(record.id) ?? `todo-${index}`;
      todos.set(id, {
        id,
        content,
        status: officialTodoStatus(record.status),
        activeForm: stringValue(record.activeForm),
      });
    });
    return;
  }

  if (name === "TaskCreate") {
    const subject = stringValue(input.subject);
    if (!subject) return;
    const id = toolUseId || `task-${todos.size}`;
    todos.set(id, {
      id,
      content: subject,
      status: "pending",
      activeForm: stringValue(input.activeForm),
    });
    if (toolUseId) toolUseToTaskId.set(toolUseId, id);
    return;
  }

  if (name === "TaskUpdate") {
    const taskId = stringValue(input.taskId);
    if (!taskId) return;
    const statusRaw = stringValue(input.status);
    if (statusRaw === "deleted") {
      todos.delete(taskId);
      return;
    }
    const current = todos.get(taskId);
    if (!current) return;
    todos.set(taskId, {
      id: taskId,
      content: stringValue(input.subject) ?? current.content,
      status: statusRaw ? officialTodoStatus(statusRaw) : current.status,
      activeForm: stringValue(input.activeForm) ?? current.activeForm,
    });
  }
}

function rawMessageContent(raw: Record<string, unknown>) {
  const message = asRecord(raw.message);
  const content = raw.content ?? message.content;
  return Array.isArray(content) ? content : [];
}

function officialTodoStatus(value: unknown): CoworkTodoItem["status"] {
  const status = stringValue(value);
  if (status === "completed" || status === "in_progress") return status;
  return "pending";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
