/**
 * Official cd5a31703 `cwe` / `awe` / `owe` / `swe` / `Tw` — Fu older pager.
 *
 * near-top: scrollTop < 1200 && !pinned && hasOlder.
 * auto-drain: owe/swe (maxScroll < 1200), not distance-from-bottom.
 * Status heightPx is awe 40 when hasOlder.
 * Silhouette `s5` / `Lnt` / blankLoadingColumn omitted. Bat telemetry omitted.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { officialCodeSessionStore } from "./officialCodeSessionStore";
import { officialCodeLocalTransport } from "./officialCodeSessionTransport";

/** Official cd5a `iwe`. */
export const OFFICIAL_OLDER_NEAR_TOP_PX = 1200;
/** Official cd5a `awe` / Tw `heightPx`. */
export const OFFICIAL_OLDER_STATUS_PX = 40;

export type OfficialOlderLoadTrigger = "near-top" | "retry" | "auto-drain";

export type OfficialOlderLoadRequest = {
  chain?: () => boolean;
  trigger: OfficialOlderLoadTrigger;
};

export type OfficialOlderStatus = {
  heightPx: number;
  state: "loading" | "failed";
} | null;

/** Official `ww`. */
export function officialOlderScrollerAlive(node: HTMLElement | null): node is HTMLElement {
  return node !== null && node.clientHeight > 0;
}

/** Official `owe` — scrollable range (not remaining-to-bottom) under 1200, or <10 rows if no scroller. */
export function officialOlderOwe(loadedCount: number, node: HTMLElement | null) {
  if (node === null || node.scrollHeight <= 0 || node.clientHeight <= 0) {
    return loadedCount < 10;
  }
  return node.scrollHeight - node.clientHeight < OFFICIAL_OLDER_NEAR_TOP_PX;
}

/** Official `swe` — slightly scrollable (1 < maxScroll < 1200). */
export function officialOlderSwe(node: HTMLElement | null) {
  if (!officialOlderScrollerAlive(node) || node.scrollHeight <= 0) return false;
  const maxScroll = node.scrollHeight - node.clientHeight;
  return maxScroll > 1 && maxScroll < OFFICIAL_OLDER_NEAR_TOP_PX;
}

export async function officialLoadOlderTranscript(
  sessionId: string,
  _trigger: OfficialOlderLoadTrigger,
): Promise<boolean> {
  const bucket = officialCodeSessionStore.getState().buckets[sessionId];
  if (!bucket?.hasOlder) return false;
  const cursor = bucket.olderCursor;
  if (!cursor) {
    officialCodeSessionStore.getState().prependOlderMessages(sessionId, [], {
      hasOlder: false,
      olderCursor: null,
    });
    return true;
  }
  const page = await officialCodeLocalTransport.fetchEarlierTranscript?.(sessionId, cursor);
  if (!page) return false;
  officialCodeSessionStore.getState().prependOlderMessages(sessionId, page.messages, {
    hasOlder: page.hasMore === true,
    olderCursor: page.cursor ?? null,
  });
  return true;
}

