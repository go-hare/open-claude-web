import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Tabs } from "@base-ui-components/react/tabs";
import { desktopBridge, type CodeStats, type DesktopPreferences, type EffortLevel, type PermissionMode, type SessionSummary, type WorkspaceContext } from "../../adapters/desktopBridge";
import type { RouteViewProps } from "../../app/routes";
import { useFrameContext } from "../../stores/frameContext";
import { Icon } from "../../shell/icons";
import { EpitaxyRouteFrame, EpitaxySessionLoading } from "./EpitaxyFrameSurface";
import { OfficialComposerFooter, OfficialPromptEditor, type OfficialPromptEditorHandle } from "./OfficialEpitaxyComposer";
import { OfficialComposerAddFolderButton, OfficialComposerAdditionalFolderPill, OfficialComposerBranchGroup, OfficialComposerEnvironmentPill } from "./OfficialComposerPills";
import { OfficialCoworkPromptBox } from "./OfficialCoworkComposer";
import { OfficialLocalEnvironmentDialog } from "./OfficialLocalEnvironmentDialog";
import {
  OfficialComposerFolderPill,
  type OfficialComposerFolderRecent,
  type OfficialDropdownItem,
} from "./OfficialEpitaxyComponents";

type PromptSuggestion = {
  id: string;
  label: string;
  prompt: string;
  icon: ReactNode;
};

type CodeTrialState = "ineligible" | "pre_trial" | "active" | "ended";

const supportUrl = "https://support.claude.com/en/articles/13364135-use-claude-cowork-safely";

const coworkSuggestions: PromptSuggestion[] = [
  {
    id: "initial-1",
    label: "优化我的一周",
    prompt: `帮我规划并优化这一周。我已经打开日历，准备让你查看和编辑。\n\n先查看我的日历并总结：\n- 会议总数\n- 最忙的日期\n- 哪些地方有 2 小时以上的空档\n\n在提出调整前，先问我本周目标、需要多少专注时间、是否有日历外截止日期、哪些会议可拒绝或缩短，以及要保护的个人边界。`,
    icon: <SuggestionCalendarIcon />,
  },
  {
    id: "initial-2",
    label: "整理我的截图",
    prompt: `帮我整理桌面上最近的截图。\n\n先扫描桌面并告诉我：\n- 截图或图片总数\n- 日期范围\n\n然后只处理最近 14 天的截图，识别内容、建议描述性文件名，并提出应放入的文件夹或可删除项。先给我计划，等我确认后再整理前 10 个文件作为预览。`,
    icon: <SuggestionFolderIcon />,
  },
  {
    id: "initial-3",
    label: "从文件中发现洞察",
    prompt: `帮我从一组文件里发现模式和洞察。\n\n先扫描文件夹并总结：\n- 文件总数\n- 日期范围\n- 内容类型\n\n分析前先问我希望发现什么、应优先哪些文件或时间段、最终输出什么格式。先找出 3-5 个模式，每个模式给 2-3 个具体例子。`,
    icon: <SuggestionDataIcon />,
  },
];

type CodeModelOption = { label: string; value: string };

const defaultCodeModelOptions: CodeModelOption[] = [
  { label: "DeepSeek Chat", value: "deepseek-chat" },
];

const permissionModeLabels: Record<PermissionMode, string> = {
  acceptEdits: "接受编辑",
  auto: "自动",
  bypass: "绕过权限",
  bypassPermissions: "绕过权限",
  default: "默认",
  plan: "计划",
};

const basePermissionModeOrder: PermissionMode[] = ["default", "acceptEdits", "plan"];

const effortOptions: Array<{ label: string; value: EffortLevel }> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Extra high", value: "xhigh" },
  { label: "Max", value: "max" },
];

