import { asRecord, stringValue } from "../recordUtils";
import type { CoworkToolUse } from "../types";
import { isCoworkDirectoryToolName } from "./coworkDirectoryTools";

export type CoworkToolRowSummary = {
  kind: "bash" | "diff" | "file" | "plan" | "question" | "text" | "todos";
  meta?: string;
  metaHref?: string;
  metaIsCode?: boolean;
  runningVerb: string;
  verb: string;
};

export type CoworkToolSummaryPiece = { isError?: boolean; meta?: string; verb: string };

type BashAction =
  | { commitKind: "amended" | "cherry-picked" | "committed"; kind: "commit"; meta?: string }
  | { kind: "push"; meta?: string }
  | { action: "merged" | "rebased"; kind: "branch"; meta?: string }
  | { action: "closed" | "commented" | "created" | "edited" | "merged" | "ready"; kind: "pr"; meta?: string; url?: string };

export function coworkToolRowSummary(tool: CoworkToolUse): CoworkToolRowSummary {
  const kind = toolRowKind(tool.name);
  const inputString = (key: string) => stringValue(tool.input[key]);
  if (isCoworkDirectoryToolName(tool.name)) return { kind, meta: tool.status === "awaiting_approval" ? "Request" : undefined, runningVerb: "Request cowork directory", verb: "Request cowork directory" };
  if (tool.name === "Bash" || tool.name === "BashTool") return bashSummary(tool, kind, inputString("command"));
  const fileSummary = fileToolSummary(tool.name, kind, inputString);
  if (fileSummary) return fileSummary;
  const workflowSummary = workflowToolSummary(tool, kind, inputString);
  if (workflowSummary) return workflowSummary;
  const label = tool.name.startsWith("mcp__") ? tool.name.split("__").at(-1)?.replace(/_/g, " ") ?? tool.name : tool.name;
  return { kind, runningVerb: `Using ${label}`, verb: `Used ${label}` };
}

export function coworkToolSummaryPieces(tools: CoworkToolUse[]) {
  const order: string[] = [];
  const counts = new Map<string, number>();
  const errors = new Map<string, boolean>();
  let otherCount = 0;
  let otherError = false;
  for (const tool of tools) {
    const kind = toolKind(tool.name);
    if (!kind) { otherCount += 1; otherError ||= Boolean(tool.isError); continue; }
    if (!counts.has(kind)) order.push(kind);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
    errors.set(kind, errors.get(kind) || Boolean(tool.isError));
  }
  const pieces = order.flatMap((kind) => kindSummary(kind, counts.get(kind) ?? 0, errors.get(kind)));
  if (otherCount) pieces.push({ isError: otherError, meta: plural(otherCount, "tool", "tools"), verb: "used" });
  return pieces.length ? pieces : [{ meta: plural(tools.length, "tool", "tools"), verb: "used" }];
}

export function coworkToolMetaClass(summary: CoworkToolRowSummary) {
  return summary.kind === "diff" || summary.kind === "file" || summary.metaIsCode
    ? "text-code text-assistant-primary truncate min-w-0"
    : "text-body text-assistant-secondary truncate min-w-0";
}

export function coworkToolHasDetails(tool: CoworkToolUse, summary: CoworkToolRowSummary) {
  return !(summary.kind === "todos" && todoItems(tool.input).length === 0);
}

function fileToolSummary(name: string, kind: CoworkToolRowSummary["kind"], input: (key: string) => string | undefined): CoworkToolRowSummary | null {
  if (name === "Read") return { kind, meta: basename(input("file_path")), runningVerb: "Reading", verb: "Read" };
  if (name === "Write") return { kind, meta: basename(input("file_path")), runningVerb: "Creating", verb: "Created" };
  if (["Edit", "MultiEdit", "NotebookEdit"].includes(name)) return { kind, meta: basename(input("file_path") ?? input("notebook_path")), runningVerb: "Editing", verb: "Edited" };
  if (name === "Grep" || name === "Glob") return { kind, meta: input("pattern"), runningVerb: "Searching", verb: "Searched" };
  if (name === "LS") return { kind, meta: input("path"), runningVerb: "Listing", verb: "Listed" };
  if (name === "WebFetch") return { kind, meta: input("url"), runningVerb: "Fetching", verb: "Fetched" };
  if (name === "WebSearch") return { kind, meta: input("query"), runningVerb: "Searching web", verb: "Searched web" };
  return null;
}

