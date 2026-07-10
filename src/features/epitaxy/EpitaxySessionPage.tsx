import type { RouteViewProps } from "../../app/routes";
import { EpitaxyFramePage } from "./EpitaxySessionTile";

export function EpitaxySessionPage({ onNavigate }: RouteViewProps) {
  const pathname = window.location.pathname;
  const sessionId = decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "");

  return <EpitaxyFramePage onNavigate={onNavigate} sessionId={sessionId} />;
}
