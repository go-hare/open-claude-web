import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GitCommandResult, LocalPrState, LocalSessionsBridge, SessionSummary } from "../../adapters/desktopBridge/types";
import { Icon } from "../../shell/icons";
import { parseLocalBranches, resolveOfficialBaseBranch } from "./composer/workspaceControlsHelpers";
import { OfficialButton, OfficialSplitDropdownButton, type OfficialDropdownItem } from "./OfficialEpitaxyComponents";

type OfficialBranchSessionRef = {
  id: string;
  type: "local" | "remote" | "bridge";
};

type GitInfo = {
  branch?: string | null;
  cwd?: string | null;
  defaultBranch?: string | null;
  remotes?: string | null;
  root?: string | null;
};

/** Official nM / Yk pr visual states (c11959232 EpitaxyBranchRow). */
type OfficialPrVisualState = "open" | "draft" | "merged" | "closed" | "changesRequested" | "conflicting" | "queued";
type OfficialPrMode = "create" | "draft" | "compose" | "view";
type OfficialCiStatus = "failed" | "passed" | "unavailable" | "loading" | "pending";

type BranchRowState = {
  additions: number;
  baseBranch: string;
  branchName: string;
  changedFiles: number;
  cwd?: string;
  deletions: number;
  hasChanges: boolean;
  hasRemote: boolean;
  prNumber?: number;
  prUrl?: string;
  prVisual?: OfficialPrVisualState;
  remoteSlug?: string;
  repoName?: string;
};

type OfficialEpitaxyBranchRowsProps = {
  bridge: LocalSessionsBridge;
  onOpenDiff?: () => void;
  session: SessionSummary | null;
  sessionRef: OfficialBranchSessionRef | null;
};

/** Official ccr_auto_create_pr_as_draft (cc989143e / ClaudeCodeSettings). */
const CREATE_PR_AS_DRAFT_KEY = "ccr_auto_create_pr_as_draft";

function readCreateAsDraft(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(CREATE_PR_AS_DRAFT_KEY);
  if (raw === null) return true;
  try {
    return JSON.parse(raw) !== false;
  } catch {
    return raw !== "false";
  }
}

function writeCreateAsDraft(draft: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CREATE_PR_AS_DRAFT_KEY, JSON.stringify(draft));
}

/** Official Yk / Xk PR icon map (c11959232). */
const PR_STATE_ICON: Record<OfficialPrVisualState, { name: string; accent?: "green" | "purple" | "pink" | "orange" | "yellow" }> = {
  open: { name: "GitPullRequest", accent: "green" },
  draft: { name: "GitDraftPullRequestPR" },
  merged: { name: "GitMergedSimple", accent: "purple" },
  closed: { name: "GitPullRequestClosed", accent: "pink" },
  changesRequested: { name: "GitPullRequestClosed", accent: "pink" },
  conflicting: { name: "GitMergeConflict", accent: "orange" },
  queued: { name: "GitMergedSimple", accent: "yellow" },
};

const PR_STATE_ELEVATION: Partial<Record<OfficialPrVisualState, "purple" | "yellow">> = {
  merged: "purple",
  queued: "yellow",
};

const ELEVATION_BG: Record<"purple" | "yellow", string> = {
  purple: "!bg-[var(--extended-10-purple)] !shadow-none ![backdrop-filter:none]",
  yellow: "!bg-[var(--extended-10-yellow)] !shadow-none ![backdrop-filter:none]",
};

const ELEVATION_TEXT: Record<"purple" | "yellow", string> = {
  purple: "text-extended-purple",
  yellow: "text-extended-yellow",
};

/**
 * Official EpitaxyBranchRow (_Component109 / aM / c11959232):
 * baseBranch = defaultBranch ?? main|master ?? current;
 * nM labels Create PR / View PR / Create draft PR / Manually create PR;
 * prMenuItems when no PR; CI chip from getPrChecks when PR exists.
 */
