import { useEffect, useSyncExternalStore } from "react";
import { fetchBootstrapPayload } from "../features/settings/accountSettingsApi";

/**
 * Official ion-dist residual (index-BELzQL5P.js):
 *
 *   const { data: d } = Ck({ limit: 5, starred: false });
 *   const u = d?.data;
 *   const h = pathname.startsWith("/chat/") && params.uuid ? params.uuid : null;
 *   KI?.setRecentChats?.(
 *     u
 *       ? u.slice(0, 5).map((t) => ({
 *           chatId: t.uuid,
 *           chatName: t.name || "Untitled",
 *         }))
 *       : [],
 *     h,
 *   );
 *
 * Official list source: GET /api/organizations/:org/chat_conversations_v2?limit=5&starred=false
 * Bridge: globalThis["claude.web"].QuickEntry.setRecentChats(chats, activeChatId)
 * Main → Swift: overlay.setRecentChats / setActiveChatId (bottom recent-chat list UI).
 *
 * Product shell does not load official root component that owned this effect;
 * re-implement residual only — no invented fields (chatId/chatName keys only).
 */

const RECENT_CHAT_LIMIT = 5;
const UNTITLED = "Untitled";

type QuickEntryBridge = {
  setRecentChats?: (
    chats: Array<{ chatId: string; chatName: string }>,
    activeChatId: string | null,
  ) => Promise<unknown> | unknown;
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function string(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getLocationKey(): string {
  return window.location.pathname + window.location.search;
}

function subscribeLocation(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener("app:navigation", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("app:navigation", onChange);
  };
}

/** Official h residual: active chat uuid when path is /chat/:uuid. */
export function activeChatIdFromPathname(pathname: string): string | null {
  if (!pathname.startsWith("/chat/")) return null;
  const rest = pathname.slice("/chat/".length);
  const uuid = rest.split(/[/?#]/)[0]?.trim();
  return uuid && uuid.length > 0 ? uuid : null;
}

export function orgUuidFromBootstrap(payload: unknown): string | null {
  const root = record(payload);
  // Official bootstrap shapes: activeOrganization.uuid | organization.uuid | account.org
  const candidates = [
    record(root.activeOrganization).uuid,
    record(root.organization).uuid,
    record(root.org).uuid,
    record(record(root.account).organization).uuid,
    record(root.defaultOrganization).uuid,
  ];
  for (const value of candidates) {
    const uuid = string(value);
    if (uuid) return uuid;
  }
  // Some payloads nest under `organizations` array with membership.
  const orgs = root.organizations;
  if (Array.isArray(orgs) && orgs.length > 0) {
    for (const entry of orgs) {
      const org = record(entry);
      const uuid = string(org.uuid) ?? string(record(org.organization).uuid);
      if (uuid) return uuid;
    }
  }
  return null;
}

/**
 * Normalize list API body → official AUe items.
 * Accepts { data: Conversation[] } (v2 residual) or bare array.
 */
export function recentChatsFromConversationsPayload(
  payload: unknown,
): Array<{ chatId: string; chatName: string }> {
  const root = record(payload);
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(root.data)
      ? root.data
      : Array.isArray(root.conversations)
        ? root.conversations
        : [];
  const out: Array<{ chatId: string; chatName: string }> = [];
  for (const item of list.slice(0, RECENT_CHAT_LIMIT)) {
    const row = record(item);
    const chatId = string(row.uuid) ?? string(row.chatId) ?? string(row.id);
    if (!chatId) continue;
    const chatName = string(row.name) ?? string(row.chatName) ?? string(row.title) ?? UNTITLED;
    out.push({ chatId, chatName });
  }
  return out;
}

async function fetchRecentConversations(
  orgUuid: string,
  signal: AbortSignal,
): Promise<Array<{ chatId: string; chatName: string }>> {
  // Official Ck({ limit: 5, starred: false }) → chat_conversations_v2
  const params = new URLSearchParams({
    limit: String(RECENT_CHAT_LIMIT),
    starred: "false",
  });
  const path = `/api/organizations/${orgUuid}/chat_conversations_v2?${params}`;
  // Prefer app:// host residual used by other settings fetches, then same-origin.
  const candidates = [`app://localhost${path}`, path];
  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        credentials: "include",
        signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) continue;
      const json: unknown = await response.json();
      return recentChatsFromConversationsPayload(json);
    } catch {
      // try next candidate / abort
      if (signal.aborted) return [];
    }
  }
  return [];
}

function quickEntryBridge(): QuickEntryBridge | undefined {
  const web = (window as unknown as { ["claude.web"]?: { QuickEntry?: QuickEntryBridge } })[
    "claude.web"
  ];
  return web?.QuickEntry;
}

export async function syncDesktopQuickEntryRecentChats(
  options: {
    signal?: AbortSignal;
    pathname?: string;
    setRecentChats?: QuickEntryBridge["setRecentChats"];
    loadBootstrap?: () => Promise<unknown>;
    loadConversations?: (
      orgUuid: string,
      signal: AbortSignal,
    ) => Promise<Array<{ chatId: string; chatName: string }>>;
  } = {},
): Promise<void> {
  const setRecentChats = options.setRecentChats ?? quickEntryBridge()?.setRecentChats;
  if (!setRecentChats) return;

  const signal = options.signal ?? new AbortController().signal;
  const pathname = options.pathname ?? window.location.pathname;
  const activeChatId = activeChatIdFromPathname(pathname);

  try {
    const bootstrap =
      (await (options.loadBootstrap ?? fetchBootstrapPayload)()) ?? null;
    if (signal.aborted) return;
    const orgUuid = orgUuidFromBootstrap(bootstrap);
    if (!orgUuid) {
      // Official: no list → still clear / push empty with active id residual.
      await setRecentChats([], activeChatId);
      return;
    }
    const chats = await (options.loadConversations ?? fetchRecentConversations)(
      orgUuid,
      signal,
    );
    if (signal.aborted) return;
    await setRecentChats(chats, activeChatId);
  } catch {
    // Official effect is silent on query failure; do not invent logout or fake chats.
  }
}

export function useDesktopQuickEntryRecentChatsSync(): void {
  const locationKey = useSyncExternalStore(subscribeLocation, getLocationKey);

  useEffect(() => {
    const bridge = quickEntryBridge();
    if (!bridge?.setRecentChats) return;
    const controller = new AbortController();
    void syncDesktopQuickEntryRecentChats({
      signal: controller.signal,
      pathname: window.location.pathname,
      setRecentChats: (chats, activeChatId) => bridge.setRecentChats?.(chats, activeChatId),
    });
    return () => controller.abort();
  }, [locationKey]);
}
