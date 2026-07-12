import { forwardRef, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { CoworkSessionSnapshot } from "../../../../adapters/desktopBridge/types";
import { CoworkClaudeAvatar } from "../transcript/CoworkClaudeAvatar";
import { useCoworkTimelineStatusVisibility } from "../transcript/CoworkTimelineStatusVisibility";
import type { CoworkAgentActivity, CoworkInitializationStatus, CoworkRawMessage } from "../types";
import { coworkToolActivityLabel } from "../transcript/coworkToolActivityLabel";
import { CoworkSessionErrorBanner } from "./CoworkSessionErrorBanner";
import {
  COWORK_TOOL_LOADING_FALLBACK,
  coworkStandbyWaitingMessage,
  extractCoworkLoadingMessagesFromMessages,
  shouldShowCoworkWaitingText,
  type CoworkToolLoadingMessages,
} from "./coworkStatusChannels";
import { coworkWaitingStatus } from "./coworkWaitingStatus";

export type CoworkApiRetryStatus = {
  attempt: number;
  delayMs: number;
  maxRetries: number;
  receivedAt: number;
};

export type CoworkConversationStatusState = {
  activityStartTime?: number | null;
  apiRetryStatus?: CoworkApiRetryStatus;
  compactionStatus?: string;
  connectionState?: string;
  contentLength?: number;
  isWaitingState?: boolean;
  /** Official m$t channel — tool loading_messages while streaming. */
  loadingMessages?: CoworkToolLoadingMessages;
  /** Official path length for ns (messageCount === 2). */
  messageCount?: number;
  /** Official client retryCount `y`. */
  retryCount?: number;
  statusMessage?: string;
};

export function parseCoworkConversationStatus(
  messages: CoworkRawMessage[],
  session: CoworkSessionSnapshot | null,
  activity?: CoworkAgentActivity | null,
  isWorking = false,
  initialization?: CoworkInitializationStatus | null,
  options?: { messageCount?: number; retryCount?: number },
): CoworkConversationStatusState {
  const statusMessage = initialization
    ? initialization.isComplete ? activityText(activity, isWorking) : initialization.message
    : session?.statusMessage ?? parseCoworkStatusMessage(messages) ?? activityText(activity, isWorking);
  const compactionStatus = parseCoworkCompactionStatus(messages);
  const apiRetryStatus = parseCoworkApiRetryStatus(messages);
  return {
    activityStartTime: initialization && !initialization.isComplete ? initialization.startTime : activity?.lastActivityTime,
    apiRetryStatus,
    compactionStatus,
    connectionState: session?.connectionState,
    contentLength: activity?.contentLength,
    isWaitingState: !activity || activity.activity === "thinking",
    loadingMessages: isWorking ? extractCoworkLoadingMessagesFromMessages(messages) : undefined,
    messageCount: options?.messageCount ?? messages.length,
    retryCount: options?.retryCount ?? 0,
    statusMessage,
  };
}

export const CoworkConversationStatus = forwardRef<HTMLDivElement, {
  error?: Error | null;
  errorCategory?: string | null;
  isWorking: boolean;
  onTryAgain?: () => Promise<void> | void;
  startedAt?: number | null;
  status: CoworkConversationStatusState | null;
}>(function CoworkConversationStatus({
  error,
  errorCategory,
  isWorking,
  onTryAgain,
  startedAt,
  status,
}, ref) {
  const { isVisible: timelineStatusVisible } = useCoworkTimelineStatusVisibility();
  const compacting = status?.compactionStatus === "compacting" || status?.compactionStatus === "complete";
  // Official M = streaming && !statusDisplayVisible && !sessionStatusMessage && loadingMessages defined
  const showLoadingMessages =
    isWorking &&
    !timelineStatusVisible &&
    !status?.statusMessage &&
    status?.loadingMessages !== undefined;
  const showWaitingChannel = shouldShowCoworkWaitingText({
    apiRetryActive: Boolean(status?.apiRetryStatus),
    isCompacting: compacting,
    isStreaming: isWorking,
    messageCount: status?.messageCount ?? 0,
    retryCount: status?.retryCount,
  });
  return (
    <div ref={ref}>
      <div className={`ml-1 flex items-center transition-transform duration-300 ease-out ${isWorking ? "mt-2 -translate-y-2.5" : "mt-6"}`}>
        {error ? <CoworkSessionErrorBanner errorCategory={errorCategory} errorMessage={error.message} onTryAgain={onTryAgain} /> : <>
          <div className={`p-1 -translate-x-px ${timelineStatusVisible ? "invisible" : ""}`}>
            <CoworkSparkSpinner isWorking={isWorking || compacting} />
          </div>
          {/* Official s$t: sessionStatusMessage when present and not hidden by k/compacting/apiRetry */}
          {!status?.statusMessage || timelineStatusVisible || compacting || status?.apiRetryStatus
            ? null
            : <CoworkSessionStatusText startedAt={startedAt} status={status} />}
          {status?.connectionState === "disconnected" ? <div className="text-text-400 ml-2 pb-1.5 text-xs">Reconnecting...</div> : null}
        </>}
        {/* Official dual residual: m$t loading_messages wins over h$t when M && j */}
        {showLoadingMessages && status?.loadingMessages !== undefined
          ? <CoworkToolLoadingMessagesRotator messages={status.loadingMessages} />
          : showWaitingChannel
            ? <CoworkWaitingChannel startedAt={startedAt} status={status} timelineStatusVisible={timelineStatusVisible} />
            : null}
      </div>
    </div>
  );
});

/** Official s$t activity/status message (not h$t standby). */
function CoworkSessionStatusText({ startedAt, status }: { startedAt?: number | null; status: CoworkConversationStatusState }) {
  const elapsed = useCoworkElapsedSeconds(startedAt);
  const waiting = coworkWaitingStatus(status.statusMessage, elapsed, status.isWaitingState, status.contentLength);
  if (!waiting.message) return null;
  return (
    <div className="ml-2 pb-1.5 font-base text-text-500">
      {waiting.message}
      {waiting.detail ? <><span className="text-text-500/50 mx-1"> · </span><span className="tabular-nums">{waiting.detail}</span></> : null}
    </div>
  );
}

/** Official h$t: compaction / api_retry / timed standby when shouldShowWaitingText. */
function CoworkWaitingChannel({
  startedAt,
  status,
  timelineStatusVisible,
}: {
  startedAt?: number | null;
  status: CoworkConversationStatusState | null;
  timelineStatusVisible: boolean;
}) {
  const retryText = useCoworkRetryText(status?.apiRetryStatus);
  const elapsed = useCoworkElapsedSeconds(startedAt);
  const seed = useMemo(() => Math.floor(Math.random() * 4), []);
  if (!timelineStatusVisible && (status?.compactionStatus === "compacting" || status?.compactionStatus === "complete")) {
    return <CoworkCompactionProgress status={status.compactionStatus} />;
  }
  if (retryText) {
    return <div className="font-claude-response text-text-300 ml-2 pb-1.5 text-sm italic tabular-nums">{retryText}</div>;
  }
  if (timelineStatusVisible) return null;
  const standby = coworkStandbyWaitingMessage(elapsed, seed);
  if (!standby) return null;
  return (
    <div className="font-claude-response text-text-300 ml-2 pb-1.5 text-sm italic tabular-nums">{standby}</div>
  );
}

/** Official m$t: rotate loading_messages every 3s. */
function CoworkToolLoadingMessagesRotator({ messages }: { messages: CoworkToolLoadingMessages }) {
  const list = useMemo(() => {
    if (messages === COWORK_TOOL_LOADING_FALLBACK) return ["Loading visualization..."];
    if (Array.isArray(messages)) return [...messages];
    return [];
  }, [messages]);
  const listRef = useRef(list);
  listRef.current = list;
  const [current, setCurrent] = useState(() => list[0] ?? "");
  useEffect(() => {
    if (list.length === 0) return undefined;
    setCurrent(list[0] ?? "");
    if (list.length === 1) return undefined;
    const timer = window.setInterval(() => {
      const pool = listRef.current;
      setCurrent((previous: string) => {
        const index = pool.indexOf(previous);
        const next = index === -1 ? 0 : (index + 1) % pool.length;
        return pool[next] ?? previous;
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [list]);
  if (list.length === 0 || !current) return null;
  return (
    <div className="font-claude-response text-text-300 ml-2 pb-1.5 text-sm italic">
      <span className="animate-in fade-in duration-300 inline-block" key={current}>{current}</span>
    </div>
  );
}

function CoworkCompactionProgress({ status }: { status: string }) {
  const progress = useCoworkCompactionProgress(status);
  return (
    <div className="ml-2 pb-1.5">
      <div className="font-small text-text-300">Compacting our conversation so we can keep chatting...</div>
      <div className="mt-1 flex items-center gap-2">
        <div className="bg-bg-500 relative h-1 w-48 overflow-hidden rounded-full after:absolute after:inset-0 after:translate-x-[-100%] after:bg-gradient-to-r after:from-always-white/0 after:from-0% after:via-always-white/20 after:via-50% after:to-always-white/0 after:to-100% after:animate-[shimmer_1.5s_infinite]">
          <div className="bg-text-300 h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-text-400 text-xs tabular-nums">{progress}%</div>
      </div>
    </div>
  );
}

function CoworkSparkSpinner({ isWorking }: { isWorking: boolean }) {
  return <CoworkClaudeAvatar state={isWorking ? "writing" : "static"} />;
}

function activityText(activity: CoworkAgentActivity | null | undefined, isWorking: boolean) {
  if (activity?.activity === "thinking") return "Thinking...";
  if (activity?.activity === "writing") return "Writing...";
  if (activity?.activity === "tool_use" && activity.toolName) {
    const label = coworkToolActivityLabel(activity.toolName, activity.filePath ? { file_path: activity.filePath } : undefined);
    return label ? `${label}...` : `Using ${activity.toolName}...`;
  }
  return isWorking ? "Working on it..." : undefined;
}

function useCoworkCompactionProgress(status: string) {
  const startRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "compacting" && status !== "complete") {
      startRef.current = null;
      lastRef.current = 0;
      setProgress(null);
      return undefined;
    }
    return status === "compacting" ? startCompactionTimer(startRef, lastRef, setProgress) : finishCompactionTimer(lastRef, setProgress);
  }, [status]);

  return progress ?? (status === "complete" ? 100 : 0);
}

function startCompactionTimer(startRef: MutableRefObject<number | null>, lastRef: MutableRefObject<number>, setProgress: (value: number) => void) {
  startRef.current = Date.now();
  lastRef.current = 0;
  setProgress(0);
  const timer = window.setInterval(() => {
    if (!startRef.current) return;
    const seconds = (Date.now() - startRef.current) / 1000;
    const next = Math.max(lastRef.current, Math.round(Math.min(95, 100 * (1 - Math.exp(-seconds / 25)))));
    lastRef.current = next;
    setProgress(next);
  }, 100);
  return () => window.clearInterval(timer);
}

function finishCompactionTimer(lastRef: MutableRefObject<number>, setProgress: (value: number | null) => void) {
  const start = lastRef.current;
  const startTime = Date.now();
  const timer = window.setInterval(() => {
    const amount = Math.min(1, (Date.now() - startTime) / 300);
    const next = Math.round(start + (100 - start) * (1 - Math.pow(1 - amount, 2)));
    lastRef.current = next;
    setProgress(next);
    if (amount >= 1) window.clearInterval(timer);
  }, 16);
  const reset = window.setTimeout(() => setProgress(null), 1000);
  return () => {
    window.clearInterval(timer);
    window.clearTimeout(reset);
  };
}

function useCoworkRetryText(retry: CoworkApiRetryStatus | undefined) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    if (!retry) {
      setSeconds(null);
      return undefined;
    }
    const update = () => setSeconds(Math.max(0, Math.ceil((retry.delayMs - (Date.now() - retry.receivedAt)) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [retry]);

  if (!retry || seconds === null) return null;
  return seconds > 0
    ? `Server is busy. Retrying in ${seconds}s (attempt ${retry.attempt} of ${retry.maxRetries})`
    : `Server is busy. Retrying now (attempt ${retry.attempt} of ${retry.maxRetries})`;
}

function useCoworkElapsedSeconds(startedAt?: number | null) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return undefined;
    }
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  return elapsed;
}

function parseCoworkCompactionStatus(messages: CoworkRawMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const raw = asRecord(messages[index].raw);
    if (stringValue(raw.type) === "system" && stringValue(raw.subtype) === "status") return stringValue(raw.status);
  }
  return undefined;
}

function parseCoworkStatusMessage(messages: CoworkRawMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const raw = asRecord(messages[index].raw);
    if (stringValue(raw.type) !== "system" || stringValue(raw.subtype) !== "status") continue;
    return stringValue(raw.statusMessage) ?? stringValue(raw.status_message) ?? stringValue(raw.message) ?? stringValue(raw.content);
  }
  return undefined;
}

function parseCoworkApiRetryStatus(messages: CoworkRawMessage[]): CoworkApiRetryStatus | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const raw = asRecord(messages[index].raw);
    const type = stringValue(raw.type);
    if (type === "assistant" || type === "result") return undefined;
    if (type === "system" && stringValue(raw.subtype) === "api_retry") return apiRetryStatus(raw);
  }
  return undefined;
}

function apiRetryStatus(raw: Record<string, unknown>): CoworkApiRetryStatus | undefined {
  const attempt = numberValue(raw.attempt);
  const maxRetries = numberValue(raw.max_retries) ?? numberValue(raw.maxRetries);
  const delayMs = numberValue(raw.retry_delay_ms) ?? numberValue(raw.retryDelayMs);
  if (attempt === undefined || maxRetries === undefined || delayMs === undefined) return undefined;
  return { attempt, delayMs, maxRetries, receivedAt: Date.now() };
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
