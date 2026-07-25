import { useEffect, useRef } from "react";
import type { CoworkImagePayload, WorkspaceContext } from "../adapters/desktopBridge";
import { createMessageUuid } from "../adapters/desktopBridge/messageUuid";
import { coworkSessionPath, coworkSessionsBasePath } from "../features/cowork/sessionPaths";

/** Lazy bridge access — avoids importing desktopBridge at module load (window required). */
async function getDesktopBridge() {
  const mod = await import("../adapters/desktopBridge");
  return mod.desktopBridge;
}

/**
 * Official ion-dist residual (index-BELzQL5P.js `B0t` + `q0t`):
 *
 *   KI?.onOnQuickEntrySubmit?.(payload => {
 *     log length/images/forChat
 *     q0t()(payload)
 *   })
 *
 *   q0t:
 *     if (!isDesktop) warn "not on desktop, bailing"
 *     if chatId → stash QBt + navigate `/chat/${chatId}?desktop_quick_entry=1`
 *     else upload images (optional) + NI({ prompt, files }) new conversation
 *
 * Product shell residual (no Anthropic org upload xAt):
 *   - images stay as base64 CoworkImagePayload and go through LocalAgentModeSessions
 *     start/sendMessage (host-loop already accepts images on first turn)
 *   - local_* chatId → sendMessage(text, {images}) then navigate session
 *   - else start new local session with message + images
 *   - does not invent cloud chat API create from shell
 *
 * Bridge event name: preload exposes both onQuickEntrySubmit and official alias
 * onOnQuickEntrySubmit (expose.ts officialEventAlias).
 */

export type QuickEntrySubmitImage = {
  base64: string;
  mimeType: string;
  filename?: string;
};

export type QuickEntrySubmitPayload = {
  text?: string;
  images?: QuickEntrySubmitImage[];
  /** Official may also send legacy single-image fields. */
  imageBase64?: string;
  imageMimeType?: string;
  chatId?: string;
};

export type QuickEntrySubmitResult =
  | "ok-new-session"
  | "ok-existing-local"
  | "ignored-not-desktop"
  | "ignored-empty"
  | "failed";

const DESKTOP_UA = /\b(?:Claude(?:Nest|Gov)?|Electron)\//i;

export function isDesktopQuickEntryHost(
  userAgent: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
  hasQuickEntryBridge: boolean = Boolean(
    (globalThis as { ["claude.web"]?: { QuickEntry?: unknown } })["claude.web"]?.QuickEntry,
  ),
): boolean {
  // Official jd residual: Electron / Claude desktop UA. Bridge presence is extra honesty.
  return DESKTOP_UA.test(userAgent) || hasQuickEntryBridge;
}

export function normalizeQuickEntrySubmitPayload(
  raw: unknown,
): { text: string; images: QuickEntrySubmitImage[]; chatId?: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const text = typeof record.text === "string" ? record.text : "";
  const images: QuickEntrySubmitImage[] = [];
  if (Array.isArray(record.images)) {
    for (const item of record.images) {
      if (!item || typeof item !== "object") continue;
      const img = item as Record<string, unknown>;
      if (typeof img.base64 !== "string" || img.base64.length === 0) continue;
      images.push({
        base64: img.base64,
        mimeType: typeof img.mimeType === "string" ? img.mimeType : "image/jpeg",
        filename: typeof img.filename === "string" ? img.filename : undefined,
      });
    }
  }
  if (
    images.length === 0 &&
    typeof record.imageBase64 === "string" &&
    record.imageBase64.length > 0
  ) {
    images.push({
      base64: record.imageBase64,
      mimeType:
        typeof record.imageMimeType === "string" ? record.imageMimeType : "image/jpeg",
    });
  }
  const chatId =
    typeof record.chatId === "string" && record.chatId.length > 0 ? record.chatId : undefined;
  if (!text.trim() && images.length === 0) return null;
  return { text, images, chatId };
}

function createCoworkSessionId(): string {
  return `local_${createMessageUuid().replace(/-/g, "")}`;
}

function isLocalSessionChatId(chatId: string): boolean {
  return chatId.startsWith("local_") || chatId.startsWith("session_");
}

export type HandleQuickEntrySubmitDeps = {
  isDesktop?: boolean;
  getWorkspace?: () => Promise<WorkspaceContext | null | undefined>;
  startSession?: (input: {
    images?: CoworkImagePayload[];
    message: string;
    sessionId: string;
    messageUuid: string;
    workspace: WorkspaceContext;
  }) => Promise<{ id: string }>;
  /** Existing local session residual: send into open chat before navigate. */
  sendMessage?: (
    sessionId: string,
    message: string,
    input?: { images?: CoworkImagePayload[]; messageUuid?: string },
  ) => Promise<unknown>;
  navigate?: (path: string) => void;
  log?: (level: "info" | "warn" | "error", message: string, extra?: unknown) => void;
};

/**
 * Pure residual processor (testable). Default deps use desktopBridge + history navigation.
 */