export function EpitaxyHome({ onNavigate, route }: RouteViewProps) {
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
  const frame = useFrameContext();
  const routeMode = route.id === "cowork-home" ? "cowork" : route.id === "epitaxy-home" ? "code" : undefined;
  const mode = routeMode ?? frame?.mode ?? "code";

  useEffect(() => {
    let alive = true;
    void desktopBridge.Preferences.getWorkspaceContext().then((nextWorkspace) => {
      if (alive) setWorkspace(nextWorkspace);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!workspace) return <EpitaxySessionLoading />;

  return mode === "cowork" ? (
    <CoworkNewTaskPage onNavigate={onNavigate} workspace={workspace} />
  ) : (
    <CodeNewSessionPage onNavigate={onNavigate} workspace={workspace} />
  );
}

function CoworkNewTaskPage({ onNavigate, workspace }: { onNavigate: (path: string) => void; workspace: WorkspaceContext }) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [composerWorkspace, setComposerWorkspace] = useState(workspace);
  const [model, setModel] = useState("default");
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("default");

  useEffect(() => {
    setComposerWorkspace(workspace);
  }, [workspace]);

  const submit = useCallback(async (nextPrompt = prompt) => {
    const normalized = nextPrompt.trim();
    if (!normalized || busy) return;
    setBusy(true);
    try {
      const session = await desktopBridge.LocalAgentModeSessions.start({
        kind: "epitaxy",
        model: model === "default" ? undefined : model,
        prompt: normalized,
        workspace: composerWorkspace,
        permissionMode,
      });
      onNavigate(`/epitaxy/${encodeURIComponent(session.id)}`);
    } finally {
      setBusy(false);
    }
  }, [busy, composerWorkspace, model, onNavigate, permissionMode, prompt]);

  return (
    <main className="mx-auto mt-4 w-full flex-1 px-4 md:px-8 lg:mt-6 max-w-7xl h-full !mt-0 !px-0 !max-w-none">
      <div className="flex h-full">
        <div className="relative isolate flex h-full min-w-0 flex-1 flex-col overflow-x-clip overflow-y-auto">
          <CoworkGridBackground />
          <div className="flex flex-1 flex-col items-center justify-start px-4 pb-6 pt-24 md:px-14">
            <div className="w-full max-w-2xl">
              <div className="mb-4">
                <CoworkHeader />
                <OfficialCoworkPromptBox
                  busy={busy}
                  model={model}
                  onModelChange={setModel}
                  onPermissionModeChange={setPermissionMode}
                  onSubmit={() => void submit()}
                  onWorkspaceChange={setComposerWorkspace}
                  permissionMode={permissionMode}
                  prompt={prompt}
                  setPrompt={setPrompt}
                  workspace={composerWorkspace}
                />
              </div>
            </div>
            <CoworkSuggestions onSelect={(suggestion) => {
              setPrompt(suggestion.prompt);
              void submit(suggestion.prompt);
            }} />
          </div>
        </div>
      </div>
    </main>
  );
}

function CodeNewSessionPage({ onNavigate, workspace }: { onNavigate: (path: string) => void; workspace: WorkspaceContext }) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [modelOptions, setModelOptions] = useState<CodeModelOption[]>(defaultCodeModelOptions);
  const [model, setModel] = useState(defaultCodeModelOptions[0].value);
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("acceptEdits");
  const [effort, setEffort] = useState<EffortLevel>("medium");
  const [preferences, setPreferences] = useState<DesktopPreferences | null>(null);
  const [composerWorkspace, setComposerWorkspace] = useState(workspace);

  useEffect(() => {
    setComposerWorkspace(workspace);
  }, [workspace]);

  useEffect(() => {
    let alive = true;
    void loadOfficialCodeModelOptions().then((options) => {
      if (!alive || options.length === 0) return;
      setModelOptions(options);
      setModel((current) => options.some((option) => option.value === current) ? current : options[0].value);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void desktopBridge.Preferences.getPreferences?.().then((next) => {
      if (alive) setPreferences(next);
    });
    const unsubscribe = desktopBridge.Preferences.onPreferencesChanged?.((next) => setPreferences(next));
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      desktopBridge.LocalSessions.getDefaultEffort?.(),
      desktopBridge.LocalSessions.getDefaultPermissionMode?.(composerWorkspace.cwd),
    ]).then(([nextEffort, nextPermissionMode]) => {
      if (!alive) return;
      if (nextEffort) setEffort(nextEffort);
      if (typeof nextPermissionMode === "string" && nextPermissionMode.length > 0 && nextPermissionMode !== "default") {
        setPermissionMode(normalizePermissionMode(nextPermissionMode));
      }
    });
    return () => {
      alive = false;
    };
  }, [composerWorkspace.cwd]);

  const submit = useCallback(async () => {
    const normalized = prompt.trim();
    if (!normalized || busy) return;
    setBusy(true);
    try {
      const session = await desktopBridge.LocalSessions.start({
        kind: "code",
        effort,
        model,
        prompt: normalized,
        workspace: composerWorkspace,
        permissionMode,
      });
      onNavigate(`/epitaxy/${encodeURIComponent(session.id)}`);
    } finally {
      setBusy(false);
    }
  }, [busy, composerWorkspace, effort, model, onNavigate, permissionMode, prompt]);

  return (
    <EpitaxyRouteFrame>
      <div className="h-full w-full min-w-0 relative isolate rounded-r6">
        <div className="h-full min-w-0 flex flex-col">
          <div className="relative">
            <CodeGreeting workspace={workspace} />
          </div>
          <div className="contents">
            <div className="flex-1 min-h-0 relative isolate [--epitaxy-scrim-inset-end:16px]">
              <div className="epitaxy-top-scrim" aria-hidden="true" />
              <div className="epitaxy-bottom-scrim" aria-hidden="true" style={{ opacity: 0.9 }} />
              <div className="h-full overflow-y-auto overflow-x-hidden">
                <div className="flex flex-col">
                  <div className="epitaxy-chat-column epitaxy-chat-size py-[24px]">
                    <CodeStatsCard />
                  </div>
                </div>
              </div>
            </div>
            <div className="epitaxy-chat-column epitaxy-chat-size relative shrink-0 flex flex-col gap-g5 [contain:layout]">
              <CodeComposer
                busy={busy}
                effort={effort}
                model={model}
                modelOptions={modelOptions}
                onEffortChange={setEffort}
                onModelChange={setModel}
                onPermissionModeChange={setPermissionMode}
                onSubmit={() => void submit()}
                onWorkspaceChange={setComposerWorkspace}
                permissionMode={permissionMode}
                preferences={preferences}
                prompt={prompt}
                setPrompt={setPrompt}
                workspace={composerWorkspace}
              />
            </div>
          </div>
        </div>
      </div>
    </EpitaxyRouteFrame>
  );
}

function CoworkHeader() {
  return (
    <div className="mb-6 pl-2">
      <div className="flex items-start">
        <img alt="" aria-hidden="true" className="!w-7 -ml-10 mr-3 mt-1 shrink-0 hidden md:block" src="/assets/v1/cd02a42d9-Vq_H3mgS.svg" />
        <h1 className="font-claude-response-title text-text-100">来把待办清掉吧</h1>
      </div>
      <p className="font-small text-text-500 mt-2">
        <a className="underline-offset-2 hover:underline" href={supportUrl} rel="noreferrer" target="_blank">了解如何安全使用协作</a>.
      </p>
    </div>
  );
}

function CoworkSuggestions({ onSelect }: { onSelect: (suggestion: PromptSuggestion) => void }) {
  return (
    <section className="w-full max-w-2xl mt-8 group/suggestions">
      <div className="flex items-center justify-between mb-2 px-2">
        <button className="flex items-center gap-2 font-small text-text-500 hover:text-text-100 transition-colors" type="button">
          <Icon name="Shuffle" customSize={20} />
          <span>随便挑个任务开始吧</span>
        </button>
      </div>
      <div className="flex flex-col [&>button:hover+hr]:opacity-0 [&>hr:has(+button:hover)]:opacity-0">
        {coworkSuggestions.map((suggestion, index) => (
          <FragmentWithSeparator isLast={index === coworkSuggestions.length - 1} key={suggestion.id}>
            <button
              onClick={() => onSelect(suggestion)}
              className="w-full flex items-center gap-3 px-2 py-3 transition-colors hover:bg-bg-300 hover:rounded-lg group text-left"
              type="button"
            >
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">{suggestion.icon}</div>
              <div className="flex-1 min-w-0"><span className="font-base text-text-200">{suggestion.label}</span></div>
              <Icon name="CaretRight" customSize={16} className="hidden group-hover:block flex-shrink-0 text-text-500" />
            </button>
          </FragmentWithSeparator>
        ))}
      </div>
      <button className="group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-uncontained-default hover:text-uncontained-hover h-small text-footnote rounded-small justify-center px-p3 !text-text-500 mt-1" type="button">
        用插件自定义
      </button>
    </section>
  );
}

function CodeGreeting({ workspace }: { workspace: WorkspaceContext }) {
  const orgName = workspace.projectName === "claude-desktop" ? "Cowork 3P" : "Cowork 3P";
  return (
    <header className="epitaxy-chat-column epitaxy-chat-size flex flex-row items-center gap-[calc(var(--g3)+2px)] pt-[12px] pb-[24px]">
      <img alt="" aria-hidden="true" className="size-[22px] shrink-0 translate-y-px" src="/assets/v1/cd02a42d9-Vq_H3mgS.svg" />
      <h1 className="text-title text-t9">{orgName}，接下来做点什么？</h1>
    </header>
  );
}

function CodeStatsCard() {
  const [stats, setStats] = useState<CodeStats | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [view, setView] = useState<"overview" | "models">("overview");
  const [range, setRange] = useState<"all" | "30d" | "7d">("all");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void desktopBridge.LocalSessions.getCodeStats?.().then((nextStats) => {
      if (alive) setStats(nextStats);
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const display = useMemo(() => buildCodeStatsDisplay(stats, range), [range, stats]);

  if (isLoading || !stats) {
    return <CodeStatsSkeletonCard />;
  }

  return (
    <div className="flex flex-col gap-[20px] p-[12px] pt-[8px] rounded-r6 bg-t1 max-w-[480px]">
      <div className="flex items-center gap-g4 min-w-0">
        <SegmentedTabs
          items={[{ label: "概览", value: "overview" }, { label: "模型", value: "models" }]}
          onValueChange={(value) => setView(value === "models" ? "models" : "overview")}
          value={view}
        />
        <span className="flex-1" />
        <SegmentedTabs
          items={[{ label: "全部", value: "all" }, { label: "30天", value: "30d" }, { label: "7天", value: "7d" }]}
          onValueChange={(value) => setRange(value === "7d" ? "7d" : value === "30d" ? "30d" : "all")}
          value={range}
        />
      </div>
      <div className="flex flex-col gap-g5">
        {view === "models" ? (
          <ModelUsagePanel modelUsage={display.modelUsage} />
        ) : (
          <CodeStatsOverview display={display} />
        )}
      </div>
    </div>
  );
}

function CodeStatsSkeletonCard() {
  return (
    <div className="flex flex-col gap-[20px] p-[12px] pt-[8px] rounded-r6 bg-t1 max-w-[480px] animate-pulse" aria-busy="true">
      <div className="flex items-center gap-g4 min-w-0">
        <div className="h-small w-[120px] rounded-r3 bg-t2" />
        <span className="flex-1" />
        <div className="h-small w-[100px] rounded-r3 bg-t2" />
      </div>
      <div className="flex flex-col gap-g5">
        <div className="grid grid-cols-4 gap-g3">
          {Array.from({ length: 8 }, (_, index) => <div className="h-[44px] rounded-r4 bg-t2" key={index} />)}
        </div>
        <div className="h-[120px] rounded-r1 bg-t2" />
        <div className="h-[12px] w-[240px] rounded-r2 bg-t2 mt-[4px]" />
      </div>
    </div>
  );
}

function CodeComposer({
  busy,
  effort,
  model,
  modelOptions,
  onEffortChange,
  onModelChange,
  onPermissionModeChange,
  onSubmit,
  onWorkspaceChange,
  permissionMode,
  preferences,
  prompt,
  setPrompt,
  workspace,
}: {
  busy: boolean;
  effort: EffortLevel;
  model: string;
  modelOptions: CodeModelOption[];
  onEffortChange: (value: EffortLevel) => void;
  onModelChange: (value: string) => void;
  onPermissionModeChange: (value: PermissionMode) => void;
  onSubmit: () => void;
  onWorkspaceChange: (workspace: WorkspaceContext) => void;
  permissionMode: PermissionMode;
  preferences: DesktopPreferences | null;
  prompt: string;
  setPrompt: (value: string) => void;
  workspace: WorkspaceContext;
}) {
  const promptEditorRef = useRef<OfficialPromptEditorHandle | null>(null);
  const [localEnvironmentOpen, setLocalEnvironmentOpen] = useState(false);
  const [recentFolders, setRecentFolders] = useState<OfficialComposerFolderRecent[]>([]);
  const permissionItems = useMemo(() => buildOfficialPermissionItems({
    model,
    onSelect: onPermissionModeChange,
    permissionMode,
    preferences,
  }), [model, onPermissionModeChange, permissionMode, preferences]);
  const modelItems: OfficialDropdownItem[] = modelOptions.map((option, index) => ({
    checked: option.value === model,
    label: option.label,
    noQuickKey: index === 0,
    onSelect: () => onModelChange(option.value),
  }));
  const effortItems: OfficialDropdownItem[] = effortOptions.map((option) => ({
    checked: option.value === effort,
    label: option.label,
    onSelect: () => onEffortChange(option.value),
  }));
  const additionalFolders = workspace.folders ?? [];
  const branchOptions = workspace.branches ?? [];
  const isGitRepo = branchOptions.length > 0;
  const worktreeSupported = isGitRepo && workspace.worktreeSupported === true;
  const worktree = workspace.worktree ?? worktreeSupported;
  const displayBranch = isGitRepo ? workspace.sourceBranch ?? (worktree && worktreeSupported ? workspace.defaultBranch ?? preferredDefaultBranch(branchOptions) ?? workspace.branchName : workspace.branchName) : undefined;
  const modelExtraSections = [{ key: "effort", header: "Effort", items: effortItems }];

  useEffect(() => {
    let alive = true;
    void Promise.all([
      desktopBridge.LocalSessions.list().catch(() => []),
      desktopBridge.LocalAgentModeSessions.list().catch(() => []),
    ]).then(([codeSessions, agentSessions]) => {
      if (!alive) return;
      setRecentFolders(buildOfficialRecentFolders([...codeSessions, ...agentSessions], workspace.cwd));
    });
    return () => {
      alive = false;
    };
  }, [workspace.cwd]);

  const applyWorkspacePath = useCallback(async (selectedPath: string) => {
    const git = await loadOfficialWorkspaceGit(selectedPath);
    const nextWorkspace = {
      mode: "local",
      projectName: basename(git.root) ?? basename(selectedPath) ?? selectedPath,
      branchName: git.displayBranch ?? "",
      branchPickerDisabled: git.branches.length === 0,
      branches: git.branches,
      defaultBranch: git.defaultBranch,
      hasWorktree: git.worktreeSupported,
      cwd: selectedPath,
      folders: additionalFolders.filter((folder) => folder !== selectedPath),
      sourceBranch: git.displayBranch,
      worktree: git.worktree,
      worktreeSupported: git.worktreeSupported,
    } satisfies WorkspaceContext;
    onWorkspaceChange(nextWorkspace);
    setRecentFolders((current) => buildOfficialRecentFolders([], selectedPath, current));
  }, [additionalFolders, onWorkspaceChange]);

  const chooseWorkspace = useCallback(async () => {
    const selectedPaths = await desktopBridge.Preferences.getDirectoryPath?.(false);
    const selectedPath = selectedPaths?.[0];
    if (!selectedPath) return;
    await applyWorkspacePath(selectedPath);
  }, [applyWorkspacePath]);

  const selectRecentWorkspace = useCallback((path: string) => {
    void applyWorkspacePath(path);
  }, [applyWorkspacePath]);

  const addAdditionalFolder = useCallback(async () => {
    const selectedPaths = await desktopBridge.Preferences.getDirectoryPath?.(false);
    const selectedPath = selectedPaths?.[0];
    if (!selectedPath || selectedPath === workspace.cwd || additionalFolders.includes(selectedPath)) return;
    onWorkspaceChange({ ...workspace, folders: [...additionalFolders, selectedPath] });
    setRecentFolders((current) => buildOfficialRecentFolders([], workspace.cwd, [...current, { path: selectedPath }]));
  }, [additionalFolders, onWorkspaceChange, workspace]);

  const removeAdditionalFolder = useCallback((folder: string) => {
    onWorkspaceChange({ ...workspace, folders: additionalFolders.filter((item) => item !== folder) });
  }, [additionalFolders, onWorkspaceChange, workspace]);

  const selectBranch = useCallback((branch: string) => {
    onWorkspaceChange({ ...workspace, branchName: branch, sourceBranch: branch });
  }, [onWorkspaceChange, workspace]);

  const setWorktree = useCallback((nextWorktree: boolean) => {
    const nextBranch = nextWorktree ? workspace.sourceBranch ?? workspace.defaultBranch ?? preferredDefaultBranch(branchOptions) ?? workspace.branchName : workspace.branchName;
    onWorkspaceChange({ ...workspace, branchName: nextBranch, sourceBranch: nextBranch, worktree: nextWorktree });
  }, [branchOptions, onWorkspaceChange, workspace]);

  return (
    <div className="flex flex-col gap-g5">
      <div className="flex flex-wrap gap-g5 pb-p3 pr-[96px]">
        <OfficialComposerEnvironmentPill
          envLabel="本地"
          envType="local"
          localEnvAvailable
          onOpenLocalEnvSettings={() => setLocalEnvironmentOpen(true)}
          onSelectLocalEnv={() => {}}
        />
        <OfficialComposerFolderPill folder={workspace.cwd} onBrowse={() => void chooseWorkspace()} onSelectFolder={selectRecentWorkspace} recentFolders={recentFolders} />
        {isGitRepo ? (
          <OfficialComposerBranchGroup
            branch={displayBranch}
            branches={branchOptions}
            branchPickerDisabled={workspace.branchPickerDisabled}
            onSelectBranch={selectBranch}
            onWorktreeChange={setWorktree}
            worktree={worktree}
            worktreeSupported={worktreeSupported}
          />
        ) : null}
        {additionalFolders.map((folder) => <OfficialComposerAdditionalFolderPill folder={folder} key={folder} onRemove={removeAdditionalFolder} />)}
        <OfficialComposerAddFolderButton onClick={() => void addAdditionalFolder()} />
      </div>
      <DraftClawd />
      <OfficialPromptEditor
        ref={promptEditorRef}
        bridge={desktopBridge.LocalSessions}
        busy={busy}
        disabled={busy}
        onChange={setPrompt}
        onSubmit={onSubmit}
        placeholder="描述一个任务，或提一个问题"
        slashCwd={workspace.cwd}
        value={prompt}
      />
      <OfficialComposerFooter
        bridge={desktopBridge.LocalSessions}
        hideDictation
        isPanelActive={!busy}
        modelExtraSections={modelExtraSections}
        modelItems={modelItems}
        modelLabel={modelLabel(model, modelOptions)}
        modelPickerDisabled={busy}
        permissionDanger={permissionMode === "bypassPermissions" || permissionMode === "auto"}
        permissionItems={permissionItems}
        permissionLabel={permissionModeLabel(permissionMode)}
        plusMenuItems={[{ icon: "Folder1", label: "Add folder", onSelect: () => void addAdditionalFolder() }]}
        sessionRef={null}
        onInsertSlashCommand={() => promptEditorRef.current?.insertSlashCommand()}
      />
      <OfficialLocalEnvironmentDialog
        bridge={desktopBridge.LocalSessionEnvironment}
        isOpen={localEnvironmentOpen}
        onClose={() => setLocalEnvironmentOpen(false)}
      />
    </div>
  );
}

function DraftClawd() {
  const [replayKey, setReplayKey] = useState(0);
  const trial = useCodeTrialState();
  const hasTrialSurface = trial.state === "pre_trial" || trial.state === "active" || trial.state === "ended";

  return (
    <div className="relative h-0 -mb-[var(--g5)] pointer-events-none">
      <div className="pointer-events-auto">
        <CcProTrialSurfaces state={trial.state} daysRemaining={trial.daysRemaining} />
        <button
          aria-hidden="true"
          className={`${hasTrialSurface ? officialDraftClawdWithTrialClass : officialDraftClawdClass} border-0 bg-transparent p-0 outline-none hide-focus-ring cursor-default pointer-events-auto`}
          onClick={() => setReplayKey((key) => key + 1)}
          onMouseDown={(event) => event.preventDefault()}
          tabIndex={-1}
          type="button"
        >
          <img
            alt=""
            className="h-full w-full"
            draggable={false}
            key={replayKey}
            src="/assets/v1/clawd-laptop-official.gif"
          />
        </button>
      </div>
    </div>
  );
}

function useCodeTrialState(): { state: CodeTrialState; daysRemaining: number | null } {
  return useMemo(() => ({ state: "ineligible", daysRemaining: null }), []);
}

function CcProTrialSurfaces({ daysRemaining, state }: { daysRemaining: number | null; state: CodeTrialState }) {
  if (state === "ineligible") return null;

  if (state === "pre_trial") {
    return (
      <div className="absolute bottom-2 right-0">
        <button
          aria-label="Start free Claude Code trial"
          className="inline-flex h-[24px] items-center gap-1.5 rounded-md bg-accent-900/50 px-1.5 text-[13px] text-accent-000 transition hover:bg-accent-900"
          type="button"
        >
          <span>Start trial</span>
          <Icon name="ArrowRight" customSize={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-2 right-0">
      <span className="inline-flex h-[24px] items-center gap-1.5 rounded-md bg-bg-300 px-1.5 text-[13px] text-text-300">
        {state === "active" ? <span>{Math.max(0, daysRemaining ?? 0)} days left</span> : <span>Trial ended</span>}
        <span aria-hidden="true">·</span>
        <span className="text-accent-100">Upgrade</span>
      </span>
    </div>
  );
}

const officialDraftClawdClass = "absolute right-[-16px] bottom-[-13px] w-[80px] h-[80px] -scale-x-100";
const officialDraftClawdWithTrialClass = "absolute right-[140px] bottom-[-13px] w-[80px] h-[80px] -scale-x-100";

function SegmentedTabs<T extends string>({ items, onValueChange, value }: { items: Array<{ label: string; value: T }>; onValueChange: (value: T) => void; value: T }) {
  return (
    <Tabs.Root value={value} onValueChange={(nextValue) => onValueChange(nextValue as T)}>
      <Tabs.List aria-label={items.map((item) => item.label).join(" / ")} className="inline-flex items-center gap-g1">
        {items.map((item) => {
          const selected = item.value === value;
          return (
            <Tabs.Tab
              className="group/tab relative isolate inline-flex items-center justify-center border-0 outline-none bg-transparent cursor-default select-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled data-[selected]:text-[var(--text-uncontained-selected)] h-small px-p6 gap-g3 rounded-r3 text-footnote"
              data-selected={selected || undefined}
              key={item.value}
              type="button"
              value={item.value}
            >
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] bg-fill-uncontained-default group-hover/tab:bg-fill-uncontained-hover group-disabled/tab:bg-fill-uncontained-disabled group-data-[selected]/tab:bg-t2" />
              <span>{item.label}</span>
            </Tabs.Tab>
          );
        })}
      </Tabs.List>
    </Tabs.Root>
  );
}

function StatTile({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="flex flex-col gap-g1 p-p3 rounded-r4 bg-t2">
      <span className="text-footnote text-t6 truncate">{label}</span>
      <span className={`tabular-nums text-t9 truncate ${small ? "text-footnote" : "text-body-semibold"}`}>{value}</span>
    </div>
  );
}

type CodeStatsDisplay = ReturnType<typeof buildCodeStatsDisplay>;

function CodeStatsOverview({ display }: { display: CodeStatsDisplay }) {
  return (
    <>
      <div className="grid grid-cols-4 gap-g3">
        <StatTile label="会话数" value={display.sessions} />
        <StatTile label="消息数" value={display.messages} />
        <StatTile label="总 Tokens" value={display.tokens} />
        <StatTile label="活跃天数" value={display.activeDays} />
        <StatTile label="当前连续天数" value={display.currentStreak} />
        <StatTile label="最长连续天数" value={display.longestStreak} />
        <StatTile label="高峰时段" value={display.peakHour} />
        <StatTile label="最常用模型" value={display.favoriteModel} small />
      </div>
      <Heatmap dailyActivity={display.dailyActivity} />
      <TokenReferenceText totalTokens={display.totalTokens} />
    </>
  );
}

function Heatmap({ dailyActivity }: { dailyActivity: CodeStats["dailyActivity"] }) {
  const activityByDate = useMemo(() => new Map(dailyActivity.map((entry) => [entry.date, entry.messageCount])), [dailyActivity]);
  const maxActivity = Math.max(0, ...activityByDate.values());
  const weeks = useMemo(() => buildHeatmapDates(), []);
  return (
    <div role="img" aria-label="Daily activity heatmap" className="flex gap-[3px] w-full">
      {weeks.map((week, weekIndex) => (
        <div className="flex flex-col gap-[3px] flex-1 min-w-0" key={weekIndex}>
          {week.map(({ date, future }) => {
            if (future) return <div className="aspect-square rounded-r1" key={date} />;
            const activity = activityByDate.get(date) ?? 0;
            const ratio = maxActivity === 0 ? 0 : activity / maxActivity;
            const lightness = ratio === 0 ? null : 80 - Math.ceil(ratio * 4) * 8;
            return <div className="aspect-square rounded-r1 bg-t2" key={date} style={lightness === null ? undefined : { backgroundColor: `hsl(217 70% ${lightness}%)` }} />;
          })}
        </div>
      ))}
    </div>
  );
}

type CodeStatsRange = "all" | "30d" | "7d";
type ModelUsageDisplay = Array<{ input: string; model: string; output: string; tokens: string; totalTokens: number }>;

function ModelUsagePanel({ modelUsage }: { modelUsage: ModelUsageDisplay }) {
  if (modelUsage.length === 0) {
    return <div className="flex min-h-[128px] items-center justify-center rounded-r4 bg-t2 text-body text-t6">No model usage yet.</div>;
  }

  return (
    <div className="flex flex-col gap-g3">
      {modelUsage.map((usage) => (
        <div className="grid grid-cols-[1fr_auto] gap-g4 rounded-r4 bg-t2 p-p3" key={usage.model}>
          <span className="truncate text-body text-t9">{modelLabel(usage.model)}</span>
          <span className="tabular-nums text-body-semibold text-t9">{usage.tokens}</span>
          <span className="text-footnote text-t6">Input {usage.input}</span>
          <span className="text-footnote text-t6">Output {usage.output}</span>
        </div>
      ))}
    </div>
  );
}

function buildCodeStatsDisplay(stats: CodeStats | null, range: CodeStatsRange) {
  const dailyActivity = filterStatsByRange(stats?.dailyActivity ?? [], range);
  const dailyModelTokens = filterStatsByRange(stats?.dailyModelTokens ?? [], range);
  const modelTotals = modelTokensFromDaily(dailyModelTokens);
  const rawModelUsage = stats?.modelUsage ?? {};
  const modelUsage = Object.entries(rawModelUsage)
    .map(([model, usage]) => {
      const totalTokens = usage.inputTokens + usage.outputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens;
      return {
        input: formatCompactNumber(usage.inputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens),
        model,
        output: formatCompactNumber(usage.outputTokens),
        tokens: formatCompactNumber(totalTokens),
        totalTokens,
      };
    })
    .filter((usage) => usage.totalTokens > 0)
    .sort((left, right) => right.totalTokens - left.totalTokens);
  const fallbackTotalTokens = modelUsage.reduce((total, usage) => total + usage.totalTokens, 0);
  const totalTokens = sumRecordValues(modelTotals) || fallbackTotalTokens;
  const favoriteModel = topModelLabel(modelTotals) ?? modelLabel(modelUsage[0]?.model ?? "-");
  const tokenReference = tokenReferenceFor(totalTokens);

  return {
    activeDays: formatNumber(dailyActivity.length),
    currentStreak: `${stats?.streaks.currentStreak ?? 0}d`,
    dailyActivity,
    favoriteModel,
    longestStreak: `${stats?.streaks.longestStreak ?? 0}d`,
    messages: formatNumber(dailyActivity.reduce((total, entry) => total + entry.messageCount, 0)),
    modelUsage,
    peakHour: typeof stats?.peakActivityHour === "number" ? `${stats.peakActivityHour}时` : "-",
    sessions: formatNumber(dailyActivity.reduce((total, entry) => total + entry.sessionCount, 0)),
    totalTokens,
    tokenBook: tokenReference?.title ?? "",
    tokens: formatCompactNumber(totalTokens),
    tokenTimes: tokenReference ? formatMultiplier(totalTokens, tokenReference.tokens) : "0",
  };
}

function filterStatsByRange<T extends { date: string }>(items: T[], range: CodeStatsRange): T[] {
  if (range === "all") return items;
  const days = range === "7d" ? 7 : 30;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return items.filter((item) => {
    const value = new Date(`${item.date}T00:00:00`);
    return !Number.isNaN(value.getTime()) && value >= cutoff;
  });
}

function modelTokensFromDaily(items: CodeStats["dailyModelTokens"]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const item of items) {
    for (const [model, tokens] of Object.entries(item.tokensByModel)) {
      totals[model] = (totals[model] ?? 0) + tokens;
    }
  }
  return totals;
}

function topModelLabel(modelTotals: Record<string, number>) {
  const top = Object.entries(modelTotals).sort((left, right) => right[1] - left[1])[0]?.[0];
  return top ? modelLabel(top) : null;
}

function sumRecordValues(record: Record<string, number>) {
  return Object.values(record).reduce((total, value) => total + value, 0);
}

function buildHeatmapDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(today.getDate() + (6 - today.getDay()));
  const start = new Date(end);
  start.setDate(end.getDate() - 181);
  return Array.from({ length: 26 }, (_, week) => Array.from({ length: 7 }, (_, day) => {
    const date = new Date(start);
    date.setDate(start.getDate() + week * 7 + day);
    return { date: toDateKey(date), future: date > today };
  }));
}

function toDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatCompactNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1_000_000) return `${trimFixed(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trimFixed(value / 1_000)}K`;
  return formatNumber(Math.round(value));
}

