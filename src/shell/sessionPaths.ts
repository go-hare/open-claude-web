import type { SessionSummary } from "../adapters/desktopBridge";

export const coworkSessionsBasePath = "/local_sessions";
export const codeSessionsBasePath = "/epitaxy";
export type SessionNavigationMode = "code" | "cowork";

export function sessionPath(session: Pick<SessionSummary, "id" | "kind" | "sessionKind">) {
  const base = isCoworkSession(session) ? coworkSessionsBasePath : codeSessionsBasePath;
  return `${base}/${encodeURIComponent(session.id)}`;
}

export function sessionHomePath(mode: SessionNavigationMode) {
  return mode === "cowork" ? "/task/new" : codeSessionsBasePath;
}

export function selectedSessionIdFromPath(pathname: string) {
  const match = /^\/(?:epitaxy|local_sessions)\/([^/?#]+)/.exec(pathname);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function isCoworkSession(session: Pick<SessionSummary, "kind" | "sessionKind">) {
  return session.sessionKind === "cowork" || session.kind === "epitaxy";
}