export async function handleDesktopQuickEntrySubmit(
  raw: unknown,
  deps: HandleQuickEntrySubmitDeps = {},
): Promise<QuickEntrySubmitResult> {
  const log =
    deps.log ??
    ((level, message, extra) => {
      const line = `[QuickEntry] ${message}`;
      if (level === "error") console.error(line, extra ?? "");
      else if (level === "warn") console.warn(line, extra ?? "");
      else console.info(line, extra ?? "");
    });

  const isDesktop = deps.isDesktop ?? isDesktopQuickEntryHost();
  if (!isDesktop) {
    log("warn", "Received quick entry payload but not on desktop, bailing.");
    return "ignored-not-desktop";
  }

  const payload = normalizeQuickEntrySubmitPayload(raw);
  if (!payload) {
    log("warn", "Received quick entry signal but could not acquire payload, bailing.");
    return "ignored-empty";
  }

  log("info", "Received quick entry payload", {
    length: payload.text.length,
    images: payload.images.length,
    forChat: payload.chatId ?? "__new__",
  });

  const navigate =
    deps.navigate ??
    ((path: string) => {
      if (path === window.location.pathname + window.location.search) return;
      window.history.pushState({}, "", path);
      window.dispatchEvent(new Event("app:navigation"));
    });

  const message = payload.text.trim();
  const images = payload.images;
  // Official allows images-only turns; host-loop content builder accepts empty text + images.
  if (!message && images.length === 0) return "ignored-empty";

  // Official: specific chatId → route to that chat with desktop_quick_entry=1.
  // Product local sessions: deliver text+images via sendMessage, then open session.
  if (payload.chatId && isLocalSessionChatId(payload.chatId)) {
    log("info", "Routing quick entry to existing local session", {
      chatId: payload.chatId,
      images: images.length,
    });
    try {
      const send =
        deps.sendMessage ??
        (async (sessionId, text, input) => {
          const bridge = await getDesktopBridge();
          if (!bridge.LocalAgentModeSessions.sendMessage) {
            throw new Error("LocalAgentModeSessions.sendMessage unavailable");
          }
          return bridge.LocalAgentModeSessions.sendMessage(sessionId, text, input);
        });
      await send(payload.chatId, message, {
        images: images.length ? images : undefined,
        messageUuid: createMessageUuid(),
      });
    } catch (error) {
      log("error", "Failed to send quick entry into existing local session", error);
      return "failed";
    }
    const path = `${coworkSessionsBasePath}/${encodeURIComponent(payload.chatId)}?desktop_quick_entry=1`;
    navigate(path);
    return "ok-existing-local";
  }

  if (payload.chatId) {
    log(
      "info",
      "chatId is not a local session id; product shell starts a new cowork session with prompt (cloud /chat routes redirect).",
      { chatId: payload.chatId },
    );
  }

  try {
    const getWorkspace =
      deps.getWorkspace ??
      (async () => {
        try {
          const bridge = await getDesktopBridge();
          return await bridge.Preferences.getWorkspaceContext();
        } catch {
          return null;
        }
      });
    const workspace = await getWorkspace();
    if (!workspace) {
      log("error", "No workspace context for quick entry new session");
      return "failed";
    }
    const sessionId = createCoworkSessionId();
    const messageUuid = createMessageUuid();
    const start =
      deps.startSession ??
      (async (input) => {
        const bridge = await getDesktopBridge();
        const session = await bridge.LocalAgentModeSessions.start({
          kind: "epitaxy",
          images: input.images,
          message: input.message,
          messageUuid: input.messageUuid,
          prompt: input.message,
          sessionId: input.sessionId,
          userSelectedFolders: input.workspace.cwd ? [input.workspace.cwd] : undefined,
          workspace: input.workspace,
        });
        return { id: session.id };
      });

    const session = await start({
      images: images.length ? images : undefined,
      message,
      sessionId,
      messageUuid,
      workspace,
    });
    navigate(coworkSessionPath(session));
    return "ok-new-session";
  } catch (error) {
    log("error", "Failed to process quick entry", error);
    return "failed";
  }
}

function quickEntrySubscribe():
  | ((cb: (payload: unknown) => void) => (() => void) | void)
  | undefined {
  const qe = (window as unknown as {
    ["claude.web"]?: {
      QuickEntry?: {
        onOnQuickEntrySubmit?: (cb: (payload: unknown) => void) => (() => void) | void;
        onQuickEntrySubmit?: (cb: (payload: unknown) => void) => (() => void) | void;
      };
    };
  })["claude.web"]?.QuickEntry;
  return qe?.onOnQuickEntrySubmit ?? qe?.onQuickEntrySubmit;
}

/**
 * Official B0t mount residual: subscribe once while desktop shell is alive.
 */
export function useDesktopQuickEntrySubmit(): void {
  const busyRef = useRef(false);

  useEffect(() => {
    const subscribe = quickEntrySubscribe();
    if (!subscribe) {
      console.info("[QuickEntry] B0t residual: no onOnQuickEntrySubmit bridge yet");
      return;
    }

    const onPayload = (payload: unknown) => {
      if (busyRef.current) return;
      busyRef.current = true;
      void handleDesktopQuickEntrySubmit(payload)
        .catch((error) => {
          console.error("[QuickEntry] handler threw", error);
        })
        .finally(() => {
          busyRef.current = false;
        });
    };

    const unsub = subscribe(onPayload);
    console.info("[QuickEntry] B0t residual: onOnQuickEntrySubmit subscribed");
    return () => {
      try {
        unsub?.();
      } catch {
        /* ignore */
      }
    };
  }, []);
}
