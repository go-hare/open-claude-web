/**
 * Official cf74 `rS` QueuedMessageBar (`oS` single / `sS` collapsed+expanded).
 * Pin 2.31226.1: cc432 `D2` mounts `a2` (`${e}:queued`) *above* `Tj` pr-bar.
 * Do not reuse channel-rail `CodeUserEntryMessage` (c10f Hb) for this slot.
 *
 * Steer: `oS` always offers Send now (`aS` / ArrowReturn) when `onSteer` is set.
 * Local code capabilities (c5da) have reorderQueued and sendSteeredNow false, so
 * cc432 `_f` is `gf` and `steerHeadOnly` is set while a turn is running: Send now
 * stops the current response (`6Wu6VFE8rB`) instead of priority "next".
 * Reorder: `nS` drag handle. `onReorder(activeId, overId)` is official `$o` —
 * place active just after over (c06 `reorderQueuedMessage`).
 */
import { useRef, useState } from "react";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import { QUEUED_MESSAGE_BAR_MESSAGES } from "../officialCodeChromeMessages";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { formatOfficialIcu } from "../../../i18n/formatOfficialIcu";
import { Icon } from "../../../shell/icons";
import type { TranscriptEntry, TranscriptEntryItem } from "./officialTranscriptParse";

/**
 * Official c81ea1931 `fm` on Send now / Edit / Remove.
 * preventDefault on mousedown so the composer does not blur and swallow the click.
 */
function officialQueuedActionMouseDown(event: { preventDefault: () => void }) {
  event.preventDefault();
}

/** Official shared-6 `Jh` + neutral `Yh` — `Kn` / `Zh`. Enter animation is the outer `gm`, not the row. */
const QUEUED_BAND_CLASS = "flex items-center gap-[5px] w-full min-h-[40px] p-[8px] rounded-[10px] bg-alpha-1";
/** Official `oS` row: `${Kn} px-lg select-none`. */
const QUEUED_SINGLE_ROW_CLASS = `${QUEUED_BAND_CLASS} px-lg select-none`;
/** Official cf74 `rS` wrapper — `gm` is `epitaxy-band-enter` (c0b46114c). */
const QUEUED_BAR_SHELL_CLASS = "epitaxy-band-enter";

type OfficialQueuedMessageBarProps = {
  entries: TranscriptEntry[];
  onCancel?: (entryId: string) => void;
  onEdit?: (entryId: string) => void;
  /**
   * Official `onSteer` (`drJdjjprFp`). Single row always. Expanded list: head
   * unless `steerHeadOnly`, then only the first steerable row (cc432 `M`).
   */
  onSteer?: (entryId: string) => void;
  /**
   * Official `onReorder(activeId, overId)` — `$o` / c06 `reorderQueuedMessage`.
   * Absent → no drag handle (capability off).
   */
  onReorder?: (activeId: string, overId: string) => void;
  /** Official `steerHeadOnly` (`An`). Send now stops the current response. */
  steerHeadOnly?: boolean;
  /** Official `steerBusy`. */
  steerBusy?: boolean;
};