function workflowToolSummary(tool: CoworkToolUse, kind: CoworkToolRowSummary["kind"], input: (key: string) => string | undefined): CoworkToolRowSummary | null {
  if (tool.name === "Task" || tool.name === "Agent") return { kind, meta: input("description"), runningVerb: "Running agent", verb: "Ran agent" };
  if (tool.name === "Skill") return { kind, meta: input("skill") ? `/${input("skill")}` : undefined, metaIsCode: true, runningVerb: "Running skill", verb: "Ran skill" };
  if (["TaskCreate", "TaskUpdate", "TaskGet", "TaskList", "TaskStop"].includes(tool.name)) return { kind, runningVerb: "Updating todos", verb: "Updated todos" };
  if (tool.name === "TodoWrite") return { kind, runningVerb: "Updating todos", verb: Array.isArray(tool.input.todos) && tool.input.todos.length ? "Updated todos" : "Cleared todos" };
  if (tool.name === "EnterPlanMode") return { kind, runningVerb: "Entering plan mode", verb: "Entered plan mode" };
  if (tool.name === "ExitPlanMode") return { kind, runningVerb: "Proposing plan", verb: "Proposed plan" };
  if (tool.name === "AskUserQuestion") {
    const questions = Array.isArray(tool.input.questions) ? tool.input.questions : [];
    return { kind, meta: stringValue(asRecord(questions[0]).header) ?? (questions.length > 1 ? `${questions.length} questions` : undefined), runningVerb: "Asking", verb: "Asked" };
  }
  if (tool.name === "SendUserMessage" || tool.name === "SendUserFile") return { kind, runningVerb: "Sending", verb: "Sent" };
  return null;
}

function bashSummary(tool: CoworkToolUse, kind: CoworkToolRowSummary["kind"], command?: string): CoworkToolRowSummary {
  const recognized = command && !tool.isError ? recognizedBashAction(command, tool.output) : null;
  if (!recognized) return { kind, meta: stringValue(tool.input.description) ?? command, runningVerb: "Running", verb: "Ran" };
  const verbs = bashActionVerbs(recognized);
  return { ...verbs, kind, meta: recognized.meta ?? stringValue(tool.input.description) ?? command, metaHref: recognized.kind === "pr" ? recognized.url : undefined, metaIsCode: recognized.meta !== undefined };
}

const gitCommit = gitCommand("commit");
const gitPush = gitCommand("push");
const gitCherryPick = gitCommand("cherry-pick");
const gitMerge = gitCommand("merge", "(?!-)");
const gitRebase = gitCommand("rebase");
const prActions = [{ action: "created", re: /\bgh\s+pr\s+create\b/ }, { action: "edited", re: /\bgh\s+pr\s+edit\b/ }, { action: "merged", re: /\bgh\s+pr\s+merge\b/ }, { action: "commented", re: /\bgh\s+pr\s+comment\b/ }, { action: "closed", re: /\bgh\s+pr\s+close\b/ }, { action: "ready", re: /\bgh\s+pr\s+ready\b/ }] as const;

