import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LocalSessionsBridge } from "../../../adapters/desktopBridge/types";
import { CoworkButton } from "../ui/CoworkButton";
import { asRecord, booleanValue, stringValue } from "../session/recordUtils";
import { isCoworkDirectoryPermissionRequest } from "../session/transcript/coworkDirectoryTools";

type CoworkPermissionRequest = {
  alwaysAllowScope?: string;
  description?: string;
  hasAlwaysAllow?: boolean;
  input: Record<string, unknown>;
  requestId: string;
  sessionId: string;
  toolName: string;
};

type Decision = "always" | "deny" | "once";

export function CoworkPermissionApprovals({ bridge, sessionId }: { bridge: LocalSessionsBridge; sessionId: string }) {
  const { requests, setRequests } = usePermissionRequests(bridge, sessionId);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const request = requests[0];
  const decide = useCallback(async (decision: Decision) => {
    if (!request || !bridge.respondToToolPermission) return;
    setResolvingId(request.requestId);
    setError(null);
    try {
      const result = await bridge.respondToToolPermission(request.requestId, decision, request.input);
      if (permissionFailed(result)) setError(stringValue(asRecord(result).error) ?? "Permission response failed.");
      else setRequests((current) => current.filter((item) => item.requestId !== request.requestId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setResolvingId(null);
    }
  }, [bridge, request, setRequests]);
  usePermissionShortcuts(request, resolvingId, decide);
  if (!request) return null;
  const errorNode = error ? <div className="text-footnote text-extended-pink">{error}</div> : null;
  return isCoworkDirectoryPermissionRequest(request)
    ? <CoworkDirectoryApproval busy={resolvingId === request.requestId} error={errorNode} onDecide={decide} request={request} />
    : <CoworkToolApproval busy={resolvingId === request.requestId} error={errorNode} onDecide={decide} queueDepth={requests.length - 1} request={request} />;
}

function usePermissionRequests(bridge: LocalSessionsBridge, sessionId: string) {
  const [requests, setRequests] = useState<CoworkPermissionRequest[]>([]);
  useEffect(() => {
    let alive = true;
    void bridge.getSession(sessionId).then((session) => {
      if (alive) setRequests((session?.pendingToolPermissions ?? []).map((item) => ({ ...item, input: asRecord(item.input) })));
    }).catch(() => undefined);
    const onEvent = (event: unknown) => {
      const resolvedId = permissionResolvedId(event, sessionId);
      if (resolvedId) { setRequests((current) => current.filter((item) => item.requestId !== resolvedId)); return; }
      const request = normalizePermissionRequest(event, sessionId);
      if (request) setRequests((current) => upsertPermission(current, request));
    };
    const offPermission = bridge.onToolPermissionRequest?.(onEvent);
    const offEvent = bridge.onEvent?.(onEvent);
    return () => { alive = false; offPermission?.(); offEvent?.(); };
  }, [bridge, sessionId]);
  return { requests, setRequests };
}

function usePermissionShortcuts(request: CoworkPermissionRequest | undefined, resolvingId: string | null, decide: (decision: Decision) => Promise<void>) {
  useEffect(() => {
    if (!request) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || resolvingId === request.requestId) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); void decide("deny"); }
      else if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        const decision = event.shiftKey ? "always" : "once";
        if (decision === "always" && request.hasAlwaysAllow === false) return;
        event.preventDefault(); event.stopPropagation(); void decide(decision);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [decide, request, resolvingId]);
}

function CoworkDirectoryApproval({ busy, error, onDecide, request }: { busy: boolean; error: ReactNode; onDecide: (decision: Decision) => void; request: CoworkPermissionRequest }) {
  const path = stringValue(request.input.path);
  return (
    <div className="bg-bg-000 rounded-xl border border-border-300 shadow-lg overflow-hidden p-3"><div className="flex flex-col gap-2"><div className="text-sm text-text-200">Claude would like to <strong>Cowork</strong> in:</div>{path ? <span className="font-mono text-sm text-text-100 break-all">{path}</span> : null}{error}<div className="flex justify-end gap-2"><CoworkButton disabled={busy} onClick={() => onDecide("deny")} variant="contained">Deny</CoworkButton><CoworkButton disabled={busy} onClick={() => onDecide("once")} variant="primary">{path ? "Allow" : "Choose folder"}</CoworkButton></div></div></div>
  );
}

