import { type ShellText, useShellText } from "../i18n/shellMessages";
import type { PaneSlot } from "../stores/paneStore";
import { PANE_SLOTS } from "../stores/paneStore";
import { BaseMenuItem, BaseMenuPopup, BaseMenuSeparator, Menu } from "./BaseMenu";
import { Icon } from "./icons";

type ExtraPaneMenuProps = {
  currentSlot: PaneSlot;
  isLonePane: boolean;
  onClose: () => void;
  onMove: (slot: PaneSlot) => void;
};

type PrimaryPaneMenuProps = {
  canOpenSplit: boolean;
  onOpenSplit: () => void;
};

const triggerClassName = "draggable-none size-6 flex items-center justify-center rounded-md text-text-300 hover:text-text-100 hover:bg-bg-300 aria-expanded:bg-bg-300 aria-expanded:text-text-100 transition-colors shrink-0";
export function PaneMenuTrigger({ label }: { label: string }) {
  return (
    <Menu.Trigger aria-label={label} className={triggerClassName} type="button">
      <Icon name="DotsHorizontal" customSize={14} />
    </Menu.Trigger>
  );
}

export function ExtraPaneMenu({ currentSlot, isLonePane, onClose, onMove }: ExtraPaneMenuProps) {
  const text = useShellText();
  const targets = PANE_SLOTS.filter((slot) => slot !== currentSlot && (!isLonePane || slot !== "br"));
  return (
    <Menu.Root>
      <PaneMenuTrigger label={text.more} />
      <BaseMenuPopup align="end" className="min-w-[190px]" side="bottom" sideOffset={4}>
        {targets.map((slot) => <BaseMenuItem icon="ArrowSplitRight" key={slot} onClick={() => onMove(slot)}>{paneLabel(slot, text)}</BaseMenuItem>)}
        {targets.length > 0 ? <BaseMenuSeparator /> : null}
        <BaseMenuItem icon="X" onClick={onClose}>{text.closeSplitView}</BaseMenuItem>
      </BaseMenuPopup>
    </Menu.Root>
  );
}

export function PrimaryPaneMenu({ canOpenSplit, onOpenSplit }: PrimaryPaneMenuProps) {
  const text = useShellText();
  if (!canOpenSplit) return null;
  return (
    <Menu.Root>
      <PaneMenuTrigger label={text.more} />
      <BaseMenuPopup align="end" className="min-w-[180px]" side="bottom" sideOffset={4}>
        <BaseMenuItem icon="ArrowSplitRight" onClick={onOpenSplit}>{text.openInSplitView}</BaseMenuItem>
      </BaseMenuPopup>
    </Menu.Root>
  );
}

function paneLabel(slot: PaneSlot, text: ShellText) {
  if (slot === "tr") return text.movePaneRight;
  if (slot === "br") return text.movePaneBottomRight;
  return text.movePaneDown;
}