export const OfficialEpitaxyBranchRows = memo(function OfficialEpitaxyBranchRows({ bridge, onOpenDiff, session, sessionRef }: OfficialEpitaxyBranchRowsProps) {
  const [state, setState] = useState<BranchRowState | null>(null);
  const [prBusy, setPrBusy] = useState(false);
  const [prError, setPrError] = useState<string | null>(null);
  const [prMode, setPrMode] = useState<OfficialPrMode>(() => (readCreateAsDraft() ? "draft" : "create"));
  const [ciStatus, setCiStatus] = useState<OfficialCiStatus | null>(null);
  const reloadKey = `${sessionRef?.id ?? ""}:${session?.updatedAtMs ?? ""}:${session?.repo?.branch ?? ""}:${session?.repo?.name ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!sessionRef || sessionRef.type !== "local") {
        setState(null);
        setCiStatus(null);
        return;
      }

      const sessionId = sessionRef.id;
      const [gitInfoRaw, branchesRaw, workingTree, prState] = await Promise.all([
        bridge.getGitInfo?.(sessionId).catch(() => null),
        bridge.getLocalBranches?.(sessionId).catch(() => null),
        bridge.getWorkingTreeStatus?.(sessionId).catch(() => null),
        bridge.getPrStateForBranch?.(sessionId, session?.repo?.branch).catch(() => null),
      ]);
      if (cancelled) return;

      const gitInfo = normalizeGitInfo(gitInfoRaw);
      const branchName = normalizeLabel(session?.repo?.branch) ?? normalizeLabel(gitInfo?.branch);
      const cwd = normalizeLabel(gitInfo?.root) ?? normalizeLabel(gitInfo?.cwd) ?? normalizeLabel(session?.cwd);
      const remoteSlug = normalizeLabel(session?.repo?.name) ?? parseRemoteSlug(gitInfo?.remotes);
      const repoName = remoteSlug ? shortRepoName(remoteSlug) : normalizeLabel(basename(cwd));
      const branches = parseLocalBranches(branchesRaw, branchName ?? "");
      const baseBranch = resolveOfficialBaseBranch({
        branches,
        currentBranch: branchName,
        defaultBranch: gitInfo?.defaultBranch,
      });

      const diffStats = await bridge.getGitDiffStats?.(sessionId, baseBranch).catch(() => null);
      if (cancelled) return;

      const stat = parseGitDiffStat(diffStats);
      const statusText = resultText(workingTree);
      const hasChanges = stat.changedFiles > 0 || hasWorkingTreeChanges(statusText);
      const hasRemote = Boolean(remoteSlug || normalizeLabel(gitInfo?.remotes));
      const prUrl = normalizeLabel(prState?.url);
      const prNumber = typeof prState?.number === "number" ? prState.number : undefined;
      const prVisual = officialPrVisualFromState(prState);

      // Official: hide row when no changes and no open PR stack.
      if (!branchName || !repoName || (!hasChanges && !prUrl)) {
        setState(null);
        setCiStatus(null);
        return;
      }

      setState({
        additions: stat.additions,
        baseBranch,
        branchName,
        changedFiles: stat.changedFiles || countStatusFiles(statusText),
        cwd,
        deletions: stat.deletions,
        hasChanges,
        hasRemote,
        prNumber,
        prUrl,
        prVisual,
        remoteSlug,
        repoName,
      });

      if (prUrl && prVisual !== "merged" && bridge.getPrChecks) {
        setCiStatus("loading");
        const checks = await bridge.getPrChecks(sessionId, prNumber ?? branchName).catch(() => null);
        if (cancelled) return;
        setCiStatus(officialCiStatusFromChecks(checks));
      } else {
        setCiStatus(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [bridge, reloadKey, session?.cwd, session?.repo?.branch, session?.repo?.name, sessionRef]);

  const openComposePr = useCallback((row: BranchRowState) => {
    const url = officialComposePrUrl(row);
    if (url) window.open(url, "_blank", "noopener");
  }, []);

  const createPr = useCallback(async (mode: OfficialPrMode = prMode) => {
    if (!sessionRef || !state || prBusy) return;
    if (state.prUrl) {
      window.open(state.prUrl, "_blank", "noopener");
      return;
    }
    if (mode === "compose") {
      setPrMode("compose");
      openComposePr(state);
      return;
    }
    if (!state.hasRemote) {
      setPrError("Add a GitHub remote to create a pull request");
      return;
    }
    if (!state.hasChanges && !state.prUrl) {
      setPrError("No changes to create a PR from");
      return;
    }
    setPrBusy(true);
    setPrError(null);
    setPrMode(mode === "draft" ? "draft" : "create");
    writeCreateAsDraft(mode === "draft");
    try {
      const draft = mode === "draft";
      const content = await bridge.generateLocalPrContent?.(sessionRef.id).catch(() => null);
      const sessionUrl = new URL(`/code/${sessionRef.id}`, window.location.origin).toString();
      const body = content?.body ? `${content.body}\n\n${sessionUrl}` : sessionUrl;
      const result = await bridge.createLocalPr?.(sessionRef.id, {
        title: content?.title,
        body,
        draft,
      });
      const ok = result?.ok !== false && result?.success !== false;
      if (!ok) {
        setPrError(result?.error || result?.stderr || "Could not create pull request. You can try again.");
        return;
      }
      const stdout = resultText(result);
      const urlMatch = stdout.match(/https?:\/\/\S+/);
      if (urlMatch) {
        setState((current) => (current ? {
          ...current,
          prUrl: urlMatch[0],
          prVisual: draft ? "draft" : "open",
        } : current));
        window.open(urlMatch[0], "_blank", "noopener");
      }
    } catch (error) {
      setPrError(error instanceof Error ? error.message : "Could not create pull request. You can try again.");
    } finally {
      setPrBusy(false);
    }
  }, [bridge, openComposePr, prBusy, prMode, sessionRef, state]);

  const prMenuItems = useMemo((): OfficialDropdownItem[] | undefined => {
    if (!state || state.prUrl) return undefined;
    return [
      {
        icon: "GitPullRequest",
        label: "Create PR",
        checked: prMode === "create",
        onSelect: () => {
          setPrMode("create");
          writeCreateAsDraft(false);
        },
      },
      {
        icon: "GitDraftPullRequestPR",
        label: "Create draft PR",
        checked: prMode === "draft",
        onSelect: () => {
          setPrMode("draft");
          writeCreateAsDraft(true);
        },
      },
      {
        icon: "SquareArrowTopRightOpenLink",
        label: "Manually create PR",
        checked: prMode === "compose",
        disabled: !state.hasRemote && !state.remoteSlug,
        // Official: menu only selects compose mode; primary Kw click opens compose URL (Z/P).
        onSelect: () => {
          setPrMode("compose");
        },
      },
    ];
  }, [openComposePr, prMode, state]);

  if (!state) return null;

  return (
    <div className="flex flex-col gap-g3">
      <EpitaxyBranchRow
        ciStatus={ciStatus}
        onCreatePr={() => void createPr(prMode)}
        onOpenDiff={onOpenDiff}
        onOpenPr={() => {
          if (state.prUrl) window.open(state.prUrl, "_blank", "noopener");
        }}
        prBusy={prBusy}
        prMenuItems={prMenuItems}
        prMode={state.prUrl ? "view" : prMode}
        state={state}
      />
      {prError ? <p className="text-footnote text-extended-pink select-text">{prError}</p> : null}
    </div>
  );
});

function EpitaxyBranchRow({
  ciStatus,
  onCreatePr,
  onOpenDiff,
  onOpenPr,
  prBusy,
  prMenuItems,
  prMode,
  state,
}: {
  ciStatus: OfficialCiStatus | null;
  onCreatePr: () => void;
  onOpenDiff?: () => void;
  onOpenPr: () => void;
  prBusy: boolean;
  prMenuItems?: OfficialDropdownItem[];
  prMode: OfficialPrMode;
  state: BranchRowState;
}) {
  const prLabel = officialPrActionLabel(prMode, prBusy);
  const prDisabled = prBusy || (!state.prUrl && !state.hasRemote && prMode !== "compose");
  const prDisabledReason = !state.hasRemote && prMode !== "compose"
    ? "Add a GitHub remote to create a pull request"
    : !state.hasChanges && !state.prUrl
      ? "No changes to create a PR from"
      : undefined;
  const iconMeta = state.prVisual ? PR_STATE_ICON[state.prVisual] : { name: "GitPullRequest" as const };
  const elevation = state.prVisual ? PR_STATE_ELEVATION[state.prVisual] : undefined;
  const prIconAria = state.prVisual
    ? state.prNumber
      ? `#${state.prNumber} · ${officialPrStateLabel(state.prVisual)}`
      : officialPrStateLabel(state.prVisual)
    : "PR not yet created";

  return (
    <div className="epitaxy-branch-row relative isolate flex items-center gap-g4 w-full p-p6 rounded-r7 mb-[2px]">
      <span
        aria-hidden="true"
        className={[
          "absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-primary-elevated effect-primary-elevated",
          elevation ? ELEVATION_BG[elevation] : "",
        ].filter(Boolean).join(" ")}
      />
      <div className="flex-1 flex items-center gap-g1 min-w-0">
        <OfficialButton
          ariaLabel={prIconAria}
          className={iconMeta.accent ? "shrink-0 [&:hover_.btn-squish]:!bg-[var(--accent-10)] [&:active_.btn-squish]:!bg-[var(--accent-10)]" : "shrink-0"}
          disabled={!state.prUrl}
          icon={iconMeta.name}
          size="base"
          variant={iconMeta.accent ? "accent" : "contained"}
          onClick={state.prUrl ? onOpenPr : undefined}
        />
        {state.repoName ? <span className="px-p6 text-footnote text-t6 shrink-0">{state.repoName}</span> : null}
        <span className="epitaxy-branch-flow contents">
          <OfficialButton
            className="shrink-0"
            size="base"
            variant={elevation ? "link" : "uncontained"}
          >
            {state.baseBranch}
          </OfficialButton>
          <Icon
            name="ArrowLeft"
            size="xs"
            className={["shrink-0 -mx-[var(--p3)]", elevation ? ELEVATION_TEXT[elevation] : "text-t6"].join(" ")}
          />
          <OfficialBranchNameButton branchName={state.branchName} />
        </span>
      </div>
      {state.changedFiles > 0 ? (
        <OfficialButton className="shrink-0" onClick={onOpenDiff} size="base" variant={elevation ? "uncontained" : "contained"}>
          <OfficialDiffStat added={state.additions} removed={state.deletions} />
        </OfficialButton>
      ) : null}
      {ciStatus && state.prUrl && state.prVisual !== "merged" ? (
        <OfficialButton
          className="gap-g2"
          onClick={state.prUrl ? () => window.open(`${state.prUrl}/checks`, "_blank", "noopener") : undefined}
          size="base"
          variant="contained"
        >
          <OfficialCiStatusDot status={ciStatus} />
          <span>CI</span>
          <Icon name="ChevronDownSmall" size="xs" className="text-t6 -mr-[2px]" />
        </OfficialButton>
      ) : null}
      {elevation ? (
        <OfficialButton onClick={state.prUrl ? onOpenPr : onCreatePr} size="base" variant="link">
          {prLabel}
        </OfficialButton>
      ) : prDisabled && prDisabledReason && !state.prUrl ? (
        <span title={prDisabledReason} className="inline-flex">
          <OfficialButton disabled size="base" variant="contained">
            {prLabel}
          </OfficialButton>
        </span>
      ) : prMenuItems && prMenuItems.length > 0 && !state.prUrl ? (
        <OfficialSplitDropdownButton
          align="end"
          ariaLabel={prLabel}
          busy={prBusy}
          disabled={prDisabled}
          items={prMenuItems}
          label={prLabel}
          menuLabel="More PR options"
          onIconClick={onCreatePr}
          side="top"
          size="base"
          variant="contained"
        />
      ) : (
        <OfficialButton disabled={prDisabled} onClick={state.prUrl ? onOpenPr : onCreatePr} size="base" variant="contained">
          {prLabel}
        </OfficialButton>
      )}
    </div>
  );
}

/** Official sM CI status glyph (c11959232). */
function OfficialCiStatusDot({ status }: { status: OfficialCiStatus }) {
  if (status === "failed") return <span className="size-[6px] rounded-full bg-extended-pink" />;
  if (status === "passed") return <span className="size-[6px] rounded-full bg-extended-green" />;
  if (status === "unavailable") return <span className="size-[6px] rounded-full bg-t4" />;
  // loading / pending — official jd spinner size s
  return (
    <span data-cds="Spinner" className="relative inline-block shrink-0 align-middle" style={{ height: 12, width: 12 }} aria-hidden="true">
      <span className="absolute inset-0 rounded-full" style={{ border: "1.5px solid var(--cds-border, var(--t2))" }} />
      <span className="absolute inset-0 rounded-full animate-[spin_2s_linear_infinite]" style={{ background: "conic-gradient(transparent 40%, var(--cds-text-muted, var(--t6)))", WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1px))", mask: "radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1px))" }} />
    </span>
  );
}