export function officialQueuedEntryPreview(entry: TranscriptEntry, imageLabel: string): string {
  const parts: string[] = [];
  for (const item of entry.items) {
    const text = previewForQueuedItem(item, imageLabel);
    if (text) parts.push(text);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim() || "…";
}

function previewForQueuedItem(item: TranscriptEntryItem, imageLabel: string): string {
  switch (item.kind) {
    case "text":
      return item.text;
    case "bash":
      return item.command ? `! ${item.command}` : "";
    case "file":
      return item.fileName ? `@${item.fileName}` : "";
    case "uploaded-file":
      return item.file?.fileName ? `@${item.file.fileName}` : "";
    case "image":
      return imageLabel;
    default:
      return "";
  }
}

export function OfficialQueuedMessageBar({
  entries,
  onCancel,
  onEdit,
  onReorder,
  onSteer,
  steerBusy = false,
  steerHeadOnly = false,
}: OfficialQueuedMessageBarProps) {
  const text = useI18nText(QUEUED_MESSAGE_BAR_MESSAGES);
  const count = entries.length;
  if (count === 0) return null;
  // Official cf74 rS: one queued message is oS, not the expanded sS list.
  // `gm` (`epitaxy-band-enter`) wraps either body.
  const body = count === 1 ? (
    <OfficialQueuedSingleRow
      entry={entries[0]!}
      onCancel={onCancel}
      onEdit={onEdit}
      onSteer={onSteer}
      steerBusy={steerBusy}
      steerHeadOnly={steerHeadOnly}
      text={text}
    />
  ) : (
    <OfficialQueuedCollapsedList
      entries={entries}
      onCancel={onCancel}
      onEdit={onEdit}
      onReorder={onReorder}
      onSteer={onSteer}
      steerBusy={steerBusy}
      steerHeadOnly={steerHeadOnly}
      text={text}
    />
  );
  return <div className={QUEUED_BAR_SHELL_CLASS}>{body}</div>;
}

/** Official cf74 `aS` — ArrowReturn plus the hidden stops / next-step description. */
function OfficialQueuedSteerButton({
  busy,
  description,
  label,
  onPress,
  size,
}: {
  busy: boolean;
  description: string;
  label: string;
  onPress: () => void;
  size: "base" | "small";
}) {
  const describedBy = useRef(`queued-steer-${Math.random().toString(36).slice(2, 8)}`);
  return (
    <>
      <OfficialButton
        aria-describedby={describedBy.current}
        ariaLabel={label}
        className="text-muted hover:text-primary"
        disabled={busy}
        icon="ArrowReturn"
        onClick={onPress}
        onMouseDown={officialQueuedActionMouseDown}
        size={size}
        variant="ghost"
      />
      <span hidden id={describedBy.current}>{description}</span>
    </>
  );
}

function OfficialQueuedSingleRow({
  entry,
  onCancel,
  onEdit,
  onSteer,
  steerBusy,
  steerHeadOnly,
  text,
}: {
  entry: TranscriptEntry;
  onCancel?: (entryId: string) => void;
  onEdit?: (entryId: string) => void;
  onSteer?: (entryId: string) => void;
  steerBusy: boolean;
  /** Official oS `steerStops` — steerHeadOnly uses the stop description. */
  steerHeadOnly: boolean;
  text: Record<keyof typeof QUEUED_MESSAGE_BAR_MESSAGES, string>;
}) {
  const preview = officialQueuedEntryPreview(entry, text.image);
  return (
    <div
      aria-busy={steerBusy || undefined}
      className={QUEUED_SINGLE_ROW_CLASS}
      data-official-source="cf74bc599-tv5IrHUA.js:rS oS"
      data-take-back-entry={entry.id}
    >
      <span className="text-body-medium text-primary shrink-0">
        {formatOfficialIcu(text.messagesQueued, { count: 1 })}
      </span>
      <span className="flex-1 min-w-0 truncate text-body text-muted">{preview}</span>
      <span className="flex items-center shrink-0">
        {onSteer ? (
          <OfficialQueuedSteerButton
            busy={steerBusy}
            description={steerHeadOnly ? text.stopsCurrentResponse : text.readsAtNextStep}
            label={text.sendNow}
            onPress={() => onSteer(entry.id)}
            size="base"
          />
        ) : null}
        {onEdit ? (
          <OfficialButton
            ariaLabel={text.editInComposer}
            className="text-muted hover:text-primary"
            icon="Edit"
            onClick={() => onEdit(entry.id)}
            onMouseDown={officialQueuedActionMouseDown}
            size="base"
            variant="ghost"
          />
        ) : null}
        {onCancel ? (
          <OfficialButton
            ariaLabel={text.removeFromQueue}
            className="text-muted hover:text-primary"
            icon="X"
            onClick={() => onCancel(entry.id)}
            onMouseDown={officialQueuedActionMouseDown}
            size="base"
            variant="ghost"
          />
        ) : null}
      </span>
    </div>
  );
}

function OfficialQueuedCollapsedList({
  entries,
  onCancel,
  onEdit,
  onReorder,
  onSteer,
  steerBusy,
  steerHeadOnly,
  text,
}: {
  entries: TranscriptEntry[];
  onCancel?: (entryId: string) => void;
  onEdit?: (entryId: string) => void;
  onReorder?: (activeId: string, overId: string) => void;
  onSteer?: (entryId: string) => void;
  steerBusy: boolean;
  steerHeadOnly: boolean;
  text: Record<keyof typeof QUEUED_MESSAGE_BAR_MESSAGES, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const firstPreview = officialQueuedEntryPreview(entries[0]!, text.image);
  const count = entries.length;

  if (!expanded) {
    return (
      <button
        aria-expanded={false}
        className={`flex items-center gap-1.25 w-full min-w-0 min-h-10 px-lg rounded-card bg-alpha-1 select-none text-left focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus hover:bg-alpha-2`}
        data-official-source="cf74bc599-tv5IrHUA.js:rS sS collapsed"
        onClick={() => setExpanded(true)}
        type="button"
      >
        <span className="text-body-medium text-primary shrink-0">
          {formatOfficialIcu(text.messagesQueued, { count })}
        </span>
        <span className="flex-1 min-w-0 truncate text-body text-muted">
          {formatOfficialIcu(text.nextPreview, { preview: firstPreview })}
        </span>
        <span aria-hidden="true" className="grid size-control shrink-0 place-items-center text-muted">
          <Icon name="CaretDown" size="auto" />
        </span>
      </button>
    );
  }

  return (
    <div
      className="flex flex-col w-full rounded-card bg-alpha-1 select-none overflow-clip divide-y"
      data-official-source="cf74bc599-tv5IrHUA.js:rS sS expanded"
    >
      <div className="flex items-center gap-1.25 w-full min-h-10 px-lg">
        <span className="flex-1 min-w-0 text-body-medium text-primary">
          {formatOfficialIcu(text.messagesQueued, { count })}
        </span>
        <OfficialButton
          ariaLabel={text.collapseQueued}
          className="text-muted hover:text-primary"
          icon="CaretUp"
          onClick={() => setExpanded(false)}
          size="base"
          variant="ghost"
        />
      </div>
      <OfficialQueuedExpandedRows
        entries={entries}
        onCancel={onCancel}
        onEdit={onEdit}
        onReorder={onReorder}
        onSteer={onSteer}
        steerBusy={steerBusy}
        steerHeadOnly={steerHeadOnly}
        text={text}
      />
      {onCancel ? (
        <div className="flex justify-end px-lg py-sm">
          <button
            className="text-footnote text-danger border-0 bg-transparent cursor-default"
            onClick={() => {
              for (const entry of entries) onCancel(entry.id);
            }}
            type="button"
          >
            {text.clearAll}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Official `sS` expanded list. Drag is `nS` (`distance: 5`, `onDragEnd` →
 * `onReorder(active, over)`). Product has no `@dnd-kit/sortable`; the handle
 * uses the same place-after contract without adding a dependency.
 */
function OfficialQueuedExpandedRows({
  entries,
  onCancel,
  onEdit,
  onReorder,
  onSteer,
  steerBusy,
  steerHeadOnly,
  text,
}: {
  entries: TranscriptEntry[];
  onCancel?: (entryId: string) => void;
  onEdit?: (entryId: string) => void;
  onReorder?: (activeId: string, overId: string) => void;
  onSteer?: (entryId: string) => void;
  steerBusy: boolean;
  steerHeadOnly: boolean;
  text: Record<keyof typeof QUEUED_MESSAGE_BAR_MESSAGES, string>;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; startY: number } | null>(null);
  const overRef = useRef<string | null>(null);
  function finishDrag() {
    const active = dragRef.current?.id;
    const over = overRef.current;
    dragRef.current = null;
    overRef.current = null;
    setDraggingId(null);
    setOverId(null);
    if (active && over && active !== over) onReorder?.(active, over);
  }

  return (
    <div
      aria-label={text.queuedMessages}
      className="flex flex-col max-h-[min(40vh,22rem)] overflow-y-auto overscroll-contain p-xs"
      onPointerCancel={finishDrag}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag) return;
        if (Math.abs(event.clientY - drag.startY) < 5) return;
        setDraggingId(drag.id);
        const hit = document.elementFromPoint(event.clientX, event.clientY);
        const row = hit?.closest("[data-take-back-entry]");
        const id = row?.getAttribute("data-take-back-entry") ?? null;
        const next = id && id !== drag.id ? id : null;
        overRef.current = next;
        setOverId(next);
      }}
      onPointerUp={finishDrag}
      role="list"
    >
      {entries.map((entry, index) => {
        // steerHeadOnly (cc432 hf): only the head stops the current response.
        // Otherwise every row can Send now.
        const showSteer = Boolean(onSteer) && (steerHeadOnly ? index === 0 : true);
        return (
          <div key={entry.id}>
            {index > 0 ? <div aria-hidden="true" className="border-t" role="presentation" /> : null}
            <OfficialQueuedExpandedRow
              dragging={draggingId === entry.id}
              entry={entry}
              onCancel={onCancel}
              onDragStart={onReorder ? (id, clientY) => {
                dragRef.current = { id, startY: clientY };
              } : undefined}
              onEdit={onEdit}
              onSteer={showSteer ? onSteer : undefined}
              reorderLabel={text.reorderQueuedMessage}
              steerBusy={steerBusy}
              steerDescription={index === 0 ? text.readsAtNextStep : text.stopsCurrentResponse}
              text={text}
            />
          </div>
        );
      })}
    </div>
  );
}

function OfficialQueuedExpandedRow({
  dragging,
  entry,
  onCancel,
  onDragStart,
  onEdit,
  onSteer,
  reorderLabel,
  steerBusy,
  steerDescription,
  text,
}: {
  dragging: boolean;
  entry: TranscriptEntry;
  onCancel?: (entryId: string) => void;
  onDragStart?: (entryId: string, clientY: number) => void;
  onEdit?: (entryId: string) => void;
  onSteer?: (entryId: string) => void;
  reorderLabel: string;
  steerBusy: boolean;
  steerDescription: string;
  text: Record<keyof typeof QUEUED_MESSAGE_BAR_MESSAGES, string>;
}) {
  const preview = officialQueuedEntryPreview(entry, text.image);
  const hasActions = Boolean(onEdit || onCancel || onSteer || onDragStart);
  const actionClass = dragging
    ? ""
    : "opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100 pointer-coarse:opacity-100";

  return (
    <div
      className={`group/row relative flex items-start gap-1.25 min-w-0 p-1.25 rounded ${dragging ? "bg-alpha-2 opacity-80" : ""}`}
      data-take-back-entry={entry.id}
      role="listitem"
    >
      <span className={`flex-1 min-w-0 text-body line-clamp-2 select-text text-primary ${onDragStart ? "group-hover/row:[mask-image:linear-gradient(to_right,black_calc(100%_-_120px),transparent_calc(100%_-_48px))] pointer-coarse:[mask-image:linear-gradient(to_right,black_calc(100%_-_120px),transparent_calc(100%_-_48px))]" : "group-hover/row:[mask-image:linear-gradient(to_right,black_calc(100%_-_76px),transparent_calc(100%_-_28px))] pointer-coarse:[mask-image:linear-gradient(to_right,black_calc(100%_-_76px),transparent_calc(100%_-_28px))]"}`}>{preview}</span>
      {hasActions ? (
        <span className="absolute right-1.25 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {onSteer ? (
            <span className={actionClass}>
              <OfficialQueuedSteerButton
                busy={steerBusy}
                description={steerDescription}
                label={text.sendNow}
                onPress={() => onSteer(entry.id)}
                size="small"
              />
            </span>
          ) : null}
          {onDragStart ? (
            <button
              aria-label={reorderLabel}
              className={`shrink-0 grid h-5 w-5 place-items-center border-0 bg-transparent cursor-grab text-muted hover:text-primary ${actionClass}`}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                onDragStart(entry.id, event.clientY);
              }}
              type="button"
            >
              <Icon name="Reorder" size="sm" />
            </button>
          ) : null}
          {onEdit ? (
            <span className={actionClass}>
              <OfficialButton
                ariaLabel={text.editInComposer}
                className="text-muted hover:text-primary"
                icon="Edit"
                onClick={() => onEdit(entry.id)}
                onMouseDown={officialQueuedActionMouseDown}
                size="small"
                variant="ghost"
              />
            </span>
          ) : null}
          {onCancel ? (
            <span className={actionClass}>
              <OfficialButton
                ariaLabel={text.removeFromQueue}
                className="text-muted hover:text-primary"
                icon="X"
                onClick={() => onCancel(entry.id)}
                onMouseDown={officialQueuedActionMouseDown}
                size="small"
                variant="ghost"
              />
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
