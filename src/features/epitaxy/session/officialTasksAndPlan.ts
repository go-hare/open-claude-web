/**
 * Official task/plan parsers (c11959232 Jp/XN).
 * Shared by Tasks pane, Plan pane, subagent, chat chrome — behavior unchanged.
 */
import type { ChatMessage, SessionSummary } from "../../../adapters/desktopBridge/types";

export type OfficialTaskStatus = "completed" | "failed" | "running" | "stopped";

export type OfficialBackgroundTask = {
  completedAt?: number;
  description: string;
  index: number;
  lastToolName?: string;
  prompt?: string;
  result?: string;
  startedAt?: number;
  status: OfficialTaskStatus;
  summary?: string;
  taskId: string;
  taskType?: string;
  toolUseId?: string;
  usage?: {
    durationMs: number;
    toolUses: number;
    totalTokens: number;
  };
  workflowProgress?: Array<{
    index: number;
    label: string;
    state: "done" | "error" | "pending" | "running" | "start";
    title?: string;
    type: "agent" | "workflow_phase";
  }>;
};

const taskNotificationPattern = /<task-notification>([\s\S]*?)<\/task-notification>/g;
const taskIdPattern = /<task-id>([^<]+)<\/task-id>/;
const taskStatusPattern = /<status>([^<]+)<\/status>/;
const taskSummaryPattern = /<summary>([^<]+)<\/summary>/;
const taskResultPattern = /<result>([\s\S]*?)<\/result>/;
const taskToolUseIdPattern = /<tool-use-id>([^<]+)<\/tool-use-id>/;
const taskTypePattern = /<task-type>([^<]+)<\/task-type>/;
const taskDescriptionPattern =
  /^(Agent|Workflow|Background command|Monitor|Remote task) "(.+?)" (?:completed|failed|was|stopped|stream|script|appears)/;
const taskTypeFromNotification: Record<string, string> = {
  Agent: "local_agent",
  Workflow: "local_workflow",
  "Background command": "local_bash",
  Monitor: "local_bash",
  "Remote task": "remote_agent",
};

export function parseOfficialTasks(messages: ChatMessage[]): OfficialBackgroundTask[] {
  const tasks = new Map<string, OfficialBackgroundTask>();
  const ensureTask = (taskId: string) => {
    let task = tasks.get(taskId);
    if (!task) {
      task = {
        description: taskId,
        index: tasks.size,
        status: "running",
        taskId,
      };
      tasks.set(taskId, task);
    }
    return task;
  };

  for (const message of messages) {
    const raw = asRecord(message.raw);
    if (raw.type === "user") {
      for (const notification of parseTaskNotifications(raw, message)) {
        const task = ensureTask(notification.taskId);
        task.status = notification.status;
        if (notification.summary) task.summary = notification.summary;
        if (notification.result) task.result = notification.result;
        if (notification.toolUseId) task.toolUseId ??= notification.toolUseId;
        if (notification.taskType) task.taskType ??= notification.taskType;
        if (notification.description && task.description === task.taskId) task.description = notification.description;
        if (task.completedAt === undefined && notification.status !== "running") task.completedAt = timestampFromRaw(raw, message);
      }
      continue;
    }

    if (!isOfficialTaskEvent(raw)) continue;
    const taskId = stringValue(raw.task_id) ?? stringValue(raw.taskId);
    if (!taskId) continue;
    const task = ensureTask(taskId);
    const timestamp = timestampFromRaw(raw, message);
    const toolUseId = stringValue(raw.tool_use_id) ?? stringValue(raw.toolUseId);
    if (toolUseId) task.toolUseId = toolUseId;

    switch (raw.subtype) {
      case "task_started":
        task.description = stringValue(raw.description) ?? task.description;
        task.taskType = stringValue(raw.task_type) ?? stringValue(raw.taskType) ?? task.taskType;
        task.prompt = stringValue(raw.prompt) ?? task.prompt;
        task.status = "running";
        if (task.startedAt === undefined) task.startedAt = timestamp;
        break;
      case "task_progress":
        if (task.startedAt === undefined) task.startedAt = timestamp;
        if (task.description === task.taskId) task.description = stringValue(raw.description) ?? task.description;
        task.usage = normalizeTaskUsage(raw.usage) ?? task.usage;
        task.lastToolName = stringValue(raw.last_tool_name) ?? stringValue(raw.lastToolName) ?? task.lastToolName;
        task.summary = stringValue(raw.summary) ?? task.summary;
        task.workflowProgress =
          normalizeWorkflowProgress(raw.workflow_progress) ?? normalizeWorkflowProgress(raw.workflowProgress) ?? task.workflowProgress;
        break;
      case "task_notification":
        task.status = normalizeTaskStatus(raw.status);
        if (task.completedAt === undefined) task.completedAt = timestamp;
        task.summary = stringValue(raw.summary) ?? task.summary;
        task.usage = normalizeTaskUsage(raw.usage) ?? task.usage;
        break;
    }
  }

  return Array.from(tasks.values());
}