function OfficialBranchNameButton({ branchName }: { branchName: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);
  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(branchName);
    setCopied(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1200);
  }, [branchName]);

  return (
    <OfficialButton className="min-w-0" onClick={copy} size="base" variant="uncontained">
      <span className="truncate">{branchName}</span>
      <Icon name={copied ? "CheckSelection" : "CopySquareBehind"} size="xs" className={`shrink-0 text-t6 transition-opacity ${copied ? "opacity-100" : "opacity-0 group-hover/btn:opacity-100 group-focus-visible/btn:opacity-100"}`} />
    </OfficialButton>
  );
}

function OfficialDiffStat({ added, removed }: { added: number; removed: number }) {
  return (
    <span className="contents text-footnote-medium">
      <span className="text-extended-green">+{added}</span>
      <span className="text-extended-pink">-{removed}</span>
    </span>
  );
}

/** Official nM busy labels (c11959232). */
function officialPrActionLabel(mode: OfficialPrMode, busy: boolean) {
  if (busy) {
    if (mode === "view") return "View PR";
    return "Creating PR…";
  }
  switch (mode) {
    case "view":
      return "View PR";
    case "create":
      return "Create PR";
    case "draft":
      return "Create draft PR";
    case "compose":
      return "Manually create PR";
    default:
      return "Create PR";
  }
}