export function useOfficialOlderPager({
  contentSizePx = 0,
  getScrollElement,
  hasOlder,
  isPinned,
  loadedCount = 0,
  sessionId,
  subscribePin,
  viewportUnfilled = false,
}: {
  contentSizePx?: number;
  getScrollElement: () => HTMLElement | null;
  hasOlder: boolean;
  isPinned: () => boolean;
  loadedCount?: number;
  sessionId?: string;
  subscribePin?: (listener: (pinned: boolean) => void) => () => void;
  viewportUnfilled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const loadingRef = useRef(false);
  const failedRef = useRef(false);
  loadingRef.current = loading;
  failedRef.current = failed;
  const unfilledRef = useRef(viewportUnfilled);
  unfilledRef.current = viewportUnfilled;
  const drainEpochRef = useRef<{ epoch: string } | null>(null);

  const loadOlder = useCallback(async (
    triggerOrRequest: OfficialOlderLoadTrigger | OfficialOlderLoadRequest,
  ) => {
    const request: OfficialOlderLoadRequest = typeof triggerOrRequest === "string"
      ? { trigger: triggerOrRequest }
      : triggerOrRequest;
    const trigger = request.trigger;
    if (!sessionId || !hasOlder || loadingRef.current) return false;
    if (failedRef.current && trigger !== "retry") return false;
    setLoading(true);
    if (trigger === "retry") setFailed(false);
    try {
      const ok = await officialLoadOlderTranscript(sessionId, trigger);
      if (!ok) {
        setFailed(true);
        return false;
      }
      setFailed(false);
      if (trigger === "auto-drain" && request.chain?.()) {
        queueMicrotask(() => {
          void loadOlder({ chain: request.chain, trigger: "auto-drain" });
        });
      }
      return true;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, [hasOlder, sessionId]);

  const tryNearTop = useCallback(() => {
    const node = getScrollElement();
    if (!hasOlder || !officialOlderScrollerAlive(node)) return;
    if (node.scrollTop >= OFFICIAL_OLDER_NEAR_TOP_PX) return;
    if (isPinned()) return;
    void loadOlder("near-top");
  }, [getScrollElement, hasOlder, isPinned, loadOlder]);

  const tryAutoDrain = useCallback(() => {
    if (!hasOlder || !sessionId) return;
    const node = getScrollElement();
    const unfilled = unfilledRef.current && officialOlderScrollerAlive(node);
    if (!unfilled && !officialOlderOwe(loadedCount, node)) return;
    const chainable = !unfilled && officialOlderSwe(node);
    const epoch = sessionId;
    if (chainable && drainEpochRef.current !== null && Object.is(drainEpochRef.current.epoch, epoch)) {
      return;
    }
    const chain = unfilled
      ? () => unfilledRef.current && officialOlderScrollerAlive(getScrollElement())
      : undefined;
    void loadOlder({ chain, trigger: "auto-drain" }).then((ok) => {
      if (ok && chainable) drainEpochRef.current = { epoch };
    });
  }, [getScrollElement, hasOlder, loadOlder, loadedCount, sessionId]);

  useLayoutEffect(() => {
    setLoading(false);
    setFailed(false);
    drainEpochRef.current = null;
  }, [sessionId]);

  useEffect(() => {
    if (!hasOlder) return undefined;
    const node = getScrollElement();
    if (!node) return undefined;
    const onScroll = () => tryNearTop();
    node.addEventListener("scroll", onScroll, { passive: true });
    tryNearTop();
    const unsubscribePin = subscribePin?.(() => tryNearTop());
    const ResizeObserverCtor = node.ownerDocument?.defaultView?.ResizeObserver ?? globalThis.ResizeObserver;
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserverCtor === "function") {
      let lastHeight = node.clientHeight;
      observer = new ResizeObserverCtor(() => {
        if (node.clientHeight === lastHeight) return;
        lastHeight = node.clientHeight;
        tryNearTop();
        tryAutoDrain();
      });
      observer.observe(node);
    }
    return () => {
      node.removeEventListener("scroll", onScroll);
      unsubscribePin?.();
      observer?.disconnect();
    };
  }, [getScrollElement, hasOlder, subscribePin, tryAutoDrain, tryNearTop]);

  useEffect(() => {
    tryAutoDrain();
  }, [contentSizePx, tryAutoDrain]);

  const wasLoadingRef = useRef(loading);
  useEffect(() => {
    const finished = wasLoadingRef.current && !loading;
    wasLoadingRef.current = loading;
    if (finished) tryNearTop();
  }, [loading, tryNearTop]);

  const status: OfficialOlderStatus = useMemo(() => {
    if (!hasOlder) return null;
    return {
      heightPx: OFFICIAL_OLDER_STATUS_PX,
      state: failed && !loading ? "failed" : "loading",
    };
  }, [failed, hasOlder, loading]);

  return {
    failed,
    loadOlder,
    loading,
    status,
  };
}