function parseTaskNotifications(raw: Record<string, unknown>, message: ChatMessage) {
  const text = rawUserText(raw) || message.text;
  if (!text.includes("<task-notification>")) return [];
  const notifications: Array<{
    description?: string;
    result?: string;
    status: OfficialTaskStatus;
    summary?: string;
    taskId: string;
    taskType?: string;
    toolUseId?: string;
  }> = [];
  for (const match of text.matchAll(taskNotificationPattern)) {
    const body = match[1];
    const taskId = body.match(taskIdPattern)?.[1];
    const rawStatus = body.match(taskStatusPattern)?.[1];
    if (!taskId || !rawStatus) continue;
    const summary = decodeTaskNotificationText(body.match(taskSummaryPattern)?.[1]);
    const descriptionMatch = summary?.match(taskDescriptionPattern);
    notifications.push({
      description: descriptionMatch?.[2],
      result: decodeTaskNotificationText(body.match(taskResultPattern)?.[1])?.trim(),
      status: normalizeTaskStatus(rawStatus),
      summary,
      taskId,
      taskType: body.match(taskTypePattern)?.[1] ?? (descriptionMatch ? taskTypeFromNotification[descriptionMatch[1]] : undefined),
      toolUseId: body.match(taskToolUseIdPattern)?.[1],
    });
  }
  return notifications;
}

/**
 * Official XN parse (c11959232):
 * writeEdits (Write/Edit/MultiEdit under first /.claude/plans/ path) preferred over ExitPlanMode plan.
 * return { content: write ?? exitPlan, path }
 */
export function parseOfficialPlan(messages: ChatMessage[]) {
  let writeContent: string | null = null;
  let exitPlan: string | null = null;
  let path: string | null = null;
  for (const message of messages) {
    const raw = asRecord(message.raw);
    if (raw.type !== "assistant") continue;
    if (("parent_tool_use_id" in raw && raw.parent_tool_use_id) || raw.parentToolUseId) continue;
    const items = rawMessageContent(raw);
    for (const item of items) {
      const record = asRecord(item);
      if (record.type !== "tool_use") continue;
      const name = stringValue(record.name);
      if (!name) continue;
      // Official XN: const e=a.input; if(!e) continue;
      if (record.input == null || typeof record.input !== "object") continue;
      const input = asRecord(record.input);
      if (name === "ExitPlanMode") {
        exitPlan = stringValue(input.plan) ?? exitPlan;
        continue;
      }
      const filePath = stringValue(input.file_path);
      if (filePath && filePath.includes("/.claude/plans/") && (path ??= filePath) === filePath) {
        if (name === "Write") {
          writeContent = stringValue(input.content) ?? writeContent;
        } else if (name === "Edit") {
          const oldString = stringValue(input.old_string);
          const newString = stringValue(input.new_string);
          if (writeContent !== null && oldString !== undefined && newString !== undefined) {
            writeContent = applyPlanEdit(writeContent, {
              old_string: oldString,
              new_string: newString,
              replace_all: input.replace_all === true,
            });
          }
        } else if (name === "MultiEdit" && Array.isArray(input.edits) && writeContent !== null) {
          for (const edit of input.edits) {
            const recordEdit = asRecord(edit);
            if (typeof recordEdit.old_string === "string" && typeof recordEdit.new_string === "string") {
              writeContent = applyPlanEdit(writeContent, recordEdit);
            }
          }
        }
      }
    }
  }
  return {
    content: writeContent ?? exitPlan ?? undefined,
    path: path ?? undefined,
  };
}

