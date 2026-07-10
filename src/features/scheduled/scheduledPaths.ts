export const scheduledTaskIndexPath = "/code/scheduled";

export function scheduledTaskDetailPath(taskId: string) {
  return `${scheduledTaskIndexPath}/${encodeURIComponent(taskId)}`;
}

export function scheduledTaskNewPath() {
  return `${scheduledTaskIndexPath}/new`;
}
