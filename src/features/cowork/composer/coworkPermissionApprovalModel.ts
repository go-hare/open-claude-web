import type { CoworkPermissionRequest } from "../session/coworkPermissionTypes";

export type CoworkPermissionApprovalKind =
  | "artifact"
  | "browser"
  | "computer-access"
  | "computer-enable"
  | "computer-tcc"
  | "computer-teach"
  | "directory"
  | "file-delete"
  | "generic"
  | "launch-code"
  | "save-skill"
  | "scheduled-task"
  | "web-fetch";

export type VisibleCoworkPermission = {
  duplicateRequestIds: string[];
  request: CoworkPermissionRequest;
};

export function coworkPermissionApprovalKind(toolName: string): CoworkPermissionApprovalKind {
  if (toolName === "mcp__cowork__request_cowork_directory") return "directory";
  if (toolName === "mcp__cowork__allow_cowork_file_delete") return "file-delete";
  if (toolName === "mcp__cowork__launch_code_session") return "launch-code";
  if (toolName.includes("create_scheduled_task") || toolName.includes("update_scheduled_task")) {
    return "scheduled-task";
  }
  if (toolName === "mcp__cowork__create_artifact" || toolName === "mcp__cowork__update_artifact") {
    return "artifact";
  }
  if (toolName.includes("save_skill")) return "save-skill";
  if (toolName.startsWith("browser:")) return "browser";
  if (toolName.startsWith("webfetch:")) return "web-fetch";
  if (toolName === "computer:request_teach_access") return "computer-teach";
  if (toolName === "computer:request_access") return "computer-access";
  return "generic";
}

/**
 * Official Age residual (index-BELzQL5P):
 *   featureDisabled → Uge (ComputerUseEnablePanel)
 *   tccState → Fge (ComputerUseTccPanel)
 *   else → Oge (ComputerUseAppListPanel)
 */
export function coworkComputerAccessApprovalKind(
  input: Record<string, unknown> | undefined,
): "computer-enable" | "computer-tcc" | "computer-access" {
  if (input?.featureDisabled === true) return "computer-enable";
  if (input?.tccState !== undefined) return "computer-tcc";
  return "computer-access";
}

export function coworkPermissionApprovalKindFromRequest(
  request: Pick<CoworkPermissionRequest, "toolName" | "input">,
): CoworkPermissionApprovalKind {
  if (request.toolName === "computer:request_access") {
    return coworkComputerAccessApprovalKind(request.input);
  }
  return coworkPermissionApprovalKind(request.toolName);
}

/**
 * Official getToolApprovalState residual (index-BELzQL5P ~40191):
 *   coworkWriteToolWarning = mode === "cowork" && annotations.readOnlyHint !== true
 * Generic approval is only mounted on the Cowork session path (mode residual = cowork).
 * Undefined readOnlyHint → true (same as official `!0 !== undefined`).
 */
export function coworkWriteToolWarningFromRequest(
  request: Pick<CoworkPermissionRequest, "annotations" | "readOnlyHint">,
): boolean {
  if (request.readOnlyHint === true) return false;
  if (request.annotations?.readOnlyHint === true) return false;
  return true;
}

export function visibleCoworkPermissions(requests: CoworkPermissionRequest[]): VisibleCoworkPermission[] {
  const browserRequestByDomain = new Map<string, VisibleCoworkPermission>();
  const visible: VisibleCoworkPermission[] = [];
  for (const request of requests) {
    if (isHiddenPermission(request)) continue;
    const domain = browserDomain(request);
    const duplicate = domain ? browserRequestByDomain.get(domain) : undefined;
    if (duplicate) {
      duplicate.duplicateRequestIds.push(request.requestId);
      continue;
    }
    const entry = { duplicateRequestIds: [], request };
    visible.push(entry);
    if (domain) browserRequestByDomain.set(domain, entry);
  }
  return visible;
}

function browserDomain(request: CoworkPermissionRequest) {
  if (coworkPermissionApprovalKind(request.toolName) !== "browser") return undefined;
  return typeof request.input.domain === "string" ? request.input.domain : undefined;
}

function isHiddenPermission(request: CoworkPermissionRequest) {
  return request.toolName.includes("AskUserQuestion")
    || request.toolName.includes("show_onboarding_role_picker");
}
