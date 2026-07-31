import type { CoworkPermissionRequest } from "./coworkPermissionTypes";
import { asRecord, booleanValue, stringValue } from "./recordUtils";

export function normalizeCoworkPermissionRequest(
  event: unknown,
  activeSessionId: string,
): CoworkPermissionRequest | null {
  const raw = asRecord(event);
  const message = asRecord(raw.message);
  const request = firstRecord(
    raw.request,
    raw.toolPermissionRequest,
    raw.permissionRequest,
    message.request,
    message.toolPermissionRequest,
  );
  const type = stringValue(raw.type) ?? stringValue(message.type) ?? stringValue(raw.kind);
  if (type !== "tool_permission_request" && type !== "permission_request" && !request.requestId && !request.request_id) {
    return null;
  }
  const sessionId = stringValue(raw.sessionId)
    ?? stringValue(raw.session_id)
    ?? stringValue(message.sessionId)
    ?? stringValue(message.session_id)
    ?? stringValue(request.sessionId)
    ?? stringValue(request.session_id);
  const requestId = stringValue(request.requestId) ?? stringValue(request.request_id) ?? stringValue(raw.requestId);
  if (sessionId !== activeSessionId || !requestId) return null;
  const annotations = parseCoworkToolAnnotations(
    request.annotations ?? raw.annotations ?? message.annotations,
  );
  const readOnlyHint = booleanValue(request.readOnlyHint)
    ?? booleanValue(request.read_only_hint)
    ?? booleanValue(raw.readOnlyHint)
    ?? annotations?.readOnlyHint;
  return {
    alwaysAllowScope: stringValue(request.alwaysAllowScope) ?? stringValue(request.always_allow_scope),
    annotations,
    description: stringValue(request.description),
    hasAlwaysAllow: booleanValue(request.hasAlwaysAllow) ?? booleanValue(request.has_always_allow),
    input: asRecord(request.input ?? raw.input),
    readOnlyHint,
    requestId,
    sessionId,
    suggestions: request.suggestions ?? raw.suggestions,
    toolName: stringValue(request.toolName) ?? stringValue(request.tool_name) ?? stringValue(raw.toolName) ?? "Tool",
    toolUseId: stringValue(request.toolUseId) ?? stringValue(request.tool_use_id) ?? stringValue(raw.toolUseId) ?? requestId,
  };
}

/** Official annotations bag residual (readOnlyHint / destructiveHint). */
function parseCoworkToolAnnotations(value: unknown): CoworkPermissionRequest["annotations"] | undefined {
  const record = asRecord(value);
  if (!Object.keys(record).length) return undefined;
  const readOnlyHint = booleanValue(record.readOnlyHint) ?? booleanValue(record.read_only_hint);
  const destructiveHint = booleanValue(record.destructiveHint) ?? booleanValue(record.destructive_hint);
  if (readOnlyHint === undefined && destructiveHint === undefined) return undefined;
  return {
    ...(readOnlyHint === undefined ? {} : { readOnlyHint }),
    ...(destructiveHint === undefined ? {} : { destructiveHint }),
  };
}

export function coworkPermissionResolvedId(event: unknown, sessionId: string) {
  const raw = asRecord(event);
  const message = asRecord(raw.message);
  const type = stringValue(raw.type) ?? stringValue(message.type);
  if (type !== "tool_permission_resolved" && type !== "permission_resolved") return null;
  const request = firstRecord(raw.request, message.request);
  const eventSessionId = stringValue(raw.sessionId)
    ?? stringValue(raw.session_id)
    ?? stringValue(message.sessionId)
    ?? stringValue(message.session_id)
    ?? stringValue(request.sessionId)
    ?? stringValue(request.session_id);
  if (eventSessionId !== sessionId) return null;
  return stringValue(request.requestId)
    ?? stringValue(request.request_id)
    ?? stringValue(raw.requestId)
    ?? null;
}

export function upsertCoworkPermission(
  requests: CoworkPermissionRequest[],
  request: CoworkPermissionRequest,
) {
  const index = requests.findIndex((item) => item.requestId === request.requestId);
  if (index < 0) return [...requests, request];
  const next = requests.slice();
  next[index] = request;
  return next;
}

function firstRecord(...values: unknown[]) {
  return values.map(asRecord).find((value) => Object.keys(value).length) ?? {};
}
