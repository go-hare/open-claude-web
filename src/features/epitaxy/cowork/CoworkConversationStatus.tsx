import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { ChatMessage, SessionSummary } from "../../../adapters/desktopBridge/types";

export type CoworkApiRetryStatus = {
  attempt: number;
  delayMs: number;
  maxRetries: number;
  receivedAt: number;
};

export type CoworkConversationStatusState = {
  apiRetryStatus?: CoworkApiRetryStatus;
  compactionStatus?: string;
  connectionState?: string;
  statusMessage?: string;
};

export function parseCoworkConversationStatus(messages: ChatMessage[], session: SessionSummary | null): CoworkConversationStatusState {
  return {
    apiRetryStatus: parseCoworkApiRetryStatus(messages),
    compactionStatus: parseCoworkCompactionStatus(messages),
    connectionState: session?.connectionState,
    statusMessage: session?.statusMessage ?? parseCoworkStatusMessage(messages),
  };
}

export function CoworkConversationStatus({
  isWorking,
  startedAt,
  status,
}: {
  isWorking: boolean;
  startedAt?: number | null;
  status: CoworkConversationStatusState | null;
}) {
  const compacting = status?.compactionStatus === "compacting" || status?.compactionStatus === "complete";
  const showWaiting = isWorking || compacting || Boolean(status?.apiRetryStatus) || status?.connectionState === "disconnected";
  if (!showWaiting) return null;

  return (
    <div className={`ml-1 flex items-center transition-transform duration-300 ease-out ${isWorking ? "mt-2 -translate-y-2.5" : "mt-6"}`} data-cowork-conversation-status>
      <div className="p-1 -translate-x-px">
        <CoworkClaudeAvatar />
      </div>
      <CoworkWaitingText isWorking={isWorking} startedAt={startedAt} status={status} />
    </div>
  );
}

function CoworkWaitingText({ isWorking, startedAt, status }: { isWorking: boolean; startedAt?: number | null; status: CoworkConversationStatusState | null }) {
  const retryText = useCoworkRetryText(status?.apiRetryStatus);
  const waitingText = useCoworkStatusMessage(Boolean(isWorking || status?.apiRetryStatus), status?.statusMessage);
  if (status?.connectionState === "disconnected") return <div className="text-text-400 ml-2 pb-1.5 text-xs">Reconnecting...</div>;
  if (status?.compactionStatus === "compacting" || status?.compactionStatus === "complete") return <CoworkCompactionProgress status={status.compactionStatus} />;
  const text = retryText ?? waitingText;
  return text ? <CoworkStatusMessageText isWaitingState={Boolean(isWorking && !retryText)} startedAt={startedAt} text={text} /> : null;
}

function CoworkClaudeAvatar() {
  return (
    <img
      alt=""
      aria-hidden="true"
      className="block h-8 w-8 select-none"
      draggable={false}
      src="/assets/v1/cd02a42d9-Vq_H3mgS.svg"
    />
  );
}

function CoworkStatusMessageText({
  isWaitingState,
  startedAt,
  text,
}: {
  isWaitingState: boolean;
  startedAt?: number | null;
  text: string;
}) {
  const elapsed = useCoworkElapsedSeconds(startedAt);
  const showElapsed = elapsed >= 5;
  const displayText = waitingStateMessage(text, elapsed, isWaitingState);

  return (
    <div className="ml-2 pb-1.5 font-base text-text-500">
      {displayText}
      {showElapsed ? (
        <>
          <span className="text-text-500/50 mx-1"> · </span>
          <span className="tabular-nums">{formatCoworkElapsed(elapsed)}</span>
        </>
      ) : null}
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
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - (startedAt ?? Date.now())) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  return elapsed;
}

function useCoworkStatusMessage(isWaiting: boolean, statusMessage?: string) {
  if (statusMessage) return statusMessage;
  return isWaiting ? "Working on it..." : "";
}

function waitingStateMessage(text: string, seconds: number, isWaitingState: boolean) {
  if (!isWaitingState) return text;
  if (seconds >= 60) return "Working through a complex response...";
  if (seconds >= 30) return "Still thinking...";
  return text;
}

function formatCoworkElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

function parseCoworkCompactionStatus(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const raw = asRecord(messages[index].raw);
    if (stringValue(raw.type) === "system" && stringValue(raw.subtype) === "status") return stringValue(raw.status);
  }
  return undefined;
}

function parseCoworkStatusMessage(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const raw = asRecord(messages[index].raw);
    if (stringValue(raw.type) !== "system" || stringValue(raw.subtype) !== "status") continue;
    return stringValue(raw.statusMessage) ?? stringValue(raw.status_message) ?? stringValue(raw.message) ?? stringValue(raw.content);
  }
  return undefined;
}

function parseCoworkApiRetryStatus(messages: ChatMessage[]): CoworkApiRetryStatus | undefined {
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
