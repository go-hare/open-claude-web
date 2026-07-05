import { useEffect } from "react";
import type { RouteViewProps } from "../../app/routes";
import { ScheduledRouteShell } from "./ScheduledPrimitives";

export function ScheduledTaskEditor({ onNavigate }: RouteViewProps) {
  useEffect(() => {
    onNavigate("/epitaxy/scheduled");
  }, [onNavigate]);

  return (
    <ScheduledRouteShell>
      <div role="status" className="h-full flex items-center justify-center text-t5">
        <span className="sr-only">Loading scheduled tasks</span>
      </div>
    </ScheduledRouteShell>
  );
}
