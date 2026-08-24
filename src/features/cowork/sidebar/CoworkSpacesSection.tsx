import type { CoworkSpaceSummary } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";

/**
 * Official Xa CoworkSpaceSessionRow (ca0135 ~6320): Fe variant=session inside
 * Recents Cl list — not a separate 「项目」 SidebarSectionHeader.
 * Wrapper is il (data-row-key + data-jump-hint-row); button is mZt (data-row).
 */
export function CoworkSpaceSessionRow({
  onNavigate,
  selected,
  space,
}: {
  onNavigate: (path: string) => void;
  selected: boolean;
  space: CoworkSpaceSummary;
}) {
  const rowKey = `cowork-space:${space.id}`;
  return (
    <div className={rowWrapperClass} data-jump-hint-row="" data-row-key={rowKey} data-selected={selected ? "open" : undefined}>
      <button
        className={rowButtonClass}
        data-row=""
        data-roving-item=""
        data-row-main-button=""
        data-selected={selected ? "open" : undefined}
        onClick={() => onNavigate(`/space/${encodeURIComponent(space.id)}`)}
        type="button"
      >
        <span className="df-leading-slot text-text-400"><Icon name="Projects" size="sm" /></span>
        <span className="min-w-0 flex-1 truncate">{space.name}</span>
      </button>
    </div>
  );
}

const rowWrapperClass = "group relative df-drag-shiftable rounded-[var(--df-radius-pill)] hover:bg-[var(--df-hover)] data-[selected=open]:bg-bg-200";
const rowButtonClass = "w-full shrink-0 border-none text-left text-[length:var(--df-row-font)] text-text-300 flex items-center gap-[var(--df-row-gap)] h-[var(--df-row-h)] px-[var(--df-row-px)] rounded-[var(--df-radius-pill)] hide-focus-ring data-[selected=open]:bg-bg-200";
