import type { RouteViewProps } from "../../../app/routes";
import { CoworkSessionView } from "./CoworkSessionView";

export function CoworkSessionPage({ onNavigate }: RouteViewProps) {
  const sessionId = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).at(-1) ?? "");
  return <CoworkSessionView onNavigate={onNavigate} sessionId={sessionId} />;
}