export function resolvePlanOpenPath(planPath: string, session: SessionSummary | null) {
  if (/^(\/|~\/|[A-Za-z]:[\\/])/.test(planPath)) return planPath;
  const cwd = session?.cwd;
  if (!cwd) return planPath;
  return `${cwd.replace(/[\\/]$/, "")}/${planPath.replace(/^\.?[\\/]/, "")}`;
}

export function applyPlanEdit(content: string, edit: Record<string, unknown>) {
  const oldString = stringValue(edit.old_string) ?? stringValue(edit.oldString);
  const newString = stringValue(edit.new_string) ?? stringValue(edit.newString);
  if (oldString === undefined || newString === undefined) return content;
  if (edit.replace_all === true || edit.replaceAll === true) return content.split(oldString).join(newString);
  const index = content.indexOf(oldString);
  if (index < 0) return content;
  return content.slice(0, index) + newString + content.slice(index + oldString.length);
}

export function isOfficialTaskEvent(raw: Record<string, unknown>) {
  return raw.type === "system" && (raw.subtype === "task_started" || raw.subtype === "task_progress" || raw.subtype === "task_notification");
}

export function officialTaskKind(taskType?: string) {
  switch (taskType) {
    case "local_agent":
    case "in_process_teammate":
      return { kind: "agent", label: "Agent" };
    case "remote_agent":
      return { kind: "remote_agent", label: "Remote agent" };
    case "local_bash":
      return { kind: "bash", label: "Bash" };
    case "local_workflow":
      return { kind: "workflow", label: "Workflow" };
    case "monitor_mcp":
      return { kind: "monitor", label: "Monitor" };
    case "dream":
      return { kind: "dream", label: "Dream" };
    default:
      return { kind: "task", label: taskType ?? "Task" };
  }
}

function rawMessageContent(raw: Record<string, unknown>) {
  const message = asRecord(raw.message);
  const content = raw.content ?? message.content;
  return Array.isArray(content) ? content : [];
}

function rawUserText(raw: Record<string, unknown>) {
  const message = asRecord(raw.message);
  const content = raw.content ?? message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((item) => stringValue(asRecord(item).text) ?? "").join("\n");
  }
  return "";
}

function normalizeTaskStatus(value: unknown): OfficialTaskStatus {
  if (value === "running") return "running";
  if (value === "failed") return "failed";
  if (value === "stopped" || value === "killed") return "stopped";
  return "completed";
}

function normalizeTaskUsage(value: unknown): OfficialBackgroundTask["usage"] | undefined {
  const raw = asRecord(value);
  const totalTokens = numberValue(raw.total_tokens ?? raw.totalTokens);
  const toolUses = numberValue(raw.tool_uses ?? raw.toolUses);
  const durationMs = numberValue(raw.duration_ms ?? raw.durationMs);
  if (!totalTokens && !toolUses && !durationMs) return undefined;
  return { durationMs, toolUses, totalTokens };
}

function normalizeWorkflowProgress(value: unknown): OfficialBackgroundTask["workflowProgress"] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((item, index) => {
    const raw = asRecord(item);
    const type = raw.type === "workflow_phase" ? "workflow_phase" : "agent";
    return {
      index: numberValue(raw.index) || index,
      label: stringValue(raw.label) ?? stringValue(raw.title) ?? "",
      state:
        raw.state === "done" || raw.state === "error" || raw.state === "pending" || raw.state === "running" || raw.state === "start"
          ? raw.state
          : "pending",
      title: stringValue(raw.title),
      type,
    };
  });
}

function timestampFromRaw(raw: Record<string, unknown>, fallback?: ChatMessage) {
  const value = stringValue(raw.timestamp) ?? stringValue(raw.createdAt) ?? fallback?.createdAt;
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isNaN(parsed) ? undefined : parsed;
}

function decodeTaskNotificationText(value?: string) {
  return value?.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

export function formatDuration(durationMs: number) {
  if (!durationMs) return "0s";
  if (durationMs < 60_000) return `${Math.max(1, Math.round(durationMs / 1000))}s`;
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.round((durationMs % 60_000) / 1000);
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export function formatTokens(tokens: number) {
  return `${tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens)} tokens`;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
