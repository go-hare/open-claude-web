import type { SessionSummary } from "../../../adapters/desktopBridge";
import type { FrameStore } from "../../../stores/frameStore";
import { BaseContextMenuPopup, ContextMenu } from "../../../shell/BaseMenu";
import { coworkSessionPath } from "../sessionPaths";
import { CoworkSessionRowActions, CoworkSessionRowMenu, type CoworkRowAction } from "./CoworkSessionMenus";
import { CoworkSidebarStatusGlyph } from "./CoworkSidebarStatusGlyph";
import { readCoworkSessionDragKey, writeCoworkSessionDragKey } from "./coworkSessionDrag";
import { coworkSessionPinKey } from "./coworkSessionPinning";

type CoworkSessionRowProps = {
  frame: FrameStore;
  onAction: (session: SessionSummary, action: CoworkRowAction) => void;
  onDropBefore?: (droppedKey: string) => void;
  onNavigate: (path: string) => void;
  selected: boolean;
  session: SessionSummary;
};

export function CoworkSessionRow(props: CoworkSessionRowProps) {
  return <CoworkSessionRowContext {...props} />;
}

function CoworkSessionRowContext({ frame, onAction, onDropBefore, onNavigate, selected, session }: CoworkSessionRowProps) {
  const key = coworkSessionPinKey(session);
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger className={rowWrapperClass} data-jump-hint-row="" data-row="" data-row-key={key} data-selected={selected ? "open" : undefined} onDragOver={(event) => allowDropBefore(event, Boolean(onDropBefore))} onDrop={(event) => handleDropBefore(event, key, onDropBefore)}>
        <CoworkSessionRowButton keyValue={key} onNavigate={onNavigate} selected={selected} session={session} />
        <CoworkSessionRowActions frame={frame} onAction={onAction} session={session} />
      </ContextMenu.Trigger>
      <BaseContextMenuPopup className="min-w-[180px]">
        <CoworkSessionRowMenu frame={frame} onAction={onAction} session={session} />
      </BaseContextMenuPopup>
    </ContextMenu.Root>
  );
}

function CoworkSessionRowButton({ keyValue, onNavigate, selected, session }: { keyValue: string; onNavigate: (path: string) => void; selected: boolean; session: SessionSummary }) {
  return (
    <button className={rowButtonClass} data-row-main-button="" data-selected={selected ? "open" : undefined} draggable onClick={() => onNavigate(coworkSessionPath(session))} onDragStart={(event) => writeCoworkSessionDragKey(event, keyValue)} type="button">
      <span className="df-leading-slot text-text-300"><CoworkSidebarStatusGlyph session={session} /></span>
      <span className="flex-1 min-w-0"><CoworkSidebarTitle>{session.title}</CoworkSidebarTitle></span>
    </button>
  );
}

function CoworkSidebarTitle({ children }: { children: string }) {
  return <span className="block w-full min-w-0 whitespace-nowrap overflow-hidden [mask-image:linear-gradient(to_right,hsl(var(--always-black))_85%,transparent_99%)] group-hover:[mask-image:linear-gradient(to_right,hsl(var(--always-black))_60%,transparent_78%)] group-focus-within:[mask-image:linear-gradient(to_right,hsl(var(--always-black))_60%,transparent_78%)] group-data-[menu-open=true]:[mask-image:linear-gradient(to_right,hsl(var(--always-black))_60%,transparent_78%)]">{children}</span>;
}

function allowDropBefore(event: React.DragEvent<HTMLElement>, enabled: boolean) {
  if (!enabled) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function handleDropBefore(event: React.DragEvent<HTMLElement>, key: string, onDropBefore?: (droppedKey: string) => void) {
  if (!onDropBefore) return;
  const droppedKey = readCoworkSessionDragKey(event);
  if (!droppedKey || droppedKey === key) return;
  event.preventDefault();
  event.stopPropagation();
  onDropBefore(droppedKey);
}

const rowWrapperClass = "group relative df-drag-shiftable rounded-[var(--df-radius-pill)] hover:bg-[var(--df-hover)] focus-within:bg-[var(--df-hover)] data-[selected=focused]:bg-bg-200 data-[selected=focused]:text-text-000 data-[selected=open]:bg-bg-200 data-[menu-open=true]:bg-[var(--df-hover)]";
const rowButtonClass = "w-full shrink-0 border-none text-left text-[length:var(--df-row-font)] text-text-300 flex items-center gap-[var(--df-row-gap)] h-[var(--df-row-h)] px-[var(--df-row-px)] hide-focus-ring focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--accent-100)),0_0_6px_0_hsl(var(--accent-100)/0.2)] rounded-[var(--df-radius-pill)] data-[selected=focused]:text-text-000";
