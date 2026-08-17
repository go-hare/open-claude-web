/**
 * Residual Code Summary mode body (c11959232 yC / cC / fC / hC / xC / vC / dC / bC).
 *
 * Residual gate (chat panel):
 *   Vn = "summary" === Kn && null !== F && Wn
 *   then yC({ sessionRef:F, entries:Ya, isResponding:H }) instead of Xb/Fu.
 *
 * cC: Df.start/stop + Ff(session_summary_*) + sessionStorage epitaxy.sessionSummary:
 * fC: turn/tool/duration/token chips + bC actions
 * hC: "Last turn" slice + Yb(hideLoader) + Gv
 * xC/vC/dC: markdown / skeleton / retry
 *
 * Host: LocalSessions.summarizeSession is residual fork (boolean + events),
 * not invent title dump. Product title SoT is refreshSessionTitle.
 */
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import {
  OfficialButton,
  type OfficialSessionRef,
  type OfficialTranscriptMode,
} from "../OfficialEpitaxyComponents";
import { OfficialCodeMarkdown } from "../OfficialCodeMarkdown";
import { formatUsageTokenCount } from "../OfficialComposerContextUsage";
import {
  CodeAssistantEntryMessage,
  CodeUserEntryMessage,
} from "./OfficialTranscript";
import { OfficialWorkingStatus } from "./OfficialWorkingStatus";
import { useOfficialSidePaneSessionStore } from "./officialSidePaneSessionStore";
import type { TranscriptEntry } from "./officialTranscriptParse";
import { residualBuildSummaryTranscriptDump } from "./officialSummaryTranscriptDump";

export { residualBuildSummaryTranscriptDump } from "./officialSummaryTranscriptDump";

const SESSION_SUMMARY_STORAGE_PREFIX = "epitaxy.sessionSummary:";

type SummaryStatus = "idle" | "generating" | "ready" | "error" | "unsupported";

type CachedSummary = {
  summary: string;
  summarizedAt: number;
};

function residualFormatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}

function residualIsUserTurn(entry: TranscriptEntry): boolean {
  return (
    entry.author === "user"
    && !(entry as { synthetic?: boolean }).synthetic
    && entry.items.some((item) => item.kind === "text" || item.kind === "image")
  );
}

