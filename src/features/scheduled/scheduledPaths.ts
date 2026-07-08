export const scheduledTaskIndexPath = "/scheduled-task";

export function scheduledTaskDetailPath(taskId: string) {
  return `${scheduledTaskIndexPath}/${encodeURIComponent(taskId)}`;
}

export function scheduledTaskNewPath() {
  return `${scheduledTaskIndexPath}/new`;
}
