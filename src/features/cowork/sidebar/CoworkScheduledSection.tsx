import type { FrameStore } from "../../../stores/frameStore";
import { SidebarSectionHeader } from "../../../shell/SidebarSectionHeader";
import { scheduledTaskDetailPath } from "../scheduled/scheduledPaths";
import { coworkSessionPath } from "../sessionPaths";
import type { CoworkScheduledSidebarItem } from "./coworkSidebarModel";
import { CoworkSidebarStatusGlyph } from "./CoworkSidebarStatusGlyph";

export function CoworkScheduledSection({ frame, items, onNavigate, selectedSessionId }: { frame: FrameStore; items: CoworkScheduledSidebarItem[]; onNavigate: (path: string) => void; selectedSessionId: string | null }) {
  if (items.length === 0) return null;
  const collapsed = frame.collapsedGroups.includes("scheduled");
  return (
    <section className="group/section flex flex-col gap-px" data-cowork-sidebar-section="scheduled">
      <SidebarSectionHeader collapsed={collapsed} onToggle={() => frame.toggleGroupCollapsed("scheduled")}>定时任务</SidebarSectionHeader>
      {!collapsed ? items.map((item) => <CoworkScheduledRow item={item} key={item.task.id} onNavigate={onNavigate} selected={item.runs.some((run) => run.id === selectedSessionId)} />) : null}
    </section>
  );
}

function CoworkScheduledRow({ item, onNavigate, selected }: { item: CoworkScheduledSidebarItem; onNavigate: (path: string) => void; selected: boolean }) {
  const target = item.latestRun ? coworkSessionPath(item.latestRun) : scheduledTaskDetailPath(item.task.id);
  return (
    <button className={rowClass} data-selected={selected ? "open" : undefined} onClick={() => onNavigate(target)} type="button">
      <span className="df-leading-slot text-text-300"><CoworkSidebarStatusGlyph session={item.latestRun} /></span>
      <span className="min-w-0 flex-1 truncate">{item.task.title}</span>
      {item.unreadCount > 0 ? <span className="rounded-full bg-accent-main-100 px-1.5 text-[10px] text-oncolor-100">{item.unreadCount}</span> : null}
    </button>
  );
}

const rowClass = "w-full shrink-0 border-none text-left text-[length:var(--df-row-font)] text-text-300 flex items-center gap-[var(--df-row-gap)] h-[var(--df-row-h)] px-[var(--df-row-px)] rounded-[var(--df-radius-pill)] hover:bg-[var(--df-hover)] data-[selected=open]:bg-bg-200";
