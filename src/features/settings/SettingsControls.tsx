import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { Combobox } from "@base-ui-components/react/combobox";
import { AnimatePresence, motion } from "motion/react";
import { desktopBridge, type DesktopPreferences } from "../../adapters/desktopBridge";
import { OfficialTooltip, OfficialTooltipWrap } from "../shared/OfficialTooltip";
import { BaseMenuItem, BaseMenuPopup, Menu } from "../../shell/BaseMenu";
import { Icon } from "../../shell/icons";
import {
  CHAT_FONT_CSS_VAR,
  CHAT_FONT_ORDER,
  readResolvedColorMode,
  THEME_MODE_CHANGE_EVENT,
  type ChatFontSetting,
} from "./appearanceSettings";
import { OfficialAvatarGlyph } from "./officialAvatars/OfficialAvatarGlyph";

/**
 * Official Profile Avatar control (c0db37792): Tss/Iss glyph when variant>0, else initials JL.
 * Hover: blur + Shuffle overlay; clear chip when variant !== 0.
 */
export function AvatarControl({
  avatar,
  displayName = "",
  onClear,
  onRandomize,
}: {
  avatar: number;
  displayName?: string;
  onClear: () => void;
  onRandomize: () => void;
}) {
  return (
    <div className="group/avatar relative w-fit">
      <button
        type="button"
        className="relative block overflow-hidden rounded-full outline-none focus-visible:shadow-focus"
        aria-label="Randomize avatar"
        onClick={onRandomize}
      >
        <span className="block transition duration-fast group-hover/avatar:opacity-40 group-hover/avatar:blur-[3px] group-hover/avatar:scale-[1.15] group-has-[:focus-visible]/avatar:opacity-40 group-has-[:focus-visible]/avatar:blur-[3px] group-has-[:focus-visible]/avatar:scale-[1.15]">
          {avatar > 0 ? (
            <OfficialAvatarGlyph size={40} variant={avatar} />
          ) : (
            <span className="grid size-10 place-items-center overflow-hidden rounded-full bg-fill-control text-body font-medium leading-none text-primary">
              {initialsFromName(displayName) || "C"}
            </span>
          )}
        </span>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition-opacity duration-fast group-hover/avatar:opacity-100 group-has-[:focus-visible]/avatar:opacity-100">
          <Icon name="Shuffle" size="md" className="text-secondary" />
        </div>
      </button>
      {avatar !== 0 ? (
        <div className="absolute -top-1.5 -left-1.5 opacity-0 transition-opacity duration-fast group-hover/avatar:opacity-100 group-has-[:focus-visible]/avatar:opacity-100">
          <button
            type="button"
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-surface-popover ring-1 ring-alpha-2 outline-none transition-colors duration-fast hover:bg-fill-ghost-hover focus-visible:shadow-focus"
            aria-label="Clear avatar"
            onClick={onClear}
          >
            <Icon name="X" customSize={12} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toLocaleUpperCase();
}

/** Official General profile $ (c0db37792): controlled text, save on blur/Enter when trimmed value changes. */
export function TextInputControl({
  ariaLabel,
  defaultValue = "",
  disabled = false,
  onSave,
  value: controlledValue,
}: {
  ariaLabel: string;
  defaultValue?: string;
  disabled?: boolean;
  onSave?: (value: string) => void;
  value?: string;
}) {
  const committed = controlledValue ?? defaultValue;
  const [value, setValue] = useState(committed);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setValue(committed);
  }, [committed, focused]);
  return (
    <input
      aria-label={ariaLabel}
      className="cds-input cds-reset h-control pl-sm rounded bg-fill-field focus-visible:bg-surface-popover backdrop-blur-sm shadow-field-ring data-[invalid]:shadow-field-invalid text-body text-primary transition duration-fast pr-sm w-56 placeholder:text-muted outline-none enabled:[&:hover:not(:focus):not([data-invalid])]:shadow-field-hover focus-visible:shadow-focus disabled:opacity-50 "
      disabled={disabled}
      value={value}
      onChange={(event) => setValue(event.currentTarget.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const next = value.trim();
        if (!next || next === committed.trim()) return;
        onSave?.(next);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape" && value.trim() !== committed.trim()) {
          event.stopPropagation();
          setValue(committed);
        }
      }}
    />
  );
}