function officialPrStateLabel(state: OfficialPrVisualState) {
  switch (state) {
    case "open":
      return "Open";
    case "draft":
      return "Draft";
    case "merged":
      return "Merged";
    case "closed":
      return "Closed";
    case "changesRequested":
      return "Changes requested";
    case "conflicting":
      return "Merge conflicts";
    case "queued":
      return "In merge queue";
    default:
      return "Open";
  }
}

function officialPrVisualFromState(prState?: LocalPrState | null): OfficialPrVisualState | undefined {
  if (!prState?.url && prState?.number == null) return undefined;
  if (prState.merged || prState.state === "merged") return "merged";
  if (prState.draft) return "draft";
  if (prState.state === "closed") return "closed";
  if (prState.state === "open" || !prState.state) return "open";
  return "open";
}

function officialCiStatusFromChecks(raw: unknown): OfficialCiStatus {
  if (raw == null) return "unavailable";
  const record = raw as Record<string, unknown>;
  if (record.ok === false && !Array.isArray(record.checkRuns)) return "unavailable";
  const runs = Array.isArray(record.checkRuns) ? record.checkRuns : [];
  const statusPayload = record.status && typeof record.status === "object" ? record.status as Record<string, unknown> : null;
  if (runs.length === 0 && !statusPayload) return "unavailable";

  let failed = 0;
  let pending = 0;
  let passed = 0;
  for (const run of runs) {
    const item = run as Record<string, unknown>;
    const conclusion = String(item.conclusion ?? "").toLowerCase();
    const status = String(item.status ?? "").toLowerCase();
    if (conclusion === "failure" || conclusion === "timed_out" || conclusion === "cancelled" || conclusion === "action_required") failed += 1;
    else if (status === "queued" || status === "in_progress" || status === "waiting" || status === "requested" || conclusion === "" || conclusion === "null") pending += 1;
    else if (conclusion === "success" || conclusion === "neutral" || conclusion === "skipped") passed += 1;
  }
  const combined = String(statusPayload?.state ?? "").toLowerCase();
  if (combined === "failure" || failed > 0) return "failed";
  if (combined === "pending" || pending > 0) return "pending";
  if (combined === "success" || passed > 0) return "passed";
  return "unavailable";
}