function recognizedBashAction(command: string, output = ""): BashAction | null {
  const prAction = prActions.find((item) => item.re.test(command))?.action;
  if (prAction) {
    const url = output.match(/https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/(\d+)/);
    if (url?.[1]) return { action: prAction, kind: "pr", meta: `#${Number(url[1])}`, url: url[0] };
    const number = output.match(/[Pp]ull request (?:\S+#)?#?(\d+)/)?.[1];
    return { action: prAction, kind: "pr", meta: number ? `#${Number(number)}` : undefined };
  }
  const cherryPick = gitCherryPick.test(command);
  if (gitCommit.test(command) || cherryPick) return { commitKind: cherryPick ? "cherry-picked" : /--amend\b/.test(command) ? "amended" : "committed", kind: "commit", meta: output.match(/\[[\w./-]+(?: \(root-commit\))? ([0-9a-f]+)\]/)?.[1]?.slice(0, 7) };
  if (gitPush.test(command)) return { kind: "push", meta: output.match(/^\s*[+\-*!= ]?\s*(?:\[new branch\]|\S+\.\.\S+)\s+\S+\s*->\s*(\S+)/m)?.[1] };
  if (gitMerge.test(command)) return branchAction(command, output, "merge", "merged");
  if (gitRebase.test(command)) return branchAction(command, output, "rebase", "rebased");
  return null;
}

function branchAction(command: string, output: string, operation: "merge" | "rebase", action: "merged" | "rebased"): BashAction | null {
  const branch = gitArgument(command, operation);
  if (!branch) return null;
  const succeeded = operation === "merge" ? /(Fast-forward|Merge made by)/.test(output) : /Successfully rebased/.test(output);
  return { action, kind: "branch", meta: !output || succeeded ? branch : undefined };
}

function bashActionVerbs(action: BashAction) {
  if (action.kind === "commit") return action.commitKind === "amended" ? { runningVerb: "Amending commit", verb: "Amended commit" } : action.commitKind === "cherry-picked" ? { runningVerb: "Cherry-picking", verb: "Cherry-picked" } : { runningVerb: "Committing", verb: "Committed" };
  if (action.kind === "push") return { runningVerb: "Pushing", verb: "Pushed" };
  if (action.kind === "branch") return action.action === "merged" ? { runningVerb: "Merging", verb: "Merged" } : { runningVerb: "Rebasing onto", verb: "Rebased onto" };
  const verbs = { created: ["Creating PR", "Created PR"], edited: ["Editing PR", "Edited PR"], merged: ["Merging PR", "Merged PR"], commented: ["Commenting on PR", "Commented on PR"], closed: ["Closing PR", "Closed PR"], ready: ["Marking PR ready", "Marked PR ready"] } as const;
  return { runningVerb: verbs[action.action][0], verb: verbs[action.action][1] };
}

function toolRowKind(name: string): CoworkToolRowSummary["kind"] {
  if (name === "Bash" || name === "BashTool") return "bash";
  if (name === "Read") return "file";
  if (["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(name)) return "diff";
  if (["TodoWrite", "TaskCreate", "TaskUpdate", "TaskGet", "TaskList", "TaskStop"].includes(name)) return "todos";
  if (name === "ExitPlanMode") return "plan";
  if (name === "AskUserQuestion") return "question";
  return "text";
}

function toolKind(name: string) {
  if (name === "Bash" || name === "BashTool") return "bash";
  if (name === "Read" || name === "View") return name.toLowerCase();
  if (name === "Write") return "write";
  if (name === "Edit" || name === "MultiEdit") return "edit";
  if (name === "NotebookEdit") return "notebook_edit";
  if (name === "Delete" || name === "DeleteFile") return "delete_file";
  if (name === "Grep") return "grep";
  if (name === "Glob" || name === "LS") return "glob";
  if (name === "WebFetch" || name === "WebSearch") return "web";
  if (name === "Task" || name === "Agent") return "task";
  if (name === "TodoWrite") return "todo";
  if (name === "ExitPlanMode") return "exit_plan_mode";
}

function kindSummary(kind: string, count: number, isError?: boolean): CoworkToolSummaryPiece[] {
  const values: Record<string, [string, string]> = { bash: ["ran", plural(count, "command", "commands")], read: ["read", plural(count, "file", "files")], view: ["viewed", plural(count, "file", "files")], write: ["created", plural(count, "file", "files")], edit: ["edited", plural(count, "file", "files")], notebook_edit: ["edited", plural(count, "notebook", "notebooks")], delete_file: ["deleted", plural(count, "file", "files")], grep: ["searched", "code"], glob: ["found", "files"], web: ["browsed", "the web"], task: ["ran", plural(count, "agent", "agents", "an")], todo: ["updated", "todos"], exit_plan_mode: ["proposed", "a plan"] };
  const value = values[kind];
  return value ? [{ isError, meta: value[1], verb: value[0] }] : [];
}

function todoItems(input: Record<string, unknown>) { return Array.isArray(input.todos) ? input.todos : []; }
function gitCommand(command: string, suffix = "") { return new RegExp(`\\bgit(?:\\s+-[cC]\\s+\\S+|\\s+--\\S+=\\S+)*\\s+${command}\\b${suffix}`); }
function gitArgument(command: string, operation: string) { return command.split(gitCommand(operation))[1]?.trim().split(/\s+/).find((token) => !token.startsWith("-") && !/^[&|;><]/.test(token)); }
function basename(value?: string) { return value?.split(/[\\/]/).filter(Boolean).at(-1); }
function plural(count: number, singular: string, pluralValue: string, article?: string) { return count === 1 ? article ? `${article} ${singular}` : `1 ${singular}` : `${count} ${pluralValue}`; }
