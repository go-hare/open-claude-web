import { type MessageDescriptors } from "../../../../i18n/footerMenuMessages";
import { formatOfficialIcu } from "../../../../i18n/formatOfficialIcu";
import { asRecord, stringValue } from "../recordUtils";
import type { CoworkContentBlock } from "./coworkMessageModel";

/** Official c05b96c7f-DSH7iwX5.js `lm` / `co` thinking duration & Thought process descriptors. */
export const COWORK_TIMELINE_THINKING_MESSAGES = {
  thoughtProcess: { defaultMessage: "Thought process", id: "zl6fNbo7RW" },
  thoughtForSeconds: { defaultMessage: "Thought for {seconds}s", id: "Jj0DasG7Mx" },
  thoughtForMinutesSeconds: { defaultMessage: "Thought for {minutes}m {seconds}s", id: "4LM6AdGWNg" },
  thoughtForMinutes: { defaultMessage: "Thought for {minutes}m", id: "vFyvc213kN" },
  thoughtForHoursMinutes: { defaultMessage: "Thought for {hours}h {minutes}m", id: "voTuOb/ijW" },
  thoughtForHours: { defaultMessage: "Thought for {hours}h", id: "MFx4UWu2HS" },
} as const satisfies MessageDescriptors;

export type CoworkTimelineThinkingText = {
  [K in keyof typeof COWORK_TIMELINE_THINKING_MESSAGES]: string;
};

const toolCategories: Record<string, string> = {
  agent: "task", bash: "bash", bash_tool: "bash", close_file: "read", conversation_search: "memory",
  create_file: "write", delete_file: "delete_file", drive_search: "drive_search", edit: "edit",
  exit_plan_mode: "exit_plan_mode", file_search: "glob", glob: "glob", grep: "grep", kill_bash: "kill_bash",
  multi_edit: "edit", notebook_edit: "notebook_edit", open_file: "read", present_files: "read",
  preview_click: "preview", preview_eval: "preview", preview_fill: "preview", preview_inspect: "preview",
  preview_list: "preview", preview_logs: "preview", preview_network: "preview", preview_resize: "preview",
    preview_screenshot: "preview", preview_scroll: "preview", preview_select: "preview", preview_snapshot: "preview",
    preview_start: "preview", preview_stop: "preview", preview_type: "preview", project_knowledge_search: "memory",
    preview_console_logs: "preview",
  read: "read", recent_chats: "memory", repl: "bash", skill: "skill", str_replace: "edit",
  str_replace_editor: "edit", task: "task", tmux: "tmux", todo_write: "todo", tool_search: "tool_search",
  update_file: "edit", view: "view", web_fetch: "web", web_search: "web", write: "write",
};

export function coworkTimelineDisplayText(
  blocks: CoworkContentBlock[],
  getResult: (id: string) => CoworkContentBlock | undefined,
  thinkingText?: Partial<CoworkTimelineThinkingText>,
) {
  const thinking = blocks.filter((block) => block.type === "thinking");
  const tools = blocks.filter((block) => block.type === "tool_use");
  if (tools.length === 0 && thinking.length > 0) return thinkingDurationLabel(thinking, thinkingText);
  if (tools.length === 1) return singleToolLabel(tools[0], getResult(tools[0].id ?? ""));
  if (tools.length === 1) return singleToolLabel(tools[0], getResult(tools[0].id ?? ""));
  if (tools.length > 1) return multipleToolLabel(tools);
  return undefined;
}