/**
 * Best-effort GitHub compare URL for Manually create PR (official compose path).
 * Do not encodeURIComponent the whole ref — GitHub compare expects literal `/` in branch names
 * (e.g. feature/x). Only strip characters that would break the path.
 */
function officialComposePrUrl(row: BranchRowState): string | null {
  const slug = row.remoteSlug;
  if (!slug || !row.branchName) return null;
  const base = row.baseBranch || "main";
  const safeRef = (value: string) => value.replace(/[?#\s]/g, (ch) => encodeURIComponent(ch));
  return `https://github.com/${slug}/compare/${safeRef(base)}...${safeRef(row.branchName)}?expand=1`;
}

function parseRemoteSlug(remotes?: string | null): string | undefined {
  if (!remotes) return undefined;
  const match = remotes.match(/github\.com[:/]([^/\s]+\/[^/\s.]+?)(?:\.git)?(?:\s|$)/i);
  return match?.[1];
}

function shortRepoName(slug: string) {
  const parts = slug.split("/");
  return parts[parts.length - 1] || slug;
}

function normalizeGitInfo(value: unknown): GitInfo | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    branch: typeof record.branch === "string" ? record.branch : null,
    cwd: typeof record.cwd === "string" ? record.cwd : null,
    defaultBranch: typeof record.defaultBranch === "string" ? record.defaultBranch : null,
    remotes: typeof record.remotes === "string" ? record.remotes : null,
    root: typeof record.root === "string" ? record.root : null,
  };
}

