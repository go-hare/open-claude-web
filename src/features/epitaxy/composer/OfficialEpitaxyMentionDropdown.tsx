/**
 * Official c11959232 Hj EpitaxyMentionDropdown.
 * Portal to document.body. Surface: epitaxy-root z-[60] + Id("popover")
 *   (`epitaxy-popup relative isolate min-w-[130px] max-w-[320px] … py-p5 rounded-r6`)
 *   with !fixed !min-w-0 !max-w-none. Elevation Nn popover (k_e).
 * Row: Rd({hasIcon:true}) + AgentPlanPath / Folder1 / 代码.
 */
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../../shell/icons";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { OfficialTooltip } from "../../shared/OfficialTooltip";
import { OfficialSpinner } from "../session/OfficialWorkingStatus";
import { COMPOSER_MENTION_MESSAGES } from "../officialCodeChromeMessages";
import { OFFICIAL_EPITAXY_AGENTS_PROVIDER_ID } from "./officialComposerAgentMentions";
import type { OfficialComposerMentionOption } from "./officialComposerAgentMentions";

const OFFICIAL_MENTION_POPUP_BASE =
  "epitaxy-popup relative isolate min-w-[130px] max-w-[320px] max-h-[var(--available-height)] flex flex-col py-p5 rounded-r6 outline-none";

const OFFICIAL_MENTION_SCROLL = "flex-1 min-h-0 flex flex-col overflow-y-auto";

/** Official cb6154120 `k` Rd({hasIcon:true}). */
const OFFICIAL_MENTION_ITEM =
  "relative isolate flex items-center min-h-[var(--h4)] shrink-0 px-p8 text-body select-none cursor-default outline-none hide-focus-ring before:content-[''] before:absolute before:-z-[1] before:inset-y-0 before:left-[6px] before:right-[6px] before:rounded-r5 data-[disabled]:opacity-50 data-[disabled]:pointer-events-none text-[var(--menu-item-color,var(--t8))] gap-g6 data-[highlighted]:before:bg-fill-uncontained-hover hover:before:bg-fill-uncontained-hover focus-visible:before:bg-fill-uncontained-hover";

type OfficialEpitaxyMentionDropdownProps = {
  isLoading?: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  options: OfficialComposerMentionOption[];
  position: { left: number; top: number };
  selectedIndex: number;
};

export const OfficialEpitaxyMentionDropdown = memo(function OfficialEpitaxyMentionDropdown({
  isLoading = false,
  onClose,
  onSelect,
  options,
  position,
  selectedIndex,
}: OfficialEpitaxyMentionDropdownProps) {
  const copy = useI18nText(COMPOSER_MENTION_MESSAGES);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const highlighted = hovered ?? selectedIndex;
  const width = useMemo(() => (options.some((option) => option.description) ? 560 : 420), [options]);
  const [style, setStyle] = useState<CSSProperties>(() => ({
    top: `${position.top - 24}px`,
    left: `${position.left}px`,
    width: `${width}px`,
    maxHeight: "360px",
    transform: "translateY(-100%)",
  }));
  const [tooltipSide, setTooltipSide] = useState<"left" | "right">("right");

  useLayoutEffect(() => {
    const overflow = position.left + width + 16 - window.innerWidth;
    const left = overflow <= 0 ? position.left : Math.max(16, position.left - overflow);
    setTooltipSide(window.innerWidth - (left + width) >= 380 ? "right" : "left");
    const above = position.top - 24 - 16;
    const below = window.innerHeight - position.top - 24 - 16;
    setStyle(
      above >= below
        ? {
            top: `${position.top - 24}px`,
            left: `${left}px`,
            width: `${width}px`,
            maxHeight: `${Math.min(360, above)}px`,
            transform: "translateY(-100%)",
          }
        : {
            top: `${position.top + 24}px`,
            left: `${left}px`,
            width: `${width}px`,
            maxHeight: `${Math.min(360, below)}px`,
          },
    );
  }, [position.top, position.left, width]);

  useEffect(() => {
    const row = listRef.current?.children[highlighted];
    if (row instanceof HTMLElement) row.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClose]);

  if (options.length === 0 && !isLoading) return null;

  return createPortal(
    <div
      ref={rootRef}
      role="listbox"
      aria-label={copy.mentionSuggestions}
      className={`epitaxy-root z-[60] ${OFFICIAL_MENTION_POPUP_BASE} !fixed !min-w-0 !max-w-none`}
      style={style}
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-stroke-shadow"
        data-surface="popover"
      />
      <div ref={listRef} className={OFFICIAL_MENTION_SCROLL}>
        {options.length === 0 && isLoading ? (
          <div role="status" className={`${OFFICIAL_MENTION_ITEM} pointer-events-none`}>
            <span className="flex items-center justify-center size-[14px] shrink-0">
              <OfficialSpinner size="s" />
            </span>
            <span className="text-t6">{copy.loading}</span>
          </div>
        ) : null}
        {options.map((option, index) => {
          const isDirectory = option.metadata?.isDirectory === true;
          const isAgent = option.providerId === OFFICIAL_EPITAXY_AGENTS_PROVIDER_ID;
          const tooltip = (option.renderedText ?? option.label).replaceAll("/", "/​");
          return (
            <OfficialTooltip
              key={option.id}
              side={tooltipSide}
              tooltipContent={tooltip}
            >
              <button
                type="button"
                role="option"
                aria-selected={index === highlighted}
                data-highlighted={index === highlighted ? "" : undefined}
                className={OFFICIAL_MENTION_ITEM}
                onClick={() => onSelect(option.id)}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className="flex items-center justify-center size-[14px] shrink-0 overflow-hidden">
                  {isAgent ? (
                    <Icon name="AgentPlanPath" size="s" />
                  ) : isDirectory ? (
                    <Icon name="Folder1" size="s" />
                  ) : (
                    <Icon name="代码" size="s" />
                  )}
                </span>
                <span className="flex-1 min-w-0 flex items-baseline gap-g5">
                  <span className="truncate text-t8">{option.label}</span>
                  {option.description ? (
                    <span className="truncate text-footnote text-t6">{option.description}</span>
                  ) : null}
                </span>
              </button>
            </OfficialTooltip>
          );
        })}
      </div>
    </div>,
    document.body,
  );
});

OfficialEpitaxyMentionDropdown.displayName = "EpitaxyMentionDropdown";
