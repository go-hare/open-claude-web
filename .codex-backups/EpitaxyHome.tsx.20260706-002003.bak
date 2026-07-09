import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Tabs } from "@base-ui-components/react/tabs";
import { desktopBridge, type WorkspaceContext } from "../../adapters/desktopBridge";
import type { RouteViewProps } from "../../app/routes";
import { useFrameContext } from "../../stores/frameContext";
import { Icon } from "../../shell/icons";
import { EpitaxyRouteFrame, EpitaxySessionLoading } from "./EpitaxyFrameSurface";

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

const codeStats = {
  sessions: "109",
  messages: "3,238",
  tokens: "315.6M",
  activeDays: "19",
  currentStreak: "0d",
  longestStreak: "6d",
  peakHour: "23时",
  favoriteModel: "Opus 4.8",
  tokenBook: "The Lord of the Rings",
  tokenTimes: "547",
};

const codeHeatmapActive = new Map<number, number>([
  [130, 72], [131, 72], [132, 72], [133, 72],
  [137, 70], [138, 70], [139, 70], [140, 70],
  [144, 64], [147, 68], [148, 68],
  [150, 74], [151, 74], [154, 70], [155, 70],
  [158, 58], [159, 54], [160, 62],
  [164, 70], [165, 70], [168, 68], [174, 72],
]);

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

  const submit = useCallback(async (nextPrompt = prompt) => {
    const normalized = nextPrompt.trim();
    if (!normalized || busy) return;
    setBusy(true);
    try {
      const session = await desktopBridge.LocalSessions.start({
        kind: "epitaxy",
        prompt: normalized,
        workspace,
        permissionMode: "default",
      });
      onNavigate(`/epitaxy/${encodeURIComponent(session.id)}`);
    } finally {
      setBusy(false);
    }
  }, [busy, onNavigate, prompt, workspace]);

  return (
    <main className="mx-auto mt-4 w-full flex-1 px-4 md:px-8 lg:mt-6 max-w-7xl h-full !mt-0 !px-0 !max-w-none">
      <div className="flex h-full">
        <div className="relative isolate flex h-full min-w-0 flex-1 flex-col overflow-x-clip overflow-y-auto">
          <CoworkGridBackground />
          <div className="flex flex-1 flex-col items-center justify-start px-4 pb-6 pt-24 md:px-14">
            <div className="w-full max-w-2xl">
              <div className="mb-4">
                <CoworkHeader />
                <CoworkPromptBox busy={busy} onSubmit={() => void submit()} prompt={prompt} setPrompt={setPrompt} />
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

  const submit = useCallback(async () => {
    const normalized = prompt.trim();
    if (!normalized || busy) return;
    setBusy(true);
    try {
      const session = await desktopBridge.LocalAgentModeSessions.start({
        kind: "code",
        prompt: normalized,
        workspace,
        permissionMode: "default",
      });
      onNavigate(`/epitaxy/${encodeURIComponent(session.id)}`);
    } finally {
      setBusy(false);
    }
  }, [busy, onNavigate, prompt, workspace]);

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
              <CodeComposer busy={busy} onSubmit={() => void submit()} prompt={prompt} setPrompt={setPrompt} workspace={workspace} />
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

function CoworkPromptBox({ busy, onSubmit, prompt, setPrompt }: { busy: boolean; onSubmit: () => void; prompt: string; setPrompt: (value: string) => void }) {
  return (
    <div
      className="epitaxy-prompt !box-content flex flex-col bg-bg-000 mx-2 md:mx-0 items-stretch transition-all duration-200 rounded-[20px] cursor-text relative z-[1] border border-transparent md:w-full shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/3.5%),0_0_0_0.5px_hsla(var(--border-300)/0.15)] hover:shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/3.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)] focus-within:shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/7.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)]"
      onClick={(event) => {
        if (event.target instanceof HTMLElement && event.target.closest("button")) return;
        event.currentTarget.querySelector("textarea")?.focus();
      }}
    >
      <div className="flex flex-col m-3.5 gap-3">
        <div className="relative font-large">
          <textarea
            aria-label="今天我可以帮你做什么？"
            className="w-full resize-none border-0 bg-transparent text-text-100 placeholder:text-text-500 outline-none"
            disabled={busy}
            style={{ minHeight: 48, maxHeight: 218, padding: 0 }}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                onSubmit();
              }
            }}
            placeholder="今天我可以帮你做什么？"
            value={prompt}
          />
        </div>
        <div className="relative flex gap-2 w-full items-center">
          <div className="relative flex-1 flex items-center shrink min-w-0 gap-1">
            <button className="group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-uncontained-default hover:text-uncontained-hover h-base text-body rounded-base justify-center aspect-square px-p3" type="button" aria-label="添加文件、连接器等">
              <span className="btn-squish absolute inset-0 -z-[1] rounded-[inherit]" aria-hidden="true" />
              <Icon name="Add" customSize={20} />
            </button>
            <button className="group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover h-small rounded-small text-footnote justify-between pl-p3 pr-p2" type="button">
              <span className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none" aria-hidden="true" />
              <Icon name="Folder" customSize={16} />
              <span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap ml-g2">在项目中工作</span>
            </button>
          </div>
          <button className="group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover h-small rounded-small text-footnote justify-between pl-p3 pr-p2 shrink-0" type="button">
            <span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">Opus 4</span>
            <Icon name="CaretDown" size="xs" />
          </button>
          <button
            aria-label="开始任务"
            className="group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-primary-default disabled:text-primary-disabled h-base text-body rounded-base justify-center aspect-square px-p3 disabled:opacity-50"
            disabled={busy || prompt.trim().length === 0}
            onClick={onSubmit}
            type="button"
          >
            <span className="btn-squish absolute inset-0 -z-[1] rounded-[inherit]" style={{ backgroundColor: "#e6b5a6" }} aria-hidden="true" />
            <Icon name="ArrowUp" customSize={20} bold />
          </button>
        </div>
      </div>
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
  return (
    <div className="flex flex-col gap-[20px] p-[12px] pt-[8px] rounded-r6 bg-t1 max-w-[480px]">
      <div className="flex items-center gap-g4 min-w-0">
        <SegmentedTabs labels={["概览", "模型"]} selectedIndex={0} />
        <span className="flex-1" />
        <SegmentedTabs labels={["全部", "30天", "7天"]} selectedIndex={0} />
      </div>
      <div className="flex flex-col gap-g5">
        <div className="grid grid-cols-4 gap-g3">
          <StatTile label="会话数" value={codeStats.sessions} />
          <StatTile label="消息数" value={codeStats.messages} />
          <StatTile label="总 Tokens" value={codeStats.tokens} />
          <StatTile label="活跃天数" value={codeStats.activeDays} />
          <StatTile label="当前连续天数" value={codeStats.currentStreak} />
          <StatTile label="最长连续天数" value={codeStats.longestStreak} />
          <StatTile label="高峰时段" value={codeStats.peakHour} />
          <StatTile label="最常用模型" value={codeStats.favoriteModel} small />
        </div>
        <Heatmap />
        <span className="text-caption text-t6 pt-[4px]">你使用的 Tokens 大约是 {codeStats.tokenBook} 的 {codeStats.tokenTimes} 倍。</span>
      </div>
    </div>
  );
}

