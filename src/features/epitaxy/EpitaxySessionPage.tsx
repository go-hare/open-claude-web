import type { RouteViewProps } from "../../app/routes";
import { EpitaxyFramePage } from "./EpitaxySessionTile";

export function EpitaxySessionPage({ onNavigate }: RouteViewProps) {
  const pathname = window.location.pathname;
  const sessionId = decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "");
  const isCoworkCanonicalPath = pathname.startsWith("/local_sessions/");
  const sessionSourceHint = isCoworkCanonicalPath ? "epitaxy" : "code";

  return <EpitaxyFramePage onNavigate={onNavigate} sessionId={sessionId} sessionSourceHint={sessionSourceHint} />;
}
