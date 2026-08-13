/**
 * Official DM rewind picker (c11959232): Dialog list of prior human turns.
 * Esc Esc / openRewindPicker → isOpen; pick → onSelect(uuid, text).
 */
import { Dialog } from "@base-ui-components/react/dialog";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { OfficialButton } from "../OfficialEpitaxyComponents";

export type OfficialRewindTurn = {
  text: string;
  uuid: string;
};

export function OfficialRewindPicker({
  isOpen,
  onClose,
  onSelect,
  turns,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (uuid: string, text: string) => void;
  turns: readonly OfficialRewindTurn[];
}) {
  const lastIndex = Math.max(turns.length - 1, 0);
  const [selectedIndex, setSelectedIndex] = useState(lastIndex);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (isOpen) setSelectedIndex(lastIndex);
  }, [isOpen, lastIndex]);

  useEffect(() => {
    if (!isOpen) return;
    listRef.current
      ?.querySelector(`[data-idx="${selectedIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [isOpen, selectedIndex]);

  const labels = useMemo(
    () =>
      turns.map((turn) => {
        const compact = turn.text.replace(/\s+/g, " ").trim();
        return compact.length > 80 ? `${compact.slice(0, 80)}…` : compact;
      }),
    [turns],
  );

  const pick = useCallback(
    (index: number, turn: OfficialRewindTurn) => {
      onSelect(turn.uuid, turn.text);
      onClose();
    },
    [onClose, onSelect],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        listRef.current?.focus();
        setSelectedIndex((index) => Math.min(index + 1, lastIndex));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        listRef.current?.focus();
        setSelectedIndex((index) => Math.max(index - 1, 0));
        return;
      }
      if (event.key === "Enter") {
        if (!listRef.current?.contains(event.target as Node)) return;
        event.preventDefault();
        const turn = turns[selectedIndex];
        if (turn) pick(selectedIndex, turn);
      }
    },
    [lastIndex, pick, selectedIndex, turns],
  );

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop
          forceRender
          className="fixed inset-0 z-50 bg-always-black/50 backdrop-blur-[2px] draggable-none"
        />
        <Dialog.Popup
          aria-label="Rewind conversation"
          className="epitaxy-root fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[32rem] max-w-[calc(100vw-2rem)] draggable-none outline-none"
          initialFocus={listRef}
          onKeyDown={onKeyDown}
        >
          <div className="relative isolate rounded-r6 p-p8 flex flex-col gap-g6">
            <span
              aria-hidden="true"
              className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-stroke-shadow"
              data-surface="popover"
            />
            <div className="flex items-start justify-between gap-g4">
              <Dialog.Title className="text-heading-semibold text-t9">Rewind</Dialog.Title>
              <OfficialButton
                ariaLabel="Close"
                icon="XCrossCloseMedium"
                onClick={onClose}
                size="small"
                variant="muted"
              />
            </div>
            <p className="text-footnote text-t6">
              Restore the conversation to a previous message
            </p>
            <ul
              aria-activedescendant={turns.length ? `rewind-opt-${selectedIndex}` : undefined}
              className="flex flex-col gap-g2 max-h-[50vh] overflow-y-auto outline-none"
              ref={listRef}
              role="listbox"
              tabIndex={-1}
            >
              {turns.length === 0 ? (
                <li className="text-body text-t6 italic px-p5 py-p4" role="presentation">
                  Nothing to rewind to yet.
                </li>
              ) : (
                turns.map((turn, index) => (
                  <li
                    aria-selected={selectedIndex === index}
                    className={
                      "rounded-r4 px-p5 py-p4 cursor-pointer "
                      + (selectedIndex === index ? "bg-t2 text-t9" : "text-t7 hover:bg-t1")
                    }
                    data-idx={index}
                    id={`rewind-opt-${index}`}
                    key={turn.uuid}
                    onClick={() => pick(index, turn)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    role="option"
                  >
                    <div className="text-body truncate">{labels[index]}</div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