function thinkingDurationLabel(blocks: CoworkContentBlock[], text?: Partial<CoworkTimelineThinkingText>) {
  let duration = 0;
  let measured = false;
  for (const block of blocks) {
    if (!block.start_timestamp || !block.stop_timestamp) continue;
    const start = new Date(block.start_timestamp).getTime();
    const stop = new Date(block.stop_timestamp).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(stop) && stop > start) {
      duration += stop - start;
      measured = true;
    }
  }
  if (!measured) return text?.thoughtProcess ?? "Thought process";
  const seconds = Math.round(duration / 1000);
  if (seconds < 60) {
    return text?.thoughtForSeconds
      ? formatOfficialIcu(text.thoughtForSeconds, { seconds })
      : `Thought for ${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  if (minutes < 60) {
    if (remSeconds > 0) {
      return text?.thoughtForMinutesSeconds
        ? formatOfficialIcu(text.thoughtForMinutesSeconds, { minutes, seconds: remSeconds })
        : `Thought for ${minutes}m ${remSeconds}s`;
    }
    return text?.thoughtForMinutes
      ? formatOfficialIcu(text.thoughtForMinutes, { minutes })
      : `Thought for ${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (remMinutes > 0) {
    return text?.thoughtForHoursMinutes
      ? formatOfficialIcu(text.thoughtForHoursMinutes, { hours, minutes: remMinutes })
      : `Thought for ${hours}h ${remMinutes}m`;
  }
  return text?.thoughtForHours
    ? formatOfficialIcu(text.thoughtForHours, { hours })
    : `Thought for ${hours}h`;
}

function singleToolLabel(block: CoworkContentBlock, result?: CoworkContentBlock) {
  const resultMessage = stringValue(result?.message);
  if (resultMessage && resultMessage !== block.name) return capitalize(resultMessage);
  const description = stringValue(asRecord(block.input).description);
  if (description) return capitalize(description);
  const message = stringValue(block.message);
  const category = toolCategory(block);
  if (category) return message && category !== "web" ? capitalize(message) : categoryLabel(category, 1);
  return message && message !== block.name ? capitalize(message) : "Used a tool";
}

function multipleToolLabel(tools: CoworkContentBlock[]) {
  const counts = new Map<string, number>();
  let generic = 0;
  for (const tool of tools) {
    const category = toolCategory(tool);
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
    else generic += 1;
  }
  const labels = [...counts].map(([category, count]) => ({ count, label: categoryLabel(category, count) }));
  if (generic) labels.push({ count: generic, label: generic === 1 ? "Used a tool" : `Used ${generic} tools` });
  return labels.sort((left, right) => right.count - left.count).slice(0, 3)
    .map((item, index) => index === 0 ? item.label : item.label.charAt(0).toLowerCase() + item.label.slice(1)).join(", ");
}

function toolCategory(block: CoworkContentBlock) {
  const name = block.name ?? "";
  const normalized = normalizeToolName(name);
  const category = toolCategories[normalized]
    ?? (name.includes("__Claude_in_Chrome__") ? "browser" : normalized.includes("computer-use") && normalized.includes("screenshot") ? "screenshot" : undefined);
  const path = stringValue(asRecord(block.input).file_path) ?? stringValue(asRecord(block.input).path);
  if (!path || !isAutoMemoryPath(path)) return category;
  if (["read", "grep", "glob"].includes(category ?? "")) return "auto_memory_read";
  if (category === "write") return "auto_memory_create";
  if (category === "edit") return "auto_memory_edit";
  return category;
}

function categoryLabel(category: string, count: number) {
  const plural = count > 1;
  const labels: Record<string, [string, string]> = {
    auto_memory_create: ["Created a memory", `Created ${count} memories`], auto_memory_edit: ["Edited a memory", `Edited ${count} memories`],
    auto_memory_read: ["Read a memory", `Read ${count} memories`], bash: ["Ran a command", `Ran ${count} commands`], browser: ["Used Claude in Chrome", `Used Claude in Chrome (${count} actions)`],
    delete_file: ["Deleted a file", `Deleted ${count} files`], drive_search: ["Searched Drive", "Searched Drive"],
    edit: ["Edited a file", `Edited ${count} files`], exit_plan_mode: ["Finished plan", "Finished plan"],
    glob: ["Found files", `Searched ${count} patterns`], grep: ["Searched code", `Searched ${count} patterns`],
    kill_bash: ["Stopped a command", `Stopped ${count} commands`], memory: ["Searched memory", "Searched memory"],
    notebook_edit: ["Edited a notebook", `Edited ${count} notebooks`], preview: ["Used Preview", "Used Preview"],
    read: ["Read a file", `Read ${count} files`], screenshot: ["Desktop screenshot", "Desktop screenshots"],
    skill: ["Used a skill", `Used ${count} skills`], task: ["Ran an agent", `Ran ${count} agents`],
    tmux: ["Ran terminal", "Ran terminal"], todo: ["Updated todo list", "Updated todo list"],
    tool_search: ["Loaded tools", "Loaded tools"], view: ["Viewed a file", `Viewed ${count} files`],
    web: ["Searched the web", "Searched the web"], write: ["Created a file", `Created ${count} files`],
  };
  return labels[category]?.[plural ? 1 : 0] ?? (plural ? `Used ${count} tools` : "Used a tool");
}

function normalizeToolName(name: string) {
  const index = name.lastIndexOf("__");
  return (index >= 0 ? name.slice(index + 2) : name).replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function isAutoMemoryPath(path: string) {
  const normalized = path.replace(/\\/g, "/");
  const fileName = normalized.split("/").at(-1)?.toLowerCase();
  if (fileName === "memory.md" || fileName === "claude.md") return false;
  return /\/mnt\/\.auto-memory(\/|$)/.test(normalized)
    || /\/local-agent-mode-sessions\/[^/]+\/[^/]+\/(memory|spaces\/[^/]+\/memory|agent\/memory)(\/|$)/.test(normalized);
}

function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
