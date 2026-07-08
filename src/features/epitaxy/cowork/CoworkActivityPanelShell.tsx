import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../OfficialEpitaxyComponents";

const coworkActivityPanelWidth = "20rem";
const coworkActivityPanelExpandedBySession = new Map<string, boolean>();
const coworkActivityPanelExpandedListeners = new Set<() => void>();

export function CoworkActivityPanelShell({
  children,
  sessionId,
}: {
  children: ReactNode;
  sessionId: string;
}) {
  const [expanded, toggleExpanded] = useCoworkActivityPanelExpanded(sessionId);

  return (
    <>
      {!expanded ? <div className="absolute top-3 right-3 z-20 draggable-none"><CoworkActivityPanelToggle expanded={false} onToggle={toggleExpanded} /></div> : null}
      <aside
        aria-hidden={!expanded || undefined}
        aria-label="Session activity panel"
        className="h-full flex-shrink-0 relative z-20 overflow-hidden"
        data-cowork-session-activity-panel
        data-expanded={expanded || undefined}
        inert={!expanded || undefined}
        style={{ width: expanded ? coworkActivityPanelWidth : 0, transition: "width 200ms cubic-bezier(0, 0, 0.2, 1)", willChange: "width" }}
      >
        {expanded ? <div className="absolute top-3 right-2 z-20 pointer-events-auto draggable-none"><CoworkActivityPanelToggle expanded onToggle={toggleExpanded} /></div> : null}
        <div className="h-full pl-2 pr-2 pt-12 flex flex-col" style={{ width: coworkActivityPanelWidth }}>
          <div className="-ml-8 -mr-2 pl-8 pr-2 overflow-y-auto flex-1 pointer-events-none">
            <div className="flex flex-col gap-3 pt-2 pb-4 pointer-events-auto">
              {children}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function useCoworkActivityPanelExpanded(sessionId: string) {
  const [, setStoreVersion] = useState(0);

  useEffect(() => {
    const listener = () => setStoreVersion((value) => value + 1);
    coworkActivityPanelExpandedListeners.add(listener);
    return () => {
      coworkActivityPanelExpandedListeners.delete(listener);
    };
  }, []);

  const expanded = coworkActivityPanelExpandedBySession.get(sessionId) ?? true;
  const toggleExpanded = useCallback(() => {
    const nextExpanded = !(coworkActivityPanelExpandedBySession.get(sessionId) ?? true);
    coworkActivityPanelExpandedBySession.set(sessionId, nextExpanded);
    coworkActivityPanelExpandedListeners.forEach((listener) => listener());
  }, [sessionId]);

  return [expanded, toggleExpanded] as const;
}

function CoworkActivityPanelToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <OfficialButton
      ariaLabel={expanded ? "Close sidebar" : "Open sidebar"}
      customIcon={<Icon className="-scale-x-100" name="Sidebar" size="sm" />}
      onClick={onToggle}
      size="small"
      variant="muted"
    />
  );
}
