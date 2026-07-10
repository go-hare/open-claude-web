import type { SessionSummary } from "../../adapters/desktopBridge";

export const coworkSessionsBasePath = "/local_sessions";

export function coworkSessionPath(session: Pick<SessionSummary, "id">) {
  return `${coworkSessionsBasePath}/${encodeURIComponent(session.id)}`;
}

export function coworkSelectedSessionId(pathname: string) {
  const match = /^\/local_sessions\/([^/?#]+)/.exec(pathname);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
