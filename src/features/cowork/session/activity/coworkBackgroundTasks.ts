import type { ChatMessage } from "../../../../adapters/desktopBridge/types";
import { asRecord, numberValue, stringValue } from "../recordUtils";
import type { CoworkBackgroundTask, CoworkTaskStatus } from "./coworkActivityTypes";

const notificationPattern = /<task-notification>([\s\S]*?)<\/task-notification>/g;
const tag = (name: string) => new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`);

export function parseCoworkBackgroundTasks(messages: ChatMessage[]) {
  const tasks = new Map<string, CoworkBackgroundTask>();
  for (const message of messages) {
    const raw = asRecord(message.raw);
    if (raw.type === "user") parseNotifications(message, raw).forEach((task) => mergeTask(tasks, task));
    else if (isTaskEvent(raw)) mergeSystemTask(tasks, raw);
  }
  return [...tasks.values()];
}

function mergeSystemTask(tasks: Map<string, CoworkBackgroundTask>, raw: Record<string, unknown>) {
  const taskId = stringValue(raw.task_id) ?? stringValue(raw.taskId);
  if (!taskId) return;
  const task = tasks.get(taskId) ?? { description: taskId, status: "running" as const, taskId };
  if (raw.subtype === "task_started") {
    task.description = stringValue(raw.description) ?? task.description;
    task.status = "running";
  } else if (raw.subtype === "task_progress") {
    task.description = task.description === taskId ? stringValue(raw.description) ?? task.description : task.description;
    task.workflowProgress = normalizeWorkflowProgress(raw.workflow_progress ?? raw.workflowProgress) ?? task.workflowProgress;
  } else if (raw.subtype === "task_notification") task.status = normalizeStatus(raw.status);
  tasks.set(taskId, task);
}

function parseNotifications(message: ChatMessage, raw: Record<string, unknown>) {
  const text = rawUserText(raw) || message.text;
  if (!text.includes("<task-notification>")) return [];
  const results: CoworkBackgroundTask[] = [];
  for (const match of text.matchAll(notificationPattern)) {
    const body = match[1];
    const taskId = body.match(tag("task-id"))?.[1];
    const status = body.match(tag("status"))?.[1];
    if (!taskId || !status) continue;
    const summary = decodeXml(body.match(tag("summary"))?.[1]);
    const description = summary?.match(/^(?:Agent|Workflow|Background command|Monitor|Remote task) "(.+?)"/)?.[1];
    results.push({ description: description ?? taskId, status: normalizeStatus(status), taskId });
  }
  return results;
}

function mergeTask(tasks: Map<string, CoworkBackgroundTask>, incoming: CoworkBackgroundTask) {
  const current = tasks.get(incoming.taskId);
  tasks.set(incoming.taskId, current ? { ...current, ...incoming, description: current.description === current.taskId ? incoming.description : current.description } : incoming);
}

function normalizeWorkflowProgress(value: unknown): CoworkBackgroundTask["workflowProgress"] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((item, index) => {
    const raw = asRecord(item);
    const state = ["done", "error", "pending", "running", "start"].includes(String(raw.state)) ? raw.state as "done" | "error" | "pending" | "running" | "start" : "pending";
    return { index: numberValue(raw.index) || index, label: stringValue(raw.label) ?? stringValue(raw.title) ?? "", state, title: stringValue(raw.title), type: raw.type === "workflow_phase" ? "workflow_phase" as const : "agent" as const };
  });
}

function normalizeStatus(value: unknown): CoworkTaskStatus {
  if (value === "running" || value === "failed" || value === "stopped") return value;
  if (value === "killed") return "stopped";
  return "completed";
}

function isTaskEvent(raw: Record<string, unknown>) {
  return raw.type === "system" && ["task_started", "task_progress", "task_notification"].includes(String(raw.subtype));
}

function rawUserText(raw: Record<string, unknown>) {
  const content = raw.content ?? asRecord(raw.message).content;
  if (typeof content === "string") return content;
  return Array.isArray(content) ? content.map((item) => stringValue(asRecord(item).text) ?? "").join("\n") : "";
}

function decodeXml(value?: string) { return value?.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&"); }
