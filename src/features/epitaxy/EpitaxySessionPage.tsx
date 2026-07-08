import { useEffect } from "react";
import type { RouteViewProps } from "../../app/routes";
import { EpitaxyFramePage } from "./EpitaxySessionTile";

export function EpitaxySessionPage({ onNavigate }: RouteViewProps) {
  const pathname = window.location.pathname;
  const sessionId = decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "");
  const isCoworkCanonicalPath = pathname.startsWith("/local_sessions/");
  const isLegacyCoworkCodePath = pathname.startsWith("/epitaxy/") && (sessionId.startsWith("epitaxy_") || sessionId.startsWith("local_"));
  const sessionSourceHint = isCoworkCanonicalPath || isLegacyCoworkCodePath ? "epitaxy" : "code";

  useEffect(() => {
    if (!isLegacyCoworkCodePath) return;
    onNavigate(`/local_sessions/${encodeURIComponent(sessionId)}`);
  }, [isLegacyCoworkCodePath, onNavigate, sessionId]);

  return <EpitaxyFramePage onNavigate={onNavigate} sessionId={sessionId} sessionSourceHint={sessionSourceHint} />;
}