/**
 * Official XD SegmentedControl (index-BELzQL5P / c0db37792 Appearance):
 * - contained: h-control + rounded bg-segment-track p-px
 * - thumb left/width from ResizeObserver on [data-checked] (not h-control math)
 * - icon-only segments: icon set && label undefined → aspect-square px-0 + tooltip
 * - icon size: comfortable density → md, else sm (Ji())
 */
export function SegmentedControl({
  ariaLabel,
  options,
  value,
  onChange,
  size,
  variant = "contained",
}: {
  ariaLabel: string;
  /**
   * Official segment shape: `{ value, icon?, label?, tooltip? }`.
   * Appearance passes icon + tooltip only (no label) so buttons stay square.
   */
  options: Array<{ value: string; label?: string; icon?: string; tooltip?: string }>;
  value: string;
  onChange: (value: string) => void;
  /** Official size → data-size; Appearance leaves undefined (inherit density). */
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "contained" | "ghost";
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  // Official f = "comfortable"===Ji() ? "md" : "sm"
  const iconSize = useMemo<"sm" | "md">(() => {
    if (typeof document === "undefined") return "md";
    const density =
      document.querySelector(".cds-root[data-density]")?.getAttribute("data-density")
      ?? "comfortable";
    return density === "comfortable" ? "md" : "sm";
  }, []);

  const measureThumb = useCallback(() => {
    const root = rootRef.current;
    const checked = root?.querySelector<HTMLElement>("[data-checked]");
    if (!checked) {
      setThumb(null);
      return;
    }
    setThumb({ left: checked.offsetLeft, width: checked.offsetWidth });
  }, []);

  useEffect(() => {
    measureThumb();
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measureThumb());
    observer.observe(root);
    for (const child of Array.from(root.children)) {
      if (child instanceof HTMLElement) observer.observe(child);
    }
    return () => observer.disconnect();
  }, [measureThumb, value, options.length, size, variant]);

  const contained = variant === "contained";

  return (
    <div
      ref={rootRef}
      aria-label={ariaLabel}
      className={`relative inline-flex w-fit items-stretch h-control ${
        contained ? "rounded bg-segment-track p-px" : "gap-[1px]"
      }`}
      data-cds="SegmentedControl"
      data-size={size}
      role="radiogroup"
    >
      {thumb ? (
        <div
          aria-hidden="true"
          className={
            "absolute rounded-[calc(var(--cds-radius)-1px)] bg-segment-thumb transition-[left,width] duration-base ease-snap motion-reduce:transition-none "
            + (contained
              ? "top-px bottom-px [box-shadow:inset_0_0_0_1px_var(--cds-border),0_1px_2px_0_rgb(0_0_0/0.05)]"
              : "inset-y-0 [box-shadow:inset_0_0_0_1px_var(--cds-border)]")
          }
          style={{ left: thumb.left, width: thumb.width }}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        // Official XD: t = e.icon && void 0 === e.label; tooltip s = e.tooltip ?? String(e.value)
        const iconOnly = Boolean(option.icon && option.label === undefined);
        const tooltip =
          option.tooltip
          ?? (typeof option.label === "string" ? option.label : undefined)
          ?? String(option.value);
        const button = (
          <button
            aria-checked={selected}
            aria-label={iconOnly ? tooltip : undefined}
            className={
              "cds-reset relative z-[1] inline-flex items-center justify-center gap-1.5 px-md select-none border-0 bg-transparent outline-none rounded-[calc(var(--cds-radius)-2px)] text-body hover:text-primary data-[checked]:text-primary disabled:opacity-50 disabled:hover:text-current transition-shadow duration-fast focus-visible:shadow-focus "
              + (contained
                ? "text-muted"
                : "text-secondary [&:not([data-checked])]:hover:bg-fill-ghost-hover")
              + (iconOnly ? " aspect-square px-0" : "")
            }
            data-checked={selected ? "" : undefined}
            onClick={() => onChange(option.value)}
            role="radio"
            type="button"
          >
            {option.icon ? <Icon name={option.icon} size={iconSize} /> : null}
            {option.label}
          </button>
        );
        // Official XD: return t ? a.jsx(rl, { content: s, children: n }, e.value) : n
        // rl = OfficialTooltip; content is already locale-resolved (zh: 跟随系统/浅色/深色).
        if (iconOnly) {
          return (
            <OfficialTooltip key={option.value} side="top" tooltipContent={tooltip}>
              {button}
            </OfficialTooltip>
          );
        }
        return (
          <Fragment key={option.value}>{button}</Fragment>
        );
      })}
    </div>
  );
}

