import { useEffect, useState, type ReactNode } from "react";
import type { SessionSummary } from "../adapters/desktopBridge";
import { type ShellText, useShellText } from "../i18n/shellMessages";
import { BaseContextMenuPopup, ContextMenu } from "./BaseMenu";
import { GroupNameDialog } from "./GroupNameDialog";
import { Icon } from "./icons";
import { OfficialSidebarStatusGlyph } from "./OfficialSidebarStatusGlyph";
import { OfficialSidebarTitle } from "./OfficialSidebarTitle";
import { SidebarSectionHeader } from "./SidebarSectionHeader";
import { orderPinnedSessions, sessionPinKey } from "./sessionPinning";
import { sessionPath } from "./sessionPaths";
import { useCodeSidebarPrState } from "./useCodeSidebarPrState";
import {
  consumeSessionRowDragClick,
  onSessionRowPointerDown,
} from "./sessionPaneDrag";

export { readSessionDragKey, writeSessionDragKey } from "./sessionPaneDrag";

type PinnedSectionProps = {
  collapsed: boolean;
  onDropSessionKey: (key: string, beforeKey?: string) => void;
  onCloseDragPinHint: () => void;
  onCreateGroup: (session: SessionSummary, name: string) => void;
  canOpenSplit: (session: SessionSummary) => boolean;
  onToggleCollapsed: () => void;
  sessions: SessionSummary[];
  pinnedOrder: string[];
  onNavigate: (path: string) => void;
  renderActions: (session: SessionSummary, onCreateGroup: () => void) => ReactNode;
  renderContextMenu: (session: SessionSummary, onCreateGroup: () => void) => ReactNode;
  selectedSessionId: string | null;
  showDragPinHint: boolean;
  /** Official T1 tIBKrv7ywy — same Wz flag as Recents glyphs. */
  showPrStatus?: boolean;
};

export function PinnedSection({ canOpenSplit, collapsed, onCloseDragPinHint, onCreateGroup, onDropSessionKey, onToggleCollapsed, pinnedOrder, renderActions, renderContextMenu, selectedSessionId, sessions, showDragPinHint, showPrStatus = true, onNavigate }: PinnedSectionProps) {
  const text = useShellText();
  const [dragOver, setDragOver] = useState(false);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [groupTarget, setGroupTarget] = useState<SessionSummary | null>(null);
  const pinned = orderPinnedSessions(sessions, pinnedOrder);

  useEffect(() => {
    const onEnd = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; x: number; y: number }>).detail;
      const section = document.querySelector("[data-kind=code].group\\/section") as HTMLElement | null;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const over = detail.x >= rect.left && detail.x <= rect.right && detail.y >= rect.top && detail.y <= rect.bottom;
      setDragOver(false);
      setDraggingKey(null);
      if (document.elementFromPoint(detail.x, detail.y)?.closest(".dframe-pane-host")) return;
      if (!over || !detail.key) return;
      const before = document.elementFromPoint(detail.x, detail.y)?.closest("[data-row-key]")?.getAttribute("data-row-key") ?? undefined;
      onDropSessionKey(detail.key, before && before !== detail.key ? before : undefined);
    };
    window.addEventListener("dframe:session-drag-end", onEnd);
    return () => window.removeEventListener("dframe:session-drag-end", onEnd);
  }, [onDropSessionKey]);

  return (
    <section
      className="group/section flex flex-col gap-px"
      data-kind="code"
      data-over={dragOver || undefined}
    >
      <SidebarSectionHeader collapsed={collapsed} onToggle={onToggleCollapsed}>{text.pinned}</SidebarSectionHeader>
      {showDragPinHint ? <DragPinHint onClose={onCloseDragPinHint} text={text} /> : null}
      {!collapsed && pinned.length > 0 ? (
        pinned.map((session) => {
          const path = sessionPath(session);
          const selected = session.id === selectedSessionId;
          const key = sessionPinKey(session);
          const openSplit = () => window.dispatchEvent(new CustomEvent("dframe:open-pane", { detail: { path, title: session.title } }));
          return (
          <ContextMenu.Root key={session.id}>
          <ContextMenu.Trigger
            className={sidebarRowWrapperClassName()}
            data-row=""
            data-selected={selected ? "open" : undefined}
            data-jump-hint-row=""
            data-pin-dragging={draggingKey === key || undefined}
            data-row-key={key}
            onPointerDown={(event) => {
              setDraggingKey(key);
              onSessionRowPointerDown(event, key);
            }}
          >
            <button
              className={sidebarRowButtonClassName()}
              data-row-main-button=""
              data-selected={selected ? "open" : undefined}
              onClick={(event) => {
                if (consumeSessionRowDragClick()) {
                  event.preventDefault();
                  return;
                }
                if ((event.metaKey || event.ctrlKey) && canOpenSplit(session)) {
                  openSplit();
                  return;
                }
                onNavigate(path);
              }}
              type="button"
            >
              <span className="df-leading-slot text-text-300">
                <PinnedSessionGlyph session={session} showPrStatus={showPrStatus} />
              </span>
              <span className="flex-1 min-w-0">
                <OfficialSidebarTitle title={session.title} />
              </span>
            </button>
            {renderActions(session, () => setGroupTarget(session))}
          </ContextMenu.Trigger>
          <BaseContextMenuPopup className="min-w-[180px]">
            {renderContextMenu(session, () => setGroupTarget(session))}
          </BaseContextMenuPopup>
          </ContextMenu.Root>
          );
        })
      ) : !collapsed ? (
        <PinDropPlaceholder isHot={dragOver} text={text} />
      ) : null}
      <GroupNameDialog
        isOpen={groupTarget !== null}
        onClose={() => setGroupTarget(null)}
        onSubmit={(name) => {
          if (groupTarget) onCreateGroup(groupTarget, name);
        }}
      />
    </section>
  );
}

