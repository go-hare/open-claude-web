import { useState, type DragEvent } from "react";
import type { SessionSummary } from "../../../adapters/desktopBridge";
import { type ShellText, useShellText } from "../../../i18n/shellMessages";
import type { FrameStore } from "../../../stores/frameStore";
import { Icon } from "../../../shell/icons";
import { SidebarSectionHeader } from "../../../shell/SidebarSectionHeader";
import { CoworkSessionRow } from "./CoworkSessionRow";
import type { CoworkRowAction } from "./CoworkSessionMenus";
import { hasCoworkSessionDrag, readCoworkSessionDragKey } from "./coworkSessionDrag";
import { orderCoworkPinnedSessions } from "./coworkSessionPinning";

type CoworkPinnedSectionProps = {
  frame: FrameStore;
  onAction: (session: SessionSummary, action: CoworkRowAction) => void;
  onNavigate: (path: string) => void;
  selectedSessionId: string | null;
  sessions: SessionSummary[];
};

export function CoworkPinnedSection({ frame, onAction, onNavigate, selectedSessionId, sessions }: CoworkPinnedSectionProps) {
  const text = useShellText();
  const collapsed = frame.collapsedGroups.includes("pinned");
  const pinned = orderCoworkPinnedSessions(sessions, frame.pinnedOrder);
  const drop = useCoworkPinnedDrop(frame);
  return (
    <section className="group/section flex flex-col gap-px" data-cowork-sidebar-section="pinned" data-over={drop.dragOver || undefined} {...drop.sectionProps}>
      <SidebarSectionHeader collapsed={collapsed} onToggle={() => frame.toggleGroupCollapsed("pinned")}>{text.pinned}</SidebarSectionHeader>
      {frame.showDragPinHint ? <CoworkDragPinHint onClose={frame.markDragPinHintSeen} text={text} /> : null}
      {!collapsed && pinned.length > 0 ? pinned.map((session) => (
        <CoworkSessionRow frame={frame} key={session.id} onAction={onAction} onDropBefore={(key) => drop.pin(key, coworkPinnedKey(session))} onNavigate={onNavigate} selected={session.id === selectedSessionId} session={session} />
      )) : !collapsed ? <CoworkPinPlaceholder isHot={drop.dragOver} text={text} /> : null}
    </section>
  );
}

function useCoworkPinnedDrop(frame: FrameStore) {
  const [dragOver, setDragOver] = useState(false);
  const pin = (key: string, beforeKey?: string) => {
    frame.setPinnedOrder(nextCoworkPinnedOrder(frame.pinnedOrder, key, beforeKey));
    frame.markDragPinHintSeen();
  };
  const sectionProps = {
    onDragEnter: (event: DragEvent<HTMLElement>) => { if (hasCoworkSessionDrag(event)) setDragOver(true); },
    onDragLeave: (event: DragEvent<HTMLElement>) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false); },
    onDragOver: (event: DragEvent<HTMLElement>) => { if (hasCoworkSessionDrag(event)) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setDragOver(true); } },
    onDrop: (event: DragEvent<HTMLElement>) => {
      const key = readCoworkSessionDragKey(event);
      setDragOver(false);
      if (key) { event.preventDefault(); pin(key); }
    },
  };
  return { dragOver, pin, sectionProps };
}

function CoworkPinPlaceholder({ isHot, text }: { isHot: boolean; text: ShellText }) {
  const label = isHot ? text.releaseToPin : text.dragToPin;
  return (
    <div className={`flex h-[var(--df-row-h)] items-center gap-[var(--df-row-gap)] rounded-[var(--df-radius-pill)] px-[var(--df-row-px)] text-[length:var(--df-row-font)] transition-colors ${isHot ? "bg-bg-300 text-text-300" : "text-text-500 opacity-80"}`}>
      <span className="df-leading-slot"><Icon className={`transition-transform ${isHot ? "rotate-6 scale-105" : ""}`} customSize={14} name="pin" /></span>
      <span>{label}</span>
    </div>
  );
}

function CoworkDragPinHint({ onClose, text }: { onClose: () => void; text: ShellText }) {
  return (
    <div className="cds-root cds-reset mb-1 rounded-card bg-surface-3 shadow-panel p-2 text-body text-primary" role="status">
      <div className="flex flex-row gap-2 items-start min-w-[13rem]">
        <Icon className="shrink-0 text-accent" customSize={18} name="Pin" />
        <p className="whitespace-normal m-0 flex-1">{text.dragPinHint}</p>
        <button aria-label={text.closePinHint} className="cds-reset flex size-icon items-center justify-center rounded text-muted hover:bg-fill-ghost-hover hover:text-primary" onClick={onClose} type="button"><Icon name="X" size="xs" /></button>
      </div>
    </div>
  );
}

function nextCoworkPinnedOrder(pinnedOrder: string[], key: string, beforeKey?: string) {
  const without = pinnedOrder.filter((item) => item !== key);
  if (!beforeKey) return [key, ...without];
  const index = without.indexOf(beforeKey);
  return index === -1 ? [key, ...without] : [...without.slice(0, index), key, ...without.slice(index)];
}

function coworkPinnedKey(session: SessionSummary) {
  return session.sessionKind === "cowork" ? `cowork:${session.id}` : `${session.kind}:${session.id}`;
}
