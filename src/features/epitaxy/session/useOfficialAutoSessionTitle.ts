/**
 * Official residual auto session title (BELz eme + c4bf H + create $ gate):
 *
 * Create path (cowork residual, applied to local code start):
 *   $ = prompt.trim().length >= 10
 *   V = $ ? generate_session_title({ first_session_message }) : void
 *   start(...) then V.then(title => updateSession(id, { title, titleSource: "auto" }))
 *
 * Open-session fallback (cowork tile residual):
 *   if title still placeholder && first user text → generate → updateSession titleSource auto
 *   skip when titleSource is already auto/user or title no longer placeholder.
 *
 * Product maps this onto LocalSessions (code) without inventing host-side LLM title.
 */
import { useEffect, useRef } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { ChatMessage, SessionSummary } from "../../../adapters/desktopBridge/types";
import {
  generateSessionTitleFromFirstMessage,
  shouldGenerateAutoSessionTitle,
} from "./generateSessionTitle";
import { isPlaceholderCodingTitle } from "./officialSessionTitle";
import { officialCodeSessionStore } from "./officialCodeSessionStore";

const inFlightSessionIds = new Set<string>();

function firstUserTextFromMessages(messages: ChatMessage[]): string {
  for (const message of messages) {
    if (message.role !== "user") continue;
    const text = message.text?.trim();
    if (text) return text;
    const raw = typeof message.raw === "object" && message.raw !== null
      ? (message.raw as Record<string, unknown>)
      : null;
    const content = raw && typeof raw.message === "object" && raw.message !== null
      ? (raw.message as Record<string, unknown>).content
      : raw?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (typeof block === "object" && block !== null) {
          const b = block as Record<string, unknown>;
          if (b.type === "text" && typeof b.text === "string" && b.text.trim()) return b.text.trim();
        }
      }
    }
    if (typeof content === "string" && content.trim()) return content.trim();
  }
  return "";
}

function shouldAttemptAutoTitle(session: SessionSummary | null | undefined): boolean {
  if (!session) return false;
  if (session.titleSource === "auto" || session.titleSource === "user") return false;
  return isPlaceholderCodingTitle(session.title);
}

/**
 * Fire-and-forget auto title for a just-created session (create path residual).
 * Safe to call without awaiting navigation.
 */
export function kickOfficialAutoSessionTitle(sessionId: string, firstMessage: string): void {
  if (!sessionId || !shouldGenerateAutoSessionTitle(firstMessage)) return;
  if (inFlightSessionIds.has(sessionId)) return;
  inFlightSessionIds.add(sessionId);
  void (async () => {
    try {
      const title = await generateSessionTitleFromFirstMessage(firstMessage);
      if (!title) return;
      const existing = officialCodeSessionStore.getState().buckets[sessionId]?.session;
      if (existing && !shouldAttemptAutoTitle(existing) && existing.titleSource === "user") return;
      // Optimistic store patch for open tile / Recents that already holds the bucket.
      if (existing) {
        officialCodeSessionStore.getState().patchSession(sessionId, {
          ...existing,
          title,
          titleSource: "auto",
        });
      }
      const updated = await desktopBridge.LocalSessions.updateSession?.(sessionId, {
        title,
        titleSource: "auto",
      });
      if (updated) {
        officialCodeSessionStore.getState().patchSession(sessionId, {
          ...updated,
          title: updated.title || title,
          titleSource: updated.titleSource ?? "auto",
        });
      }
    } finally {
      inFlightSessionIds.delete(sessionId);
    }
  })();
}

/**
 * Tile residual: when session still has placeholder title after messages load,
 * generate once (if create path did not already).
 */
export function useOfficialAutoSessionTitle(
  session: SessionSummary | null,
  messages: ChatMessage[],
  isLoading: boolean,
) {
  const attemptedRef = useRef<string | null>(null);
  const titleBaselineRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!session?.id) return;
    if (attemptedRef.current !== session.id) {
      attemptedRef.current = null;
      titleBaselineRef.current = session.title;
    }
  }, [session?.id, session?.title]);

  useEffect(() => {
    if (isLoading || !session?.id) return;
    if (attemptedRef.current === session.id) return;
    if (inFlightSessionIds.has(session.id)) return;
    if (!shouldAttemptAutoTitle(session)) return;
    const first = firstUserTextFromMessages(messages);
    if (!shouldGenerateAutoSessionTitle(first)) return;
    const baseline = titleBaselineRef.current ?? session.title;
    // Official: only while title still equals the create-time baseline (placeholder).
    if (session.title !== baseline && !isPlaceholderCodingTitle(session.title)) return;
    attemptedRef.current = session.id;
    inFlightSessionIds.add(session.id);
    let cancelled = false;
    void (async () => {
      try {
        const title = await generateSessionTitleFromFirstMessage(first);
        if (cancelled || !title) return;
        const current = officialCodeSessionStore.getState().buckets[session.id]?.session ?? session;
        if (current.titleSource === "user") return;
        if (!isPlaceholderCodingTitle(current.title) && current.titleSource === "auto") return;
        officialCodeSessionStore.getState().patchSession(session.id, {
          ...current,
          title,
          titleSource: "auto",
        });
        const updated = await desktopBridge.LocalSessions.updateSession?.(session.id, {
          title,
          titleSource: "auto",
        });
        if (updated && !cancelled) {
          officialCodeSessionStore.getState().patchSession(session.id, {
            ...updated,
            title: updated.title || title,
            titleSource: updated.titleSource ?? "auto",
          });
        }
      } finally {
        inFlightSessionIds.delete(session.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, messages, session]);
}