function readCachedSummary(sessionId: string): CachedSummary | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(SESSION_SUMMARY_STORAGE_PREFIX + sessionId);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CachedSummary;
    if (typeof parsed?.summary === "string" && typeof parsed?.summarizedAt === "number") {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function writeCachedSummary(sessionId: string, value: CachedSummary) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_SUMMARY_STORAGE_PREFIX + sessionId, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/**
 * Residual cC(sessionRef, entries, isResponding).
 * Local: Df.start(id) → summarizeSession (fork).
 * Non-local: Df.start(id, dump) → summarizeTranscript.
 */
function useOfficialSessionSummary(
  sessionRef: OfficialSessionRef | null | undefined,
  entries: TranscriptEntry[],
  isResponding: boolean,
): { summary: string; status: SummaryStatus; regenerate: () => void } {
  const sessionId = sessionRef?.id ?? null;
  const isLocal = sessionRef?.type === "local";
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<SummaryStatus>("idle");
  const summarizedAtRef = useRef(0);
  const entriesRef = useRef(entries);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const clearDebounce = useCallback(() => {
    if (debounceRef.current != null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const startSummary = useCallback(
    async (id: string) => {
      summarizedAtRef.current = entriesRef.current.length;
      if (!isLocal && entriesRef.current.length === 0) {
        setStatus("idle");
        return;
      }
      const bridge = desktopBridge.LocalSessions;
      let started = false;
      try {
        if (isLocal) {
          if (!bridge.summarizeSession) {
            setStatus("unsupported");
            return;
          }
          started = Boolean(await bridge.summarizeSession(id));
        } else {
          if (!bridge.summarizeTranscript) {
            setStatus("unsupported");
            return;
          }
          const dump = residualBuildSummaryTranscriptDump(entriesRef.current);
          started = Boolean(await bridge.summarizeTranscript(id, dump));
        }
      } catch {
        started = false;
      }
      setStatus(started ? "generating" : "unsupported");
    },
    [isLocal],
  );

  useEffect(() => {
    if (!sessionId) {
      setStatus("idle");
      return undefined;
    }
    let cancelled = false;
    const cached = readCachedSummary(sessionId);
    setSummary(cached?.summary ?? "");
    summarizedAtRef.current = cached?.summarizedAt ?? 0;

    const unsubscribe = desktopBridge.LocalSessions.onEvent?.((raw) => {
      if (cancelled) return;
      const event = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
      if (!event || event.sessionId !== sessionId) return;
      if (event.type === "session_summary_result") {
        const text = typeof event.data === "string" ? event.data : "";
        setSummary(text);
        setStatus("ready");
        writeCachedSummary(sessionId, {
          summary: text,
          summarizedAt: summarizedAtRef.current,
        });
      } else if (event.type === "session_summary_error") {
        setStatus("error");
      }
    });

    const needsRegen =
      !cached || entriesRef.current.length > cached.summarizedAt;
    if (needsRegen) {
      void startSummary(sessionId);
    } else {
      setStatus("ready");
    }

    return () => {
      cancelled = true;
      clearDebounce();
      unsubscribe?.();
      void desktopBridge.LocalSessions.stopSessionSummary?.(sessionId);
    };
  }, [sessionId, startSummary, clearDebounce]);

  const regenerate = useCallback(() => {
    if (!sessionId) return;
    clearDebounce();
    void startSummary(sessionId);
  }, [sessionId, clearDebounce, startSummary]);

  // Residual: when not responding and entries grew past summarizedAt → debounce 1500ms regen.
  const entryCount = entries.length;
  useEffect(() => {
    if (!sessionId) return;
    if (isResponding) {
      clearDebounce();
      return;
    }
    if (entryCount <= summarizedAtRef.current) return;
    if (status === "generating" || status === "unsupported") return;
    clearDebounce();
    debounceRef.current = setTimeout(() => {
      regenerate();
    }, 1500);
    return clearDebounce;
  }, [sessionId, entryCount, isResponding, status, regenerate, clearDebounce]);

  return { summary, status, regenerate };
}

function SummaryChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center h-base px-p5 rounded-radius-full bg-t1 text-footnote text-t7 tabular-nums">
      {children}
    </span>
  );
}

/** Residual bC — Exit summary / View transcript. */
function SummaryActions() {
  const setTranscriptMode = useOfficialSidePaneSessionStore((s) => s.setTranscriptMode);
  // Residual toggleSidePane("transcript") — product tile layout may strip "transcript";
  // still call residual toggle so any open transcript chrome closes; exit uses setTranscriptMode.
  const toggleSidePane = useOfficialSidePaneSessionStore((s) => s.toggleSidePane);

  const exitSummary = useCallback(() => {
    setTranscriptMode("normal" as OfficialTranscriptMode);
  }, [setTranscriptMode]);

  const viewTranscript = useCallback(() => {
    // Residual: n("transcript"). Product: exit to normal mode is the practical equivalent
    // when no transcript side pane is mounted; still invoke toggle for residual parity.
    toggleSidePane("transcript" as never);
    setTranscriptMode("normal" as OfficialTranscriptMode);
  }, [toggleSidePane, setTranscriptMode]);

  return (
    <div className="flex items-center gap-g3">
      <OfficialButton size="base" variant="uncontained" onClick={viewTranscript}>
        View transcript
      </OfficialButton>
      <OfficialButton size="base" variant="contained" onClick={exitSummary}>
        Exit summary view
      </OfficialButton>
    </div>
  );
}

/** Residual fC stats row. */
const SummaryStatsBar = memo(function SummaryStatsBar({
  sessionRef,
  entries,
}: {
  sessionRef: OfficialSessionRef;
  entries: TranscriptEntry[];
}) {
  const [contextTokens, setContextTokens] = useState<number | null>(null);
  const [durationMs, setDurationMs] = useState<number | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    const bridge = desktopBridge.LocalSessions;
    void bridge.getSession?.(sessionRef.id).then((meta) => {
      if (!alive || !meta) return;
      // Residual fC: n?.createdAt && n.lastActivityAt → duration. Product SessionSummary
      // uses createdAtMs / updatedAtMs (updatedAt ISO as last activity proxy).
      const created =
        typeof meta.createdAtMs === "number"
          ? meta.createdAtMs
          : NaN;
      const updated =
        typeof meta.updatedAtMs === "number"
          ? meta.updatedAtMs
          : meta.updatedAt
            ? Date.parse(String(meta.updatedAt))
            : NaN;
      if (Number.isFinite(created) && Number.isFinite(updated) && updated >= created) {
        setDurationMs(updated - created);
      }
    }).catch(() => {});
    void bridge.getContextUsage?.(sessionRef.id).then((usage) => {
      if (!alive || !usage) return;
      const total = typeof usage.totalTokens === "number" ? usage.totalTokens : null;
      setContextTokens(total);
    }).catch(() => setContextTokens(null));
    return () => {
      alive = false;
    };
  }, [sessionRef.id, entries.length]);

  const { turnCount, toolCount } = useMemo(() => {
    let turns = 0;
    let tools = 0;
    for (const entry of entries) {
      if (residualIsUserTurn(entry)) turns += 1;
      else {
        for (const item of entry.items) {
          if (item.kind === "tools") {
            tools += (item as { tools?: unknown[] }).tools?.length ?? 0;
          }
        }
      }
    }
    return { turnCount: turns, toolCount: tools };
  }, [entries]);

  return (
    <div className="flex items-center gap-g4 min-h-base">
      <div className="flex flex-wrap items-center gap-g3 min-w-0">
        <SummaryChip>
          {turnCount === 1 ? "1 turn" : `${turnCount} turns`}
        </SummaryChip>
        <SummaryChip>
          {toolCount === 1 ? "1 tool call" : `${toolCount} tool calls`}
        </SummaryChip>
        {durationMs !== undefined ? (
          <SummaryChip>{residualFormatDuration(durationMs)}</SummaryChip>
        ) : null}
        {contextTokens !== null ? (
          <SummaryChip>{`${formatUsageTokenCount(contextTokens)} tokens`}</SummaryChip>
        ) : null}
      </div>
      <div className="ml-auto shrink-0">
        <SummaryActions />
      </div>
    </div>
  );
});