type SelectOption = {
  value: string;
  label: ReactNode;
  fontFamily?: string;
};

type GhostSelectItem = {
  fontFamily?: string;
  label: ReactNode;
  value: string;
};

/**
 * Official c43c5949a $a Combobox residual (General work_function c0db37792):
 * mode="select" variant="ghost" fullWidth=false align="end" searchable=false.
 *
 * Trigger shell = oa + ia.ghost + sa.select + pr-sm
 * Portal = le (cds-root + data-mode/density/platform) so shadow-panel ring tokens resolve
 * Popup = pa (rounded-card + popover surface) / ha / ma / ga + check indicator
 * Positioner: side bottom, sideOffset 6, positionMethod fixed, z-popover,
 * w-[var(--anchor-width)] min-w-[12rem]; anchor is the outer shell (official ye).
 */
const ghostSelectTriggerShell =
  "cds-reset group/cbx inline-flex min-w-0 items-center gap-1.5 h-control rounded text-body text-primary outline-none transition duration-fast data-[disabled]:opacity-50 data-[disabled]:pointer-events-none bg-transparent hover:bg-fill-ghost-hover pl-0 has-[:focus-visible]:shadow-focus data-[disabled]:cursor-default pr-sm";

/**
 * Official pa = flex flex-col max-h… + ra("popover") + cds-reset…
 * Theme tokens come from portal le (CdsPortalRoot), not from putting bare
 * cds-root on the popup (bare cds-root without data-mode resets to light rings).
 */
const ghostSelectPopupClassName =
  "flex flex-col max-h-[min(var(--available-height),var(--cds-popup-max-h,320px))] rounded-card bg-surface-3 backdrop-blur-[12px] shadow-panel cds-reset text-body text-primary outline-none data-[starting-style]:opacity-0";

const ghostSelectPopupInnerClassName =
  "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] p-1";

const ghostSelectListClassName =
  "cds-reset min-h-0 flex-1 overflow-y-auto outline-none";

const ghostSelectItemClassName =
  "cds-reset group/cbx-item flex w-full items-center gap-2 min-h-control px-md py-1 rounded text-body text-primary select-none outline-none data-[highlighted]:bg-fill-ghost-hover data-[disabled]:opacity-50 data-[disabled]:pointer-events-none";

const ghostSelectSearchInputClassName =
  "-mx-1 -mt-1 mb-1 block w-[calc(100%+8px)] shrink-0 cds-reset bg-transparent border-0 border-b border-b-[var(--cds-border)] outline-none px-[calc(var(--cds-pad-md)+4px)] py-2 text-body text-primary placeholder:text-muted";

/**
 * Official le (c43c5949a): portaled surfaces re-root CDS tokens (ring/shadow-panel).
 * Without this, shadow-panel loses --cds-ring-* / --cds-shadow-popover and looks borderless.
 */
