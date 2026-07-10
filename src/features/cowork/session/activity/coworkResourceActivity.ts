import type { ChatMessage, SessionSummary } from "../../../../adapters/desktopBridge/types";
import { coworkContextResourceOperations, isCoworkUserFolderResource } from "./coworkResourcePaths";
import { coworkResourceActivityFromTool, rawCoworkToolUses } from "./coworkResourceFromTool";
import type { CoworkResourceActivity, CoworkResourceOperation, CoworkResourceSections } from "./coworkResourceTypes";

export type {
  CoworkResourceActivity,
  CoworkResourceCategory,
  CoworkResourceOperation,
  CoworkResourceSections,
} from "./coworkResourceTypes";
export { coworkChromeMcpServerUuid, isCoworkChromeMcpServer } from "./coworkResourceFromTool";

export function parseCoworkResourceActivity(messages: ChatMessage[]): CoworkResourceActivity[] {
  const resources = new Map<string, CoworkResourceActivity>();
  messages.forEach((message, messageIndex) => {
    for (const tool of rawCoworkToolUses(message)) {
      const activity = coworkResourceActivityFromTool(message, messageIndex, tool);
      if (!activity) continue;
      const existing = resources.get(activity.filePath);
      if (!existing || existing.timestamp <= activity.timestamp) resources.set(activity.filePath, activity);
    }
  });
  return [...resources.values()].sort((left, right) => right.timestamp - left.timestamp);
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

export function coworkSessionFolders(session: SessionSummary | null) {
  const folders = session?.folders?.filter(Boolean) ?? [];
  return folders.length > 0 ? folders : session?.cwd ? [session.cwd] : [];
}

export function coworkFolderSectionTitle(folders: string[]) {
  void folders;
  return "工作文件夹";
}
