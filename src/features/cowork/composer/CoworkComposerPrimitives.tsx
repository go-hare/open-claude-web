import { Menu } from "@base-ui-components/react/menu";
import { type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { CoworkChevronDownGlyph } from "../ui/CoworkOfficialGlyphs";

type CoworkComposerButtonProps = {
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
  dataWidgetAction?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  shortcut?: ReactNode;
  size?: "base" | "icon-sm" | "sm";
  variant?: "claude" | "ghost" | "primary" | "secondary";
};

const baseButton = "inline-flex items-center justify-center relative isolate shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none";
const variantClasses = {
  claude: "font-base-bold transition-colors _claude_10ocf_159",
  ghost: "border-transparent transition font-base duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] _ghost_10ocf_96",
  primary: "font-base-bold overflow-hidden transition-transform will-change-transform ease-[cubic-bezier(0.165,0.85,0.45,1)] duration-150 hover:scale-y-[1.015] hover:scale-x-[1.005] backface-hidden after:absolute after:inset-0 after:bg-[radial-gradient(at_bottom,hsla(var(--bg-000)/20%),hsla(var(--bg-000)/0%))] after:opacity-0 after:transition after:duration-200 after:translate-y-2 hover:after:opacity-100 hover:after:translate-y-0 _primary_10ocf_44",
  secondary: "font-base-bold border-0.5 overflow-hidden transition duration-100 backface-hidden _secondary_10ocf_72",
};
const sizeClasses = {
  base: "h-9 px-4 py-2 rounded-lg min-w-[5rem] whitespace-nowrap",
  "icon-sm": "h-8 w-8 rounded-md",
  sm: "h-8 rounded-md px-3 min-w-[4rem] whitespace-nowrap !text-xs",
};
const shortcutClasses = {
  base: "pl-3 pr-2 gap-1",
  "icon-sm": "",
  sm: "pl-2.5 pr-2 gap-1",
};
const genericSplitButtonClass = "!bg-text-100 !border-text-100 !text-bg-100 hover:!bg-text-200 !font-base !px-3 [&:first-child]:!border-r [&:first-child]:!border-r-white/30 [&:last-child]:!pl-1.5";

export function CoworkComposerButton({
  ariaLabel,
  children,
  className,
  dataWidgetAction,
  disabled,
  loading,
  onClick,
  shortcut,
  size = "base",
  variant = "primary",
}: CoworkComposerButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={[baseButton, variantClasses[variant], "_fill_10ocf_9", sizeClasses[size], shortcut ? shortcutClasses[size] : "", loading ? "!text-transparent ![text-shadow:_none]" : "", className ?? ""].join(" ")}
      data-widget-action={dataWidgetAction || undefined}
      disabled={disabled || loading}
      onClick={onClick}
      type="button"
    >
      {loading ? <div className="absolute inset-0 flex items-center justify-center _loadingSpinner_10ocf_187"><Icon className="animate-spin" customSize={14} name="Spinner" /></div> : null}
      {children}
      {shortcut ? <CoworkPermissionShortcut onDark={variant !== "secondary"}>{shortcut}</CoworkPermissionShortcut> : null}
    </button>
  );
}

type SplitItem = {
  disabled?: boolean;
  label: ReactNode;
  onSelect: () => void;
};

type CoworkPermissionSplitButtonProps = {
  buttonClassName?: string;
  disabled?: boolean;
  items: SplitItem[];
  mainButtonText: ReactNode;
  menuLabel?: ReactNode;
  onMainClick: () => void;
  triggerClassName?: string;
};