function CodeComposer({ busy, onSubmit, prompt, setPrompt, workspace }: { busy: boolean; onSubmit: () => void; prompt: string; setPrompt: (value: string) => void; workspace: WorkspaceContext }) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div className="flex flex-col gap-g5">
      <div className="flex flex-wrap gap-g5 pb-p3 pr-[96px]">
        <ComposerChip icon="Laptop" label="本地" />
        <ComposerChip icon="Folder" label={workspace.projectName} />
        <div className="group/split inline-flex rounded-r5 bg-fill-contained-default effect-contained-default has-[[aria-expanded=true]]:bg-[var(--fill-contained-selected)]">
          <button className={`${composerSplitPillClass} gap-g5 px-p5`} type="button">
            <Icon name="GitBranch" size="sm" />
            <span className="truncate">{workspace.branchName}</span>
          </button>
          {workspace.hasWorktree ? <span aria-hidden="true" className="w-px my-[7px] bg-t3 transition-opacity group-hover/split:opacity-0 group-focus-within/split:opacity-0" /> : null}
          {workspace.hasWorktree ? (
            <button className={`${composerSplitPillClass} group/cb gap-g2 pl-p4 pr-p5`} type="button">
              <span className="inline-flex items-center justify-center size-[16px] shrink-0 p-[2.4px]">
                <span className="flex items-center justify-center size-full rounded-[2.4px] bg-[var(--accent)]">
                  <svg width="6" height="5" viewBox="0 0 5.875 5.375" fill="none" aria-hidden="true" className="text-[var(--core-white)]">
                    <path d="M0.500014 2.75004L2.25001 4.87504L5.37501 0.500039" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </span>
              <span>worktree</span>
            </button>
          ) : null}
        </div>
        <button className={composerPillClass} type="button" aria-label="Add another folder">
          <Icon name="FolderPlus" customSize={16} />
        </button>
      </div>
      <DraftClawd />
      <div
        className="epitaxy-prompt relative isolate rounded-r7 transition-shadow duration-300"
        onClick={(event) => {
          if (event.target instanceof HTMLElement && event.target.closest("button")) return;
          textareaRef.current?.focus();
        }}
        style={{ boxShadow: "var(--df-shadow-card)" }}
      >
        <div className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-prompt-blur effect-prompt-blur" />
        <span className="sr-only" role="status" />
        <div className="grid min-w-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none" style={{ gridTemplateRows: "0fr" }}>
          <div className="min-h-0 overflow-hidden" />
        </div>
        <div className="relative flex w-full">
          <div className="epitaxy-prompt-input flex-1 min-w-0 text-heading text-t9 [&_.tiptap]:min-h-[var(--h8)] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:py-[13px] [&_.tiptap]:pl-p7 [&_.tiptap]:pr-p3 [&_.tiptap_p]:m-0">
            <textarea
              aria-label="描述一个任务，或提一个问题"
              className="tiptap block w-full resize-none bg-transparent placeholder:text-t5"
              disabled={busy}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="描述一个任务，或提一个问题"
              ref={textareaRef}
              rows={1}
              value={prompt}
            />
          </div>
          <div className="flex self-end p-p7 pl-p3">
            <button className={composerIconButtonClass} disabled={busy || prompt.trim().length === 0} onClick={onSubmit} type="button" aria-label="Send">
              <span aria-hidden="true" className="btn-squish absolute inset-0 -z-[1] rounded-[inherit] bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)]" />
              <Icon name={busy ? "Stop" : "ArrowReturn"} customSize={16} />
            </button>
          </div>
        </div>
      </div>
      <div className="w-full flex items-center gap-g5 py-[4px]">
        <div className="flex items-center gap-g5 min-w-0">
          <button className={composerDropdownButtonClass} type="button">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)]" />
            <span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap text-extended-yellow">绕过权限</span>
          </button>
          <button className={composerIconDropdownButtonClass} type="button" aria-label="Add">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)]" />
            <Icon name="Add" customSize={16} />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-g4">
          <button className={composerDropdownButtonClass} type="button">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)]" />
            <span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">Opus 4</span>
          </button>
          <button className={`${composerIconButtonClass} h-small text-footnote rounded-small shrink-0`} type="button" aria-label="Usage">
            <span aria-hidden="true" className="btn-squish absolute inset-0 -z-[1] rounded-[inherit] bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)]" />
            <span className="size-[12px] rounded-full border-2 border-border-400" aria-hidden="true" />
          </button>
        </div>
      </div>
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
const composerPillClass = "relative inline-flex items-center gap-g5 h-[24px] px-p5 rounded-r5 bg-fill-contained-default text-contained-default text-body effect-contained-default hover:bg-fill-contained-hover hover:text-contained-hover disabled:bg-fill-contained-disabled disabled:text-contained-disabled aria-[expanded=true]:bg-[var(--fill-contained-selected)] aria-[expanded=true]:text-[var(--text-contained-selected)] aria-[expanded=true]:hover:bg-[var(--fill-contained-selected)] aria-[expanded=true]:hover:text-[var(--text-contained-selected)] cursor-default select-none border-0 outline-none hide-focus-ring ring-focus";
const composerSplitPillClass = "relative inline-flex items-center h-[24px] bg-transparent text-contained-default text-body hover:bg-fill-contained-hover hover:text-contained-hover disabled:text-contained-disabled aria-[expanded=true]:text-[var(--text-contained-selected)] aria-[expanded=true]:hover:bg-transparent aria-[expanded=true]:hover:text-[var(--text-contained-selected)] cursor-default select-none border-0 outline-none hide-focus-ring ring-focus rounded-[inherit]";
const composerDropdownButtonClass = "group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)] h-small rounded-small text-footnote justify-between pl-p5 pr-p2";
const composerIconDropdownButtonClass = "group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)] h-small rounded-small text-footnote justify-between pl-p3 pr-p2 shrink-0";
const composerIconButtonClass = "group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy pressed:text-uncontained-selected pressed:hover:text-uncontained-selected ring-focus h-base text-body rounded-base justify-center aspect-square px-p3";