const SUMMARY_MARKDOWN_CLASS =
  "min-h-0 overflow-y-auto rounded-r6 bg-t1 p-p8 [&_:is(h1,h2,h3,h4,h5,h6)]:text-heading-semibold [&_:is(h1,h2,h3,h4,h5,h6)]:text-assistant-primary [&_:is(h1,h2,h3,h4,h5,h6):not(:first-child)]:mt-[var(--p8)]";

/** Residual xC. */
const SummaryMarkdown = memo(function SummaryMarkdown({ summary }: { summary: string }) {
  return (
    <div className={`${SUMMARY_MARKDOWN_CLASS} select-text`}>
      {/* OfficialCodeMarkdown = residual kb — prop is `text`, not children. */}
      <OfficialCodeMarkdown text={summary} />
    </div>
  );
});

/** Residual vC skeleton. */
function SummarySkeleton() {
  return (
    <div aria-hidden className={`${SUMMARY_MARKDOWN_CLASS} animate-pulse`}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={i > 0 ? "mt-[var(--p8)]" : undefined}>
          <div className="h-[14px] w-[96px] rounded-r3 bg-t3" />
          <div className="mt-[var(--p3)] h-[10px] w-full rounded-r3 bg-t2" />
          <div className="mt-[6px] h-[10px] w-[70%] rounded-r3 bg-t2" />
        </div>
      ))}
    </div>
  );
}

/** Residual dC retry. */
function SummaryRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      type="button"
      aria-label="Retry summary"
      onClick={onRetry}
      className="self-start inline-flex items-center gap-g3 h-base px-p5 rounded-radius-full bg-t1 text-footnote text-[var(--core-red)] border-0 cursor-default outline-none hide-focus-ring ring-focus"
    >
      <span>Couldn&apos;t generate summary — click to retry</span>
      <Icon name="ArrowUndoUp" size="m" className="shrink-0" />
    </button>
  );
}

