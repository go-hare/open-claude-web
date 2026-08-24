import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";

const coworkActivityPanelWidth = "20rem";
const coworkActivityPanelExpandedBySession = new Map<string, boolean>();
const coworkActivityPanelExpandedListeners = new Set<() => void>();

export function CoworkActivityPanelShell({
  children,
  isFileDrawerOpen = false,
  sessionId,
}: {
  children: ReactNode;
  /** Official xQt `P` — selectedItem && isDrawerExpanded. Width is iQt only when C && !P. */
  isFileDrawerOpen?: boolean;
  sessionId: string;
}) {
  const [expanded] = useCoworkActivityPanelExpanded(sessionId);
  // Official C6: expandedBySession[id] ?? true. Width: M || C && !P ? iQt : 0 (desktop non-overlay).
  const open = expanded && !isFileDrawerOpen;

  return (
    <aside
      aria-hidden={!open || undefined}
      aria-label="Session activity panel"
      className="h-full flex-shrink-0 relative z-20 overflow-hidden"
      data-cowork-session-activity-panel
      data-expanded={open || undefined}
      data-official-source="index-BELzQL5P.js:xQt Session activity panel aside"
      inert={!open || undefined}
      style={{ width: open ? coworkActivityPanelWidth : 0, transition: "width 200ms cubic-bezier(0, 0, 0.2, 1)", willChange: "width" }}
    >
      <div
        className="h-full pl-2 pr-2 flex flex-col pt-0"
        data-official-source="index-BELzQL5P.js:xQt y?pt-0:pt-12 inner panel"
        style={{ width: coworkActivityPanelWidth }}
      >
        <div className="-ml-8 -mr-2 pl-8 pr-2 overflow-y-auto flex-1 pointer-events-none">
          <div className="flex flex-col gap-3 pt-2 pb-4 pointer-events-auto">
            {children}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function CoworkActivityPanelHeaderToggle({ sessionId }: { sessionId: string }) {
  const [expanded, toggleExpanded] = useCoworkActivityPanelExpanded(sessionId);
  return <CoworkActivityPanelToggle expanded={expanded} onToggle={toggleExpanded} />;
}

export function useCoworkActivityPanelExpanded(sessionId: string) {
  const [, setStoreVersion] = useState(0);

  useEffect(() => {
    const listener = () => setStoreVersion((value) => value + 1);
    coworkActivityPanelExpandedListeners.add(listener);
    return () => {
      coworkActivityPanelExpandedListeners.delete(listener);
    };
  }, []);

  const expanded = coworkActivityPanelExpandedBySession.get(sessionId) ?? true;
  const setExpanded = useCallback((nextExpanded: boolean) => {
    const current = coworkActivityPanelExpandedBySession.get(sessionId) ?? true;
    if (current === nextExpanded) return;
    coworkActivityPanelExpandedBySession.set(sessionId, nextExpanded);
    coworkActivityPanelExpandedListeners.forEach((listener) => listener());
  }, [sessionId]);
  const toggleExpanded = useCallback(() => {
    setExpanded(!(coworkActivityPanelExpandedBySession.get(sessionId) ?? true));
  }, [sessionId, setExpanded]);

  return [expanded, toggleExpanded, setExpanded] as const;
}

function CoworkActivityPanelToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const officialControlVars = {
    "--cds-h-control": "24px",
    "--cds-icon": "16px",
  } as CSSProperties;

  return (
    <button
      aria-label={expanded ? "Close sidebar" : "Open sidebar"}
      className="cds-reset group/btn relative isolate inline-flex h-control w-control shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded border-0 px-0 text-body font-medium text-primary outline-none transition-shadow duration-fast select-none focus-visible:shadow-focus disabled:pointer-events-none [&:disabled:not([aria-busy])]:opacity-50"
      data-cds="Button"
      data-official-source="index-BELzQL5P.js:ZZt uses to iconOnly ghost sm with eo Sidebar sm"
      data-size="sm"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      style={officialControlVars}
      type="button"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-[1] rounded-[inherit] bg-transparent transition-colors duration-fast group-hover/btn:bg-fill-ghost-hover group-focus-visible/btn:shadow-[inset_0_0_0_1px_var(--cds-page-bg)]"
      />
      <span
        aria-hidden="true"
        className="-scale-x-100"
        data-cds="Icon"
        data-official-source="c43c5949a-vQe16vbD.js:eo Anthropicons Sidebar sm"
        style={
          {
            alignItems: "center",
            display: "inline-flex",
            flexShrink: 0,
            fontFamily: "var(--font-anthropicons, Anthropicons-Variable)",
            fontFeatureSettings: '"liga" 0',
            fontOpticalSizing: "auto",
            fontSize: "var(--cds-icon)",
            fontStyle: "normal",
            fontVariationSettings: '"wght" 533.3',
            height: "1em",
            justifyContent: "center",
            lineHeight: 1,
            width: "1em",
          } as CSSProperties
        }
      >
        {String.fromCodePoint(57565)}
      </span>
    </button>
  );
}
