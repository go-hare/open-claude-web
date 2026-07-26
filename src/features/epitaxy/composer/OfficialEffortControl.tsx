/**
 * Official Effort chip + Faster/Smarter slider popover residual (c360a9e1c `Ene` + `Tne`).
 * Dne places this beside Models; Effort is NOT an extraSections list inside Models.
 */
import { Popover } from "@base-ui-components/react/popover";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialHoverCardTooltip, OfficialTooltip } from "../../shared/OfficialTooltip";
import { OfficialEffortSlider } from "./OfficialEffortSlider";

export type OfficialEffortItem = {
  accent?: boolean;
  checked?: boolean;
  disabled?: boolean;
  help?: { body?: ReactNode; title?: ReactNode };
  label: ReactNode;
  noQuickKey?: boolean;
  onSelect?: () => void;
  value?: string;
};

const DEFAULT_HELP_BODY = "Higher effort means more thorough responses, but takes longer and uses your limits faster.";

/** Official Pne motion variants for Tne level title (blur slide). */
const EFFORT_TITLE_VARIANTS = {
  enter: (direction: number) => ({ y: 0.55 * direction + "em", opacity: 0, filter: "blur(2px)" }),
  center: { y: 0, opacity: 1, filter: "blur(0px)" },
  exit: (direction: number) => ({ y: 0.55 * -direction + "em", opacity: 0, filter: "blur(2px)" }),
};

/** Official Tne — purple accent when Ultracode stop is active/previewed. */
function EffortTitleLabel({ accent, index, label }: { accent?: boolean; index: number; label: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [meta, setMeta] = useState({ index, direction: 1 });
  if (meta.index !== index) {
    setMeta({ index, direction: index > meta.index ? 1 : -1 });
  }
  const direction = meta.index !== index ? (index > meta.index ? 1 : -1) : meta.direction;
  return (
    <span aria-hidden="true" className="relative min-w-0 text-t7">
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.span
          key={index}
          custom={direction}
          variants={EFFORT_TITLE_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
          className={`block min-w-0 truncate ${accent ? "font-medium text-extended-purple" : ""}`}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function OfficialEffortControl({
  disabled = false,
  items,
  onOpenChange,
  open,
}: {
  disabled?: boolean;
  items: OfficialEffortItem[];
  onOpenChange: (open: boolean, reason?: string) => void;
  open: boolean;
}) {
  const checkedIndex = items.findIndex((item) => item.checked);
  const selectedIndex = checkedIndex >= 0 ? checkedIndex : 0;
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const activeIndex = Math.min(previewIndex ?? selectedIndex, Math.max(items.length - 1, 0));
  const activeItem = items[activeIndex];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canOpen = items.length > 1;

  // Official Ene: clear preview when popover closes.
  useEffect(() => {
    if (!open) setPreviewIndex(null);
  }, [open]);

  const getAriaValueText = useCallback((index: number) => {
    const label = items[index]?.label;
    if (typeof label === "string") return label;
    return `Level ${index + 1} of ${items.length}`;
  }, [items]);

  // Official Ene: b = e => h(e)
  const onValueChange = useCallback((index: number) => {
    setPreviewIndex(index);
  }, []);

  // Official Ene: y = t => { h(null); s || e[t]?.onSelect?.() }
  // Parent onSelect (official X) must update checked index in the same event turn
  // so React batches preview-clear + new checked — no 3→2→3 flash.
  const onValueCommitted = useCallback((index: number) => {
    setPreviewIndex(null);
    if (disabled) return;
    items[index]?.onSelect?.();
  }, [disabled, items]);

  const handleOpenChange = useCallback((next: boolean, eventDetails?: { reason?: string }) => {
    if (!next) setPreviewIndex(null);
    onOpenChange(next, eventDetails?.reason);
  }, [onOpenChange]);

  const triggerLabel = items[selectedIndex]?.label;
  const fillShader = items.at(-1)?.accent === true;
  const helpTitle = activeItem?.help?.title ?? "Effort";
  const helpBody = activeItem?.help?.body ?? DEFAULT_HELP_BODY;

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <OfficialTooltip delayDuration={400} side="top" tooltipContent="Effort" keyboardShortcut="cmd+shift+e">
        <Popover.Trigger
          disabled={disabled || !canOpen}
          className="group/btn relative isolate inline-flex items-center justify-center h-small rounded-small text-footnote text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled shrink-0 select-none border-0 outline-none hide-focus-ring ring-focus cursor-default aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)]"
          type="button"
        >
          <span aria-hidden="true" className="btn-squish absolute inset-0 -z-[1] rounded-[inherit] bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)] group-disabled/btn:bg-[var(--fill-uncontained-disabled)] group-aria-[expanded=true]/btn:bg-[var(--fill-uncontained-selected)]" />
          <span className="sr-only">Effort: </span>
          <span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap px-p5">
            {triggerLabel}
          </span>
        </Popover.Trigger>
      </OfficialTooltip>
      <Popover.Portal>
        <Popover.Positioner align="end" className="epitaxy-root size-0" collisionPadding={24} side="top" sideOffset={8}>
          <Popover.Popup className="outline-none absolute bottom-0 right-0" initialFocus={inputRef}>
            <div className="relative isolate flex w-[220px] select-none flex-col gap-[16px] rounded-r8 p-p7">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <div className="flex items-center justify-between gap-g3">
                <div className="flex min-w-0 items-center gap-g3 text-body">
                  <span className="shrink-0 text-t6">Effort</span>
                  <EffortTitleLabel accent={activeItem?.accent} index={activeIndex} label={activeItem?.label} />
                </div>
                <OfficialHoverCardTooltip
                  align="end"
                  alignOffset={-10}
                  className="w-[220px] select-none"
                  delayDuration={200}
                  side="top"
                  sideOffset={18}
                  tooltipContent={(
                    <>
                      <span className="text-footnote-medium text-t7 pb-p3">{helpTitle}</span>
                      <span className="text-pretty text-body text-t6 break-words">{helpBody}</span>
                    </>
                  )}
                >
                  <button
                    type="button"
                    className="inline-flex size-[18px] shrink-0 cursor-default items-center justify-center rounded-full text-t5 outline-none hide-focus-ring ring-focus hover:text-t7"
                    aria-label="About effort"
                  >
                    <Icon name="Help" size="m" />
                  </button>
                </OfficialHoverCardTooltip>
              </div>
              <div className="flex w-full flex-col gap-g6">
                <div className="flex items-center justify-between gap-g3 text-footnote text-t6">
                  <span>Faster</span>
                  <span>Smarter</span>
                </div>
                <OfficialEffortSlider
                  aria-label="Effort"
                  disabled={disabled}
                  fillShader={fillShader}
                  getAriaValueText={getAriaValueText}
                  inputRef={inputRef}
                  max={Math.max(items.length - 1, 0)}
                  min={0}
                  onValueChange={onValueChange}
                  onValueCommitted={onValueCommitted}
                  showStops
                  stopTooltips
                  step={1}
                  value={activeIndex}
                />
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
