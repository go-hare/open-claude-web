/**
 * Official c11959232 `SC` Side chat overlay.
 * DOM/className/copy from ion-dist. Host: startSideChat / sendSideChatMessage / stopSideChat.
 * Events: c3d5 `V()` side_chat_ready|assistant|turn_end|error|closed.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LocalSessionsBridge } from "../../../adapters/desktopBridge/types";
import { OfficialPromptEditor, type OfficialPromptEditorHandle } from "../OfficialPromptEditor";
import { OfficialButton, type OfficialSessionRef } from "../OfficialEpitaxyComponents";
import { OfficialCodeMarkdown } from "../OfficialCodeMarkdown";
import { OfficialSparkSpinner } from "./OfficialWorkingStatus";
import {
  officialSideChatStore,
  useOfficialSideChatError,
  useOfficialSideChatMessages,
  useOfficialSideChatOpen,
  useOfficialSideChatPendingQuestion,
  useOfficialSideChatStatus,
} from "./officialSideChatStore";

function OfficialSideChatSurface() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-primary-elevated effect-primary-elevated"
      data-surface="sidebar"
    />
  );
}

function startFork(sessionId: string, start: (id: string) => void) {
  const store = officialSideChatStore.getState();
  store.setStarted(sessionId, true);
  store.setIsStarting(sessionId, true);
  store.setStatus(sessionId, "starting");
  start(sessionId);
}

export function OfficialSideChatOverlay({
  bridge,
  sessionRef,
}: {
  bridge: LocalSessionsBridge;
  sessionRef: OfficialSessionRef | null;
}) {
  const localId = sessionRef?.type === "local" ? sessionRef.id : null;
  const isRemote = sessionRef != null && sessionRef.type !== "local";
  const open = useOfficialSideChatOpen(localId);
  const messages = useOfficialSideChatMessages(localId);
  const status = useOfficialSideChatStatus(localId);
  const error = useOfficialSideChatError(localId);
  const pendingQuestion = useOfficialSideChatPendingQuestion(localId);
  const editorRef = useRef<OfficialPromptEditorHandle | null>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [prompt, setPrompt] = useState("");
  const [allowTransition, setAllowTransition] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAllowTransition(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      editorRef.current?.focus();
    } else {
      const previous = previousFocusRef.current;
      previousFocusRef.current = null;
      if (
        previous instanceof HTMLElement
        && previous.isConnected
        && document.activeElement === document.body
      ) {
        previous.focus();
      }
    }
  }, [open]);

  useEffect(() => {
    editorRef.current?.clear();
    setPrompt("");
  }, [localId]);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    node?.scrollTo({ top: node.scrollHeight, behavior: "instant" });
  }, [messages.length, status]);

  const close = useCallback(() => {
    if (localId) officialSideChatStore.getState().close(localId);
  }, [localId]);

  useEffect(() => {
    if (!localId) return;
    const store = officialSideChatStore.getState();
    if (store.openBySession[localId] && !store.startedBySession[localId]) {
      store.setError(localId, null);
      startFork(localId, (id) => void bridge.startSideChat?.(id));
    }
  }, [bridge, localId, open]);

  const submit = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text || !localId) return;
    const store = officialSideChatStore.getState();
    store.setError(localId, null);
    editorRef.current?.clear();
    setPrompt("");
    const replacingQueued = store.queuedBySession[localId] !== undefined;
    store.pushUserMessage(localId, text, replacingQueued);
    if (store.statusBySession[localId] !== "ready") {
      store.setQueued(localId, text);
      if ((store.statusBySession[localId] ?? "idle") === "idle" && !store.startedBySession[localId]) {
        startFork(localId, (id) => void bridge.startSideChat?.(id));
      }
      return;
    }
    store.setStatus(localId, "thinking");
    bridge.sendSideChatMessage?.(localId, text);
  }, [bridge, localId]);

  useEffect(() => {
    if (open && pendingQuestion && localId) {
      submit(pendingQuestion);
      officialSideChatStore.getState().clearPendingQuestion(localId);
    }
  }, [localId, open, pendingQuestion, submit]);

  useEffect(() => {
    const subscribe = bridge.onEvent;
    if (!subscribe) return undefined;
    return subscribe((event) => {
      const raw = event && typeof event === "object" ? event as Record<string, unknown> : {};
      const sessionId = typeof raw.sessionId === "string" ? raw.sessionId : "";
      if (!sessionId) return;
      const store = officialSideChatStore.getState();
      switch (raw.type) {
        case "side_chat_ready": {
          store.setIsStarting(sessionId, false);
          const queued = store.queuedBySession[sessionId];
          if (queued !== undefined) {
            store.setQueued(sessionId, null);
            store.setStatus(sessionId, "thinking");
            bridge.sendSideChatMessage?.(sessionId, queued);
          } else {
            store.setStatus(sessionId, "ready");
          }
          return;
        }
        case "side_chat_assistant":
          if (store.isStartingBySession[sessionId]) return;
          store.appendMessage(sessionId, {
            role: "assistant",
            text: typeof raw.data === "string" ? raw.data : "",
          });
          return;
        case "side_chat_turn_end": {
          if (store.isStartingBySession[sessionId]) return;
          store.setError(sessionId, typeof raw.error === "string" ? raw.error : null);
          const queued = store.queuedBySession[sessionId];
          if (queued !== undefined) {
            store.setQueued(sessionId, null);
            store.setStatus(sessionId, "thinking");
            bridge.sendSideChatMessage?.(sessionId, queued);
          } else {
            store.setStatus(sessionId, "ready");
          }
          return;
        }
        case "side_chat_error":
          store.setError(sessionId, typeof raw.error === "string" ? raw.error : "Unknown error");
          if (store.statusBySession[sessionId] === "thinking") store.setStatus(sessionId, "ready");
          return;
        case "side_chat_closed":
          store.setStarted(sessionId, false);
          store.setIsStarting(sessionId, false);
          if (store.queuedBySession[sessionId] !== undefined) {
            store.setQueued(sessionId, null);
            store.popLastUserMessage(sessionId);
          }
          store.setStatus(sessionId, "idle");
          return;
        default:
          return;
      }
    });
  }, [bridge]);

  const noSession = !localId;
  const hasMessages = messages.length > 0;
  const busy = status === "starting" || status === "thinking";
  const placeholder = isRemote
    ? "Side chat is local-only — not available for remote sessions."
    : noSession
      ? "Open a session to use side chat"
      : hasMessages
        ? "Follow up…"
        : "Ask a quick question…";

  return (
    <aside
      aria-hidden={!open || undefined}
      aria-label="Side chat"
      className={`epitaxy-side-chat absolute bottom-2 right-0 z-[10000] w-[380px] max-w-full max-h-[60vh] isolate rounded-r6 flex flex-col ${open ? "draggable-none" : "pointer-events-none"}`}
      data-open={open || undefined}
      inert={!open || undefined}
      onClick={(event) => event.stopPropagation()}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
        close();
      }}
      style={allowTransition ? undefined : { transition: "none" }}
    >
      <OfficialSideChatSurface />
      <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden rounded-[inherit] p-[12px] gap-g6">
        <div className="flex items-center shrink-0 -mt-1 -mr-1 gap-g2">
          <span className="flex-1 px-p4 text-caption text-t6 truncate">
            {status === "starting" ? "Forking…" : "Side chat"}
          </span>
          {hasMessages ? (
            <OfficialButton
              ariaLabel="Clear side chat"
              icon="TrashCanRound"
              onClick={() => {
                if (!localId) return;
                const store = officialSideChatStore.getState();
                store.clearMessages(localId);
                store.setError(localId, null);
                store.setQueued(localId, null);
                startFork(localId, (id) => void bridge.startSideChat?.(id));
                editorRef.current?.focus();
              }}
              size="small"
              variant="uncontained"
            />
          ) : null}
          <OfficialButton
            ariaLabel="Close side chat"
            icon="XCrossCloseMedium"
            onClick={close}
            size="small"
            variant="uncontained"
          />
        </div>
        {hasMessages ? (
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-g6">
            {messages.map((message, index) => (
              message.role === "user" ? (
                <div className="flex justify-end" key={index}>
                  <p className="py-p6 px-p8 rounded-r7 bg-t2 text-t9 text-body select-text max-w-[85%] whitespace-pre-wrap break-words text-pretty">
                    {message.text}
                  </p>
                </div>
              ) : (
                <div className="select-text" key={index}>
                  <OfficialCodeMarkdown
                    isStreaming={busy && index === messages.length - 1}
                    text={message.text}
                  />
                </div>
              )
            ))}
            {busy ? (
              <div className="flex items-center gap-g4 text-caption text-t6" role="status">
                <OfficialSparkSpinner isWorking size="s" />
                <span>{status === "starting" ? "Forking session…" : "Thinking…"}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="px-p4 pb-p4 text-caption text-t6 select-text">
            Chat about this session without touching the main thread. Claude sees the full context, and nothing here is added to the conversation.
          </div>
        )}
        {error ? (
          <p className="px-p4 text-caption text-[var(--core-red)] select-text shrink-0">{error}</p>
        ) : null}
        <div className="shrink-0">
          <OfficialPromptEditor
            bridge={bridge}
            disabled={noSession || busy}
            onChange={setPrompt}
            onSubmit={() => {
              const live = editorRef.current?.getEditor()?.getText() ?? prompt;
              submit(live);
            }}
            placeholder={placeholder}
            ref={editorRef}
            sessionRef={sessionRef}
            value={prompt}
          />
        </div>
      </div>
    </aside>
  );
}