function PinDropPlaceholder({ isHot, text }: { isHot: boolean; text: ShellText }) {
  const label = isHot ? text.releaseToPin : text.dragToPin;
  return (
    <div className={`flex h-[var(--df-row-h)] items-center gap-[var(--df-row-gap)] rounded-[var(--df-radius-pill)] px-[var(--df-row-px)] text-[length:var(--df-row-font)] transition-colors ${isHot ? "bg-bg-300 text-text-300" : "text-text-500 opacity-80"}`}>
      <span className="df-leading-slot">
        <Icon name="pin" customSize={14} className={`transition-transform ${isHot ? "rotate-6 scale-105" : ""}`} />
      </span>
      <span>{label}</span>
    </div>
  );
}

function DragPinHint({ onClose, text }: { onClose: () => void; text: ShellText }) {
  return (
    <div className="cds-root cds-reset mb-1 rounded-card bg-surface-3 shadow-panel p-2 text-body text-primary" role="status">
      <div className="flex flex-row gap-2 items-start min-w-[13rem]">
        <Icon name="Pin" customSize={18} className="shrink-0 text-accent" />
        <p className="whitespace-normal m-0 flex-1">{text.dragPinHint}</p>
        <button aria-label={text.closePinHint} className="cds-reset flex size-icon items-center justify-center rounded text-muted hover:bg-fill-ghost-hover hover:text-primary" onClick={onClose} type="button">
          <Icon name="X" size="xs" />
        </button>
      </div>
    </div>
  );
}

function sidebarRowWrapperClassName() {
  return "group relative df-drag-shiftable rounded-[var(--df-radius-pill)] hover:bg-[var(--df-hover)] focus-within:bg-[var(--df-hover)] data-[selected=focused]:bg-bg-200 data-[selected=focused]:text-text-000 data-[selected=open]:bg-bg-200 data-[menu-open=true]:bg-[var(--df-hover)]";
}

function sidebarRowButtonClassName() {
  // Official index-BELz uZt residual: base text-text-300; only data-selected=focused
  // gets text-text-000. Open current session paints bg on the wrapper, not open text.
  return "w-full shrink-0 border-none text-left text-[length:var(--df-row-font)] text-text-300 flex items-center gap-[var(--df-row-gap)] h-[var(--df-row-h)] px-[var(--df-row-px)] hide-focus-ring focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--accent-100)),0_0_6px_0_hsl(var(--accent-100)/0.2)] rounded-[var(--df-radius-pill)] data-[selected=focused]:text-text-000";
}

function PinnedSessionGlyph({ session, showPrStatus }: { session: SessionSummary; showPrStatus: boolean }) {
  // Official CodeStatusGlyph yje → prState (same residual as Recents SessionGlyph).
  const prState = useCodeSidebarPrState(session, showPrStatus);
  return <OfficialSidebarStatusGlyph session={{ ...session, prState }} />;
}