function trimFixed(value: number) {
  return value.toFixed(value >= 10 ? 1 : 2).replace(/\.0+$/, "").replace(/(\.\d)0$/, "$1");
}

function tokenReferenceFor(totalTokens: number) {
  const references = [
    { title: "The Little Prince", tokens: 22_000 },
    { title: "Animal Farm", tokens: 39_000 },
    { title: "The Great Gatsby", tokens: 62_000 },
    { title: "Harry Potter and the Philosopher's Stone", tokens: 103_000 },
    { title: "The Hobbit", tokens: 123_000 },
    { title: "Pride and Prejudice", tokens: 156_000 },
    { title: "Dune", tokens: 244_000 },
    { title: "Moby-Dick", tokens: 268_000 },
    { title: "The Lord of the Rings", tokens: 576_000 },
    { title: "War and Peace", tokens: 730_000 },
  ];
  const eligible = references.filter((reference) => totalTokens >= reference.tokens);
  return eligible[eligible.length - 1] ?? null;
}

function formatMultiplier(totalTokens: number, referenceTokens: number) {
  if (totalTokens <= 0) return "0";
  return formatNumber(Math.max(1, Math.round(totalTokens / referenceTokens)));
}

function TokenReferenceText({ totalTokens }: { totalTokens: number }) {
  const reference = useMemo(() => tokenReferenceFor(totalTokens), [totalTokens]);
  if (!reference) return null;
  const times = Math.floor(totalTokens / reference.tokens);
  return (
    <span className="text-caption text-t6 pt-[4px]">
      {times >= 2
        ? <>你使用的 Tokens 大约是 {reference.title} 的 {formatNumber(times)} 倍。</>
        : <>你使用的 Tokens 大约和 {reference.title} 一样多。</>}
    </span>
  );
}

