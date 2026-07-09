import type { RouteViewProps } from "../../app/routes";
import { EpitaxyFramePage } from "./EpitaxySessionTile";

export function EpitaxySessionPage({ onNavigate }: RouteViewProps) {
  const sessionId = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).at(-1) ?? "");
  return <EpitaxyFramePage onNavigate={onNavigate} sessionId={sessionId} />;
}
