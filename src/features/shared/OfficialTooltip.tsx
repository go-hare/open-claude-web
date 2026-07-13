/**
 * Official tooltip (_Component7 / Xp) from c5f4e1303.
 * Default content _C classes; keyboardShortcut via hC/mC (cmd+f → ⌘F / Ctrl+F).
 * gYt collapsed filter: tooltipContent=placeholder, keyboardShortcut="cmd+f", side="top".
 */
import { cloneElement, isValidElement, useMemo, type ReactElement, type ReactNode } from "react";
import { Tooltip } from "@base-ui-components/react/tooltip";

const defaultContentClass =
  "px-2 py-1 text-xs font-normal font-ui leading-tight rounded-md shadow-md text-always-white bg-always-black/80 backdrop-blur break-words z-tooltip max-w-[13rem] text-pretty [*:disabled_&]:hidden";

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /macintosh|macintel|macppc|mac68k|macos/i.test(navigator.userAgent);
}

/** Official hC(+mC): parse "cmd+f" → platform glyphs */
export function formatKeyboardShortcut(shortcut: string, isMac = isMacPlatform()): string {
  if (!shortcut) return "";
  const parts = shortcut
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  const modifiers: string[] = [];
  const keys: string[] = [];
  for (const part of parts) {
    if (["cmd", "command", "meta", "ctrl", "control", "alt", "option", "shift"].includes(part)) {
      modifiers.push(part);
    } else {
      keys.push(part);
    }
  }
  const order = ["ctrl", "control", "alt", "option", "shift", "cmd", "command", "meta"];
  const macMod: Record<string, string> = {
    ctrl: "\u2303",
    control: "\u2303",
    alt: "\u2325",
    option: "\u2325",
    shift: "\u21E7",
    cmd: "\u2318",
    command: "\u2318",
    meta: "\u2318",
  };
  const winMod: Record<string, string> = {
    ctrl: "Ctrl",
    control: "Ctrl",
    alt: "Alt",
    option: "Alt",
    shift: "\u21E7",
    cmd: "Ctrl",
    command: "Ctrl",
    meta: "Ctrl",
  };
  const formatKey = (key: string) => {
    if (key === "space") return isMac ? "\u2423" : "Space";
    if (key === "enter" || key === "return") return isMac ? "\u23CE" : "Enter";
    if (key === "delete" || key === "backspace") return isMac ? "\u232B" : "Backspace";
    if (key === "escape" || key === "esc") return "Esc";
    if (key === "tab") return "Tab";
    return key.length === 1 ? key.toUpperCase() : key;
  };
  const rendered = [
    ...modifiers
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))
      .map((mod) => (isMac ? macMod[mod] : winMod[mod])),
    ...keys.map(formatKey),
  ].filter(Boolean) as string[];
  return isMac ? rendered.join("") : rendered.join("+");
}

export type OfficialTooltipProps = {
  children: ReactElement;
  className?: string;
  delayDuration?: number;
  keyboardShortcut?: string;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  tooltipContent?: ReactNode;
};

/** Official _Component7 / Xp */
export function OfficialTooltip({
  children,
  className,
  delayDuration = 200,
  keyboardShortcut,
  side = "top",
  sideOffset = 5,
  tooltipContent,
}: OfficialTooltipProps) {
  const shortcutLabel = useMemo(
    () => (keyboardShortcut ? formatKeyboardShortcut(keyboardShortcut) : ""),
    [keyboardShortcut],
  );

  if (tooltipContent == null || tooltipContent === false || !isValidElement(children)) {
    return children;
  }

  return (
    <Tooltip.Root disableHoverablePopup>
      <Tooltip.Trigger delay={delayDuration} render={children as ReactElement} />
      <Tooltip.Portal>
        <Tooltip.Positioner className="z-tooltip" side={side} sideOffset={sideOffset}>
          <Tooltip.Popup
            className={[defaultContentClass, className ?? ""].filter(Boolean).join(" ")}
            data-official-source="c5f4e1303:_Component7/_C"
          >
            {tooltipContent}
            {keyboardShortcut ? <span className="ml-1.5 opacity-70">{shortcutLabel}</span> : null}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** Wrap arbitrary node when child is not a single element (fallback span trigger). */
export function OfficialTooltipWrap({
  children,
  ...rest
}: Omit<OfficialTooltipProps, "children"> & { children: ReactNode }) {
  if (isValidElement(children)) {
    return <OfficialTooltip {...rest}>{children}</OfficialTooltip>;
  }
  return (
    <OfficialTooltip {...rest}>
      <span className="inline-flex">{children}</span>
    </OfficialTooltip>
  );
}
