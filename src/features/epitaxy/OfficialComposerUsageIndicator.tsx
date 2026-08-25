import { Popover } from "@base-ui-components/react/popover";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ContextUsage, SessionSummary } from "../../adapters/desktopBridge";
import type { LocalSessionsBridge } from "../../adapters/desktopBridge/types";
import { OfficialButton, type OfficialSessionRef } from "./OfficialEpitaxyComponents";
import { OfficialContextProgressBar, OfficialContextWindowSummary, OfficialUsageCircle, composerUsageCircumference, formatUsageTokenCount, officialClampPercent } from "./OfficialComposerContextUsage";
import { useOfficialCodeSessionBucket } from "./session/officialCodeSessionStore";

const officialContextUsageCache = new Map<string, ContextUsage>();

/**
 * Official c4bf `Ue` residual:
 *   queryKey: ["epitaxy", type, "contextUsage", id, model]
 *   enabled: Boolean(id&&type) && hasGetContextUsage && !Xke
 *   staleTime: 0
 * Xke = Qke(pendingTurn && !endTurnSeen). When the turn settles (!Xke) or model
 * changes, react-query refetches. Product mirrors that with a module cache +
 * refetch when busy clears / model changes (plus mount + popover open).
 */
export function OfficialComposerUsageIndicator({ bridge, session, sessionRef }: { bridge: LocalSessionsBridge; session?: SessionSummary | null; sessionRef?: OfficialSessionRef | null }) {
  const sessionId = sessionRef?.id;
  const bucket = useOfficialCodeSessionBucket(sessionId);
  // Official Qke / Xke: pendingTurn exists AND endTurnSeen is still false.
  const xke = bucket.pendingTurnStartedAt !== null && !bucket.pendingTurnEndTurnSeen;
  const model =
    session?.model
    ?? bucket.session?.model
    ?? bucket.liveMeta?.model
    ?? null;
  const [bridgeUsage, setBridgeUsage] = useState<ContextUsage | null>(() => sessionId ? officialContextUsageCache.get(sessionId) ?? null : null);
  const [isFetching, setIsFetching] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const prevXkeRef = useRef(xke);
  const prevModelRef = useRef<string | null>(null);
  const setUsageForSession = useCallback((nextUsage: ContextUsage | null) => {
    if (!sessionId) {
      setBridgeUsage(null);
      return;
    }
    if (nextUsage) officialContextUsageCache.set(sessionId, nextUsage);
    setBridgeUsage(nextUsage ?? officialContextUsageCache.get(sessionId) ?? null);
  }, [sessionId]);
  const refreshUsage = useCallback(async (opts?: { invalidate?: boolean }) => {
    if (!sessionId || !bridge.getContextUsage) {
      setUsageForSession(null);
      setIsFetching(false);
      return;
    }
    // Official Ue enabled:!Xke — never get_context_usage while the turn is open
    // (CLI stdin for-await serializes it with interrupt; would miss GkA=1500).
    if (xke) {
      setUsageForSession(officialContextUsageCache.get(sessionId) ?? null);
      setIsFetching(false);
      return;
    }
    if (opts?.invalidate) officialContextUsageCache.delete(sessionId);
    setIsFetching(true);
    let alive = true;
    await bridge.getContextUsage(sessionId).then((nextUsage) => {
      if (alive) setUsageForSession(nextUsage);
    }).catch(() => {
      if (alive) setUsageForSession(null);
    }).finally(() => {
      if (alive) setIsFetching(false);
    });
    alive = false;
  }, [bridge, sessionId, setUsageForSession, xke]);
  // Mount / sessionId change — official Ue runs when enabled becomes true (!Xke).
  useEffect(() => {
    let alive = true;
    prevXkeRef.current = xke;
    prevModelRef.current = model;
    if (!sessionId || !bridge.getContextUsage) {
      setUsageForSession(null);
      setIsFetching(false);
      return undefined;
    }
    setBridgeUsage(officialContextUsageCache.get(sessionId) ?? null);
    if (xke) {
      setIsFetching(false);
      return undefined;
    }
    setIsFetching(true);
    void bridge.getContextUsage(sessionId).then((nextUsage) => {
      if (alive) setUsageForSession(nextUsage);
    }).catch(() => {
      if (alive) setUsageForSession(null);
    }).finally(() => {
      if (alive) setIsFetching(false);
    });
    return () => {
      alive = false;
    };
    // xke/model intentionally omitted — settle/model effects own those refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session switch only
  }, [bridge, sessionId, setUsageForSession]);
  // Official Ue staleTime:0 + enabled:!Xke — refetch when turn settles (busy→idle).
  useEffect(() => {
    const wasBusy = prevXkeRef.current;
    prevXkeRef.current = xke;
    if (wasBusy && !xke && sessionId && bridge.getContextUsage) {
      void refreshUsage({ invalidate: true });
    }
  }, [xke, sessionId, bridge, refreshUsage]);
  // Official queryKey includes model — refetch when model changes *and* enabled (!Xke).
  useEffect(() => {
    const prev = prevModelRef.current;
    prevModelRef.current = model;
    if (prev == null || prev === model) return;
    if (!sessionId || !bridge.getContextUsage || xke) return;
    void refreshUsage({ invalidate: true });
  }, [model, sessionId, bridge, refreshUsage, xke]);

  const isLocalContext = sessionRef?.type === "local";
  const usage = bridgeUsage;
  const usedTokens = usage?.totalTokens ?? 0;
  const maxTokens = usage?.rawMaxTokens ?? null;
  const usagePercent = typeof maxTokens === "number" && maxTokens > 0 ? officialClampPercent(usedTokens / maxTokens * 100) : null;
  const contextSummary = typeof maxTokens === "number" && maxTokens > 0 ? `${formatUsageTokenCount(usedTokens)} / ${formatUsageTokenCount(maxTokens)} (${usagePercent}%)` : formatUsageTokenCount(usedTokens);
  const triggerPercent = isLocalContext ? usagePercent ?? 0 : 0;
  const strokeDashoffset = composerUsageCircumference * (1 - triggerPercent / 100);
  const ariaParts = [isLocalContext ? `context ${usagePercent !== null ? `${usagePercent}%` : contextSummary}` : null].filter(Boolean);
  const ariaLabel = ariaParts.length > 0 ? `Usage: ${ariaParts.join(", ")}` : "Usage";
  const handleOpenChange = useCallback((open: boolean) => {
    // Official Ue enabled:!Xke — popover while busy shows cache, does not fetch.
    if (open && isLocalContext && !xke) void refreshUsage();
    if (!open) setExpanded(false);
  }, [isLocalContext, refreshUsage, xke]);
  return (
    <Popover.Root onOpenChange={handleOpenChange}>
      <Popover.Trigger render={<OfficialButton ariaLabel={ariaLabel} className="shrink-0" customIcon={<OfficialUsageCircle strokeDashoffset={strokeDashoffset} usagePercent={triggerPercent} />} size="small" variant="uncontained" />} />
      <Popover.Portal>
        <Popover.Positioner align="end" className="epitaxy-root size-0" side="top" sideOffset={8}>
          <Popover.Popup className="outline-none absolute bottom-0 right-0">
            <div className="relative isolate flex flex-col py-p5 rounded-r6 w-[360px] max-w-[calc(100vw-2rem)] max-h-[min(var(--available-height),640px)]">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <h2 className="sr-only">Usage</h2>
              <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain">
                {isLocalContext ? (
                  <OfficialContextWindowSummary
                    contextPct={usagePercent}
                    contextUsage={usage}
                    expanded={expanded}
                    isFetching={isFetching}
                    onToggle={() => setExpanded((value) => !value)}
                    summary={contextSummary}
                  />
                ) : (
                  <div className="flex flex-col gap-g2">
                    <div className="group flex items-center gap-g6 px-p8 py-p2 min-h-[20px] text-left">
                      <span className="text-footnote text-t6">Usage limits</span>
                      <span className="text-footnote text-t6 tabular-nums ml-auto">0%</span>
                    </div>
                    <div className="px-p8 pb-p2"><OfficialContextProgressBar contextPct={0} /></div>
                  </div>
                )}
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
