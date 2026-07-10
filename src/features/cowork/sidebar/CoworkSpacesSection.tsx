import type { CoworkSpaceSummary } from "../../../adapters/desktopBridge";
import type { FrameStore } from "../../../stores/frameStore";
import { SidebarSectionHeader } from "../../../shell/SidebarSectionHeader";
import { Icon } from "../../../shell/icons";

export function CoworkSpacesSection({ frame, onNavigate, spaces }: { frame: FrameStore; onNavigate: (path: string) => void; spaces: CoworkSpaceSummary[] }) {
  if (spaces.length === 0) return null;
  const collapsed = frame.collapsedGroups.includes("spaces");
  return (
    <section className="group/section flex flex-col gap-px" data-cowork-sidebar-section="spaces">
      <SidebarSectionHeader collapsed={collapsed} onToggle={() => frame.toggleGroupCollapsed("spaces")}>项目</SidebarSectionHeader>
      {!collapsed ? spaces.map((space) => (
        <button className={rowClass} key={space.id} onClick={() => onNavigate(`/space/${encodeURIComponent(space.id)}`)} type="button">
          <span className="df-leading-slot text-text-400"><Icon name="Projects" size="sm" /></span>
          <span className="min-w-0 flex-1 truncate">{space.name}</span>
        </button>
      )) : null}
    </section>
  );
}

const rowClass = "w-full shrink-0 border-none text-left text-[length:var(--df-row-font)] text-text-300 flex items-center gap-[var(--df-row-gap)] h-[var(--df-row-h)] px-[var(--df-row-px)] rounded-[var(--df-radius-pill)] hover:bg-[var(--df-hover)]";
