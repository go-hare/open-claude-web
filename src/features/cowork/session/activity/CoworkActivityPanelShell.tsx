import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { announceCoworkActivityPanelVisibility } from "./coworkActivityAnnounce";
import { useCoworkActivityChromeText } from "./coworkActivityChromeMessages";

const coworkActivityPanelWidth = "20rem";
/** Official c21 Sx — peek hit-target lives on the activity aside. */
const coworkActivityPeekZoneProps = { "data-activity-peek-zone": "" } as const;
const coworkActivityPanelExpandedBySession = new Map<string, boolean>();
const coworkActivityPanelExpandedListeners = new Set<() => void>();

export function CoworkActivityPanelShell({
  children,
  headerHostedToggle = true,
  isFileDrawerOpen = false,
  sessionId,
}: {
  children: ReactNode;
  /**
   * Official c21f `je` = `headerHostedToggle`.
   * Desktop hosted: header trailing only, drag strip `h-2`, inner `pt-0`.
   * `!je`: drag strip `h-12`, inner `pt-12`, aside-mounted toggle (`top-3 right-2`).
   */
  headerHostedToggle?: boolean;
  /** Official xQt `P` — selectedItem && isDrawerExpanded. Width is iQt only when C && !P. */
  isFileDrawerOpen?: boolean;
  sessionId: string;
}) {
  const chromeText = useCoworkActivityChromeText();
  const [expanded, toggleExpanded] = useCoworkActivityPanelExpanded(sessionId);
  const hosted = headerHostedToggle;
  // Official C6: expandedBySession[id] ?? true. Width: M || C && !P ? iQt : 0 (desktop non-overlay).
  const open = expanded && !isFileDrawerOpen;
  const previousOpenRef = useRef<boolean | null>(null);

  // Official shared-16 hc: announce shown/hidden when the panel open state flips.
  useEffect(() => {
    if (previousOpenRef.current === null) {
      previousOpenRef.current = open;
      return;
    }
    if (previousOpenRef.current === open) return;
    previousOpenRef.current = open;
    announceCoworkActivityPanelVisibility(open, {
      shown: chromeText.activityPanelShown,
      hidden: chromeText.activityPanelHidden,
    });
  }, [chromeText.activityPanelHidden, chromeText.activityPanelShown, open]);

  return (
    <aside
      {...coworkActivityPeekZoneProps}
      aria-hidden={!open || undefined}
      aria-label={chromeText.sessionActivityPanel}
      className="h-full flex-shrink-0 relative z-20 overflow-hidden"
      data-cowork-session-activity-panel
      data-expanded={open || undefined}
      data-official-source="c21f11e6d-CxD82rYo.js:xQt Session activity panel aside"
      inert={!open || undefined}
      style={{ width: open ? coworkActivityPanelWidth : 0, transition: "width 200ms cubic-bezier(0, 0, 0.2, 1)", willChange: "width" }}
    >
      {/* Official `je` hosted: h-2 strip. `!je`: h-12 strip + aside toggle (do not use on desktop hosted). */}
      {open ? (
        <div
          aria-hidden="true"
          className={`absolute top-0 left-0 right-0 draggable z-10 ${hosted ? "h-2" : "h-12"}`}
          data-official-source="c21f11e6d-CxD82rYo.js:xQt je?h-2:h-12 drag strip"
        />
      ) : null}
      {!hosted && open ? (
        <div
          className="absolute top-3 right-2 z-20 pointer-events-auto draggable-none"
          data-official-source="c21f11e6d-CxD82rYo.js:xQt !je aside toggle top-3 right-2"
        >
          <CoworkActivityPanelToggle expanded={expanded} onToggle={toggleExpanded} />
        </div>
      ) : null}
      <div
        className={`h-full pl-2 pr-2 flex flex-col ${hosted ? "pt-0" : "pt-12"}`}
        data-official-source="c21f11e6d-CxD82rYo.js:xQt je?pt-0:pt-12 inner panel"
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

/**
 * Official hosted title-row trailing: same toggle opens and closes.
 * Do not mount a second copy inside the aside (overlaps Progress / content).
 */
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
  const chromeText = useCoworkActivityChromeText();
  const officialControlVars = {
    "--cds-h-control": "24px",
    "--cds-icon": "16px",
  } as CSSProperties;

  return (
    <button
      aria-label={expanded ? chromeText.closeSidebar : chromeText.openSidebar}
      className="cds-reset group/btn relative isolate inline-flex h-control w-control shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded border-0 px-0 text-body font-medium text-primary outline-none transition-shadow duration-fast select-none focus-visible:shadow-focus disabled:pointer-events-none [&:disabled:not([aria-busy])]:opacity-50"
      data-cds="Button"
      data-official-source="c21f11e6d-CxD82rYo.js:ZZt uses to iconOnly ghost sm with eo Sidebar sm"
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
