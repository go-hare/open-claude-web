import type {
  ChatMessage,
  ConnectedBrowser,
  ConnectedOfficeFile,
  CoworkSessionsBridge,
  CoworkSpaceSummary,
  DesktopBridge,
  DesktopPreferences,
  LocalFileEntry,
  ScheduledTaskSummary,
  ScheduledTasksBridge,
  SessionSummary,
  StartSessionInput,
  WorkspaceContext,
} from "./types";
import { createMessageUuid } from "./messageUuid";
import coworkOfficialFixtures from "../../fixtures/coworkOfficialFixtures.json";

const now = Date.now();

const coworkFixture = coworkOfficialFixtures as {
  messages: ChatMessage[];
  scheduledTasks: ScheduledTaskSummary[];
  sessions: Array<Pick<SessionSummary, "id" | "title" | "updatedAtMs"> & Partial<SessionSummary>>;
  spaces: CoworkSpaceSummary[];
};

type FakeSessionKind = "code" | "epitaxy";
type FakeEventListener = (event: unknown) => void;

const fakeSessionEvents: Record<FakeSessionKind, {
  events: Set<FakeEventListener>;
  permissionRequests: Set<FakeEventListener>;
}> = {
  code: { events: new Set(), permissionRequests: new Set() },
  epitaxy: { events: new Set(), permissionRequests: new Set() },
};

const fakePermissionSessionByRequestId = new Map<string, string>();

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function joinPath(parentPath: string, name: string) {
  const separator = parentPath.includes("\\") && !parentPath.includes("/") ? "\\" : "/";
  return `${parentPath.replace(/[\\/]+$/, "")}${separator}${name}`;
}

function decodeFakeFilePath(filePathOrSessionId: string, encodedFilePath?: string) {
  if (!encodedFilePath) return filePathOrSessionId;
  try {
    return decodeURIComponent(encodedFilePath);
  } catch {
    return encodedFilePath;
  }
}

function fakeFolderEntries(folderPath: string): LocalFileEntry[] {
  if (folderPath.endsWith("runtime-assets")) {
    return [
      { name: "notes.md", path: joinPath(folderPath, "notes.md"), isDirectory: false, isFile: true, size: 256 },
    ];
  }
  return [
    { name: "sample.txt", path: joinPath(folderPath, "sample.txt"), isDirectory: false, isFile: true, size: 128 },
    { name: "runtime-assets", path: joinPath(folderPath, "runtime-assets"), isDirectory: true, isFile: false },
  ];
}

function notifyFakeListeners(listeners: Set<FakeEventListener>, event: unknown) {
  for (const listener of Array.from(listeners)) listener(event);
}

export function emitFakeLocalSessionEvent(event: unknown, kind: FakeSessionKind = "code") {
  notifyFakeListeners(fakeSessionEvents[kind].events, event);
}

export function emitFakeToolPermissionRequest(event: unknown, kind: FakeSessionKind = "code") {
  const raw = asRecord(event);
  const request = asRecord(raw.request);
  const requestId = stringValue(request.requestId) ?? stringValue(request.request_id) ?? stringValue(raw.requestId);
  const sessionId = stringValue(request.sessionId) ?? stringValue(request.session_id) ?? stringValue(raw.sessionId);
  if (requestId && sessionId) fakePermissionSessionByRequestId.set(requestId, sessionId);
  notifyFakeListeners(fakeSessionEvents[kind].permissionRequests, event);
  notifyFakeListeners(fakeSessionEvents[kind].events, event);
}

export function getFakeSessionListenerCounts(kind: FakeSessionKind = "code") {
  return {
    events: fakeSessionEvents[kind].events.size,
    permissionRequests: fakeSessionEvents[kind].permissionRequests.size,
  };
}