function modelLabel(value: string, options: CodeModelOption[] = defaultCodeModelOptions) {
  const normalized = normalizeCodeModelValue(value);
  return options.find((option) => option.value === normalized)?.label ?? formatClaudeModelLabel(value);
}

function normalizeCodeModelValue(value?: string) {
  return value || defaultCodeModelOptions[0].value;
}

function formatClaudeModelLabel(value: string) {
  const match = value.match(/^claude-([a-z]+)-(\d+)(?:-(\d+))?/i);
  if (!match) return value;
  const family = `${match[1].charAt(0).toUpperCase()}${match[1].slice(1)}`;
  return `${family} ${match[2]}${match[3] ? `.${match[3]}` : ""}`;
}

function permissionModeLabel(value: PermissionMode) {
  return permissionModeLabels[value] ?? value;
}

function effortLabel(value: EffortLevel) {
  return effortOptions.find((option) => option.value === value)?.label ?? value;
}

function normalizePermissionMode(value: unknown): PermissionMode {
  if (typeof value !== "string") return "acceptEdits";
  if (value === "bypass") return "bypassPermissions";
  return Object.prototype.hasOwnProperty.call(permissionModeLabels, value) ? value as PermissionMode : "acceptEdits";
}

function buildOfficialPermissionItems({
  model,
  onSelect,
  permissionMode,
  preferences,
}: {
  model: string;
  onSelect: (mode: PermissionMode) => void;
  permissionMode: PermissionMode;
  preferences: DesktopPreferences | null;
}): OfficialDropdownItem[] {
  const autoAvailable = officialModelSupportsAutoPermissions(model);
  const bypassAvailable = preferences?.bypassPermissionsModeEnabled === true;
  const modes = officialAvailablePermissionModes({ bypassPermissionsModeEnabled: bypassAvailable, model });
  const items: OfficialDropdownItem[] = modes.map((mode) => ({
    checked: normalizePermissionMode(mode) === normalizePermissionMode(permissionMode),
    label: permissionModeLabel(mode),
    onSelect: () => onSelect(normalizePermissionMode(mode)),
  }));
  if (!bypassAvailable) {
    items.push({
      checked: false,
      disabled: true,
      hint: "Enable in Claude Code settings",
      label: permissionModeLabel("bypassPermissions"),
    });
  }
  if (!autoAvailable) {
    items.push({
      checked: false,
      disabled: true,
      hint: "Enable Auto mode for this model in Claude Code settings",
      label: permissionModeLabel("auto"),
    });
  }
  return items;
}