function CdsPortalRoot({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">(() => readResolvedColorMode());
  useEffect(() => {
    const sync = () => setMode(readResolvedColorMode());
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(THEME_MODE_CHANGE_EVENT, sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(THEME_MODE_CHANGE_EVENT, sync);
    };
  }, []);
  return (
    <div
      className="cds-root"
      data-cds-portal=""
      data-density="default"
      data-mode={mode}
      data-platform="desktop"
    >
      {children}
    </div>
  );
}

export function GhostSelect({
  align = "end",
  fullWidth = false,
  options,
  placeholder,
  searchable,
  value,
  onChange,
}: {
  align?: "start" | "center" | "end";
  fullWidth?: boolean;
  options: SelectOption[];
  placeholder?: string;
  /** Official default: true when items.length > 5. Work-function passes false. */
  searchable?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const items = useMemo<GhostSelectItem[]>(
    () =>
      options.map((option) => ({
        value: option.value,
        label: option.label,
        fontFamily: option.fontFamily,
      })),
    [options],
  );
  const selected = useMemo(
    () => items.find((item) => item.value === value) ?? null,
    [items, value],
  );
  // Official A = searchable ?? (items.length > 5)
  const enableSearch = searchable ?? items.length > 5;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  // Official ve: when !searchable && mode select → filter null (no typeahead filter UI).
  // Still keep a client filter when searchable for the popup search field.
  const filtered = useMemo(() => {
    if (!enableSearch) return items;
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return items;
    return items.filter((item) => {
      const label = typeof item.label === "string" ? item.label : item.value;
      return (
        label.toLocaleLowerCase().includes(needle)
        || item.value.toLocaleLowerCase().includes(needle)
      );
    });
  }, [enableSearch, items, query]);

  const triggerLabel = selected ? (
    <span style={selected.fontFamily ? { fontFamily: selected.fontFamily } : undefined}>
      {selected.label}
    </span>
  ) : (
    <span className="font-normal text-muted">{placeholder ?? "\u00a0"}</span>
  );

  return (
    <Combobox.Root
      // Official non-searchable select: filter null; searchable path filters via Re input + our filtered items.
      filter={null}
      items={filtered}
      value={selected}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      onValueChange={(next) => {
        if (next && typeof next === "object" && "value" in next) {
          onChange(String((next as GhostSelectItem).value));
        }
      }}
      onInputValueChange={(next) => {
        if (enableSearch) setQuery(next);
      }}
      isItemEqualToValue={(a, b) => a?.value === b?.value}
      itemToStringLabel={(item) =>
        typeof item?.label === "string" ? item.label : item?.value ?? ""
      }
      itemToStringValue={(item) => item?.value ?? ""}
    >
      {/* Official ye shell: oa + ia[variant] + sa[mode] + pr-sm + optional w-full */}
      <div
        ref={shellRef}
        className={`${ghostSelectTriggerShell}${fullWidth ? " w-full" : ""}`}
        data-official-source="c43c5949a:$a ghost select"
      >
        <Combobox.Trigger
          className="cds-reset flex min-w-0 flex-1 items-center gap-1.5 self-stretch pl-sm text-left border-0 bg-transparent p-0 outline-none"
          type="button"
        >
          <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
          <Icon
            name="CaretDown"
            size="sm"
            className="mr-0.5 shrink-0 text-muted transition-colors group-hover/cbx:text-secondary"
          />
        </Combobox.Trigger>
      </div>
      <Combobox.Portal>
        {/* Official is → le → ps → ms; le re-roots --cds-ring-* for shadow-panel border. */}
        <CdsPortalRoot>
          <Combobox.Positioner
            align={align}
            anchor={shellRef}
            className="z-popover w-[var(--anchor-width)] min-w-[12rem]"
            positionMethod="fixed"
            side="bottom"
            sideOffset={6}
          >
            <Combobox.Popup className={ghostSelectPopupClassName} data-cds="Combobox">
              <div className={ghostSelectPopupInnerClassName}>
                {/* Official Re: search field only when mode select && searchable */}
                {enableSearch ? (
                  <Combobox.Input
                    className={ghostSelectSearchInputClassName}
                    placeholder={placeholder}
                  />
                ) : null}
                <div className={ghostSelectListClassName} tabIndex={-1}>
                  {/*
                    Official non-virtual List (c43c5949a $a → rs + Ea):
                    children is Collection render fn WITHOUT index prop.
                    Passing index skips CompositeList register; CompositeList then
                    truncates listRef to sortedMap.size (0) → hover never sets
                    data-highlighted → no bg-fill-ghost-hover.
                    Only virtualized Ea passes index={t.index}.
                  */}
                  <Combobox.List className="cds-reset outline-none">
                    {(item: GhostSelectItem) => (
                      <Combobox.Item
                        className={ghostSelectItemClassName}
                        key={item.value}
                        value={item}
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span
                            className="truncate"
                            style={item.fontFamily ? { fontFamily: item.fontFamily } : undefined}
                          >
                            {item.label}
                          </span>
                        </div>
                        <Combobox.ItemIndicator className="shrink-0 text-accent">
                          <Icon name="Check" size="sm" />
                        </Combobox.ItemIndicator>
                      </Combobox.Item>
                    )}
                  </Combobox.List>
                </div>
              </div>
            </Combobox.Popup>
          </Combobox.Positioner>
        </CdsPortalRoot>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

/**
 * Official se Chat font (c0db37792): Menu k.Root/Trigger/Popup — not Combobox.
 * Trigger: ghost h-control + sample fontFamily var(K[value].claude)
 * Popup: w-56 listbox; item highlight via hover/focus; Check size md when selected.
 */
export function ChatFontSelect({
  labels,
  onChange,
  value,
}: {
  labels: Record<ChatFontSetting, string>;
  onChange: (value: ChatFontSetting) => void;
  value: ChatFontSetting;
}) {
  const selected = CHAT_FONT_ORDER.includes(value) ? value : "default";
  return (
    <Menu.Root>
      <Menu.Trigger
        className="cds-reset inline-flex h-control min-w-0 cursor-default items-center gap-1.5 rounded bg-transparent pl-sm pr-0.5 text-body text-primary outline-none transition duration-fast hover:bg-fill-ghost-hover focus-visible:shadow-focus"
        type="button"
      >
        <span
          className="truncate"
          style={{ fontFamily: `var(${CHAT_FONT_CSS_VAR[selected]})` }}
        >
          {labels[selected]}
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none flex size-icon shrink-0 items-center justify-center text-muted"
        >
          <Icon name="CaretDown" size="sm" />
        </span>
      </Menu.Trigger>
      <BaseMenuPopup align="end" className="w-56" side="bottom" sideOffset={6}>
        <div
          aria-label="Chat font"
          className="-m-pad-lg flex flex-col p-1"
          role="listbox"
        >
          {CHAT_FONT_ORDER.map((font) => {
            const active = font === selected;
            return (
              <Menu.Item
                key={font}
                className="cds-reset flex min-h-control w-full cursor-default select-none items-center gap-2 rounded px-md py-1 text-left text-body text-primary outline-none data-[highlighted]:bg-fill-ghost-hover"
                onClick={() => onChange(font)}
              >
                <span
                  className="min-w-0 flex-1 truncate"
                  style={{ fontFamily: `var(${CHAT_FONT_CSS_VAR[font]})` }}
                >
                  {labels[font]}
                </span>
                {active ? (
                  <Icon name="Check" size="md" className="shrink-0 text-accent" />
                ) : null}
              </Menu.Item>
            );
          })}
        </div>
      </BaseMenuPopup>
    </Menu.Root>
  );
}

/**
 * Official X → Y conversation_preferences (c0db37792):
 * autosize textarea min-h-[5.5rem] max-h-40; rotating placeholders when empty.
 */
/**
 * Official RIe rotating placeholders (index-BELzQL5P):
 *   interval default 6000; AnimatePresence + motion.p
 *   initial { opacity:0, y:4 } → animate { opacity:1, y:0, transition:{ delay:0.3 } }
 *   exit { opacity:0, y:-4 }
 * c0db37792 Y: className "!px-sm !py-sm text-body text-muted" over base absolute inset padding.
 */
function SettingsRotatingPlaceholders({
  className,
  interval = 6000,
  isShown,
  placeholders,
}: {
  className?: string;
  interval?: number;
  isShown: boolean;
  placeholders: string[];
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isShown || placeholders.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % placeholders.length);
    }, interval);
    return () => window.clearInterval(timer);
  }, [interval, isShown, placeholders.length]);

  useEffect(() => {
    if (!isShown) setIndex(0);
  }, [isShown]);

  return (
    <div
      aria-hidden="true"
      className={[
        "absolute top-0 left-0 right-0 bottom-0 w-full h-full p-3 pointer-events-none",
        !isShown ? "opacity-0" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-official-source="index-BELzQL5P:RIe"
    >
      {isShown ? (
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
            exit={{ opacity: 0, y: -4 }}
            className="break-words absolute text-body text-muted"
          >
            {placeholders[index % Math.max(placeholders.length, 1)] ?? ""}
          </motion.p>
        </AnimatePresence>
      ) : null}
    </div>
  );
}

/**
 * Official X Instructions field (c0db37792): R tooltip when CMEK + Y textarea.
 * disabled + opacity-50 + aria-disabled when locked (LBt taint:cmek).
 * Placeholder rotation: official RIe (not plain text swap).
 */
export function InstructionsPreferencesField({
  description,
  disabled = false,
  id = "conversation-preferences",
  label,
  lockTooltip,
  onSave,
  placeholders,
  value,
}: {
  description: ReactNode;
  disabled?: boolean;
  id?: string;
  label: ReactNode;
  /** Official D4CuWTj4f5 when CMEK lock active. */
  lockTooltip?: string;
  onSave: (value: string) => void;
  placeholders: string[];
  value: string;
}) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  // Official Y: isShown = !value (draft empty) && not disabled
  const showPlaceholder = !disabled && draft.length === 0 && placeholders.length > 0;

  const field = (
    <div
      className={["flex flex-col gap-sm py-md", disabled ? "opacity-50" : ""].filter(Boolean).join(" ")}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? 0 : undefined}
    >
      <label className="text-body text-primary" htmlFor={id}>
        {label}
      </label>
      <div className="text-footnote text-neutral-500">{description}</div>
      <div className="relative">
        <textarea
          id={id}
          className="cds-input cds-reset min-h-[5.5rem] max-h-40 w-full resize-y rounded bg-fill-field px-sm py-sm text-body text-primary shadow-field-ring outline-none transition duration-fast placeholder:text-muted focus-visible:bg-surface-popover focus-visible:shadow-focus disabled:cursor-not-allowed"
          rows={3}
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => {
            focused.current = false;
            if (disabled || draft === value) return;
            onSave(draft);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && draft !== value) {
              event.stopPropagation();
              setDraft(value);
            }
          }}
        />
        <SettingsRotatingPlaceholders
          className="!px-sm !py-sm text-body text-muted"
          isShown={showPlaceholder}
          placeholders={placeholders}
        />
      </div>
    </div>
  );

  if (disabled && lockTooltip) {
    return (
      <OfficialTooltipWrap tooltipContent={lockTooltip} side="top">
        {field}
      </OfficialTooltipWrap>
    );
  }

  return field;
}