function fakeSessionKind(targetKind: SessionSummary["kind"]): FakeSessionKind {
  return targetKind === "epitaxy" ? "epitaxy" : "code";
}

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
    pendingToolPermissions: [
      {
        input: {
          taskId: "review-launch-risks",
          description: "Review launch risks and owners",
          prompt: "Review the launch brief, update the risk register, and notify each owner about unresolved blockers.",
          cronExpression: "0 9 * * 1",
        },
        requestId: "permission-schedule",
        sessionId: "cowork_downloads",
        toolName: "create_scheduled_task",
        toolUseId: "tool-schedule"
      },
    ],
    messages: coworkFixture.messages,
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
  ...coworkFixture.sessions.slice(1).map((session): SessionSummary => ({
    ...session,
    updatedAt: "刚刚",
    kind: "epitaxy",
    sessionKind: "cowork",
    messages: session.id === "cowork_official_error" ? [fakeCoworkStatusUserMessage(session.id, "Review the failure and reconnect.")] : [],
  })),
  fakeCoworkStatusSession("cowork_official_compacting", "Compact project research", {
    type: "system",
    subtype: "status",
    status: "compacting",
    statusMessage: "Compacting our conversation so we can keep chatting...",
  }),
  fakeCoworkStatusSession("cowork_official_retry", "Retry customer data source", {
    type: "system",
    subtype: "api_retry",
    attempt: 2,
    max_retries: 5,
    retry_delay_ms: 15000,
  }),
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
    messages: index === 0 ? buildFakeTranscript(index) : [
      {
        id: `code_m_${index}`,
        role: "user",
        text: "General coding session",
        createdAt: "今天",
        raw: { type: "user", timestamp: new Date(now - 1000 * 60 * (index + 1) * 13).toISOString(), message: { content: "General coding session" } },
      },
    ],
  })),
];

function fakeCoworkStatusSession(id: string, title: string, status: Record<string, unknown>): SessionSummary {
  return {
    id,
    title,
    updatedAt: "刚刚",
    updatedAtMs: now - 1000 * 60 * 4,
    kind: "epitaxy",
    sessionKind: "cowork",
    isRunning: true,
    messages: [fakeCoworkStatusUserMessage(id, title), {
      id: `${id}-status`,
      role: "system",
      text: "",
      createdAt: new Date().toISOString(),
      raw: status,
    }],
  };
}

function fakeCoworkStatusUserMessage(id: string, text: string): ChatMessage {
  return {
    id: `${id}-user`,
    role: "user",
    text,
    createdAt: new Date().toISOString(),
    raw: { type: "user", uuid: `${id}-user`, message: { role: "user", content: [{ type: "text", text }] } },
  };
}


function buildFakeTranscript(index: number) {
  const timestamp = new Date(now - 1000 * 60 * (index + 1) * 13).toISOString();
  return [
    {
      id: `code_m_${index}_user`,
      role: "user" as const,
      text: "General coding session",
      createdAt: "今天",
      raw: { type: "user", timestamp, message: { content: "General coding session" } },
    },
    {
      id: `code_m_${index}_task`,
      role: "system" as const,
      text: "",
      createdAt: timestamp,
      raw: {
        type: "system",
        subtype: "task_notification",
        task_id: `fake-task-${index}`,
        task_type: "local_bash",
        description: "Run project checks",
        status: "completed",
        summary: "Verified the local shell bridge and side pane wiring.",
        last_tool_name: "Bash",
        usage: { duration_ms: 4200, total_tokens: 1280, tool_uses: 2 },
        timestamp,
      },
    },
    {
      id: `code_m_${index}_assistant`,
      role: "assistant" as const,
      text: "Proposed plan",
      createdAt: timestamp,
      raw: {
        type: "assistant",
        timestamp,
        message: {
          content: [
            {
              type: "tool_use",
              name: "Write",
              input: {
                file_path: "/Users/apple/Downloads/Claude code 汉化mac桌面版/claude-ion-react-workbench/claude-deepseek-react-shell/.claude/plans/fake-plan.md",
                content: "# Plan\n\n- Inspect official JS\n- Port the same bridge methods\n- Verify in the desktop shell",
              },
            },
            {
              type: "tool_use",
              name: "ExitPlanMode",
              input: { plan: "# Plan\n\n- Inspect official JS\n- Port the same bridge methods\n- Verify in the desktop shell" },
            },
          ],
        },
      },
    },
  ];
}

const scheduledTasks: ScheduledTaskSummary[] = [];
const coworkScheduledTasks: ScheduledTaskSummary[] = coworkFixture.scheduledTasks.map((task) => ({ ...task }));
const coworkSpaces: CoworkSpaceSummary[] = coworkFixture.spaces.map((space) => ({ ...space }));