function officialAvailablePermissionModes({ bypassPermissionsModeEnabled, model }: { bypassPermissionsModeEnabled?: boolean; model: string }): PermissionMode[] {
  const modes = [...basePermissionModeOrder];
  if (officialModelSupportsAutoPermissions(model)) modes.push("auto");
  if (bypassPermissionsModeEnabled === true) modes.push("bypassPermissions");
  return modes;
}

function officialModelSupportsAutoPermissions(model: string) {
  const normalized = model.toLowerCase();
  if (normalized.includes("claude-3-")) return false;
  return !/claude-[a-z]+-4(?:$|-(?:[0-5](?!\d)|\d{8}))/.test(normalized);
}

async function loadOfficialCodeModelOptions(): Promise<CodeModelOption[]> {
  const bootstrap = await fetch("/api/bootstrap").then((response) => response.ok ? response.json() : null).catch(() => null);
  return extractBootstrapModelOptions(bootstrap);
}

function extractBootstrapModelOptions(value: unknown): CodeModelOption[] {
  const record = asRecord(value);
  const account = asRecord(record.account);
  const memberships = Array.isArray(account.memberships) ? account.memberships : [];
  const models: CodeModelOption[] = [];
  for (const membership of memberships) {
    const organization = asRecord(asRecord(membership).organization);
    const rawModels = organization.claude_ai_bootstrap_models_config;
    if (!Array.isArray(rawModels)) continue;
    for (const item of rawModels) {
      const model = asRecord(item);
      const value = stringValue(model.model) ?? stringValue(model.id);
      const label = stringValue(model.name) ?? (value ? formatClaudeModelLabel(value) : undefined);
      if (value && label) models.push({ label, value });
    }
  }
  return uniqueStrings(models.map((item) => item.value)).map((value) => models.find((item) => item.value === value)!).filter(Boolean);
}

