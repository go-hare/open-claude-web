import { useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { desktopBridge, type DesktopPreferences } from "../../adapters/desktopBridge";
import { BaseMenuItem, BaseMenuPopup, Menu } from "../../shell/BaseMenu";
import { Icon } from "../../shell/icons";

export function AvatarControl({ avatar, onClear, onRandomize }: { avatar: number; onClear: () => void; onRandomize: () => void }) {
  return (
    <div className="group/avatar relative w-fit">
      <button
        type="button"
        className="relative block overflow-hidden rounded-full outline-none focus-visible:shadow-focus"
        aria-label="随机头像"
        onClick={onRandomize}
      >
        <span className="block transition duration-fast group-hover/avatar:opacity-40 group-hover/avatar:blur-[3px] group-hover/avatar:scale-[1.15] group-has-[:focus-visible]/avatar:opacity-40 group-has-[:focus-visible]/avatar:blur-[3px] group-has-[:focus-visible]/avatar:scale-[1.15]">
          <span className="grid size-10 place-items-center rounded-full bg-bg-300 text-body text-primary">
            {avatar ? avatar : "C"}
          </span>
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
            aria-label="清除头像"
            onClick={onClear}
          >
            <Icon name="X" customSize={12} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function TextInputControl({ ariaLabel, defaultValue = "" }: { ariaLabel: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <input
      aria-label={ariaLabel}
      className="cds-input cds-reset h-control pl-sm rounded bg-fill-field focus-visible:bg-surface-popover backdrop-blur-sm shadow-field-ring data-[invalid]:shadow-field-invalid text-body text-primary transition duration-fast pr-sm w-56 placeholder:text-muted outline-none enabled:[&:hover:not(:focus):not([data-invalid])]:shadow-field-hover focus-visible:shadow-focus disabled:opacity-50 "
      value={value}
      onChange={(event) => setValue(event.currentTarget.value)}
    />
  );
}

export function SegmentedControl({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  options: Array<{ value: string; label: string; icon?: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  return (
    <div
      aria-label={ariaLabel}
      className="relative inline-flex w-fit items-stretch h-control rounded bg-segment-track p-px"
      data-cds="SegmentedControl"
      role="radiogroup"
    >
      <div
        aria-hidden="true"
        className="absolute rounded-[calc(var(--cds-radius)-1px)] bg-segment-thumb transition-[left,width] duration-base ease-snap motion-reduce:transition-none top-px bottom-px [box-shadow:inset_0_0_0_1px_var(--cds-border),0_1px_2px_0_rgb(0_0_0/0.05)]"
        style={{ left: `calc(${selectedIndex} * var(--cds-h-control) + 1px)`, width: "calc(var(--cds-h-control) - 2px)" }}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            aria-checked={selected}
            className="cds-reset relative z-[1] inline-flex items-center justify-center gap-1.5 select-none border-0 bg-transparent outline-none rounded-[calc(var(--cds-radius)-2px)] text-body hover:text-primary data-[checked]:text-primary disabled:opacity-50 disabled:hover:text-current transition-shadow duration-fast focus-visible:shadow-focus text-muted aspect-square px-0"
            data-checked={selected ? "" : undefined}
            onClick={() => onChange(option.value)}
            role="radio"
            title={option.label}
            type="button"
          >
            {option.icon ? <Icon name={option.icon} size="sm" /> : null}
          </button>
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

export function GhostSelect({
  align = "end",
  options,
  placeholder,
  value,
  onChange,
}: {
  align?: "start" | "center" | "end";
  options: SelectOption[];
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const activeValue = highlighted ?? selected?.value ?? options[0]?.value;
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === activeValue));
  const menuLabel = typeof selected?.label === "string" ? selected.label : selected?.label ?? placeholder;

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (options.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next = options[(activeIndex + delta + options.length) % options.length];
      setHighlighted(next?.value ?? null);
    }
    if (event.key === "Home") {
      event.preventDefault();
      setHighlighted(options[0]?.value ?? null);
    }
    if (event.key === "End") {
      event.preventDefault();
      setHighlighted(options.at(-1)?.value ?? null);
    }
  };

  return (
    <Menu.Root onOpenChange={(open) => !open && setHighlighted(null)}>
      <Menu.Trigger
        className="cds-reset inline-flex h-control min-w-0 cursor-default items-center gap-1.5 rounded bg-transparent pl-sm pr-0.5 text-body text-primary outline-none transition duration-fast hover:bg-fill-ghost-hover focus-visible:shadow-focus"
        type="button"
      >
        <span className="truncate" style={selected?.fontFamily ? { fontFamily: selected.fontFamily } : undefined}>{menuLabel}</span>
        <span aria-hidden="true" className="pointer-events-none flex size-icon shrink-0 items-center justify-center text-muted">
          <Icon name="CaretDown" size="sm" />
        </span>
      </Menu.Trigger>
      <BaseMenuPopup align={align} className="w-56" side="bottom" sideOffset={4}>
        <div
          aria-label={placeholder}
          className="-m-pad-lg flex flex-col p-1"
          onKeyDown={onKeyDown}
          onMouseLeave={() => setHighlighted(null)}
          role="listbox"
        >
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              className={`cds-reset flex min-h-control w-full cursor-default select-none items-center gap-2 rounded px-md py-1 text-left text-body text-primary outline-none ${option.value === highlighted ? "bg-fill-ghost-hover" : ""}`}
              key={option.value}
              onClick={() => onChange(option.value)}
              onFocus={() => setHighlighted(option.value)}
              onMouseEnter={() => setHighlighted(option.value)}
              role="option"
              style={option.fontFamily ? { fontFamily: option.fontFamily } : undefined}
              tabIndex={option.value === activeValue ? 0 : -1}
              type="button"
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.value === value ? <Icon name="Check" size="md" className="shrink-0 text-accent" /> : null}
            </button>
          ))}
        </div>
      </BaseMenuPopup>
    </Menu.Root>
  );
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

export function ShortcutControl({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  const display = value ? formatAccelerator(value) : "Set shortcut";
  return (
    <div className="w-[220px]">
      <button
        className="outline outline-1 outline-border-300/25 bg-bg-200 text-text-100 font-medium text-sm h-7 leading-7 px-2 box-border text-center min-w-[120px] rounded-md select-none relative focus-within:outline-2 focus-within:outline-brand-200 focus-within:shadow-[inset_0_1px_4px_2px_hsl(var(--always-black)/12%)] flex items-center justify-center"
        onClick={() => onChange(value ? "" : "CommandOrControl+Shift+Space")}
        type="button"
      >
        <span className={value ? "text-text-100" : "text-text-500 placeholder"}>{display}</span>
      </button>
    </div>
  );
}

function formatAccelerator(value: string) {
  return value
    .replace(/CommandOrControl|CmdOrCtrl|Command|Cmd/g, "⌘")
    .replace(/Control|Ctrl/g, "⌃")
    .replace(/Alt|Option/g, "⌥")
    .replace(/Shift/g, "⇧")
    .replace(/\+/g, "");
}