/** Residual hC Last turn + Yb(hideLoader) + Gv. */
const SummaryLastTurn = memo(function SummaryLastTurn({
  entries,
  isResponding,
  sessionId,
}: {
  entries: TranscriptEntry[];
  isResponding: boolean;
  sessionId: string;
}) {
  const slice = useMemo(() => {
    let lastUser = -1;
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      if (residualIsUserTurn(entries[i]!)) {
        lastUser = i;
        break;
      }
    }
    return lastUser < 0 ? entries : entries.slice(lastUser);
  }, [entries]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showTopScrim, setShowTopScrim] = useState(false);
  const [showBottomScrim, setShowBottomScrim] = useState(false);

  const updateScrims = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    setShowTopScrim(node.scrollTop > 1);
    setShowBottomScrim(node.scrollHeight - node.clientHeight - node.scrollTop > 1);
  }, []);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (node && isResponding) {
      node.scrollTop = node.scrollHeight;
    }
    updateScrims();
  }, [slice, isResponding, updateScrims]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;
    const ro = new ResizeObserver(updateScrims);
    ro.observe(node);
    for (const child of node.children) ro.observe(child);
    return () => ro.disconnect();
  }, [updateScrims, slice]);

  return (
    <div className="flex-1 min-h-[96px] flex flex-col gap-[var(--chat-item-gap)]">
      <h3 className="shrink-0 text-body text-assistant-secondary">Last turn</h3>
      <div className="relative isolate flex-1 min-h-0">
        <div
          aria-hidden
          className="epitaxy-top-scrim transition-opacity"
          style={{ opacity: showTopScrim ? 1 : 0 }}
        />
        <div
          aria-hidden
          className="epitaxy-bottom-scrim"
          style={{ opacity: showBottomScrim ? 1 : 0 }}
        />
        <div ref={scrollRef} onScroll={updateScrims} className="h-full overflow-y-auto">
          <div className="flex flex-col gap-[var(--chat-item-gap)]">
            {/* Residual hC → Yb({ entries, isResponding, sessionId, hideLoader:true }).
                Product maps entries only (no loader row); Gv is sibling OfficialWorkingStatus. */}
            {slice.map((entry) =>
              entry.author === "user" ? (
                <CodeUserEntryMessage key={entry.id} entry={entry} />
              ) : (
                <CodeAssistantEntryMessage
                  key={entry.id}
                  entry={entry}
                  transcriptMode="normal"
                />
              ),
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0">
        <OfficialWorkingStatus sessionId={sessionId} isWorking={isResponding} />
      </div>
    </div>
  );
});

export type OfficialSummaryTranscriptBodyProps = {
  sessionRef: OfficialSessionRef;
  entries: TranscriptEntry[];
  isResponding: boolean;
};

/**
 * Residual yC.
 * When status unsupported / no sessionRef: residual empty copy + bC.
 */
export const OfficialSummaryTranscriptBody = memo(function OfficialSummaryTranscriptBody({
  sessionRef,
  entries,
  isResponding,
}: OfficialSummaryTranscriptBodyProps) {
  const { summary, status, regenerate } = useOfficialSessionSummary(
    sessionRef,
    entries,
    isResponding,
  );

  if (status === "unsupported") {
    return (
      <div className="flex flex-col gap-g6">
        <p className="text-body text-t6">
          Live summary isn&apos;t available for this session yet.
        </p>
        <SummaryActions />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-[var(--chat-turn-gap)]">
      <div className="min-h-0 flex flex-col gap-g6">
        <SummaryStatsBar sessionRef={sessionRef} entries={entries} />
        {summary ? (
          <SummaryMarkdown summary={summary} />
        ) : status === "generating" ? (
          <SummarySkeleton />
        ) : null}
        {status === "error" ? <SummaryRetry onRetry={regenerate} /> : null}
      </div>
      <SummaryLastTurn
        entries={entries}
        isResponding={isResponding}
        sessionId={sessionRef.id}
      />
    </div>
  );
});