async function loadOfficialWorkspaceGit(selectedPath: string, fallbackBranch?: string) {
  const gitInfo = await desktopBridge.LocalSessions.getGitInfo?.(selectedPath).catch(() => null);
  const git = asRecord(gitInfo);
  const branch = stringValue(git.branch) ?? fallbackBranch;
  const branchesResult = await desktopBridge.LocalSessions.getLocalBranches?.(selectedPath).catch(() => null);
  const branches = orderOfficialBranches(parseLocalBranches(asRecord(branchesResult).stdout), branch);
  const defaultBranch = preferredDefaultBranch(branches);
  const worktreeSupported = branches.length > 0;
  return {
    branches,
    defaultBranch,
    displayBranch: worktreeSupported ? defaultBranch ?? branch ?? branches[0] : branch,
    root: stringValue(git.root),
    worktree: worktreeSupported,
    worktreeSupported,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0))];
}

function parseLocalBranches(stdout: unknown): string[] {
  return typeof stdout === "string"
    ? uniqueStrings(stdout.split(/\r?\n/).map((line) => line.replace(/^\*\s*/, "").trim()).filter((line) => line.length > 0 && !line.includes("->")))
    : [];
}

function preferredDefaultBranch(branches: string[]): string | undefined {
  return branches.find((branch) => branch === "main") ?? branches.find((branch) => branch === "master") ?? branches[0];
}

