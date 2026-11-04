/**
 * Official cf580 `ua` logs panel + `Nn` (cf700) Set link destination.
 */
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { OfficialButton, OfficialModal } from "../OfficialEpitaxyComponents";
import { PREVIEW_EMPTY_MESSAGES } from "../officialCodeChromeMessages";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { Icon } from "../../../shell/icons";
import {
  readTranscriptLinksInPreview,
  writeTranscriptLinksInPreview,
} from "../../settings/coworkTranscriptLinks";

export const OFFICIAL_PREVIEW_LOGS_EXPANDED_KEY = "epitaxy-preview-logs-expanded";

/** Official ca80 `Oq` — Globe Add server `Xe=l(()=>{re(nt)})`. */
export const OFFICIAL_PREVIEW_ADD_SERVER_PROMPT =
  "Detect this project's dev servers, write them to .claude/launch.json, then call preview_start.";

export type OfficialPreviewLogLine = {
  line: string;
  stream?: "stdout" | "stderr";
  timestamp?: string;
};

export function readPreviewLogsExpanded(): boolean {
  try {
    return window.localStorage.getItem(OFFICIAL_PREVIEW_LOGS_EXPANDED_KEY) === "true";
  } catch {
    return false;
  }
}

export function writePreviewLogsExpanded(next: boolean): void {
  try {
    window.localStorage.setItem(OFFICIAL_PREVIEW_LOGS_EXPANDED_KEY, next ? "true" : "false");
  } catch {
    /* ignore quota / private mode */
  }
}

function officialLogTone(line: string): "error" | "warn" | null {
  const head = line.slice(0, 200).toUpperCase();
  if (head.includes("ERROR") || head.includes("ERR!") || head.includes("FATAL") || head.includes("FAIL")) {
    return "error";
  }
  if (head.includes("WARN")) return "warn";
  return null;
}

/** Official cf580 `ua`. */
export function OfficialPreviewLogsPanel({
  logs,
  onClose,
  source,
}: {
  logs: OfficialPreviewLogLine[];
  onClose: () => void;
  source?: { name: string; port: number };
}) {
  const chrome = useI18nText(PREVIEW_EMPTY_MESSAGES);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pinToBottomRef = useRef(true);
  const dragAbortRef = useRef<AbortController | null>(null);
  const sourceLabel = source
    ? `${source.name} · localhost:${source.port}`
    : undefined;

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || !pinToBottomRef.current) return;
    node.scrollTop = node.scrollHeight;
  }, [logs]);

  useEffect(() => () => dragAbortRef.current?.abort(), []);

  const onScroll = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;
    pinToBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 8;
  }, []);

  const onResizePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const root = rootRef.current;
    if (!root) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    const startHeight = root.getBoundingClientRect().height;
    const abort = new AbortController();
    dragAbortRef.current = abort;
    const move = (next: PointerEvent) => {
      root.style.height = `${Math.max(80, startHeight + (startY - next.clientY))}px`;
    };
    const stop = () => abort.abort();
    window.addEventListener("pointermove", move, { signal: abort.signal });
    window.addEventListener("pointerup", stop, { signal: abort.signal });
    window.addEventListener("pointercancel", stop, { signal: abort.signal });
  }, []);

  return (
    <div
      className="relative flex flex-col shrink-0 h-[200px] min-h-[80px] max-h-[60%]"
      data-testid="preview-logs"
      ref={rootRef}
    >
      <div
        aria-orientation="horizontal"
        className="absolute top-0 left-0 right-0 h-[8px] cursor-ns-resize z-[1]"
        onPointerDown={onResizePointerDown}
        role="separator"
      />
      <div className="flex shrink-0 items-center gap-sm pt-md pr-xs pl-lg">
        <span
          className="min-w-0 flex-1 truncate text-caption text-muted"
          data-testid="preview-logs-source"
          title={sourceLabel}
        >
          {sourceLabel}
        </span>
        <OfficialButton
          ariaLabel={chrome.closeDevServerLogs}
          icon="X"
          onClick={onClose}
          preferFont
          tooltipSide="bottom"
          variant="ghost"
        />
      </div>
      <div
        className="min-h-0 flex-1 overflow-auto [contain:strict] px-lg pb-lg text-code text-secondary select-text"
        onScroll={onScroll}
        ref={scrollerRef}
      >
        {logs.length === 0 ? (
          <div className="text-muted text-center">{chrome.waitingForOutput}</div>
        ) : (
          logs.map((entry, index) => {
            const tone = officialLogTone(entry.line);
            return (
              <div
                className={`whitespace-pre-wrap break-all${tone === "error" ? " text-danger" : tone === "warn" ? " text-warning" : ""}`}
                key={`${entry.timestamp ?? ""}:${index}`}
              >
                {entry.line}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Official cf700 `Nn` / `v`. */
export function OfficialPreviewTranscriptLinksModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const chrome = useI18nText(PREVIEW_EMPTY_MESSAGES);
  const [draft, setDraft] = useState(true);
  useEffect(() => {
    if (isOpen) setDraft(readTranscriptLinksInPreview());
  }, [isOpen]);
  const modifier = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
  const hint = chrome.modifierClickOpensDefaultBrowser.replace("{modifier}", modifier);
  return (
    <OfficialModal isOpen={isOpen} onClose={onClose} title={chrome.whereShouldLinksOpen} width="w-[420px]">
      <p className="m-0 text-body text-secondary">{chrome.chooseWhatHappensWhenYouClickALink}</p>
      <div
        aria-label={chrome.linkDestination}
        className="flex flex-col gap-2.5 pt-md"
        role="radiogroup"
      >
        <button
          aria-checked={draft}
          className="flex items-start gap-sm rounded-r4 border-0 bg-alpha-1 px-md py-sm text-left outline-none hide-focus-ring shadow-focus"
          onClick={() => setDraft(true)}
          role="radio"
          type="button"
        >
          <Icon name="Globe" preferFont size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block text-body text-primary">{chrome.openInApp}</span>
            <span className="block text-caption text-muted">{chrome.opensBesideTheChat}</span>
          </span>
        </button>
        <button
          aria-checked={!draft}
          className="flex items-start gap-sm rounded-r4 border-0 bg-alpha-1 px-md py-sm text-left outline-none hide-focus-ring shadow-focus"
          onClick={() => setDraft(false)}
          role="radio"
          type="button"
        >
          <Icon name="ArrowOutSquare" preferFont size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block text-body text-primary">{chrome.openInDefaultBrowser}</span>
            <span className="block text-caption text-muted">{chrome.opensOutsideTheApp}</span>
          </span>
        </button>
      </div>
      {draft ? <p className="m-0 pt-sm text-caption text-muted">{hint}</p> : null}
      <div className="mt-md flex justify-end">
        <OfficialButton
          onClick={() => {
            writeTranscriptLinksInPreview(draft);
            onClose();
          }}
          size="small"
          variant="primary"
        >
          {chrome.done}
        </OfficialButton>
      </div>
    </OfficialModal>
  );
}