function createFakeScheduledTasksBridge(items: ScheduledTaskSummary[]): ScheduledTasksBridge {
  return {
    list: async () => items.slice(),
    get: async (id) => items.find((task) => task.id === id) ?? null,
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
        userSelectedFolders: input.userSelectedFolders,
      };
      items.unshift(task);
      return task;
    },
    updateStatus: async (id, status) => {
      const index = items.findIndex((task) => task.id === id);
      if (index < 0) return;
      if (status === "deleted") {
        items.splice(index, 1);
        return;
      }
      items[index] = { ...items[index], enabled: status === "enabled" };
    },
  };
}

const preferencesListeners = new Set<(preferences: DesktopPreferences) => void>();
const fakeConnectedOfficeFileListeners = new Set<(files: ConnectedOfficeFile[]) => void>();

let preferences: DesktopPreferences = {
  allowAllBrowserActions: false,
  autoCreatePullRequests: false,
  autoUpdateExtensions: true,
  bypassPermissionsModeEnabled: false,
  ccAutoArchiveOnPrClose: false,
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
let fakeGlobalShortcut: string | null = null;
let fakeMenuBarEnabled = true;
let fakeStartupOnLoginEnabled = false;
const fakeTrustedFolders = new Set<string>();
const fakeLocalFiles = new Map<string, string>();
let fakeConnectedOfficeFiles: ConnectedOfficeFile[] = [
  {
    id: "fake-office-budget",
    document: "Budget.xlsx",
    path: "/Users/apple/Downloads/Budget.xlsx",
    status: "Connected",
  },
];
let fakeConnectedBrowsers: ConnectedBrowser[] = [
  {
    deviceId: "chrome-work-0001",
    name: "Chrome · Work",
    osPlatform: "macOS",
  },
  {
    deviceId: "chrome-research-0002",
    name: "Chrome · Research",
    osPlatform: "macOS",
  },
];
let fakeSelectedBrowserId: string | null = fakeConnectedBrowsers[0]?.deviceId ?? null;
let fakeBrowserSwitchCount = 0;
let fakeLocalSessionEnvironment: Record<string, string> = {};

const emitPreferences = () => {
  const snapshot = { ...preferences };
  preferencesListeners.forEach((listener) => listener(snapshot));
};

export function setFakeConnectedOfficeFiles(files: ConnectedOfficeFile[]) {
  fakeConnectedOfficeFiles = files;
  fakeConnectedOfficeFileListeners.forEach((listener) => listener(fakeConnectedOfficeFiles.slice()));
}

export function setFakeConnectedBrowsers(browsers: ConnectedBrowser[]) {
  fakeConnectedBrowsers = browsers;
  fakeSelectedBrowserId = browsers.some((browser) => browser.deviceId === fakeSelectedBrowserId) ? fakeSelectedBrowserId : browsers[0]?.deviceId ?? null;
}

export function getFakeBrowserSwitchCount() {
  return fakeBrowserSwitchCount;
}

const workspace: WorkspaceContext = {
  mode: "local",
  projectName: "claude-desktop",
  branchName: "main",
  hasWorktree: false,
  cwd: "/Users/apple/work-py/hare-code/claude-code",
};

function fakeDetectedProjects(targetKind: SessionSummary["kind"]): SessionSummary[] {
  return [
    {
      id: "project_gateway_docs",
      title: "Gateway docs",
      updatedAt: "刚刚",
      updatedAtMs: now,
      kind: targetKind,
      sessionKind: targetKind === "epitaxy" ? "cowork" : "code",
      cwd: "/Users/apple/Downloads",
      folders: ["/Users/apple/Downloads"],
      repo: { name: "Workbench Org", branch: "main" },
    },
    {
      id: "project_claude_desktop",
      title: "Claude Desktop",
      updatedAt: "今天",
      updatedAtMs: now - 1000 * 60 * 8,
      kind: targetKind,
      sessionKind: targetKind === "epitaxy" ? "cowork" : "code",
      cwd: workspace.cwd,
      folders: workspace.cwd ? [workspace.cwd] : [],
      repo: { name: "Workbench Org", branch: workspace.branchName },
    },
  ];
}

const titleFromPrompt = (prompt: string) => {
  const visiblePrompt = prompt.replace(/<uploaded_files>[\s\S]*?<\/uploaded_files>\s*/g, "").trim();
  const firstLine = visiblePrompt.split("\n")[0] ?? "新会话";
  return firstLine.length > 24 ? `${firstLine.slice(0, 24)}…` : firstLine || "新会话";
};

const createSessionBridge = (targetKind: SessionSummary["kind"]): DesktopBridge["LocalSessions"] => ({
  list: async () => sessions.filter((session) => session.kind === targetKind),
  getSession: async (id) => sessions.find((session) => session.id === id && session.kind === targetKind) ?? null,
  getTranscript: async (id) => sessions.find((session) => session.id === id && session.kind === targetKind)?.messages ?? [],
  addFolderToSession: async (id, folder) => {
    const index = sessions.findIndex((session) => session.id === id && session.kind === targetKind);
    if (index < 0) return null;
    const folders = [...new Set([...(sessions[index].folders ?? []), folder])];
    sessions[index] = { ...sessions[index], cwd: sessions[index].cwd ?? folder, folders };
    return sessions[index];
  },
  getCodeStats: async () => buildFakeCodeStats(),
  getDefaultEffort: async () => "medium",
  getDefaultPermissionMode: async () => null,
  getDetectedProjects: async () => fakeDetectedProjects(targetKind),
  getDiffFileContent: async () => null,
  getEffort: async (id) => sessions.find((session) => session.id === id && session.kind === targetKind)?.effort ?? "medium",
  getGitInfo: async (idOrCwd) => ({
    cwd: idOrCwd,
    root: idOrCwd,
    branch: workspace.branchName,
    defaultBranch: workspace.defaultBranch ?? "main",
  }),
  getGitDiff: async () => null,
  getGitDiffStats: async () => ({ ok: true, success: true, stdout: " 2 files changed, 65 insertions(+), 7 deletions(-)\n", stderr: "" }),
  getMergeBase: async () => ({ ok: true, success: true, stdout: "deadbeefcafebabe000000000000000000000001\n", stderr: "" }),
  getLocalBranches: async () => ({ ok: true, success: true, stdout: "* main\n  v3\n  feature/workspace-trust\n", stderr: "" }),
  getPrStateForBranch: async () => null,
  getPrChecks: async () => ({ ok: true, checkRuns: [], status: null }),
  getPrDetails: async () => null,
  generateLocalPrContent: async () => ({
    title: "Update project",
    body: "## Summary\nFake PR body for local bridge.\n",
    branch: workspace.branchName || "feature/workspace-trust",
  }),
  createLocalPr: async () => ({ ok: true, success: true, stdout: "https://github.com/example/repo/pull/1\n", stderr: "" }),
  summarizeSession: async (id) => {
    const session = sessions.find((item) => item.id === id && item.kind === targetKind);
    if (!session) return null;
    if (!session.title || session.title === "General coding session" || session.title === "Coding session" || /^\d+$/.test(session.title)) {
      const firstUser = session.messages?.find((message) => message.role === "user")?.text?.trim();
      if (firstUser) {
        session.title = firstUser.split("\n")[0]!.slice(0, 40);
      }
    }
    // Mirror desktop summarizeSession → session_updated so recents/header listeners refresh.
    emitFakeLocalSessionEvent({ type: "session_updated", sessionId: id, session }, targetKind === "epitaxy" ? "epitaxy" : "code");
    return { summary: session.messages?.map((message) => message.text).join("\n").slice(0, 1000) ?? "", title: session.title, session };
  },
  checkTrust: async (folder) => ({ trusted: fakeTrustedFolders.has(folder), sources: [] }),
  checkRemoteTrust: async () => ({ trusted: false, remote: true, sources: [] }),
  saveTrust: async (folder) => {
    fakeTrustedFolders.add(folder);
    return true;
  },
  openInEditor: async () => true,
  getPermissionMode: async (id) => sessions.find((session) => session.id === id && session.kind === targetKind)?.permissionMode ?? "default",
  getSupportedCommands: async () => [
    { name: "help", description: "Show available slash commands" },
    { name: "compact", description: "Compact conversation history" },
    { name: "model", description: "Set the model for this session", argumentHint: "model-id" },
    {
      name: "schedule",
      description: "Create a scheduled task that can be run on demand or automatically on an interval.",
      scope: "cowork",
    },
    {
      name: "setup-cowork",
      description: "Guided Cowork setup — install a matching plugin, try a skill, connect tools.",
      scope: "cowork",
    },
    {
      name: "consolidate-memory",
      description: "Reflective pass over your memory files — merge duplicates, fix stale facts, prune the index.",
      scope: "cowork",
    },
    { name: "context", description: "Show what's using your context window", scope: "cowork" },
  ],
  getWorkingTreeStatus: async () => ({ ok: true, success: true, stdout: "", stderr: "" }),
  readFileAtCwd: async () => ({ ok: true, success: true, stdout: "", stderr: "" }),
  // Official fe.listSessionDirectory — XC Files browser tree.
  listSessionDirectory: async (id, relative = ".") => {
    const session = sessions.find((item) => item.id === id && item.kind === targetKind);
    // WorkspaceContext uses cwd (not rootPath); avoid Node process in browser tsconfig.
    const root = session?.cwd ?? workspace.cwd ?? "/tmp";
    const abs = relative === "." || !relative
      ? root
      : (relative.startsWith("/") ? relative : `${root.replace(/\/+$/, "")}/${relative.replace(/^\.\//, "")}`);
    const base = abs.replace(/\/+$/, "") || root;
    return [
      { name: "src", path: `${base}/src`, isDirectory: true, isFile: false },
      { name: "README.md", path: `${base}/README.md`, isDirectory: false, isFile: true },
      { name: "package.json", path: `${base}/package.json`, isDirectory: false, isFile: true },
    ];
  },
  // Official getSessionsForScheduledTask — QS/DS Runs pane.
  getSessionsForScheduledTask: async (taskId) => sessions.filter(
    (session) => session.kind === targetKind && session.scheduledTaskId === taskId,
  ),
  readSessionFile: async (_id, filePath) => `Preview for ${filePath}\n\nThis is fake desktop bridge content.`,
  readSessionImageAsDataUrl: async () => null,
  pickSessionFile: async () => "/tmp/preview.txt",
  pickFileAtCwd: async () => "/tmp/preview.txt",
  respondToToolPermission: async (requestId, decision, updatedInput) => {
    const sessionIndex = sessions.findIndex((session) =>
      session.kind === targetKind
      && session.pendingToolPermissions?.some((request) => request.requestId === requestId),
    );
    const sessionId = fakePermissionSessionByRequestId.get(requestId)
      ?? (sessionIndex >= 0 ? sessions[sessionIndex].id : undefined);
    if (sessionIndex >= 0) {
      sessions[sessionIndex] = {
        ...sessions[sessionIndex],
        pendingToolPermissions: sessions[sessionIndex].pendingToolPermissions?.filter((request) => request.requestId !== requestId),
      };
    }
    fakePermissionSessionByRequestId.delete(requestId);
    emitFakeLocalSessionEvent({
      type: "tool_permission_resolved",
      sessionId,
      request: { decision, input: updatedInput, requestId },
    }, fakeSessionKind(targetKind));
    return { decision, ok: true, requestId };
  },
  setEffort: async (id, effort) => {
    const index = sessions.findIndex((session) => session.id === id && session.kind === targetKind);
    if (index < 0) return null;
    sessions[index] = { ...sessions[index], effort };
    return sessions[index];
  },
  setModel: async (id, model) => {
    const index = sessions.findIndex((session) => session.id === id && session.kind === targetKind);
    if (index < 0) return null;
    sessions[index] = { ...sessions[index], model };
    return sessions[index];
  },
  setPermissionMode: async (id, permissionMode) => {
    const index = sessions.findIndex((session) => session.id === id && session.kind === targetKind);
    if (index < 0) return null;
    sessions[index] = { ...sessions[index], permissionMode };
    return sessions[index];
  },
  updateSession: async (id, patch) => {
    const index = sessions.findIndex((session) => session.id === id && session.kind === targetKind);
    if (index < 0) return null;
    sessions[index] = { ...sessions[index], ...patch, updatedAt: "刚刚", updatedAtMs: Date.now() };
    return sessions[index];
  },
  startShellPty: async () => ({ ok: true, buffered: "" }),
  stop: async (id) => {
    const index = sessions.findIndex((session) => session.id === id && session.kind === targetKind);
    if (index >= 0) sessions[index] = { ...sessions[index], isRunning: false };
    return true;
  },
  stopShellPty: async () => {},
  stopTask: async (sessionId, taskId) => {
    const session = sessions.find((item) => item.id === sessionId && item.kind === targetKind);
    const message = session?.messages?.find((item) => item.raw && typeof item.raw === "object" && (item.raw as { task_id?: string }).task_id === taskId);
    if (message?.raw && typeof message.raw === "object") {
      (message.raw as { status?: string }).status = "stopped";
    }
  },
  writeShellPty: async () => {},
  resizeShellPty: async () => {},
  getShellPtyBuffer: async () => "",
  getTranscriptFeedback: async () => [],
  onShellPtyEvent: () => () => {},
  start: async (input: StartSessionInput) => {
    const messageUuid = input.messageUuid ?? createMessageUuid();
    const message = input.message ?? input.prompt;
    const selectedFolders = input.userSelectedFolders?.length ? input.userSelectedFolders : input.workspace.cwd ? [input.workspace.cwd] : [];
    const userMessageRaw = {
      messageUuid,
      ...(input.userSelectedFiles?.length ? { userSelectedFiles: input.userSelectedFiles } : {}),
      ...(selectedFolders.length ? { userSelectedFolders: selectedFolders } : {}),
    };
    const created: SessionSummary = {
      id: input.sessionId ?? `${targetKind === "epitaxy" ? "local" : "code"}_${Date.now()}`,
      title: titleFromPrompt(message),
      updatedAt: "刚刚",
      updatedAtMs: Date.now(),
      kind: targetKind,
      sessionKind: targetKind === "epitaxy" ? "cowork" : "code",
      cwd: input.workspace.cwd,
      folders: selectedFolders,
      userSelectedFolders: selectedFolders,
      mountedProjects: input.mountedProjects,
      effort: input.effort,
      model: input.model,
      permissionMode: input.permissionMode,
      hasWorktree: input.useWorktree,
      scheduledTaskId: input.scheduledTaskId,
      origin: input.origin,
      repo: {
        name: input.workspace.projectName,
        branch: input.sourceBranch ?? input.workspace.branchName,
      },
      isRunning: false,
      messages: [
        {
          id: messageUuid,
          role: "user",
          text: message,
          createdAt: "刚刚",
          raw: userMessageRaw,
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
  forkSession: async (id, messageId) => {
    const source = sessions.find((session) => session.id === id && session.kind === targetKind);
    const messages = source?.messages ? sliceFakeMessagesThroughId(source.messages, messageId) : [];
    const forked: SessionSummary = {
      ...(source ?? {
        title: "Forked session",
        updatedAt: "刚刚",
        updatedAtMs: Date.now(),
        kind: targetKind,
        sessionKind: targetKind === "epitaxy" ? "cowork" : "code",
      }),
      id: `${targetKind}_fork_${Date.now()}`,
      title: source ? `${source.title} fork` : "Forked session",
      updatedAt: "刚刚",
      updatedAtMs: Date.now(),
      isRunning: false,
      messages,
    };
    sessions.unshift(forked);
    return forked;
  },
  rewind: async (id, messageId) => {
    const index = sessions.findIndex((session) => session.id === id && session.kind === targetKind);
    if (index < 0) return false;
    sessions[index] = {
      ...sessions[index],
      isRunning: false,
      messages: sliceFakeMessagesThroughId(sessions[index].messages ?? [], messageId),
      updatedAt: "刚刚",
      updatedAtMs: Date.now(),
    };
    return true;
  },
  sendMessage: async (id, text, input) => {
    const index = sessions.findIndex((session) => session.id === id && session.kind === targetKind);
    if (index < 0) return null;
    const userSelectedFiles = input?.userSelectedFiles?.filter(Boolean) ?? [];
    const messageUuid = input?.messageUuid ?? createMessageUuid();
    const message = {
      id: messageUuid,
      role: "user" as const,
      text,
      createdAt: new Date().toISOString(),
      raw: {
        messageUuid,
        ...(userSelectedFiles.length ? { userSelectedFiles } : {}),
      },
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
  submitTranscriptFeedback: async (_sessionIdOrInput, input) => ({
    ...(input && typeof input === "object" ? input : {}),
    createdAt: new Date().toISOString(),
  }),
  onEvent: (listener) => {
    const bucket = fakeSessionEvents[fakeSessionKind(targetKind)].events;
    bucket.add(listener);
    return () => bucket.delete(listener);
  },
  onToolPermissionRequest: (listener) => {
    const bucket = fakeSessionEvents[fakeSessionKind(targetKind)].permissionRequests;
    bucket.add(listener);
    return () => bucket.delete(listener);
  },
});

function createCoworkSessionBridge(): CoworkSessionsBridge {
  const bridge = createSessionBridge("epitaxy");
  return {
    ...bridge,
    addFolderToSession: async (id, folder) => {
      const session = await bridge.addFolderToSession?.(id, folder);
      return session
        ? { folderPath: folder, ok: true }
        : { error: "Session not found", ok: false };
    },
    addTrustedFolder: async (folder) => {
      fakeTrustedFolders.add(folder);
      return true;
    },
    isFolderTrusted: async (folder) => fakeTrustedFolders.has(folder),
    rewind: async (id, messageId) => {
      const session = await bridge.getSession(id);
      const prompt = session?.messages?.find((message) => message.id === messageId)?.text ?? null;
      const rewound = await bridge.rewind?.(id, messageId);
      return rewound ? prompt : null;
    },
    getRawSession: async (id) => {
      const session = await bridge.getSession(id);
      if (!session) return null;
      return {
        ...session,
        rawBufferedMessages: session.bufferedMessages ?? [],
        rawMessages: session.messages ?? [],
        rawSession: session,
      };
    },
    getRawTranscript: async (id) => await bridge.getTranscript?.(id) ?? [],
  };
}

function buildFakeCodeStats() {
  const today = new Date().toISOString().slice(0, 10);
  const codeSessions = sessions.filter((session) => session.kind === "code");
  const messageCount = codeSessions.reduce((total, session) => total + (session.messages?.length ?? 0), 0);
  const tokenEstimate = Math.max(0, messageCount * 128);
  return {
    dailyActivity: [{ date: today, messageCount, sessionCount: codeSessions.length, toolCallCount: 0 }],
    dailyModelTokens: [{ date: today, tokensByModel: { "opus-4": tokenEstimate } }],
    modelUsage: {
      "opus-4": { cacheCreationInputTokens: 0, cacheReadInputTokens: 0, inputTokens: tokenEstimate, outputTokens: 0 },
    },
    peakActivityHour: new Date().getHours(),
    streaks: { currentStreak: codeSessions.length > 0 ? 1 : 0, longestStreak: codeSessions.length > 0 ? 1 : 0 },
  };
}

function sliceFakeMessagesThroughId(messages: NonNullable<SessionSummary["messages"]>, messageId?: string) {
  if (!messageId) return [...messages];
  const index = messages.findIndex((message) => {
    const raw = typeof message.raw === "object" && message.raw !== null ? message.raw as Record<string, unknown> : {};
    const nested = typeof raw.message === "object" && raw.message !== null ? raw.message as Record<string, unknown> : {};
    return message.id === messageId
      || raw.id === messageId
      || raw.uuid === messageId
      || nested.id === messageId
      || nested.uuid === messageId;
  });
  return index < 0 ? [...messages] : messages.slice(0, index + 1);
}

export const fakeDesktopBridge: DesktopBridge = {
  LocalSessions: createSessionBridge("code"),
  LocalAgentModeSessions: createCoworkSessionBridge(),
  LocalSessionEnvironment: {
    get: async () => ({ ...fakeLocalSessionEnvironment }),
    save: async (env) => {
      fakeLocalSessionEnvironment = { ...env };
      return true;
    },
  },
  Resources: {
    fetchMentionOptions: async () => [],
    searchFileContents: async () => [],
    listProjectFiles: async () => [],
    setFocusedCwd: async () => true,
  },
  BrowserUse: {
    listConnectedBrowsers: async () => fakeConnectedBrowsers.map((browser) => ({ ...browser })),
    selectBrowser: async (deviceId) => {
      const exists = fakeConnectedBrowsers.some((browser) => browser.deviceId === deviceId);
      if (exists) fakeSelectedBrowserId = deviceId;
      return exists;
    },
    switchBrowser: async () => {
      fakeBrowserSwitchCount += 1;
      return true;
    },
    getSelectedBrowserId: async () => fakeSelectedBrowserId,
  },
  CCDScheduledTasks: createFakeScheduledTasksBridge(scheduledTasks),
  CoworkScheduledTasks: createFakeScheduledTasksBridge(coworkScheduledTasks),
  CoworkSpaces: {
    list: async () => coworkSpaces.map((space) => ({ ...space })),
    create: async (input) => {
      const space = {
        id: `space-${Date.now()}`,
        name: input.name,
        description: input.instructions ?? null,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
      };
      coworkSpaces.unshift(space);
      return { ...space };
    },
    createSpaceFolder: async (location, name) => `${location.replace(/[\\/]+$/, "")}/${name}`,
    addFolderToSpace: async () => {},
    onEvent: () => () => {},
  },
  CoworkFilePreview: {
    isEnabled: async () => false,
    isVmReady: async () => false,
    show: async () => false,
    hide: async () => undefined,
    parkAndCapture: async () => null,
  },
  FileSystem: {
    browseFiles: async () => [`${workspace.cwd ?? "/tmp"}/sample.txt`],
    listFilesInFolder: async (_sessionId, folderPath) => fakeFolderEntries(folderPath),
    openLocalFile: async () => ({ ok: true }),
    readLocalFile: async (filePathOrSessionId, encodedFilePath) => {
      const filePath = decodeFakeFilePath(filePathOrSessionId, encodedFilePath);
      return { content: fakeLocalFiles.get(filePath) ?? "", path: filePath };
    },
    showInFolder: async () => true,
    writeLocalFile: async (filePathOrSessionId, encodedFilePathOrData, dataOrOptions) => {
      const hasOfficialPath = typeof dataOrOptions === "string" || dataOrOptions instanceof Uint8Array;
      const filePath = hasOfficialPath ? decodeFakeFilePath(filePathOrSessionId, encodedFilePathOrData) : filePathOrSessionId;
      const data = hasOfficialPath ? dataOrOptions : encodedFilePathOrData;
      const content = data instanceof Uint8Array ? new TextDecoder().decode(data) : String(data ?? "");
      fakeLocalFiles.set(filePath, content);
      return { ok: true, path: filePath };
    },
  },
  OfficeAddinFiles: {
    getConnectedFiles: async () => fakeConnectedOfficeFiles.slice(),
    isFeatureEnabled: async () => true,
    focusFile: async (fileIdOrPath) => {
      const file = fakeConnectedOfficeFiles.find((item) => item.id === fileIdOrPath || item.path === fileIdOrPath);
      return Boolean(file);
    },
    selectFile: async (fileIdOrPath) => {
      const file = fakeConnectedOfficeFiles.find((item) => item.id === fileIdOrPath || item.path === fileIdOrPath) ?? null;
      if (file) {
        fakeConnectedOfficeFiles = fakeConnectedOfficeFiles.map((item) => ({ ...item, active: item.id === file.id }));
        fakeConnectedOfficeFileListeners.forEach((listener) => listener(fakeConnectedOfficeFiles.slice()));
      }
      return file;
    },
    onConnectedFilesChange: (listener) => {
      fakeConnectedOfficeFileListeners.add(listener);
      return () => fakeConnectedOfficeFileListeners.delete(listener);
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
    isStartupOnLoginEnabled: async () => fakeStartupOnLoginEnabled,
    setStartupOnLoginEnabled: async (enabled) => {
      fakeStartupOnLoginEnabled = enabled;
      return true;
    },
    isMenuBarEnabled: async () => fakeMenuBarEnabled,
    setMenuBarEnabled: async (enabled) => {
      fakeMenuBarEnabled = enabled;
      return true;
    },
    getGlobalShortcut: async () => fakeGlobalShortcut,
    setGlobalShortcut: async (accelerator) => {
      fakeGlobalShortcut = accelerator && accelerator.length > 0 ? accelerator : null;
      return true;
    },
  },
  Window: {
    close: async () => {},
    getFullscreen: async () => false,
    getZoomFactor: async () => 1,
    onFullscreenChanged: () => () => undefined,
    onZoomFactorChanged: () => () => undefined,
  },
};