function parseGitDiffStat(result?: GitCommandResult | null) {
  const text = resultText(result);
  const summaryLine = text.split(/\r?\n/).reverse().find((line) => /file(s)? changed|insertion|deletion/.test(line)) ?? "";
  const files = numberBefore(summaryLine, /files? changed/);
  const additions = numberBefore(summaryLine, /insertions?\(\+\)/);
  const deletions = numberBefore(summaryLine, /deletions?\(-\)/);
  return { additions, changedFiles: files, deletions };
}

function numberBefore(text: string, marker: RegExp) {
  const match = text.match(new RegExp(`(\\d+)\\s+${marker.source}`));
  return match ? Number(match[1]) || 0 : 0;
}

function resultText(result?: GitCommandResult | null) {
  if (!result) return "";
  return [result.stdout, result.stderr].filter((part): part is string => typeof part === "string").join("\n").trim();
}

function hasWorkingTreeChanges(text: string) {
  return text.split(/\r?\n/).some((line) => {
    const trimmed = line.trim();
    return Boolean(trimmed) && !trimmed.startsWith("##");
  });
}

function countStatusFiles(text: string) {
  return text.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    return Boolean(trimmed) && !trimmed.startsWith("##");
  }).length;
}

function normalizeLabel(value?: string | null) {
  const text = value?.trim();
  return text ? text : undefined;
}

function basename(value?: string) {
  if (!value) return undefined;
  const cleaned = value.replace(/[\\/]+$/, "");
  return cleaned.split(/[\\/]/).pop();
}