function ComposerChip({ icon, label }: { icon?: string; label: string }) {
  return (
    <button className={composerPillClass} type="button">
      {icon ? <Icon name={icon} size="sm" /> : null}
      <span className="truncate max-w-[200px]">{label}</span>
    </button>
  );
}

function SegmentedTabs({ labels, selectedIndex }: { labels: string[]; selectedIndex: number }) {
  const items = labels.map((label) => ({ label, value: label }));
  const selectedValue = items[selectedIndex]?.value ?? items[0]?.value;

  return (
    <Tabs.Root value={selectedValue} onValueChange={() => undefined}>
      <Tabs.List aria-label={labels.join(" / ")} className="inline-flex items-center gap-g1">
        {items.map((item) => {
          const selected = item.value === selectedValue;
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

function Heatmap() {
  const weeks = useMemo(() => Array.from({ length: 26 }, (_, week) => Array.from({ length: 7 }, (_, day) => week * 7 + day)), []);
  return (
    <div role="img" aria-label="Daily activity heatmap" className="flex gap-[3px] w-full">
      {weeks.map((week, weekIndex) => (
        <div className="flex flex-col gap-[3px] flex-1 min-w-0" key={weekIndex}>
          {week.map((index) => {
            const lightness = codeHeatmapActive.get(index);
            return <div className="aspect-square rounded-r1 bg-t2" key={index} style={lightness ? { backgroundColor: `hsl(217 70% ${lightness}%)` } : undefined} />;
          })}
        </div>
      ))}
    </div>
  );
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