export function WorktreeSelect({ onChange, value = "default" }: { onChange: (value: DesktopPreferences["chillingSlothLocation"]) => void; value?: DesktopPreferences["chillingSlothLocation"] }) {
  const isCustom = typeof value === "object";
  const label = isCustom ? "Custom..." : "Inside project (.claude/worktrees)";
  const customPath = isCustom ? value.customPath : "";
  const chooseCustom = async () => {
    const paths = await desktopBridge.Preferences.getDirectoryPath?.(false);
    onChange(paths?.[0] ? { customPath: paths[0] } : { customPath: customPath || "" });
  };
  return (
    <div className="w-[220px] flex gap-2 flex-col justify-center">
      <Menu.Root>
        <Menu.Trigger className="cds-reset group/cbx inline-flex min-w-0 items-center gap-1.5 h-control rounded text-body text-primary outline-none transition duration-fast bg-fill-field focus-visible:bg-surface-popover backdrop-blur-sm shadow-field-ring hover:shadow-field-hover pl-0 pr-sm w-full" type="button">
          <span className="cds-reset flex min-w-0 flex-1 items-center gap-1.5 self-stretch pl-sm text-left border-0 bg-transparent p-0 outline-none">
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span aria-hidden="true">▾</span>
          </span>
        </Menu.Trigger>
        <BaseMenuPopup align="end" className="min-w-[220px]" side="bottom" sideOffset={4}>
          <BaseMenuItem checked={!isCustom} checkedRole="radio" onClick={() => onChange("default")}>Inside project (.claude/worktrees)</BaseMenuItem>
          <BaseMenuItem checked={isCustom} checkedRole="radio" onClick={chooseCustom}>Custom...</BaseMenuItem>
        </BaseMenuPopup>
      </Menu.Root>
      {customPath ? <div className="text-sm text-text-300 truncate" title={customPath}>{customPath}</div> : null}
    </div>
  );
}

