import type {
  DesktopBridge,
  DesktopPreferences,
  ScheduledTaskSummary,
  SessionSummary,
  StartSessionInput,
  WorkspaceContext,
} from "./types";

const now = Date.now();

const sessions: SessionSummary[] = [
  {
    id: "cowork_downloads",
    title: "Organize Downloads folder",
    updatedAt: "刚刚",
    updatedAtMs: now,
    kind: "epitaxy",
    sessionKind: "cowork",
    cwd: "/Users/apple/Downloads",
    repo: {
      name: "Gateway",
      branch: "main",
    },
    isPinned: false,
    isRunning: false,
    isUnread: false,
    messages: [
      {
        id: "m1",
        role: "user",
        text: "Organize Downloads folder",
        createdAt: "刚刚",
      },
    ],
  },
  {
    id: "cowork_untitled",
    title: "Untitled",
    updatedAt: "今天",
    updatedAtMs: now - 1000 * 60 * 28,
    kind: "epitaxy",
    sessionKind: "cowork",
    cwd: "/Users/apple/Desktop",
    repo: {
      name: "Gateway",
      branch: "main",
    },
    isPinned: false,
    isRunning: false,
    isUnread: false,
    messages: [],
  },
  ...Array.from({ length: 14 }, (_, index): SessionSummary => ({
    id: `code_demo_${index}`,
    title: index === 1 ? "Coding Session 2" : index === 7 ? "2" : "General coding session",
    updatedAt: index < 2 ? "刚刚" : "今天",
    updatedAtMs: now - 1000 * 60 * (index + 1) * 13,
    kind: "code",
    sessionKind: "code",
    cwd: "/Users/apple/Downloads/Claude code 汉化mac桌面版/claude-ion-react-workbench/claude-deepseek-react-shell",
    repo: {
      name: "claude-desktop",
      branch: "main",
    },
    isPinned: false,
    isRunning: false,
    isUnread: false,
    messages: [
      {
        id: `code_m_${index}`,
        role: "user",
        text: "General coding session",
        createdAt: "今天",
      },
    ],
  })),
];

const scheduledTasks: ScheduledTaskSummary[] = [];

const preferencesListeners = new Set<(preferences: DesktopPreferences) => void>();

let preferences: DesktopPreferences = {
  autoCreatePullRequests: false,
  autoUpdateExtensions: true,
  bypassPermissionsModeEnabled: false,
  ccBranchPrefix: "claude",
  chillingSlothLocation: "default",
  coworkSpaceContextEnabled: false,
  dockBounceEnabled: false,
  enabledCoworkMemory: true,
  keepAwakeEnabled: false,
  launchEnabled: false,
  launchPreviewPersistSession: false,
  menuBarEnabled: true,
  quickEntryShortcut: "",
  useBuiltInNodeForMcp: true,
};

const emitPreferences = () => {
  const snapshot = { ...preferences };
  preferencesListeners.forEach((listener) => listener(snapshot));
};

const workspace: WorkspaceContext = {
  mode: "local",
  projectName: "claude-desktop",
  branchName: "main",
  hasWorktree: true,
  cwd: "/Users/apple/work-py/hare-code/claude-code",
};

const titleFromPrompt = (prompt: string) => {
  const firstLine = prompt.trim().split("\n")[0] ?? "新会话";
  return firstLine.length > 24 ? `${firstLine.slice(0, 24)}…` : firstLine || "新会话";
};

