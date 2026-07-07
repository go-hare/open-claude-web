import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { GitCommandResult, LocalSessionsBridge, SessionSummary } from "../../adapters/desktopBridge/types";
import { Icon } from "../../shell/icons";
import { OfficialButton } from "./OfficialEpitaxyComponents";

type OfficialBranchSessionRef = {
  id: string;
  type: "local" | "remote" | "bridge";
};

type GitInfo = {
  branch?: string | null;
  cwd?: string | null;
  remotes?: string | null;
  root?: string | null;
};

type BranchRowState = {
  additions: number;
  baseBranch: string;
  branchName: string;
  changedFiles: number;
  cwd?: string;
  deletions: number;
  hasChanges: boolean;
  hasRemote: boolean;
  repoName?: string;
};

type OfficialEpitaxyBranchRowsProps = {
  bridge: LocalSessionsBridge;
  onOpenDiff?: () => void;
  session: SessionSummary | null;
  sessionRef: OfficialBranchSessionRef | null;
};

export const OfficialEpitaxyBranchRows = memo(function OfficialEpitaxyBranchRows({ bridge, onOpenDiff, session, sessionRef }: OfficialEpitaxyBranchRowsProps) {
  const [state, setState] = useState<BranchRowState | null>(null);
  const reloadKey = `${sessionRef?.id ?? ""}:${session?.updatedAtMs ?? ""}:${session?.repo?.branch ?? ""}:${session?.repo?.name ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!sessionRef || sessionRef.type !== "local") {
        setState(null);
        return;
      }

      const [gitInfoRaw, diffStats, workingTree] = await Promise.all([
        bridge.getGitInfo?.(sessionRef.id).catch(() => null),
        bridge.getGitDiffStats?.(sessionRef.id, "HEAD").catch(() => null),
        bridge.getWorkingTreeStatus?.(sessionRef.id).catch(() => null),
      ]);
      if (cancelled) return;

      const gitInfo = normalizeGitInfo(gitInfoRaw);
      const branchName = normalizeLabel(session?.repo?.branch) ?? normalizeLabel(gitInfo?.branch);
      const cwd = normalizeLabel(gitInfo?.root) ?? normalizeLabel(gitInfo?.cwd) ?? normalizeLabel(session?.cwd);
      const repoName = normalizeLabel(session?.repo?.name) ?? normalizeLabel(basename(cwd));
      const stat = parseGitDiffStat(diffStats);
      const statusText = resultText(workingTree);
      const hasChanges = stat.changedFiles > 0 || hasWorkingTreeChanges(statusText);
      const hasRemote = Boolean(normalizeLabel(session?.repo?.name) || normalizeLabel(gitInfo?.remotes));

      if (!branchName || !repoName || !hasChanges) {
        setState(null);
        return;
      }

      setState({
        additions: stat.additions,
        baseBranch: "HEAD",
        branchName,
        changedFiles: stat.changedFiles || countStatusFiles(statusText),
        cwd,
        deletions: stat.deletions,
        hasChanges,
        hasRemote,
        repoName,
      });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [bridge, reloadKey, session?.cwd, session?.repo?.branch, session?.repo?.name, sessionRef]);

  if (!state) return null;

  return (
    <div className="flex flex-col gap-g3">
      <EpitaxyBranchRow onOpenDiff={onOpenDiff} state={state} />
    </div>
  );
});

function EpitaxyBranchRow({ onOpenDiff, state }: { onOpenDiff?: () => void; state: BranchRowState }) {
  return (
    <div className="epitaxy-branch-row relative isolate flex items-center gap-g4 w-full p-p6 rounded-r7 mb-[2px]">
      <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-primary-elevated effect-primary-elevated" />
      <div className="flex-1 flex items-center gap-g1 min-w-0">
        <OfficialButton ariaLabel="PR not yet created" className="shrink-0" disabled icon="GitPullRequest" size="base" variant="contained" />
        {state.repoName ? <span className="px-p6 text-footnote text-t6 shrink-0">{state.repoName}</span> : null}
        <span className="epitaxy-branch-flow contents">
          <OfficialButton className="shrink-0" size="base" variant="uncontained">{state.baseBranch}</OfficialButton>
          <Icon name="ArrowLeft" size="xs" className="shrink-0 -mx-[var(--p3)] text-t6" />
          <OfficialBranchNameButton branchName={state.branchName} />
        </span>
      </div>
      {state.changedFiles > 0 ? (
        <OfficialButton className="shrink-0" onClick={onOpenDiff} size="base" variant="contained">
          <OfficialDiffStat added={state.additions} removed={state.deletions} />
        </OfficialButton>
      ) : null}
      <OfficialButton disabled={!state.hasRemote} size="base" variant="contained">
        Create PR
      </OfficialButton>
    </div>
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

function normalizeGitInfo(value: unknown): GitInfo | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    branch: typeof record.branch === "string" ? record.branch : null,
    cwd: typeof record.cwd === "string" ? record.cwd : null,
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