function CoworkToolApproval({ busy, error, onDecide, queueDepth, request }: { busy: boolean; error: ReactNode; onDecide: (decision: Decision) => void; queueDepth: number; request: CoworkPermissionRequest }) {
  const copy = useMemo(() => approvalCopy(request), [request]);
  return (
    <div className="epitaxy-approval-card">
      {Array.from({ length: Math.min(queueDepth, 2) }, (_, index) => <div aria-hidden="true" className="absolute inset-0 rounded-r7 bg-surface-primary-elevated epitaxy-approval-ghost" key={index} style={{ opacity: 0.75 - 0.25 * index, transform: `translateY(-${6 * (index + 1)}px) scale(${0.97 - 0.03 * index})`, zIndex: -index - 1 }} />)}
      <div aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] bg-surface-primary-elevated effect-primary-elevated" />
      <div className="flex flex-col gap-2"><div className="text-footnote text-t6">Claude wants to use {request.toolName}</div><div className="text-body-semibold text-t9">Allow Claude to {copy.action}{copy.meta ? ` ${copy.meta}` : ""}?</div>{copy.detail ? <div className="bg-t1 rounded-r4 py-p6 px-p8 text-code text-t7 whitespace-pre-wrap break-words max-h-[240px] overflow-y-auto">{copy.detail}</div> : null}{request.description ? <div className="text-footnote text-t6">{request.description}</div> : null}{error}</div>
      <div className="epitaxy-approval-actions flex flex-wrap justify-between gap-2"><CoworkButton disabled={busy} onClick={() => onDecide("deny")} variant="contained">Deny</CoworkButton><div className="flex gap-2">{request.hasAlwaysAllow === false ? null : <CoworkButton disabled={busy} onClick={() => onDecide("always")} variant="contained">{alwaysAllowLabel(request.alwaysAllowScope)}</CoworkButton>}<CoworkButton disabled={busy} onClick={() => onDecide("once")} variant="primary">Allow once</CoworkButton></div></div>
    </div>
  );
}

function approvalCopy(request: CoworkPermissionRequest) {
  const value = (key: string) => stringValue(request.input[key]);
  const name = request.toolName.split("__").pop() ?? request.toolName;
  if (name === "Bash" || name === "BashTool") return { action: "run", detail: value("command"), meta: value("description") };
  if (["Read", "Write", "Edit", "MultiEdit"].includes(name)) return { action: name === "Read" ? "read" : name === "Write" ? "write" : "edit", detail: value("file_path"), meta: basename(value("file_path")) };
  if (name === "WebFetch") return { action: "fetch", meta: value("url") };
  if (name === "WebSearch") return { action: "search the web", meta: value("query") };
  return { action: `use ${name.replace(/_/g, " ")}`, detail: Object.keys(request.input).length ? JSON.stringify(request.input, null, 2) : undefined };
}

function normalizePermissionRequest(event: unknown, activeSessionId: string): CoworkPermissionRequest | null {
  const raw = asRecord(event);
  const message = asRecord(raw.message);
  const request = firstRecord(raw.request, raw.toolPermissionRequest, raw.permissionRequest, message.request, message.toolPermissionRequest);
  const type = stringValue(raw.type) ?? stringValue(message.type) ?? stringValue(raw.kind);
  if (type !== "tool_permission_request" && type !== "permission_request" && !request.requestId && !request.request_id) return null;
  const sessionId = stringValue(raw.sessionId) ?? stringValue(message.sessionId) ?? stringValue(request.sessionId) ?? activeSessionId;
  const requestId = stringValue(request.requestId) ?? stringValue(request.request_id) ?? stringValue(raw.requestId);
  if (sessionId !== activeSessionId || !requestId) return null;
  return { alwaysAllowScope: stringValue(request.alwaysAllowScope) ?? stringValue(request.always_allow_scope), description: stringValue(request.description), hasAlwaysAllow: booleanValue(request.hasAlwaysAllow) ?? booleanValue(request.has_always_allow), input: asRecord(request.input ?? raw.input), requestId, sessionId, toolName: stringValue(request.toolName) ?? stringValue(request.tool_name) ?? stringValue(raw.toolName) ?? "Tool" };
}

function permissionResolvedId(event: unknown, sessionId: string) {
  const raw = asRecord(event);
  const message = asRecord(raw.message);
  const type = stringValue(raw.type) ?? stringValue(message.type);
  if (type !== "tool_permission_resolved" && type !== "permission_resolved") return null;
  const request = firstRecord(raw.request, message.request);
  const eventSessionId = stringValue(raw.sessionId) ?? stringValue(message.sessionId) ?? stringValue(request.sessionId) ?? sessionId;
  return eventSessionId === sessionId ? stringValue(request.requestId) ?? stringValue(request.request_id) ?? stringValue(raw.requestId) ?? null : null;
}

function upsertPermission(requests: CoworkPermissionRequest[], request: CoworkPermissionRequest) { const index = requests.findIndex((item) => item.requestId === request.requestId); if (index < 0) return [...requests, request]; const next = requests.slice(); next[index] = request; return next; }
function firstRecord(...values: unknown[]) { return values.map(asRecord).find((value) => Object.keys(value).length) ?? {}; }
function permissionFailed(value: unknown) { const raw = asRecord(value); return raw.ok === false || raw.success === false || Boolean(raw.error); }
function basename(value?: string) { return value?.split(/[\\/]/).filter(Boolean).at(-1); }
function alwaysAllowLabel(scope?: string) { return scope === "session" ? "Always allow in this session" : scope === "project" ? "Always allow in this project" : scope === "user" ? "Always allow everywhere" : "Always allow"; }
