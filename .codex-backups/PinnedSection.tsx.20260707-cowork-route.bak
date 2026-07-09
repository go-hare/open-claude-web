import { useState, type DragEvent, type ReactNode } from "react";
import type { SessionSummary } from "../adapters/desktopBridge";
import { type ShellText, useShellText } from "../i18n/shellMessages";
import { BaseContextMenuPopup, ContextMenu } from "./BaseMenu";
import { GroupNameDialog } from "./GroupNameDialog";
import { Icon } from "./icons";
import { SidebarSectionHeader } from "./SidebarSectionHeader";
import { orderPinnedSessions, sessionPinKey } from "./sessionPinning";

type PinnedSectionProps = {
  collapsed: boolean;
  onDropSessionKey: (key: string, beforeKey?: string) => void;
  onCloseDragPinHint: () => void;
  onCreateGroup: (session: SessionSummary, name: string) => void;
  onToggleCollapsed: () => void;
  sessions: SessionSummary[];
  pinnedOrder: string[];
  onNavigate: (path: string) => void;
  renderActions: (session: SessionSummary, onCreateGroup: () => void) => ReactNode;
  renderContextMenu: (session: SessionSummary, onCreateGroup: () => void) => ReactNode;
  selectedSessionId: string | null;
  showDragPinHint: boolean;
};

export function PinnedSection({ collapsed, onCloseDragPinHint, onCreateGroup, onDropSessionKey, onToggleCollapsed, pinnedOrder, renderActions, renderContextMenu, selectedSessionId, sessions, showDragPinHint, onNavigate }: PinnedSectionProps) {
  const text = useShellText();
  const [dragOver, setDragOver] = useState(false);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [groupTarget, setGroupTarget] = useState<SessionSummary | null>(null);
  const pinned = orderPinnedSessions(sessions, pinnedOrder);

  return (
    <section
      className="group/section flex flex-col gap-px"
      data-over={dragOver || undefined}
      onDragEnter={(event) => {
        if (hasSessionDrag(event)) setDragOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false);
      }}
      onDragOver={(event) => {
        if (!hasSessionDrag(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDragOver(true);
      }}
      onDrop={(event) => {
        const key = readSessionDragKey(event);
        setDragOver(false);
        if (!key) return;
        event.preventDefault();
        onDropSessionKey(key);
      }}
    >
      <SidebarSectionHeader collapsed={collapsed} onToggle={onToggleCollapsed}>{text.pinned}</SidebarSectionHeader>
      {showDragPinHint ? <DragPinHint onClose={onCloseDragPinHint} text={text} /> : null}
      {!collapsed && pinned.length > 0 ? (
        pinned.map((session) => {
          const path = `/epitaxy/${encodeURIComponent(session.id)}`;
          const selected = session.id === selectedSessionId;
          const key = sessionPinKey(session);
          const openSplit = () => window.dispatchEvent(new CustomEvent("dframe:open-pane", { detail: { path, title: session.title } }));
          return (
          <ContextMenu.Root key={session.id}>
          <ContextMenu.Trigger
            className={sidebarRowClassName(selected)}
            data-jump-hint-row=""
            data-pin-dragging={draggingKey === key || undefined}
            data-row-key={key}
            onDragOver={(event) => {
              if (!hasSessionDrag(event)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              const droppedKey = readSessionDragKey(event);
              if (!droppedKey || droppedKey === key) return;
              event.preventDefault();
              event.stopPropagation();
              onDropSessionKey(droppedKey, key);
              setDraggingKey(null);
            }}
          >
            <button
              className="flex flex-1 min-w-0 items-center gap-1.5 text-left border-0 bg-transparent p-0 text-inherit"
              data-row-main-button=""
              data-selected={selected ? "open" : undefined}
              draggable
              onDragEnd={() => setDraggingKey(null)}
              onDragStart={(event) => {
                setDraggingKey(key);
                writeSessionDragKey(event, key);
              }}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey) {
                  openSplit();
                  return;
                }
                onNavigate(path);
              }}
              type="button"
            >
              <span className="df-leading-slot">
                <PinnedSessionGlyph session={session} />
              </span>
              <span className="min-w-0 flex-1 truncate">{session.title}</span>
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

function sidebarRowClassName(selected: boolean) {
  const base = "group relative df-drag-shiftable flex w-full items-center gap-[var(--df-row-gap)] h-[var(--df-row-h)] px-[var(--df-row-px)] rounded-[var(--df-radius-pill)] text-[length:var(--df-row-font)]";
  return selected ? `${base} bg-bg-300 text-text-000` : `${base} text-text-300 hover:bg-bg-200`;
}

function PinnedSessionGlyph({ session }: { session: SessionSummary }) {
  if (session.sessionKind === "code") {
    return <span className="claude-rebuild-session-dot" aria-hidden="true" />;
  }
  return <span className="claude-rebuild-logo" aria-hidden="true">✳</span>;
}

export function writeSessionDragKey(event: DragEvent<HTMLElement>, key: string) {
  event.dataTransfer.setData("application/x-dframe-session-key", key);
  event.dataTransfer.setData("text/plain", key);
  event.dataTransfer.effectAllowed = "copyMove";
}

export function readSessionDragKey(event: DragEvent<HTMLElement>) {
  return event.dataTransfer.getData("application/x-dframe-session-key") || event.dataTransfer.getData("text/plain");
}

function hasSessionDrag(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).some((type) => type === "application/x-dframe-session-key" || type === "text/plain");
}