function orderOfficialBranches(branches: string[], currentBranch?: string): string[] {
  const defaultBranch = preferredDefaultBranch(branches);
  return [...branches].sort((left, right) => {
    if (left === defaultBranch) return -1;
    if (right === defaultBranch) return 1;
    if (left === currentBranch) return -1;
    if (right === currentBranch) return 1;
    return left.localeCompare(right);
  });
}

function basename(value?: string): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}

function buildOfficialRecentFolders(
  sessions: SessionSummary[],
  currentCwd?: string,
  existing: OfficialComposerFolderRecent[] = [],
): OfficialComposerFolderRecent[] {
  const ordered = [...sessions].sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0));
  const seen = new Set<string>();
  const recent: OfficialComposerFolderRecent[] = [];

  const addPath = (path: string | undefined) => {
    if (!path || seen.has(path)) return;
    seen.add(path);
    recent.push({ path });
  };

  addPath(currentCwd);
  for (const item of existing) addPath(item.path);
  for (const session of ordered) {
    addPath(session.cwd);
    for (const folder of session.folders ?? []) addPath(folder);
  }

  return recent.slice(0, 12);
}

function FragmentWithSeparator({ children, isLast }: { children: ReactNode; isLast: boolean }) {
  return (
    <>
      {children}
      {!isLast ? <hr className="border-t-0.5 border-border-300 mx-2 transition-opacity" /> : null}
    </>
  );
}

function CoworkGridBackground() {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 opacity-70" style={gridStyle} />
    </div>
  );
}

const gridStyle: CSSProperties = {
  backgroundImage: "radial-gradient(circle, hsl(var(--text-500) / 0.22) 1px, transparent 1.25px)",
  backgroundSize: "16px 16px",
  maskImage: "radial-gradient(ellipse at center, black 0%, black 54%, transparent 80%)",
};

function SuggestionCalendarIcon() {
  return (
    <span className="inline-flex size-10 items-center justify-center rounded-r4 border-0.5 border-border-300 bg-bg-000 text-t6 shadow-sm">
      <Icon name="Calendar" customSize={24} />
    </span>
  );
}

function SuggestionFolderIcon() {
  return (
    <span className="inline-flex size-10 items-center justify-center rounded-r4 border-0.5 border-border-300 bg-bg-000 text-t6 shadow-sm">
      <Icon name="Folder" customSize={26} />
    </span>
  );
}

function SuggestionDataIcon() {
  return (
    <span className="inline-flex size-10 items-center justify-center rounded-r4 border-0.5 border-border-300 bg-bg-000 text-t6 shadow-sm">
      <Icon name="Spreadsheet" customSize={24} />
    </span>
  );
}