export function BranchInput({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return (
    <div className="w-[220px]">
      <input
        className="cds-input cds-reset h-control pl-sm rounded bg-fill-field focus-visible:bg-surface-popover backdrop-blur-sm shadow-field-ring data-[invalid]:shadow-field-invalid text-body text-primary transition duration-fast pr-sm w-full placeholder:text-muted outline-none enabled:[&:hover:not(:focus):not([data-invalid])]:shadow-field-hover focus-visible:shadow-focus disabled:opacity-50 "
        data-cds="TextInput"
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder="claude"
        value={value}
      />
    </div>
  );
}

/**
 * Official us (c71860c77): focusable capture field; onKeyDownCapture builds Cmd/Ctrl/Alt/Shift+Key;
 * reserved combos blocked; X clears. onShortcutChange may throw → show unsupported message.
 */
const RESERVED_SHORTCUTS = new Set([
  "Cmd+Q",
  "Cmd+W",
  "Cmd+H",
  "Cmd+M",
  "Cmd+,",
  "Cmd+N",
  "Cmd+O",
  "Cmd+T",
  "Cmd+S",
  "Cmd+C",
  "Cmd+V",
  "Ctrl+W",
  "Ctrl+N",
  "Ctrl+O",
  "Ctrl+T",
  "Ctrl+S",
  "Ctrl+C",
  "Ctrl+V",
]);

const MODIFIER_CODES = new Set([
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
  "OSLeft",
  "OSRight",
]);

export function ShortcutControl({
  onChange,
  value,
}: {
  onChange: (value: string) => void | Promise<void>;
  value: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const isDarwin =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
  const display = useMemo(
    () => (value ? formatAccelerator(value, isDarwin) : ""),
    [value, isDarwin],
  );

  const onKeyDownCapture = useCallback(
    async (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const hasMod = event.altKey || event.ctrlKey || event.metaKey;
      if (event.key === "Tab" && !hasMod) return;
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation?.();
      if (MODIFIER_CODES.has(event.code)) return;

      const mods: string[] = [];
      if (event.shiftKey) mods.push("Shift");
      if (event.altKey) mods.push("Alt");
      if (event.ctrlKey) mods.push("Ctrl");
      if (event.metaKey) mods.push("Cmd");

      let key = "";
      if (event.code.startsWith("Key")) key = event.code.slice(-1);
      else if (event.code === "Space") key = "Space";
      else if (event.key.length === 1) key = event.key.toUpperCase();
      else key = event.code;
      if (!key) return;

      const isFunction = key.toUpperCase().startsWith("F") && key.length > 1;
      if (mods.length === 0 && !isFunction) return;

      const accelerator = [...mods, key].join("+");
      if (RESERVED_SHORTCUTS.has(accelerator)) {
        setError("This shortcut is reserved for common actions. Try a different combination.");
        return;
      }
      setError(null);
      try {
        await onChange(accelerator);
      } catch {
        setError("This shortcut combination isn't supported. Try a different combination.");
      }
    },
    [onChange],
  );

  const onKeyUpCapture = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
  }, []);

  return (
    <div className="w-[220px] flex flex-col gap-1">
      <div
        tabIndex={0}
        onKeyDownCapture={onKeyDownCapture}
        onKeyUpCapture={onKeyUpCapture}
        className="outline outline-1 outline-border-300/25 bg-bg-200 text-text-100 font-medium text-sm h-7 leading-7 px-2 box-border text-center min-w-[120px] rounded-md select-none relative focus-within:outline-2 focus-within:outline-brand-200 focus-within:shadow-[inset_0_1px_4px_2px_hsl(var(--always-black)/12%)] flex items-center justify-center"
        role="textbox"
        aria-label="Keyboard shortcut"
      >
        <div className={display ? "" : "text-text-500 placeholder"}>{display || "Set shortcut"}</div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setError(null);
            void onChange("");
          }}
          className={`absolute right-2 top-1.5 h-4 w-4 cursor-pointer ${value ? "block" : "hidden"}`}
          aria-label="Clear shortcut"
        >
          <defs>
            <mask id="xMaskShortcut">
              <rect width="100" height="100" fill="white" />
              <path d="M35 35 L65 65 M65 35 L35 65" stroke="black" strokeWidth="8" strokeLinecap="round" />
            </mask>
          </defs>
          <circle cx="50" cy="50" r="45" fill="currentColor" className="text-text-500" mask="url(#xMaskShortcut)" />
        </svg>
      </div>
      {error ? <p className="text-footnote text-danger-000">{error}</p> : null}
    </div>
  );
}

