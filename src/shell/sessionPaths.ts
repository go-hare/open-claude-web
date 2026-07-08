import type { SessionSummary } from "../adapters/desktopBridge";

export const coworkSessionsBasePath = "/local_sessions";
export const codeSessionsBasePath = "/epitaxy";
export type SessionNavigationMode = "code" | "cowork";

const epitaxyReservedSessionSegments = new Set([
  "agents",
  "apps",
  "dev",
  "dispatch",
  "pull-requests",
  "remote-agents",
  "scheduled",
  "tasks",
]);

export function sessionPath(session: Pick<SessionSummary, "id" | "kind" | "sessionKind">) {
  const base = isCoworkSession(session) ? coworkSessionsBasePath : codeSessionsBasePath;
  return `${base}/${encodeURIComponent(session.id)}`;
}

export function sessionHomePath(mode: SessionNavigationMode) {
  return mode === "cowork" ? "/task/new" : codeSessionsBasePath;
}

export function canOpenSessionInSplit(mode: SessionNavigationMode, session: Pick<SessionSummary, "kind" | "sessionKind">) {
  return mode === "code" && session.kind === "code" && !isCoworkSession(session);
}

export function selectedSessionIdFromPath(pathname: string) {
  const coworkMatch = /^\/local_sessions\/([^/?#]+)/.exec(pathname);
  if (coworkMatch?.[1]) return decodeURIComponent(coworkMatch[1]);
  const codeMatch = /^\/epitaxy\/([^/?#]+)/.exec(pathname);
  if (!codeMatch?.[1] || epitaxyReservedSessionSegments.has(codeMatch[1])) return null;
  return decodeURIComponent(codeMatch[1]);
}

function isCoworkSession(session: Pick<SessionSummary, "kind" | "sessionKind">) {
  return session.sessionKind === "cowork" || session.kind === "epitaxy";
}
