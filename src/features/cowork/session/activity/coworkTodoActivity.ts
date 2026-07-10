import type { ChatMessage } from "../../../../adapters/desktopBridge/types";
import type { CoworkTodoItem } from "./coworkActivityTypes";

export function parseCoworkTodos(messages: ChatMessage[]): CoworkTodoItem[] {
  let latestTodos: CoworkTodoItem[] = [];
  for (const message of messages) {
    for (const tool of rawToolUsesFromMessage(message)) {
      if (tool.name !== "TodoWrite") continue;
      latestTodos = officialTodoItems(tool.input);
    }
  }
  return latestTodos;
}

function rawToolUsesFromMessage(message: ChatMessage): Array<{ input: Record<string, unknown>; name: string }> {
  const raw = asRecord(message.raw);
  const content = rawMessageContent(raw);
  return content.flatMap((item) => {
    const record = asRecord(item);
    const itemType = stringValue(record.type) ?? stringValue(record.kind);
    const name = stringValue(record.name) ?? stringValue(record.tool_name);
    if (itemType !== "tool_use" && !name) return [];
    return [{ input: asRecord(record.input), name: name ?? "Tool" }];
  });
}

function rawMessageContent(raw: Record<string, unknown>) {
  const message = asRecord(raw.message);
  const content = raw.content ?? message.content;
  return Array.isArray(content) ? content : [];
}

function officialTodoItems(input: Record<string, unknown>) {
  const todos = Array.isArray(input.todos) ? input.todos : [];
  return todos.flatMap((todo) => {
    const record = asRecord(todo);
    const id = stringValue(record.id);
    const content = stringValue(record.content);
    if (!id || !content) return [];
    return [{ content, id, status: officialTodoStatus(record.status) }];
  });
}

function officialTodoStatus(value: unknown): CoworkTodoItem["status"] {
  const status = stringValue(value);
  return status === "completed" || status === "in_progress" ? status : "pending";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
