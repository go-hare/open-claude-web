/**
 * Official Workflow → Fu `workflow` compact / settled row (pin 2.31226.1).
 *
 * Gate: cd5a31703-B4nKQMBN.js `T1(e)` — `name==="Workflow"` and status is not
 * `awaiting_approval` / `error`. Paint: `E1` → compact `w1`/`C0e` or settled Zg-like line.
 * Title: c7226f7ba `Gfe` (`t`) — `input.name`, else `script` `meta.name`, else `scriptPath` basename.
 * Product also accepts `description` / `title` (E1 `Gfe(e.input)` + C0e `n??e.name??e.description`).
 *
 * Verbs: c52b02f3f `H.Workflow` Running `5ERbNHcYuQ`, `U.Workflow` Ran `cvADfWAsqS`.
 * C0e footnotes: Starting `h80VjAcT3+`, Workflow `pv1lF7n7cd`.
 * Settled Stopped `1LBny5MvRa` / Failed `vXCeIi67rj` (cd5a E1 / Zg).
 *
 * Compact `y1 = group/tool my-[6px] ${Ay}` — Ay is c425 `R`/`p` (318px isolate row).
 * Clickable: `${y1} ${Dy} pr-[8px]` + hy + Fy; else `${y1} pr-[16px]` + hy.
 * No Ub task store → no `openTasksPaneAtTask`; `onOpen` is Tasks pane (`s===undefined ? n("tasks")`).
 * Skip Nm/jm agent chips / elapsed (no workflowProgress).
 */

import {
  OFFICIAL_ARTIFACT_KX_CLICKABLE,
  OFFICIAL_ARTIFACT_KX_SURFACE,
} from "./officialArtifactSurface";

export const OFFICIAL_WORKFLOW_KIND = "workflow" as const;
export const OFFICIAL_WORKFLOW_TOOL_NAME = "Workflow" as const;

export const OFFICIAL_WORKFLOW_SOURCE_CD5A = "cd5a31703-B4nKQMBN.js";
export const OFFICIAL_WORKFLOW_SOURCE_C52B = "c52b02f3f-DbJ5Omt6.js";
export const OFFICIAL_WORKFLOW_SOURCE_C722 = "c7226f7ba-237meNQr.js";
export const OFFICIAL_WORKFLOW_SOURCE_C425 = "c425fb3cf-C8q5-d1_.js";

/** c52b `H.Workflow` / `U.Workflow` / `W.Workflow`. */
export const OFFICIAL_WORKFLOW_RUNNING_ID = "5ERbNHcYuQ";
export const OFFICIAL_WORKFLOW_RAN_ID = "cvADfWAsqS";
export const OFFICIAL_WORKFLOW_FAILED_RUN_ID = "qUEcKqfGhB";

/** cd5a C0e footnotes / aria. */
export const OFFICIAL_WORKFLOW_STARTING_ID = "h80VjAcT3+";
export const OFFICIAL_WORKFLOW_FOOTNOTE_ID = "pv1lF7n7cd";
export const OFFICIAL_WORKFLOW_VIEW_DESCRIBED_ID = "bbTYecAUn+";
export const OFFICIAL_WORKFLOW_VIEW_ID = "8vTH0UDtIN";

/** cd5a E1 / Zg settled badges. */
export const OFFICIAL_WORKFLOW_STOPPED_ID = "1LBny5MvRa";
export const OFFICIAL_WORKFLOW_FAILED_ID = "vXCeIi67rj";

/** c425 `R` as cd5a `Ay`/`p` — C0e 318px isolate (`pl-lg py-2.5`), not kX `z`. */
export const OFFICIAL_WORKFLOW_C0E_AY =
  "relative isolate flex self-start min-w-[318px] max-w-[318px] items-start gap-xs rounded-lg pl-lg py-2.5 text-left text-pretty";
/** cd5a `y1`. */
export const OFFICIAL_WORKFLOW_C0E_Y1 = `group/tool my-[6px] ${OFFICIAL_WORKFLOW_C0E_AY}`;
export const OFFICIAL_WORKFLOW_C0E_CLICKABLE = OFFICIAL_ARTIFACT_KX_CLICKABLE;
export const OFFICIAL_WORKFLOW_C0E_SURFACE = OFFICIAL_ARTIFACT_KX_SURFACE;
/** c425 `s`/`My` on E1 settled row (c8ba `n`). */
export const OFFICIAL_WORKFLOW_E1_MY =
  "[--cds-assistant-message-text-inset:0px] [--cds-assistant-message-text-stop:0px]";