const createSessionBridge = (targetKind: SessionSummary["kind"]): DesktopBridge["LocalSessions"] => ({
  list: async () => sessions.filter((session) => session.kind === targetKind),
  getSession: async (id) => sessions.find((session) => session.id === id && session.kind === targetKind) ?? null,
  getTranscript: async (id) => sessions.find((session) => session.id === id && session.kind === targetKind)?.messages ?? [],
  getGitDiff: async () => ({ ok: true, success: true, stdout: "", stderr: "" }),
  getGitDiffStats: async () => ({ ok: true, success: true, stdout: "", stderr: "" }),
  getWorkingTreeStatus: async () => ({ ok: true, success: true, stdout: "", stderr: "" }),
  startShellPty: async () => ({ ok: true, buffered: "" }),
  stopShellPty: async () => {},
  writeShellPty: async () => {},
  resizeShellPty: async () => {},
  getShellPtyBuffer: async () => "",
  onShellPtyEvent: () => () => {},
  start: async (input: StartSessionInput) => {
    const created: SessionSummary = {
      id: `${targetKind === "epitaxy" ? "local" : "code"}_${Date.now()}`,
      title: titleFromPrompt(input.prompt),
      updatedAt: "刚刚",
      updatedAtMs: Date.now(),
      kind: targetKind,
      sessionKind: targetKind === "epitaxy" ? "cowork" : "code",
      cwd: input.workspace.cwd,
      repo: {
        name: input.workspace.projectName,
        branch: input.workspace.branchName,
      },
      isRunning: false,
      messages: [
        {
          id: `user_${Date.now()}`,
          role: "user",
          text: input.prompt,
          createdAt: "刚刚",
        },
        {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          text: "LocalSessions.start 返回后这里接入原事件流。",
          createdAt: "刚刚",
        },
      ],
    };
    sessions.unshift(created);
    return created;
  },
  sendMessage: async (id, text) => {
    const index = sessions.findIndex((session) => session.id === id && session.kind === targetKind);
    if (index < 0) return null;
    const message = {
      id: `user_${Date.now()}`,
      role: "user" as const,
      text,
      createdAt: new Date().toISOString(),
    };
    sessions[index] = {
      ...sessions[index],
      updatedAt: "刚刚",
      updatedAtMs: Date.now(),
      messages: [...(sessions[index].messages ?? []), message],
    };
    return sessions[index];
  },
  create: async (kind) => ({
    id: `${targetKind}_${Date.now()}`,
    title: "新会话",
    updatedAt: "刚刚",
    updatedAtMs: Date.now(),
    kind,
    sessionKind: kind === "epitaxy" ? "cowork" : "code",
  }),
  archive: async (id) => {
    const index = sessions.findIndex((session) => session.id === id && session.kind === targetKind);
    if (index >= 0) sessions[index] = { ...sessions[index], isArchived: true };
  },
  delete: async (id) => {
    const index = sessions.findIndex((session) => session.id === id && session.kind === targetKind);
    if (index >= 0) sessions.splice(index, 1);
  },
  setFocusedSession: async () => {},
});

export const fakeDesktopBridge: DesktopBridge = {
  LocalSessions: createSessionBridge("epitaxy"),
  LocalAgentModeSessions: createSessionBridge("code"),
  CCDScheduledTasks: {
    list: async () => scheduledTasks.slice(),
    get: async (id) => scheduledTasks.find((task) => task.id === id) ?? null,
    create: async (input) => {
      const task: ScheduledTaskSummary = {
        id: input.name,
        title: input.name,
        schedule: input.cronExpression ?? "Manual",
        enabled: true,
        description: input.description,
        prompt: input.prompt,
        cronExpression: input.cronExpression,
        cwd: input.cwd,
        permissionMode: input.permissionMode,
        model: input.model,
        useWorktree: input.useWorktree,
        sourceBranch: input.sourceBranch,
      };
      scheduledTasks.unshift(task);
      return task;
    },
    updateStatus: async (id, status) => {
      const index = scheduledTasks.findIndex((task) => task.id === id);
      if (index < 0) return;
      if (status === "deleted") {
        scheduledTasks.splice(index, 1);
        return;
      }
      scheduledTasks[index] = {
        ...scheduledTasks[index],
        enabled: status === "enabled",
      };
    },
  },
  Preferences: {
    getWorkspaceContext: async () => workspace,
    getPreferences: async () => ({ ...preferences }),
    setPreference: async (key, value) => {
      preferences = { ...preferences, [key]: value };
      emitPreferences();
    },
    onPreferencesChanged: (listener) => {
      preferencesListeners.add(listener);
      return () => preferencesListeners.delete(listener);
    },
    getDirectoryPath: async () => [workspace.cwd ?? "/Users/apple/work-py/hare-code/claude-code"],
  },
  Window: {
    close: async () => {},
    getFullscreen: async () => false,
    getZoomFactor: async () => 1,
  },
};
