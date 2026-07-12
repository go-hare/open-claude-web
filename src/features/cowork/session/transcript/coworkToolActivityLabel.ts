import { asRecord, stringValue } from "../recordUtils";

const labels: Record<string, string> = {
  agent: "Running agent", close_file: "Closing file", conversation_search: "Searching memory",
  create_file: "Creating file", delete_file: "Deleting file", drive_search: "Searching Drive",
  edit: "Editing file", exit_plan_mode: "Finishing plan", file_search: "Searching files",
  glob: "Finding files", grep: "Searching code", kill_bash: "Stopping command",
  multi_edit: "Editing files", notebook_edit: "Editing notebook", open_file: "Opening file",
  present_files: "Presenting files", project_knowledge_search: "Searching project knowledge",
  read: "Reading file", recent_chats: "Searching memory", repl: "Running code",
  skill: "Running skill", task: "Running agent", tmux: "Running terminal",
  todo_write: "Update todo list", tool_search: "Loading tools", update_file: "Updating file",
  view: "Viewing file", web_fetch: "Fetching URL", web_search: "Searching web", write: "Writing file",
  preview_start: "Starting preview", preview_screenshot: "Taking preview screenshot",
  preview_click: "Clicking preview element", preview_type: "Typing in preview",
  preview_scroll: "Scrolling preview", preview_select: "Selecting preview element",
  preview_eval: "Running preview script", preview_resize: "Resizing preview",
  preview_stop: "Stopping preview", preview_list: "Listing previews",
  preview_snapshot: "Taking preview snapshot", preview_fill: "Filling preview field",
  preview_logs: "Viewing preview logs", preview_console_logs: "Viewing console logs",
  preview_network: "Viewing network activity", preview_inspect: "Inspecting preview element",
  read_widget_context: "Reading widget context", str_replace: "Editing file",
  str_replace_editor: "Editing file",
};

export function coworkToolActivityLabel(name: string, inputValue?: unknown) {
  const normalized = normalizeToolName(name);
  const input = asRecord(inputValue);
  if (normalized === "bash" || normalized === "bash_tool") {
    return stringValue(input.description) ?? stringValue(input.command) ?? "Running command";
  }
  if (normalized === "str_replace" || normalized === "str_replace_editor") {
    const path = stringValue(input.path);
    return path ? `Editing ${path}` : "Editing file";
  }
  if (normalized === "computer") return computerActivityLabel(stringValue(input.action));
  return labels[normalized];
}

function computerActivityLabel(action?: string) {
  if (action === "screenshot") return "Taking screenshot";
  if (["left_click", "right_click", "double_click", "triple_click", "middle_click"].includes(action ?? "")) return "Clicking";
  if (action === "left_click_drag") return "Dragging";
  if (action === "hover" || action === "mouse_move") return "Moving mouse";
  if (action === "type") return "Typing";
  if (action === "key") return "Pressing key";
  if (action === "scroll" || action === "scroll_to") return "Scrolling";
  return action ? action.charAt(0).toUpperCase() + action.slice(1).replaceAll("_", " ") : "Browser action";
}

function normalizeToolName(name: string) {
  const index = name.lastIndexOf("__");
  return (index >= 0 ? name.slice(index + 2) : name)
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase();
}