export const OFFICIAL_WORKFLOW_E1_ROW =
  `relative flex self-start max-w-full items-center py-0 gap-0.75 text-left rounded-sm ${OFFICIAL_WORKFLOW_E1_MY}`;

const GFE_SCRIPT_META_NAME = /\bmeta\s*=\s*\{[^}]*?\bname\s*:\s*['"]([^'"]+)['"]/;
const GFE_SCRIPT_SLICE = 4096;

export type OfficialWorkflowSurfaceTool = {
  id?: string;
  input: Record<string, unknown>;
  interrupted?: boolean;
  isError?: boolean;
  name: string;
  status?: string;
};

export type OfficialWorkflowSurfaceStatus = "completed" | "failed" | "running" | "stopped";

export type OfficialWorkflowSurfaceModel = {
  compact: boolean;
  failed: boolean;
  isPreLaunch: boolean;
  running: boolean;
  status: OfficialWorkflowSurfaceStatus;
  stopped: boolean;
  title: string;
};

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function basenameFromPath(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "");
  const slash = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
}

/**
 * Official c7226f7ba `r` exported as `Gfe`/`t`:
 * `input.name`, else `script` `meta.name` (first 4096 chars), else `scriptPath` basename (`zp`).
 * C0e also falls back to `description`; product `title` is the same Gfe string field family.
 */
export function officialWorkflowTitle(input: Record<string, unknown> | undefined): string {
  if (!input) return "";
  const named = stringField(input.name) ?? stringField(input.description) ?? stringField(input.title);
  if (named) return named;
  if (typeof input.script === "string") {
    const match = input.script.slice(0, GFE_SCRIPT_SLICE).match(GFE_SCRIPT_META_NAME);
    if (match?.[1]) return match[1];
  }
  if (typeof input.scriptPath === "string" && input.scriptPath) {
    return basenameFromPath(input.scriptPath);
  }
  return "";
}

export function isOfficialWorkflowTool(name: string | undefined): boolean {
  return name === OFFICIAL_WORKFLOW_TOOL_NAME;
}

/** cd5a `T1`. */
export function officialWorkflowT1(tool: { name: string; status?: string }): boolean {
  return tool.name === OFFICIAL_WORKFLOW_TOOL_NAME && tool.status !== "awaiting_approval" && tool.status !== "error";
}

function officialWorkflowSyntheticStatus(tool: OfficialWorkflowSurfaceTool): OfficialWorkflowSurfaceStatus {
  if (tool.isError === true || tool.status === "error" || tool.status === "failed") return "failed";
  if (tool.status === "stopped" || tool.interrupted === true) return "stopped";
  if (tool.status === "completed") return "completed";
  return "running";
}

/**
 * Compact when `!inGroup && (f || m)` (cd5a E1). Without Ub, `f` is true for any
 * non-completed / non-error tool — running compact still `isPreLaunch` (`h80VjAcT3+`).
 * `pv1lF7n7cd` is the launched (Ub) footnote; empty counts OK (no Nm/jm).
 */
export function extractOfficialWorkflowSurface(
  tool: OfficialWorkflowSurfaceTool,
  inGroup = false,
): OfficialWorkflowSurfaceModel | null {
  if (!isOfficialWorkflowTool(tool.name)) return null;
  const title = officialWorkflowTitle(tool.input);
  const status = officialWorkflowSyntheticStatus(tool);
  const running = status === "running";
  const failed = status === "failed";
  const stopped = status === "stopped";
  const completed = status === "completed";
  const isPreLaunch = !completed && !failed && tool.status !== "error";
  const compact = officialWorkflowT1(tool) && !inGroup && (isPreLaunch || running);
  return {
    compact,
    failed,
    isPreLaunch,
    running,
    status,
    stopped,
    title,
  };
}

export function officialWorkflowSettledVerb(running: boolean): { id: string; text: string } {
  if (running) return { id: OFFICIAL_WORKFLOW_RUNNING_ID, text: "Running workflow" };
  return { id: OFFICIAL_WORKFLOW_RAN_ID, text: "Ran workflow" };
}

export function officialWorkflowCompactFootnote(isPreLaunch: boolean): { id: string; text: string } {
  if (isPreLaunch) return { id: OFFICIAL_WORKFLOW_STARTING_ID, text: "Starting workflow" };
  return { id: OFFICIAL_WORKFLOW_FOOTNOTE_ID, text: "Workflow" };
}

export function officialWorkflowViewLabel(title: string): { id: string; text: string } {
  if (title !== "") {
    return { id: OFFICIAL_WORKFLOW_VIEW_DESCRIBED_ID, text: `View workflow: ${title}` };
  }
  return { id: OFFICIAL_WORKFLOW_VIEW_ID, text: "View workflow" };
}
