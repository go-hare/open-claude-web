/**
 * Official tool permission / ExitPlanMode approval cards (Wk/jfe/nwe) — c11959232.
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { SessionSummary } from "../../../adapters/desktopBridge";
import type { LocalSessionsBridge } from "../../../adapters/desktopBridge/types";
import { Icon } from "../../../shell/icons";
import { OfficialButton, OfficialDropdownButton, OfficialSplitDropdownButton, type OfficialDropdownItem } from "../OfficialEpitaxyComponents";
import { OfficialPlanCommentsList } from "../plan/OfficialPlanComments";
import {
  acknowledgeOfficialToolDecision,
  isOfficialToolDecisionAcknowledged,
  mergeOfficialPlanCommentFeedback,
  officialPlanCommentsApi,
  scanOfficialExitPlanModeFromMessages,
  setOfficialApprovedPlan,
  useOfficialPlanCommentCount,
} from "./officialPlanCommentsStore";
import { useOfficialCodeSessionBucket } from "./officialCodeSessionStore";
import {
  officialAvailablePermissionModes,
  officialPlanExitAcceptOptions,
  officialPlanExitTrustMode,
  permissionModeLabel,
} from "./officialComposerOptions";

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function firstNonEmptyRecord(...values: unknown[]): Record<string, unknown> {
  for (const value of values) {
    const record = asRecord(value);
    if (Object.keys(record).length > 0) return record;
  }
  return {};
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export type InlineToolPermissionRequest = {
  alwaysAllowScope?: string;
  decisionReason?: string;
  description?: string;
  hasAlwaysAllow?: boolean;
  input: Record<string, unknown>;
  requestId: string;
  sessionId: string;
  toolName: string;
  toolUseId?: string;
};

export function InlineToolPermissionApprovals({
  bridge,
  onOpenPlan,
  onPermissionModeChange,
  sessionId,
}: {
  bridge: LocalSessionsBridge;
  /** Official Wk onOpenPlan → setSidePane("plan") when ExitPlanMode approval mounts. */
  onOpenPlan?: () => void;
  /** Official Wk onModeChange after plan Accept (permission mode). */
  onPermissionModeChange?: (mode: string) => void | Promise<void>;
  sessionId?: string;
}) {
  const [requests, setRequests] = useState<InlineToolPermissionRequest[]>([]);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  // Also read session.pendingToolPermissions from the code session store so session_updated
  // (after control_request) can hydrate the card even if a permission event was missed.
  const sessionBucket = useOfficialCodeSessionBucket(sessionId);
  const storePending = sessionBucket?.session?.pendingToolPermissions;
  // Official nwe(messages) — CCR/local recovery when IPC pending is empty but transcript still has
  // unresolved ExitPlanMode (rwe plan modal path).
  const nweScan = useMemo(
    () => scanOfficialExitPlanModeFromMessages(sessionBucket?.messages ?? []),
    [sessionBucket?.messages],
  );
  // Official Mfe sendToolDecision: optimistic resolve, suppress until store no longer lists id.
  // Without this, stale storePending / merge(empty→keep) re-shows a card after Allow and freezes the turn UI.
  const suppressedRequestIdsRef = useRef(new Set<string>());
  // Official Wk: first mount of ExitPlanMode card calls onOpenPlan once (auto open Plan pane).
  const openedPlanForRequestIdRef = useRef<string | null>(null);

  const syncRequestsFromStorePending = useCallback((pending: NonNullable<SessionSummary["pendingToolPermissions"]> | undefined | null) => {
    if (!Array.isArray(pending)) return;
    const storeIds = new Set(pending.map((item) => item.requestId));
    for (const id of [...suppressedRequestIdsRef.current]) {
      // Drop suppressions once the bridge store has cleared them (or they never reappear).
      if (!storeIds.has(id)) suppressedRequestIdsRef.current.delete(id);
    }
    setRequests(
      pending
        .filter((item) => !suppressedRequestIdsRef.current.has(item.requestId))
        // Official jfe: skip already-acknowledged tool decisions (5min TTL localStorage).
        .filter((item) => {
          const toolUseId = item.toolUseId ?? item.requestId;
          return !isOfficialToolDecisionAcknowledged(sessionId, toolUseId)
            && !isOfficialToolDecisionAcknowledged(sessionId, item.requestId);
        })
        .map(inlinePermissionFromPending),
    );
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setRequests([]);
      suppressedRequestIdsRef.current.clear();
      return undefined;
    }
    let alive = true;
    void bridge.getSession(sessionId).then((session) => {
      if (!alive) return;
      // Empty array is authoritative — do not keep a stale local card after store clear.
      if (Array.isArray(session?.pendingToolPermissions)) {
        syncRequestsFromStorePending(session.pendingToolPermissions);
      }
    }).catch(() => {});
    const onPermissionEvent = (event: unknown) => {
      // session_updated carries the full pending queue after register/clear.
      const raw = asRecord(event);
      if (stringValue(raw.type) === "session_updated") {
        const session = asRecord(raw.session);
        const sessionIdFromEvent = stringValue(raw.sessionId) ?? stringValue(session.id) ?? stringValue(session.sessionId);
        if (sessionIdFromEvent && sessionIdFromEvent !== sessionId) return;
        const pending = session.pendingToolPermissions;
        if (Array.isArray(pending)) {
          syncRequestsFromStorePending(pending as NonNullable<SessionSummary["pendingToolPermissions"]>);
        }
        return;
      }
      const resolvedId = toolPermissionResolvedId(event, sessionId);
      if (resolvedId) {
        suppressedRequestIdsRef.current.add(resolvedId);
        setRequests((current) => current.filter((request) => request.requestId !== resolvedId));
        return;
      }
      const request = normalizeToolPermissionRequest(event, sessionId);
      if (!request) return;
      if (suppressedRequestIdsRef.current.has(request.requestId)) return;
      // Official jfe: skip already-acknowledged tool_use_id (trailing / reconnect hydrate).
      const toolUseId = request.toolUseId ?? request.requestId;
      if (
        isOfficialToolDecisionAcknowledged(sessionId, toolUseId)
        || isOfficialToolDecisionAcknowledged(sessionId, request.requestId)
      ) {
        return;
      }
      setResolveError(null);
      setRequests((current) => {
        const existingIndex = current.findIndex((item) => item.requestId === request.requestId);
        if (existingIndex < 0) return [...current, request];
        const next = current.slice();
        next[existingIndex] = request;
        return next;
      });
    };
    const unsubscribePermission = bridge.onToolPermissionRequest?.(onPermissionEvent);
    const unsubscribeEvents = bridge.onEvent?.(onPermissionEvent);
    return () => {
      alive = false;
      unsubscribePermission?.();
      unsubscribeEvents?.();
    };
  }, [bridge, sessionId, syncRequestsFromStorePending]);

  useEffect(() => {
    if (!sessionId || storePending === undefined) return;
    // storePending is source of truth including [] — empty must clear local queue.
    syncRequestsFromStorePending(storePending ?? []);
  }, [sessionId, storePending, syncRequestsFromStorePending]);

  // Official rwe `h`: nwe pending ExitPlanMode not jfe-acknowledged → plan modal when no IPC pending.
  useEffect(() => {
    if (!sessionId) return;
    const ipcHasExitPlan = (storePending ?? []).some((item) => isOfficialExitPlanModeTool(item.toolName));
    if (ipcHasExitPlan) return;
    const lastPlanId = nweScan.lastPlan?.id;
    if (!nweScan.isPending || !nweScan.lastPlan || !lastPlanId) {
      // Drop synthetic nwe ExitPlan card once tool_result lands / scan not pending.
      if (!lastPlanId) {
        // No ExitPlanMode in transcript — strip synthetic cards that used toolUseId as requestId.
        setRequests((current) => current.filter((item) => !(
          isOfficialExitPlanModeTool(item.toolName)
          && item.requestId === item.toolUseId
          && !(storePending ?? []).some((p) => p.requestId === item.requestId)
        )));
        return;
      }
      setRequests((current) => current.filter((item) => (
        item.requestId !== lastPlanId && item.toolUseId !== lastPlanId
      )));
      return;
    }
    const toolUseId = lastPlanId;
    // Official jfe skip: do not mount / drop already-mounted synthetic for acknowledged id.
    if (
      isOfficialToolDecisionAcknowledged(sessionId, toolUseId)
      || suppressedRequestIdsRef.current.has(toolUseId)
    ) {
      setRequests((current) => current.filter((item) => (
        item.requestId !== toolUseId && item.toolUseId !== toolUseId
      )));
      return;
    }
    setRequests((current) => {
      if (current.some((item) => item.requestId === toolUseId || item.toolUseId === toolUseId)) {
        return current;
      }
      // Prefer keeping any non-ExitPlan IPC cards; inject ExitPlan at front like official trailing hydrate.
      const synthetic: InlineToolPermissionRequest = {
        requestId: toolUseId,
        sessionId,
        toolName: "ExitPlanMode",
        toolUseId,
        input: { plan: nweScan.lastPlan!.plan },
        description: "Claude proposed a plan",
        hasAlwaysAllow: false,
      };
      return [synthetic, ...current.filter((item) => !isOfficialExitPlanModeTool(item.toolName))];
    });
  }, [nweScan.isPending, nweScan.lastPlan, sessionId, storePending]);

  const request = requests[0];
  const hasAlwaysAllow = request?.hasAlwaysAllow !== false;
  // Official tool_name is "ExitPlanMode"; normalize snake/legacy aliases so Wk card mounts.
  const isExitPlanMode = isOfficialExitPlanModeTool(request?.toolName);

  // Official Wk effect: when ExitPlanMode approval is active, open Plan pane once.
  useEffect(() => {
    if (!request || !isExitPlanMode || !onOpenPlan) return;
    if (openedPlanForRequestIdRef.current === request.requestId) return;
    openedPlanForRequestIdRef.current = request.requestId;
    onOpenPlan();
  }, [isExitPlanMode, onOpenPlan, request]);

  const decide = useCallback(async (
    decision: "always" | "deny" | "once",
    updatedInput?: Record<string, unknown>,
    options?: { targetMode?: string },
  ) => {
    if (!request || !bridge.respondToToolPermission) return;
    if (decision === "always" && request.hasAlwaysAllow === false) return;
    const requestId = request.requestId;
    setResolvingId(requestId);
    setResolveError(null);
    // Official sendToolDecision: set resolving then resolveRequest immediately (optimistic).
    suppressedRequestIdsRef.current.add(requestId);
    setRequests((current) => current.filter((item) => item.requestId !== requestId));
    // Official Wk: onModeChange(targetMode) fires with accept decide (same tick).
    if (options?.targetMode) {
      void onPermissionModeChange?.(options.targetMode);
    }
    try {
      // Pass sessionId inside updatedInput so desktop IPC can resolve the live turn
      // without relying only on findSessionIdForPermission store fallback.
      // Official Wk merges tool.input + _targetMode / _feedbackMessage into decide payload.
      const result = await bridge.respondToToolPermission(requestId, decision, {
        ...request.input,
        ...updatedInput,
        sessionId: request.sessionId,
      });
      if (toolPermissionResponseFailed(result)) {
        const errorText = toolPermissionResponseError(result);
        setResolveError(errorText);
        // Stale turn: keep card dismissed so the user is not stuck on a dead approval.
        // Still _fe when this was a synthetic nwe inject (requestId === toolUseId) so jfe
        // skips re-showing rwe plan modal after no_active_turn / reconnect.
        if (errorText.includes("no_active_turn")) {
          const toolUseId = request.toolUseId ?? request.requestId;
          if (
            sessionId
            && toolUseId
            && isOfficialExitPlanModeTool(request.toolName)
            && request.requestId === toolUseId
          ) {
            acknowledgeOfficialToolDecision(sessionId, toolUseId, request.toolName);
          }
          return;
        }
        // Official catch path: restore pending + surface error so user can retry.
        suppressedRequestIdsRef.current.delete(requestId);
        setRequests((current) => {
          if (current.some((item) => item.requestId === requestId)) return current;
          return [request, ...current];
        });
        return;
      }
      // Official _fe after successful resolve — jfe skips re-showing this tool_use on rehydrate.
      const toolUseId = request.toolUseId ?? request.requestId;
      if (sessionId && toolUseId) {
        acknowledgeOfficialToolDecision(sessionId, toolUseId, request.toolName);
        if (toolUseId !== request.requestId) {
          acknowledgeOfficialToolDecision(sessionId, request.requestId, request.toolName);
        }
      }
      // Success: leave suppressed until store pending no longer lists this id.
    } catch (error) {
      setResolveError(error instanceof Error ? error.message : String(error));
      suppressedRequestIdsRef.current.delete(requestId);
      setRequests((current) => {
        if (current.some((item) => item.requestId === requestId)) return current;
        return [request, ...current];
      });
    } finally {
      setResolvingId(null);
    }
  }, [bridge, onPermissionModeChange, request, sessionId]);

  // Generic tool card shortcuts only — ExitPlanMode Wk owns Escape / ⌘⏎ itself.
  useEffect(() => {
    if (!request || isExitPlanMode) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || resolvingId === request.requestId) return;
      if (event.key === "Escape") {
        if (event.isComposing) {
          event.stopPropagation();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        void decide("deny");
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        const decision = event.shiftKey ? "always" : "once";
        if (decision === "always" && !hasAlwaysAllow) return;
        void decide(decision);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [decide, hasAlwaysAllow, isExitPlanMode, request, resolvingId]);

  if (!request) return null;

  const busy = resolvingId === request.requestId;
  if (isExitPlanMode) {
    // Official Mt.planExitTrustMode / planExitAcceptOptions from Os available modes.
    const availableModes = officialAvailablePermissionModes();
    const planExitTrustMode = officialPlanExitTrustMode(availableModes);
    const planExitAcceptOptions = officialPlanExitAcceptOptions(availableModes);
    return (
      <OfficialExitPlanModeApprovalCard
        acceptOptions={planExitAcceptOptions}
        busy={busy}
        onDecide={(decision, updatedInput, options) => void decide(decision, updatedInput, options)}
        onOpenPlan={onOpenPlan}
        queueDepth={Math.max(0, requests.length - 1)}
        request={request}
        sessionId={sessionId}
        trustForwardMode={planExitTrustMode}
      >
        {resolveError ? <div className="text-footnote text-extended-pink">{resolveError}</div> : null}
      </OfficialExitPlanModeApprovalCard>
    );
  }
  return (
    <OfficialToolApprovalCard
      busy={busy}
      onDecide={(decision) => void decide(decision)}
      queueDepth={Math.max(0, requests.length - 1)}
      request={request}
    >
      {resolveError ? <div className="text-footnote text-extended-pink">{resolveError}</div> : null}
    </OfficialToolApprovalCard>
  );
}

type OfficialToolApprovalDecision = "always" | "deny" | "once";

type OfficialToolApprovalCopy = {
  action: ReactNode;
  detail?: string;
  meta?: string;
};

const officialApprovalCollapseTransition = {
  height: { type: "spring", duration: 0.35, bounce: 0 },
  opacity: { duration: 0.2, ease: "easeOut" },
} as const;

const officialApprovalCollapsed = { height: 0, opacity: 0 } as const;
const officialApprovalExpanded = { height: "auto", opacity: 1 } as const;

const OfficialToolApprovalCard = memo(function OfficialToolApprovalCard({
  busy,
  children,
  onDecide,
  queueDepth,
  request,
}: {
  busy?: boolean;
  children?: ReactNode;
  onDecide: (decision: OfficialToolApprovalDecision) => void;
  queueDepth: number;
  request: InlineToolPermissionRequest;
}) {
  const copy = useMemo(() => officialToolApprovalCopy(request), [request]);
  const ghostCount = Math.min(queueDepth, 2);
  const hasAlwaysAllow = request.hasAlwaysAllow !== false;

  return (
    <div className="epitaxy-approval-card">
      {Array.from({ length: ghostCount }, (_, index) => {
        const layer = index + 1;
        return (
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-r7 bg-surface-primary-elevated epitaxy-approval-ghost"
            key={layer}
            style={{
              opacity: 1 - 0.25 * layer,
              transform: `translateY(-${6 * layer}px) scale(${1 - 0.03 * layer})`,
              zIndex: -layer,
            }}
          />
        );
      })}
      <OfficialApprovalSurface elevation="sidebar" />
      <OfficialToolApprovalCopyView copy={copy} description={request.description} toolName={request.toolName} />
      {request.decisionReason ? <div className="text-footnote text-t7 select-text break-words">{request.decisionReason}</div> : null}
      {children}
      <div className="epitaxy-approval-actions flex flex-wrap justify-between gap-x-g3 gap-y-[8px]">
        <OfficialButton ariaLabel="Deny" className="shrink-0" disabled={busy} onClick={() => onDecide("deny")} size="base" variant="contained">
          Deny
          <OfficialApprovalShortcut>esc</OfficialApprovalShortcut>
        </OfficialButton>
        <div className="flex min-w-0 flex-wrap gap-[8px]">
          {hasAlwaysAllow ? (
            <OfficialButton ariaLabel="Always allow" className="min-w-0" disabled={busy} onClick={() => onDecide("always")} size="base" variant="contained">
              <span className="min-w-0 truncate">{officialAlwaysAllowLabel(request.alwaysAllowScope)}</span>
              <OfficialApprovalShortcut>⌘⇧⏎</OfficialApprovalShortcut>
            </OfficialButton>
          ) : null}
          <OfficialButton ariaLabel="Allow once" className="min-w-0" disabled={busy} onClick={() => onDecide("once")} size="base" variant="primary">
            <span className="min-w-0 truncate">Allow once</span>
            <OfficialApprovalShortcut>⌘⏎</OfficialApprovalShortcut>
          </OfficialButton>
        </div>
      </div>
    </div>
  );
});

/** Official Bk accept labels (c11959232 Wk). */
const OFFICIAL_EXIT_PLAN_ACCEPT_LABELS: Record<string, string> = {
  default: "Accept",
  acceptEdits: "Accept and allow edits",
  auto: "Accept and auto mode",
  bypassPermissions: "Accept and bypass permissions",
};

function officialExitPlanAcceptLabel(mode: string): string {
  return OFFICIAL_EXIT_PLAN_ACCEPT_LABELS[mode] ?? OFFICIAL_EXIT_PLAN_ACCEPT_LABELS.default;
}

/** Official qk default acceptOptions. */
const OFFICIAL_EXIT_PLAN_ACCEPT_OPTIONS = ["acceptEdits"] as const;

/**
 * Official Wk ExitPlanMode approval (c11959232):
 * - header "Claude proposed a plan" + trailing "Open plan" → onOpenPlan
 * - auto-opens plan pane via parent effect on first mount (not card body)
 * - Reject / Revise… (esc → feedback → Revise) / Accept (trustForwardMode)
 * - acceptOptions.length > 1 → Kw OfficialSplitDropdownButton ("More accept options")
 * - accept → decide("once", {...input, _targetMode}) + onModeChange(targetMode)
 * - reject → decide("deny", {...input, _feedbackMessage})
 * - No plan body preview in the card (plan lives in side pane)
 */
const OfficialExitPlanModeApprovalCard = memo(function OfficialExitPlanModeApprovalCard({
  busy,
  children,
  onDecide,
  onOpenPlan,
  queueDepth,
  request,
  sessionId,
  trustForwardMode = "acceptEdits",
  acceptOptions = OFFICIAL_EXIT_PLAN_ACCEPT_OPTIONS as unknown as string[],
  isUltraplanMode = false,
}: {
  acceptOptions?: string[];
  busy?: boolean;
  children?: ReactNode;
  isUltraplanMode?: boolean;
  onDecide: (
    decision: OfficialToolApprovalDecision,
    updatedInput?: Record<string, unknown>,
    options?: { targetMode?: string },
  ) => void;
  onOpenPlan?: () => void;
  queueDepth: number;
  request: InlineToolPermissionRequest;
  sessionId?: string;
  trustForwardMode?: string;
}) {
  const ghostCount = Math.min(queueDepth, 2);
  const [revising, setRevising] = useState(false);
  const [feedback, setFeedback] = useState("");
  const feedbackRef = useRef<HTMLTextAreaElement | null>(null);
  // Keep latest feedback for Enter/Revise so same-tick IME/composition never reads stale "" .
  const feedbackValueRef = useRef(feedback);
  feedbackValueRef.current = feedback;
  const isPanelActiveRef = useRef(true);
  // Official Wk: Escape closes open Kw menu before entering revise (N.current / R).
  const [acceptMenuOpen, setAcceptMenuOpen] = useState(false);
  const acceptMenuOpenRef = useRef(false);
  const input = request.input;
  // Official Wk $k / Uk keyed by sessionId — prefer host prop, fall back to request.sessionId
  // so comment→revise linkage (T = y || P) still works if sessionRef is briefly null.
  // Use both ids: if host prop and pending.sessionId ever diverge, still flip T when either has comments.
  const hostSessionId = sessionId || undefined;
  const requestSessionId = request.sessionId || undefined;
  const commentSessionId = hostSessionId ?? requestSessionId;
  // Official Wk x = comment count; T = y || P (revising OR has comments → revise UI).
  // Subscribe both keys so a mismatched pending.sessionId cannot leave Reject while Plan marks paint.
  const hostCommentCount = useOfficialPlanCommentCount(hostSessionId);
  const requestCommentCount = useOfficialPlanCommentCount(
    requestSessionId && requestSessionId !== hostSessionId ? requestSessionId : null,
  );
  const planCommentCount = Math.max(hostCommentCount, requestCommentCount);
  const hasPlanComments = planCommentCount > 0;
  const showReviseUi = revising || hasPlanComments;

  const setAcceptMenuOpenState = useCallback((open: boolean) => {
    acceptMenuOpenRef.current = open;
    setAcceptMenuOpen(open);
  }, []);

  // Official Wk focuses feedback when y (revising) becomes true.
  // Comment 联动: T also becomes true when P (comments > 0) while ExitPlanMode card is mounted —
  // focus the revise textarea ("Anything else to add?") so the card input is live after Comment.
  // Also re-focus when planCommentCount increases while already in revise UI (WN dismisses after
  // Comment and focus would otherwise stay nowhere / on plan pane).
  useLayoutEffect(() => {
    if (!showReviseUi) return;
    feedbackRef.current?.focus();
  }, [planCommentCount, showReviseUi]);

  const clearPlanComments = useCallback(() => {
    // Clear both possible keys if host/request sessionId ever diverged during a permission hydrate.
    if (hostSessionId) officialPlanCommentsApi.clear(hostSessionId);
    if (requestSessionId && requestSessionId !== hostSessionId) {
      officialPlanCommentsApi.clear(requestSessionId);
    }
  }, [hostSessionId, requestSessionId]);

  const accept = useCallback((targetMode: string) => {
    setAcceptMenuOpenState(false);
    // Official Mfe resolveRequest: ExitPlanMode allow → setApprovedPlan(session, plan).
    const planText = typeof input.plan === "string" ? input.plan : "";
    if (commentSessionId && planText) setOfficialApprovedPlan(commentSessionId, planText);
    clearPlanComments();
    onDecide("once", { ...input, _targetMode: targetMode }, { targetMode });
  }, [clearPlanComments, commentSessionId, input, onDecide, setAcceptMenuOpenState]);

  const reject = useCallback((message: string) => {
    setAcceptMenuOpenState(false);
    // Official Wk reject: Hk(comments, feedback) then $k.clear.
    // Prefer host session comments; fall back to request.sessionId bucket if only that was written.
    const comments = [
      ...officialPlanCommentsApi.get(hostSessionId),
      ...(requestSessionId && requestSessionId !== hostSessionId
        ? officialPlanCommentsApi.get(requestSessionId)
        : []),
    ];
    const merged = mergeOfficialPlanCommentFeedback(comments, message);
    clearPlanComments();
    onDecide("deny", { ...input, _feedbackMessage: merged });
  }, [clearPlanComments, hostSessionId, input, onDecide, requestSessionId, setAcceptMenuOpenState]);

  // Official ultraplan accept-local: deny with special feedback prefix + plan body.
  // index-BELzQL5P awe = "__ULTRAPLAN_TELEPORT_LOCAL__" (c119 Ha in Wk).
  const acceptLocal = useCallback(() => {
    const plan = typeof input.plan === "string" ? input.plan : "";
    clearPlanComments();
    onDecide("deny", {
      ...input,
      _feedbackMessage: `__ULTRAPLAN_TELEPORT_LOCAL__\n${plan}`,
    });
  }, [clearPlanComments, input, onDecide]);

  // Official Wk window keydown: Escape → close menu or revise; ⌘⏎ accept trust; ⌘⇧⏎ accept default.
  // Disabled while revise UI open (T).
  useEffect(() => {
    if (showReviseUi || busy) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPanelActiveRef.current) return;
      if (event.key === "Escape") {
        if (event.isComposing) return;
        if (acceptMenuOpenRef.current) {
          event.preventDefault();
          event.stopPropagation();
          setAcceptMenuOpenState(false);
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        setRevising(true);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        accept(event.shiftKey ? "default" : trustForwardMode);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [accept, busy, setAcceptMenuOpenState, showReviseUi, trustForwardMode]);

  const onFeedbackKeyDown = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    // Official _: Escape only cancels when no comments (P); with comments stay in revise.
    // CJK IME: composition Enter/Escape must not reject or dismiss.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "Escape" && !hasPlanComments) {
      event.preventDefault();
      setRevising(false);
      setFeedback("");
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      reject(feedbackValueRef.current);
    }
  }, [hasPlanComments, reject]);

  const acceptLabel = officialExitPlanAcceptLabel(trustForwardMode);
  const showDefaultAccept = trustForwardMode !== "default";
  // Official Wk D: menu items for every acceptOption (including trust primary).
  const acceptMenuItems = useMemo<OfficialDropdownItem[]>(
    () =>
      acceptOptions.map((mode) => ({
        label: officialExitPlanAcceptLabel(mode),
        onSelect: () => accept(mode),
      })),
    [accept, acceptOptions],
  );

  return (
    <div className="epitaxy-approval-card">
      {Array.from({ length: ghostCount }, (_, index) => {
        const layer = index + 1;
        return (
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-r7 bg-surface-primary-elevated epitaxy-approval-ghost"
            key={layer}
            style={{
              opacity: 1 - 0.25 * layer,
              transform: `translateY(-${6 * layer}px) scale(${1 - 0.03 * layer})`,
              zIndex: -layer,
            }}
          />
        );
      })}
      <OfficialApprovalSurface elevation="sidebar" />
      {/* Official Wk Ah: trailing Open plan (c11959232 Ah trailing shrink-0 self-center). */}
      <OfficialApprovalHeader
        trailing={
          onOpenPlan ? (
            <OfficialButton ariaLabel="Open plan" onClick={onOpenPlan} size="small" variant="uncontained">
              Open plan
            </OfficialButton>
          ) : undefined
        }
      >
        Claude proposed a plan
      </OfficialApprovalHeader>
      {request.decisionReason ? <div className="text-footnote text-t7 select-text break-words">{request.decisionReason}</div> : null}
      {children}
      {showReviseUi ? (
        <>
          {hasPlanComments && (hostCommentCount > 0 ? hostSessionId : requestSessionId) ? (
            <OfficialPlanCommentsList
              onOpenPlan={onOpenPlan}
              sessionId={(hostCommentCount > 0 ? hostSessionId : requestSessionId) as string}
            />
          ) : null}
          <textarea
            aria-label="Plan feedback"
            className="epitaxy-textarea w-full"
            disabled={busy}
            onChange={(event) => {
              const next = event.target.value;
              feedbackValueRef.current = next;
              setFeedback(next);
            }}
            onKeyDown={onFeedbackKeyDown}
            placeholder={hasPlanComments ? "Anything else to add?" : "What should change? (optional)"}
            ref={feedbackRef}
            rows={3}
            value={feedback}
          />
          <div className="flex flex-col gap-g3 sm:flex-row sm:justify-between">
            {hasPlanComments ? (
              <span />
            ) : (
              <OfficialButton
                ariaLabel="Back"
                disabled={busy}
                onClick={() => {
                  setRevising(false);
                  setFeedback("");
                }}
                size="base"
                variant="contained"
              >
                Back
                <OfficialApprovalShortcut>esc</OfficialApprovalShortcut>
              </OfficialButton>
            )}
            <OfficialButton
              ariaLabel="Revise"
              disabled={busy}
              onClick={() => reject(feedbackValueRef.current)}
              size="base"
              variant="primary"
            >
              Revise
              <OfficialApprovalShortcut>⏎</OfficialApprovalShortcut>
            </OfficialButton>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-g3 sm:flex-row sm:justify-between">
          <div className="flex gap-[8px]">
            <OfficialButton
              ariaLabel="Reject"
              disabled={busy}
              onClick={() => reject("")}
              size="base"
              variant="contained"
            >
              Reject
            </OfficialButton>
            <OfficialButton
              ariaLabel="Revise"
              disabled={busy}
              onClick={() => setRevising(true)}
              size="base"
              variant="contained"
            >
              Revise…
              <OfficialApprovalShortcut>esc</OfficialApprovalShortcut>
            </OfficialButton>
          </div>
          <div className="flex flex-wrap justify-end gap-[8px]">
            {isUltraplanMode ? (
              <OfficialButton
                ariaLabel="Return to terminal"
                disabled={busy}
                onClick={acceptLocal}
                size="base"
                variant="contained"
              >
                Return to terminal
              </OfficialButton>
            ) : null}
            {showDefaultAccept ? (
              <OfficialButton
                ariaLabel={officialExitPlanAcceptLabel("default")}
                disabled={busy}
                onClick={() => accept("default")}
                size="base"
                variant="contained"
              >
                {officialExitPlanAcceptLabel("default")}
                <OfficialApprovalShortcut>⌘⇧⏎</OfficialApprovalShortcut>
              </OfficialButton>
            ) : null}
            {acceptOptions.length > 1 ? (
              // Official Kw: primary trust accept + chevron "More accept options".
              <OfficialSplitDropdownButton
                align="end"
                ariaLabel={acceptLabel}
                busy={busy}
                disabled={busy}
                items={acceptMenuItems}
                label={(
                  <span className="inline-flex items-center gap-g4">
                    {acceptLabel}
                    <OfficialApprovalShortcut>⌘⏎</OfficialApprovalShortcut>
                  </span>
                )}
                menuLabel="More accept options"
                onIconClick={() => accept(trustForwardMode)}
                onOpenChange={setAcceptMenuOpenState}
                open={acceptMenuOpen}
                side="top"
                size="base"
                variant="primary"
              />
            ) : (
              <OfficialButton
                ariaLabel={acceptLabel}
                disabled={busy}
                onClick={() => accept(trustForwardMode)}
                size="base"
                variant="primary"
              >
                {acceptLabel}
                <OfficialApprovalShortcut>⌘⏎</OfficialApprovalShortcut>
              </OfficialButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

function OfficialToolApprovalCopyView({ copy, description, toolName }: { copy: OfficialToolApprovalCopy; description?: string; toolName: string }) {
  const [expanded, setExpanded] = useState(true);
  const hasDetail = Boolean(copy.detail && copy.detail !== copy.meta);
  const toolIntro = <div className="text-footnote text-t6 select-text break-words">Claude wants to use {toolName}</div>;
  const descriptionNode = description ? <div className="text-footnote text-t6 select-text break-words">{description}</div> : null;
  const title = (
    <>
      Allow Claude to <span className="text-t9">{copy.action}</span>
      {copy.meta ? <> <span className="text-t9">{copy.meta}</span></> : null}?
    </>
  );

  if (hasDetail) {
    return (
      <div className="flex flex-col gap-[8px]">
        {toolIntro}
        <OfficialApprovalHeader ariaExpanded={expanded} onClick={() => setExpanded((value) => !value)}>{title}</OfficialApprovalHeader>
        {descriptionNode}
        <OfficialApprovalCollapse expanded={expanded}>
          <div className="bg-t1 rounded-r4 py-p6 px-p8 text-code text-t7 whitespace-pre-wrap break-words select-text max-h-[240px] overflow-y-auto">{copy.detail}</div>
        </OfficialApprovalCollapse>
      </div>
    );
  }

  if (descriptionNode) {
    return (
      <div className="flex flex-col gap-[8px]">
        {toolIntro}
        <OfficialApprovalHeader>{title}</OfficialApprovalHeader>
        {descriptionNode}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[8px]">
      {toolIntro}
      <OfficialApprovalHeader>{title}</OfficialApprovalHeader>
    </div>
  );
}

/**
 * Official Ah header (c11959232):
 * - default class: text-body-semibold text-t9 min-h-[24px] flex items-center gap-1 pb-p6
 * - leading col: flex-1 min-w-0 + gap-g3 row with awaiting yellow dot + children
 * - trailing: shrink-0 self-center (Wk Open plan)
 */
function OfficialApprovalHeader({
  ariaExpanded,
  children,
  className,
  onClick,
  trailing,
}: {
  ariaExpanded?: boolean;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  const baseClass = className ?? "text-body-semibold text-t9 min-h-[24px] flex items-center gap-1 pb-p6";
  const content = (
    <span className="flex flex-1 min-w-0 flex-col gap-[2px]">
      <span className="flex items-center gap-g3 min-w-0">
        <span aria-hidden="true" className="grid size-[20px] shrink-0 place-items-center">
          <span className="size-[6px] rounded-full bg-extended-yellow" />
        </span>
        <span className="min-w-0 break-words">{children}</span>
      </span>
    </span>
  );
  const trailingNode = trailing ? <span className="shrink-0 self-center">{trailing}</span> : null;

  return onClick ? (
    <button
      aria-expanded={ariaExpanded}
      className={`${baseClass} w-full text-left outline-none hide-focus-ring focus:ring-focus`}
      onClick={onClick}
      type="button"
    >
      {content}
      {trailingNode}
    </button>
  ) : (
    <div className={baseClass}>
      {content}
      {trailingNode}
    </div>
  );
}

function OfficialApprovalCollapse({ children, expanded }: { children: ReactNode; expanded: boolean }) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return expanded ? <div>{children}</div> : null;
  return (
    <AnimatePresence initial={false}>
      {expanded ? (
        <motion.div
          animate={officialApprovalExpanded}
          className="overflow-hidden"
          exit={officialApprovalCollapsed}
          initial={officialApprovalCollapsed}
          transition={officialApprovalCollapseTransition}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function OfficialApprovalSurface({ className, elevation }: { className?: string; elevation: "hud" | "popover" | "prompt" | "sidebar" }) {
  const elevationClass = {
    hud: "bg-surface-hud effect-hud",
    popover: "bg-surface-popover effect-stroke-shadow",
    prompt: "bg-surface-prompt-blur effect-prompt-blur",
    sidebar: "bg-surface-primary-elevated effect-primary-elevated",
  }[elevation];
  return <div aria-hidden="true" className={`absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none ${elevationClass} ${className ?? ""}`} data-surface={elevation} />;
}

function OfficialApprovalShortcut({ children }: { children: ReactNode }) {
  return <kbd className="text-caption opacity-60 shrink-0">{children}</kbd>;
}

function officialAlwaysAllowLabel(scope?: string) {
  if (scope === "session") return "Always allow in this session";
  if (scope === "project") return "Always allow in this project";
  if (scope === "projectLocal") return "Always allow in this project (local)";
  if (scope === "user") return "Always allow everywhere";
  return "Always allow";
}

function officialToolApprovalCopy(request: InlineToolPermissionRequest): OfficialToolApprovalCopy {
  const input = request.input;
  const stringInput = (key: string) => stringValue(input[key]);
  const toolName = request.toolName;
  const normalizedName = toolName.split("__").pop() ?? toolName;
  switch (normalizedName) {
    case "Bash":
    case "BashTool":
      return { action: "run", meta: stringInput("description"), detail: stringInput("command") };
    case "Read":
      return { action: "read", ...officialPathCopy(stringInput("file_path")) };
    case "Write":
      return { action: "write", ...officialPathCopy(stringInput("file_path")) };
    case "Edit":
    case "MultiEdit":
      return { action: "edit", ...officialPathCopy(stringInput("file_path")) };
    case "NotebookEdit":
      return { action: "edit", ...officialPathCopy(stringInput("notebook_path")) };
    case "Grep":
    case "Glob":
      return { action: "search", meta: stringInput("pattern") };
    case "WebFetch":
      return { action: "fetch", meta: stringInput("url") };
    case "WebSearch":
      return { action: "search the web", meta: stringInput("query") };
    case "Skill": {
      const skill = stringInput("skill");
      return { action: "run skill", meta: skill ? `/${skill}` : undefined, detail: stringInput("args") };
    }
    case "Task":
    case "Agent":
      return { action: "run an agent", meta: stringInput("description") };
    case "request_directory": {
      const directory = stringInput("path");
      return directory ? { action: "access", ...officialPathCopy(directory) } : { action: "access a folder" };
    }
    default: {
      const label = toolName.startsWith("mcp__") ? normalizedName.replace(/_/g, " ") : normalizedName;
      return {
        action: `use ${label}`,
        detail: Object.keys(input).length > 0 ? JSON.stringify(input, null, 2) : undefined,
      };
    }
  }
}

function officialPathCopy(value?: string) {
  return value ? { meta: officialBasename(value), detail: value } : {};
}

function officialBasename(value: string) {
  const trimmed = value.replace(/[\\/]+$/, "");
  const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return index < 0 ? trimmed : trimmed.slice(index + 1);
}

function toolPermissionResponseFailed(value: unknown) {
  const raw = asRecord(value);
  return raw.ok === false || raw.success === false || Boolean(raw.error);
}

function toolPermissionResponseError(value: unknown) {
  const raw = asRecord(value);
  return stringValue(raw.error) ?? "Permission response failed.";
}


function isOfficialExitPlanModeTool(toolName: string | undefined | null): boolean {
  if (!toolName) return false;
  const base = toolName.split("__").pop() ?? toolName;
  return base === "ExitPlanMode" || base === "exit_plan_mode" || base === "exitPlanMode";
}

function inlinePermissionFromPending(item: NonNullable<SessionSummary["pendingToolPermissions"]>[number]): InlineToolPermissionRequest {
  return {
    alwaysAllowScope: item.alwaysAllowScope,
    decisionReason: item.decisionReason,
    description: item.description,
    hasAlwaysAllow: item.hasAlwaysAllow,
    input: asRecord(item.input),
    requestId: item.requestId,
    sessionId: item.sessionId,
    toolName: item.toolName,
    toolUseId: item.toolUseId,
  };
}

function mergeInlinePermissionRequests(
  current: InlineToolPermissionRequest[],
  incoming: InlineToolPermissionRequest[],
) {
  // Empty incoming is authoritative clear (store / session_updated after resolve).
  // Previous behavior kept `current` and left approval cards stuck after Allow/Deny.
  if (incoming.length === 0) return [];
  if (current.length === 0) return incoming;
  const byId = new Map(current.map((item) => [item.requestId, item]));
  for (const item of incoming) byId.set(item.requestId, item);
  // Preserve arrival order of existing requests still present, then append new ids.
  // Drop requestIds that are no longer in incoming (store removed them).
  const ordered: InlineToolPermissionRequest[] = [];
  const seen = new Set<string>();
  const incomingIds = new Set(incoming.map((item) => item.requestId));
  for (const item of current) {
    if (!incomingIds.has(item.requestId)) continue;
    const next = byId.get(item.requestId);
    if (next) {
      ordered.push(next);
      seen.add(item.requestId);
    }
  }
  for (const item of incoming) {
    if (!seen.has(item.requestId)) ordered.push(item);
  }
  return ordered;
}

function normalizeToolPermissionRequest(event: unknown, activeSessionId: string): InlineToolPermissionRequest | null {
  const raw = asRecord(event);
  const message = asRecord(raw.message);
  const request = firstNonEmptyRecord(
    raw.request,
    raw.toolPermissionRequest,
    raw.permissionRequest,
    message.request,
    message.toolPermissionRequest,
    message.permissionRequest,
  );
  const type = stringValue(raw.type) ?? stringValue(message.type) ?? stringValue(raw.kind) ?? stringValue(message.kind);
  const subtype = stringValue(raw.subtype) ?? stringValue(message.subtype) ?? stringValue(request.subtype);
  const looksLikeRequest = type === "tool_permission_request"
    || type === "permission_request"
    || subtype === "tool_permission"
    || Object.keys(request).length > 0 && (request.toolName || request.tool_name || request.requestId || request.request_id);
  if (!looksLikeRequest) return null;
  const sessionId = stringValue(raw.sessionId)
    ?? stringValue(message.sessionId)
    ?? stringValue(request.sessionId)
    ?? stringValue(request.session_id)
    ?? activeSessionId;
  if (sessionId !== activeSessionId) return null;
  const requestId = stringValue(request.requestId)
    ?? stringValue(request.request_id)
    ?? stringValue(request.toolUseId)
    ?? stringValue(request.tool_use_id)
    ?? stringValue(raw.requestId)
    ?? stringValue(message.requestId);
  const toolName = stringValue(request.toolName)
    ?? stringValue(request.tool_name)
    ?? stringValue(raw.toolName)
    ?? stringValue(message.toolName)
    ?? "Tool";
  if (!requestId) return null;
  return {
    alwaysAllowScope: stringValue(request.alwaysAllowScope)
      ?? stringValue(request.always_allow_scope)
      ?? stringValue(request.permissionScope)
      ?? stringValue(request.permission_scope)
      ?? stringValue(raw.alwaysAllowScope)
      ?? stringValue(message.alwaysAllowScope),
    decisionReason: stringValue(request.decisionReason)
      ?? stringValue(request.decision_reason)
      ?? stringValue(raw.decisionReason)
      ?? stringValue(message.decisionReason),
    description: stringValue(request.description) ?? stringValue(raw.description) ?? stringValue(message.description),
    hasAlwaysAllow: booleanValue(request.hasAlwaysAllow)
      ?? booleanValue(request.has_always_allow)
      ?? booleanValue(raw.hasAlwaysAllow)
      ?? booleanValue(message.hasAlwaysAllow),
    input: asRecord(request.input ?? raw.input ?? message.input),
    requestId,
    sessionId,
    toolName,
    toolUseId: stringValue(request.toolUseId) ?? stringValue(request.tool_use_id),
  };
}

function toolPermissionResolvedId(event: unknown, activeSessionId: string): string | null {
  const raw = asRecord(event);
  const message = asRecord(raw.message);
  const request = firstNonEmptyRecord(raw.request, message.request);
  const type = stringValue(raw.type) ?? stringValue(message.type);
  if (type !== "tool_permission_resolved" && type !== "permission_resolved") return null;
  const sessionId = stringValue(raw.sessionId)
    ?? stringValue(message.sessionId)
    ?? stringValue(request.sessionId)
    ?? stringValue(request.session_id)
    ?? activeSessionId;
  if (sessionId !== activeSessionId) return null;
  return stringValue(request.requestId)
    ?? stringValue(request.request_id)
    ?? stringValue(request.toolUseId)
    ?? stringValue(request.tool_use_id)
    ?? stringValue(raw.requestId)
    ?? stringValue(message.requestId)
    ?? null;
}