/** Official cs display residual: darwin spaces, else +. */
export function formatAccelerator(value: string, darwin = true) {
  if (!value) return "";
  const sep = darwin ? "" : "+";
  const parts = value.split("+").filter(Boolean);
  const mapped = parts.map((part) => {
    if (/^(CommandOrControl|CmdOrCtrl|Command|Cmd|Meta)$/i.test(part)) return darwin ? "⌘" : "Ctrl";
    if (/^(Control|Ctrl)$/i.test(part)) return darwin ? "⌃" : "Ctrl";
    if (/^(Alt|Option)$/i.test(part)) return darwin ? "⌥" : "Alt";
    if (/^Shift$/i.test(part)) return darwin ? "⇧" : "Shift";
    if (/^Space$/i.test(part)) return "Space";
    return part.length === 1 ? part.toUpperCase() : part;
  });
  return darwin ? mapped.join(sep) : mapped.join("+");
}

/** Official xs presets when nativeQuickEntry is supported (c71860c77). */
export type QuickEntryShortcutValue = "double-tap-option" | "off" | { accelerator: string };

export const QUICK_ENTRY_NATIVE_PRESETS: Array<{
  id: string;
  label: string;
  value: QuickEntryShortcutValue;
  match: (value: unknown) => boolean;
}> = [
  {
    id: "double-tap-option",
    label: "Tap Option twice",
    value: "double-tap-option",
    match: (value) => value === "double-tap-option",
  },
  {
    id: "option-space",
    label: "Option+Space",
    value: { accelerator: "Alt+Space" },
    match: (value) =>
      typeof value === "object" && value !== null && (value as { accelerator?: string }).accelerator === "Alt+Space",
  },
  {
    id: "custom",
    label: "Custom…",
    value: { accelerator: "Cmd+Shift+Space" },
    match: (value) =>
      typeof value === "object"
      && value !== null
      && typeof (value as { accelerator?: string }).accelerator === "string"
      && (value as { accelerator: string }).accelerator !== "Alt+Space",
  },
  {
    id: "off",
    label: "No shortcut",
    value: "off",
    match: (value) => value === "off",
  },
];

/** Official gs dictation presets (c71860c77). */
export type QuickEntryDictationValue = "capslock" | "off" | { accelerator: string };

export const QUICK_ENTRY_DICTATION_PRESETS: Array<{
  id: string;
  label: string;
  value: QuickEntryDictationValue;
  requiresCustomSupport?: boolean;
  match: (value: unknown) => boolean;
}> = [
  {
    id: "capslock",
    label: "Caps Lock",
    value: "capslock",
    match: (value) => value === "capslock",
  },
  {
    id: "custom",
    label: "Custom…",
    value: { accelerator: "Cmd+Shift+Alt+Space" },
    requiresCustomSupport: true,
    match: (value) => typeof value === "object" && value !== null,
  },
  {
    id: "off",
    label: "No shortcut",
    value: "off",
    match: (value) => value === "off",
  },
];
