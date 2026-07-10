export type CoworkOpenFileTarget = {
  path: string;
};

export type CoworkTaskStatus = "completed" | "failed" | "running" | "stopped";

export type CoworkBackgroundTask = {
  description: string;
  status: CoworkTaskStatus;
  taskId: string;
  workflowProgress?: Array<{
    index: number;
    label: string;
    state: "done" | "error" | "pending" | "running" | "start";
    title?: string;
    type: "agent" | "workflow_phase";
  }>;
};

export type CoworkTodoItem = {
  content: string;
  id: string;
  status: "completed" | "in_progress" | "pending";
};
