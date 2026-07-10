import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LocalSessionsBridge } from "../../../adapters/desktopBridge/types";
import { Icon } from "../../../shell/icons";
import { CoworkButton } from "../ui/CoworkButton";
import { labelFromCron } from "../scheduled/scheduleUtils";
import type { CoworkPermissionDecision, CoworkPermissionRequest } from "../session/coworkPermissionTypes";
import { asRecord, booleanValue, stringValue } from "../session/recordUtils";
import { CoworkMarkdown } from "../session/transcript/CoworkMarkdown";
import { isCoworkDirectoryPermissionRequest } from "../session/transcript/coworkDirectoryTools";

export type CoworkPermissionController = ReturnType<typeof useCoworkPermissionRequests>;

export function CoworkPermissionApprovals({ controller }: { controller: CoworkPermissionController }) {
  const { requests, setRequests } = controller;
  const visibleRequests = useMemo(() => requests.filter(isVisiblePermissionRequest), [requests]);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const decide = useCallback(async (request: CoworkPermissionRequest, decision: CoworkPermissionDecision) => {
    if (!controller.bridge.respondToToolPermission) return;
    setResolvingId(request.requestId);
    setError(null);
    try {
      const result = await controller.bridge.respondToToolPermission(request.requestId, decision, request.input);
      if (permissionFailed(result)) setError({ id: request.requestId, message: stringValue(asRecord(result).error) ?? "Permission response failed." });
      else setRequests((current) => current.filter((item) => item.requestId !== request.requestId));
    } catch (caught) {
      setError({ id: request.requestId, message: caught instanceof Error ? caught.message : String(caught) });
    } finally {
      setResolvingId(null);
    }
  }, [controller.bridge, setRequests]);
  usePermissionShortcuts(visibleRequests[0], resolvingId, decide);
  return (
    <div className={visibleRequests.length > 0 ? "mb-6" : undefined}>
      <AnimatePresence initial={false} mode="popLayout">
        {visibleRequests.map((request) => (
          <motion.div className="-mx-1 overflow-hidden px-1" exit={{ height: 0, opacity: 0 }} key={request.requestId} layout="position" transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}>
            <CoworkPermissionCard busy={resolvingId === request.requestId} error={error?.id === request.requestId ? <div className="text-footnote text-extended-pink">{error.message}</div> : null} onDecide={(decision) => void decide(request, decision)} request={request} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useCoworkPermissionRequests(bridge: LocalSessionsBridge, sessionId: string) {
  const [requests, setRequests] = useState<CoworkPermissionRequest[]>([]);
  useEffect(() => {
    let alive = true;
    void bridge.getSession(sessionId).then((session) => {
      if (alive) setRequests((session?.pendingToolPermissions ?? []).map((item) => ({
        ...item,
        input: asRecord(item.input),
        sessionId: item.sessionId || sessionId,
      })));
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
  return { bridge, requests, setRequests };
}

function usePermissionShortcuts(request: CoworkPermissionRequest | undefined, resolvingId: string | null, decide: (request: CoworkPermissionRequest, decision: CoworkPermissionDecision) => Promise<void>) {
  useEffect(() => {
    if (!request) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || resolvingId === request.requestId) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); void decide(request, "deny"); }
      else if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); void decide(request, "once"); }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [decide, request, resolvingId]);
}

function CoworkPermissionCard({ busy, error, onDecide, request }: { busy: boolean; error: ReactNode; onDecide: (decision: CoworkPermissionDecision) => void; request: CoworkPermissionRequest }) {
  if (isCoworkDirectoryPermissionRequest(request)) return <CoworkDirectoryApproval busy={busy} error={error} onDecide={onDecide} request={request} />;
  if (isScheduledTaskRequest(request)) return <CoworkScheduledTaskApproval busy={busy} error={error} onDecide={onDecide} request={request} />;
  if (request.toolName.toLowerCase().includes("save_skill")) return <CoworkSaveSkillApproval busy={busy} error={error} onDecide={onDecide} request={request} />;
  return <CoworkToolApproval busy={busy} error={error} onDecide={onDecide} request={request} />;
}

function CoworkDirectoryApproval({ busy, error, onDecide, request }: { busy: boolean; error: ReactNode; onDecide: (decision: CoworkPermissionDecision) => void; request: CoworkPermissionRequest }) {
  const path = stringValue(request.input.path);
  return (
    <div className="bg-bg-000 rounded-xl border border-border-300 shadow-lg overflow-hidden p-3"><div className="flex flex-col gap-2"><div className="flex items-start gap-2"><Icon className="text-text-300 flex-shrink-0 mt-0.5" customSize={20} name="Folder1" /><div className="flex min-w-0 flex-col gap-1"><span className="text-sm text-text-200">Claude would like to <strong>Cowork</strong> in{path ? ":" : " a folder"}</span>{path ? <span className="font-mono text-sm text-text-100 break-all">{path}</span> : null}</div></div>{error}<div className="flex justify-end gap-2"><CoworkButton disabled={busy} onClick={() => onDecide("deny")} variant="contained">Deny</CoworkButton><CoworkButton disabled={busy} onClick={() => onDecide("once")} variant="primary">{path ? "Allow" : "Choose folder"}</CoworkButton></div></div></div>
  );
}

function CoworkToolApproval({ busy, error, onDecide, request }: { busy: boolean; error: ReactNode; onDecide: (decision: CoworkPermissionDecision) => void; request: CoworkPermissionRequest }) {
  const copy = useMemo(() => approvalCopy(request), [request]);
  return (
    <div className="epitaxy-approval-card">
      <div aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] bg-surface-primary-elevated effect-primary-elevated" />
      <div className="flex flex-col gap-2"><div className="text-footnote text-t6">Claude wants to use {request.toolName}</div><div className="text-body-semibold text-t9">Allow Claude to {copy.action}{copy.meta ? ` ${copy.meta}` : ""}?</div>{copy.detail ? <div className="bg-t1 rounded-r4 py-p6 px-p8 text-code text-t7 whitespace-pre-wrap break-words max-h-[240px] overflow-y-auto">{copy.detail}</div> : null}{request.description ? <div className="text-footnote text-t6">{request.description}</div> : null}{error}</div>
      <div className="epitaxy-approval-actions flex flex-wrap justify-between gap-2"><CoworkButton disabled={busy} onClick={() => onDecide("deny")} variant="contained">Deny</CoworkButton><div className="flex gap-2">{request.hasAlwaysAllow === false ? null : <CoworkButton disabled={busy} onClick={() => onDecide("always")} variant="contained">{alwaysAllowLabel(request.alwaysAllowScope)}</CoworkButton>}<CoworkButton disabled={busy} onClick={() => onDecide("once")} variant="primary">Allow once</CoworkButton></div></div>
    </div>
  );
}

function CoworkScheduledTaskApproval({ busy, error, onDecide, request }: { busy: boolean; error: ReactNode; onDecide: (decision: CoworkPermissionDecision) => void; request: CoworkPermissionRequest }) {
  const [expanded, setExpanded] = useState(false);
  const update = request.toolName.toLowerCase().includes("update_scheduled_task");
  const name = stringValue(request.input.name) ?? stringValue(request.input.title) ?? stringValue(request.input.taskId) ?? "Untitled";
  const description = stringValue(request.input.description);
  const prompt = stringValue(request.input.prompt);
  const schedule = permissionSchedule(request.input);
  return (
    <div className="bg-bg-000 rounded-xl border-0.5 border-border-300 shadow-sm overflow-hidden p-3">
      <div className="flex flex-col gap-2"><div className="flex items-center gap-2"><div className="flex items-center justify-center rounded-md border border-border-300 p-1"><Icon className="text-text-300" customSize={16} name="Calendar" /></div><span className="font-base-bold text-text-100">{update ? "Update task" : "Schedule task"}</span><span className="text-text-500/50">·</span><span className="font-base truncate">{name}</span></div>{description ? <div className="font-base text-text-300 pl-[34px]">{description}</div> : null}<div className="font-small text-text-500 pl-[34px]">{schedule}</div>{prompt ? <PermissionDetails expanded={expanded} label="Details" onToggle={() => setExpanded((value) => !value)}><CoworkMarkdown text={prompt} /></PermissionDetails> : null}{error}</div>
      <div className="mt-2 flex ml-8 gap-2"><CoworkButton disabled={busy} onClick={() => onDecide("once")} variant="primary">{update ? "Update" : "Schedule"}</CoworkButton><CoworkButton disabled={busy} onClick={() => onDecide("deny")} variant="contained">Cancel</CoworkButton></div>
    </div>
  );
}

function CoworkSaveSkillApproval({ busy, error, onDecide, request }: { busy: boolean; error: ReactNode; onDecide: (decision: CoworkPermissionDecision) => void; request: CoworkPermissionRequest }) {
  const [expanded, setExpanded] = useState(false);
  const update = request.input.overwrite === true;
  const name = stringValue(request.input.name) ?? "untitled";
  const description = stringValue(request.input.description);
  const content = stringValue(request.input.content);
  return (
    <div className="bg-bg-000 rounded-xl border-0.5 border-border-300 shadow-sm overflow-hidden p-3">
      <div className="flex flex-col gap-2"><div className="flex items-center gap-2"><div className="flex items-center justify-center rounded-md border border-border-300 p-1"><Icon className="text-text-300" customSize={16} name="Book" /></div><span className="font-base-bold text-text-100">{update ? "Update skill" : "Save skill"}</span><span className="text-text-500/50">·</span><span className="font-base truncate">{name}</span></div>{description ? <div className="font-base text-text-300 pl-[34px]">{description}</div> : null}{content ? <PermissionDetails expanded={expanded} label="Content" onToggle={() => setExpanded((value) => !value)}><CoworkMarkdown text={content} /></PermissionDetails> : null}{error}</div>
      <div className="mt-2 flex ml-8 gap-2"><CoworkButton disabled={busy} onClick={() => onDecide("once")} variant="primary">{update ? "Update" : "Save"}</CoworkButton><CoworkButton disabled={busy} onClick={() => onDecide("deny")} variant="contained">Cancel</CoworkButton></div>
    </div>
  );
}

function PermissionDetails({ children, expanded, label, onToggle }: { children: ReactNode; expanded: boolean; label: string; onToggle: () => void }) {
  return <div className="mt-2 pl-[34px]"><button aria-expanded={expanded} className="flex items-center gap-1 font-small text-text-500 cursor-pointer bg-transparent border-none p-0 py-1" onClick={onToggle} type="button"><Icon customSize={14} name={expanded ? "ChevronDownSmall" : "ChevronRightMedium"} />{label}</button>{expanded ? <div className="mt-1 max-h-[300px] overflow-y-auto rounded-lg border-0.5 border-border-300 bg-bg-100 p-4 font-base text-text-500 break-words">{children}</div> : null}</div>;
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
  return { alwaysAllowScope: stringValue(request.alwaysAllowScope) ?? stringValue(request.always_allow_scope), description: stringValue(request.description), hasAlwaysAllow: booleanValue(request.hasAlwaysAllow) ?? booleanValue(request.has_always_allow), input: asRecord(request.input ?? raw.input), requestId, sessionId, toolName: stringValue(request.toolName) ?? stringValue(request.tool_name) ?? stringValue(raw.toolName) ?? "Tool", toolUseId: stringValue(request.toolUseId) ?? stringValue(request.tool_use_id) ?? stringValue(raw.toolUseId) };
}

function isVisiblePermissionRequest(request: CoworkPermissionRequest) {
  return !request.toolName.includes("AskUserQuestion") && !request.toolName.includes("show_onboarding_role_picker");
}

function isScheduledTaskRequest(request: CoworkPermissionRequest) {
  const name = request.toolName.toLowerCase();
  return name.includes("create_scheduled_task") || name.includes("update_scheduled_task");
}

function permissionSchedule(input: Record<string, unknown>) {
  const fireAt = stringValue(input.fireAt);
  if (fireAt) {
    const date = new Date(fireAt);
    if (!Number.isNaN(date.getTime())) return `Once — ${date.toLocaleString()}`;
  }
  const cron = stringValue(input.cronExpression);
  return cron ? labelFromCron(cron) : "Manual only";
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
