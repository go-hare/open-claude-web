import type { CoworkDetectedFile, CoworkSessionSnapshot } from "../../../../adapters/desktopBridge/types";
import type { CoworkRawMessage } from "../types";
import {
  basename,
  coworkContextResourceOperations,
  isCoworkUserFolderResource,
  normalizeCoworkPath,
} from "./coworkResourcePaths";
import {
  collectCoworkToolResults,
  coworkResourceActivitiesFromTool,
  createCoworkResourceActivity,
  rawCoworkToolUses,
  type CoworkResourceActivityOptions,
} from "./coworkResourceFromTool";
import type { CoworkResourceActivity, CoworkResourceOperation, CoworkResourceSections } from "./coworkResourceTypes";

export type {
  CoworkResourceActivity,
  CoworkResourceCategory,
  CoworkResourceOperation,
  CoworkResourceSections,
} from "./coworkResourceTypes";
export { coworkChromeMcpServerUuid, isCoworkChromeMcpServer } from "./coworkResourceFromTool";

export function parseCoworkResourceActivity(
  messages: CoworkRawMessage[],
  options: CoworkResourceActivityOptions = {},
): CoworkResourceActivity[] {
  const toolResults = collectCoworkToolResults(messages);
  const resources: CoworkResourceActivity[] = [];
  messages.forEach((message, messageIndex) => {
    for (const tool of rawCoworkToolUses(message)) {
      resources.push(...coworkResourceActivitiesFromTool(
        message,
        messageIndex,
        tool,
        toolResults.get(tool.id),
        options,
      ));
    }
  });
  return resources.sort((left, right) => left.timestamp - right.timestamp);
}

/**
 * Official activity merge (index-BELzQL5P ~60258): append fs_detected rows for host paths
 * not already covered by write/edit/create (or memory non-read) tool activity.
 */
export function mergeCoworkFsDetectedActivity(
  resources: CoworkResourceActivity[],
  detected: CoworkDetectedFile[] | Map<string, CoworkDetectedFile> | null | undefined,
): CoworkResourceActivity[] {
  if (!detected) return resources;
  const entries = detected instanceof Map ? [...detected.values()] : detected;
  if (!entries.length) return resources;
  // Official: cover write/edit/create, and memory only when fileOperation !== "read".
  // Our tool path sets memory for Read on CLAUDE.md etc. without fileOperation → do not cover.
  const covered = new Set<string>();
  for (const resource of resources) {
    if (resource.operation === "write" || resource.operation === "edit" || resource.operation === "create") {
      covered.add(resource.filePath);
    }
  }
  const extras: CoworkResourceActivity[] = [];
  for (const file of entries) {
    if (!file.hostPath || covered.has(file.hostPath)) continue;
    extras.push(createCoworkResourceActivity({
      fileName: file.fileName,
      filePath: file.hostPath,
      latestId: `fs-${file.hostPath}-${file.timestamp}`,
      operation: "fs_detected",
      timestamp: file.timestamp,
      toolName: "fs_detected",
    }));
  }
  if (!extras.length) return resources;
  return [...resources, ...extras].sort((left, right) => left.timestamp - right.timestamp);
}

export function splitCoworkResourceSections(resources: CoworkResourceActivity[], folders: string[]): CoworkResourceSections {
  const workingResources: CoworkResourceActivity[] = [];
  const scratchpadResources: CoworkResourceActivity[] = [];
  const contextResources: CoworkResourceActivity[] = [];
  for (const resource of resources) {
    if (coworkContextResourceOperations.has(resource.operation)) contextResources.push(resource);
    else if (isCoworkUserFolderResource(resource.filePath, folders)) workingResources.push(resource);
    else if (resource.categoryKey === "working") scratchpadResources.push(resource);
    else if (resource.categoryKey !== "internal") contextResources.push(resource);
  }
  return { contextResources, scratchpadResources, workingResources };
}

export function coworkResourceOperationLabel(operation: CoworkResourceOperation) {
  const labels: Record<CoworkResourceOperation, string> = {
    cli_tool: "ran",
    command_invoked: "invoked",
    create: "created",
    edit: "edited",
    fs_detected: "updated",
    mcp_tool: "used",
    memory: "referenced",
    read: "viewed",
    skill_invoked: "invoked",
    web_search: "searched",
    write: "wrote to",
  };
  return labels[operation];
}

/**
 * Official activity panel xQt (index-BELzQL5P) roots Browse files / Working folder
 * on session.userSelectedFolders — real host paths the user attached.
 * `cwd` on LocalAgentMode sessions is virtual (`/sessions/<uuid>`) and must not be
 * treated as a listable host root (listFilesInFolder would return empty).
 */
export function coworkSessionFolders(session: CoworkSessionSnapshot | null) {
  const selected = uniqueCoworkFolderPaths(session?.userSelectedFolders);
  if (selected.length > 0) return selected;
  const folders = uniqueCoworkFolderPaths(session?.folders);
  if (folders.length > 0) return folders;
  const cwd = session?.cwd?.trim();
  if (cwd && !isVirtualCoworkSessionCwd(cwd)) return [cwd];
  return [];
}

export function coworkFolderSectionTitle(folders: string[]) {
  // Official xQt: single folder → basename (Y8); multi → "Working folders"; none → "Working folder".
  if (folders.length === 1) {
    const name = basename(folders[0]);
    return name || folders[0] || "工作文件夹";
  }
  return "工作文件夹";
}

function uniqueCoworkFolderPaths(paths: string[] | null | undefined) {
  if (!paths?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const path of paths) {
    if (!path) continue;
    const key = normalizeCoworkPath(path);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(path);
  }
  return out;
}

function isVirtualCoworkSessionCwd(cwd: string) {
  return /^\/sessions\//i.test(normalizeCoworkPath(cwd));
}
