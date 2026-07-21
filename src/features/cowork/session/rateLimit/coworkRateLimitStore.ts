/**
 * Official xI / Tke subset: messageLimits[orgUuid] for Cowork rate_limit_event.
 * Full react-query account bootstrap not wired — local store so D1e path is product-visible.
 */
import { createStore, type StoreApi } from "zustand/vanilla";
import type { CoworkMappedRateLimit } from "./coworkRateLimitMap";

export type CoworkRateLimitState = {
  /** Last applied limit per organization uuid (official messageLimits). */
  messageLimits: Record<string, CoworkMappedRateLimit>;
  /** Last session that emitted a non-within limit (conversationUuid on official). */
  lastSessionId: string | null;
  setMessageLimit: (
    orgUuid: string,
    limit: CoworkMappedRateLimit,
    sessionId?: string,
  ) => void;
  getMessageLimit: (orgUuid: string) => CoworkMappedRateLimit | undefined;
};

export type CoworkRateLimitStore = StoreApi<CoworkRateLimitState>;

export function createCoworkRateLimitStore(): CoworkRateLimitStore {
  return createStore((set, get) => ({
    messageLimits: {},
    lastSessionId: null,
    setMessageLimit: (orgUuid, limit, sessionId) => {
      const next: CoworkMappedRateLimit =
        limit.type === "within_limit"
          ? limit
          : { ...limit, conversationUuid: sessionId ?? limit.conversationUuid };
      set((state) => ({
        messageLimits: { ...state.messageLimits, [orgUuid]: next },
        lastSessionId:
          limit.type === "within_limit"
            ? state.lastSessionId
            : (sessionId ?? state.lastSessionId),
      }));
    },
    getMessageLimit: (orgUuid) => get().messageLimits[orgUuid],
  }));
}

export const coworkRateLimitStore = createCoworkRateLimitStore();

/**
 * Official D1e rate_limit_event → xI(orgUuid). When org uuid unknown, key "_".
 */
export function applyCoworkRateLimitToStore(
  mapped: CoworkMappedRateLimit,
  options: { orgUuid?: string | null; sessionId?: string },
): void {
  const orgUuid =
    typeof options.orgUuid === "string" && options.orgUuid.length > 0
      ? options.orgUuid
      : "_";
  coworkRateLimitStore.getState().setMessageLimit(orgUuid, mapped, options.sessionId);
}