export function CoworkPermissionSplitButton({
  buttonClassName = genericSplitButtonClass,
  disabled,
  items,
  mainButtonText,
  menuLabel,
  onMainClick,
  triggerClassName = "!h-9",
}: CoworkPermissionSplitButtonProps) {
  return (
    <Menu.Root>
      <div className={`flex h-8 whitespace-nowrap ${triggerClassName}`}>
        <button
          className={`font-base-bold !text-xs rounded-l-lg bg-bg-000 h-full flex items-center justify-center px-2 border-y-0.5 border-l-0.5 border-border-200 hover:bg-bg-200 disabled:opacity-50 disabled:hover:bg-bg-000 ${buttonClassName}`}
          disabled={disabled}
          onClick={onMainClick}
          type="button"
        >
          {mainButtonText}
        </button>
        <Menu.Trigger
          aria-label="Allow options"
          className={`bg-bg-000 flex items-center justify-center px-1 hover:bg-bg-200 rounded-r-lg border-0.5 border-border-200 ${buttonClassName}`}
          disabled={disabled}
        >
          <CoworkChevronDownGlyph size={16} />
        </Menu.Trigger>
      </div>
      <PermissionSplitMenu items={items} menuLabel={menuLabel} />
    </Menu.Root>
  );
}

function PermissionSplitMenu({ items, menuLabel }: Pick<CoworkPermissionSplitButtonProps, "items" | "menuLabel">) {
  return (
    <Menu.Portal>
      <Menu.Positioner align="end" className="z-dropdown" sideOffset={4}>
        <Menu.Popup className="p-1.5 z-dropdown bg-bg-000 border-0.5 border-border-200 backdrop-blur-xl rounded-xl min-w-[8rem] text-text-300 shadow-[0px_2px_8px_0px_hsl(var(--always-black)/8%)] dark:shadow-[0px_2px_8px_0px_hsl(var(--always-black)/24%)] max-h-[min(var(--radix-select-content-available-height,var(--radix-dropdown-menu-content-available-height)),var(--dropdown-max-height,24rem))] overflow-y-auto overflow-x-hidden">
          {menuLabel ? <div className="font-small text-text-500 pt-1 pb-0.5 px-2 pb-1">{menuLabel}</div> : null}
          {items.map((item, index) => (
            <Menu.Item
              className="font-base min-h-8 px-2 py-1.5 rounded-lg cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis grid grid-cols-[minmax(0,_1fr)_auto] gap-2 items-center outline-none select-none [&[data-highlighted]]:bg-bg-300 [&[data-highlighted]]:text-text-000 data-[disabled]:opacity-50 data-[disabled]:cursor-default"
              disabled={item.disabled}
              key={index}
              onClick={item.onSelect}
            >
              {item.label}
            </Menu.Item>
          ))}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export function CoworkPermissionShortcut({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  const keys = typeof children === "string" ? shortcutKeys(children) : [children];
  return (
    <div className="ml-1 flex items-center gap-1">
      {keys.map((key, index) => <kbd className={`font-base select-none inline-flex items-center justify-center rounded min-w-5 h-5 px-1 ${onDark ? "bg-bg-000/25" : "bg-bg-300"}`} key={index}>{key}</kbd>)}
    </div>
  );
}

function shortcutKeys(shortcut: string) {
  const mac = typeof navigator !== "undefined" && /macintosh|macintel|macppc|mac68k|macos/i.test(navigator.userAgent);
  const modifiers: Record<string, string> = mac
    ? { alt: "⌥", cmd: "⌘", command: "⌘", control: "⌃", ctrl: "⌃", meta: "⌘", option: "⌥", shift: "⇧" }
    : { alt: "Alt", cmd: "Ctrl", command: "Ctrl", control: "Ctrl", ctrl: "Ctrl", meta: "Ctrl", option: "Alt", shift: "⇧" };
  const keys = shortcut.toLowerCase().split("+").map((key) => key.trim());
  return keys.map((key) => modifiers[key] ?? shortcutKeyLabel(key, mac));
}

function shortcutKeyLabel(key: string, mac: boolean) {
  const labels: Record<string, string> = mac
    ? { backspace: "⌫", delete: "⌫", down: "↓", enter: "⏎", esc: "Esc", escape: "Esc", left: "←", return: "⏎", right: "→", space: "␣", tab: "⇥", up: "↑" }
    : { backspace: "Backspace", delete: "Backspace", down: "Down", enter: "Enter", esc: "Esc", escape: "Esc", left: "Left", return: "Enter", right: "Right", space: "Space", tab: "Tab", up: "Up" };
  return labels[key] ?? (key.length === 1 || /^f\d+$/.test(key) ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1));
}
