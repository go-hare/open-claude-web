import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { type ShellText } from "../i18n/shellMessages";
import { Icon } from "./icons";
import { LegacyDropdownItem, LegacyDropdownMenu, LegacyDropdownPopup, LegacyDropdownSeparator } from "./LegacyDropdown";
import type { SidebarNavItem } from "./sidebarData";

type SidebarMoreFlyoutProps = {
  activeItem?: SidebarNavItem;
  items: SidebarNavItem[];
  moreOpen: boolean;
  onCustomizeSidebar: () => void;
  onMoreOpenChange: (open: boolean) => void;
  onNavigate: (href: string) => void;
  text: ShellText;
};

export function SidebarMoreFlyout({ activeItem, items, moreOpen, onCustomizeSidebar, onMoreOpenChange, onNavigate, text }: SidebarMoreFlyoutProps) {
  const {
    cancelClose,
    cancelSafeZone,
    closeMore,
    open,
    scheduleClose,
    scheduleOpen,
    setOpen,
    startSafeZoneClose,
  } = useMoreFlyoutState(moreOpen, onMoreOpenChange);

  const selectAndNavigate = (href: string) => {
    closeMore();
    onNavigate(href);
  };

  const openCustomizeSidebar = () => {
    closeMore();
    onCustomizeSidebar();
  };

  return (
    <LegacyDropdownMenu.Root open={open} onOpenChange={setOpen}>
      <MoreFlyoutButton
        activeItem={activeItem}
        text={text}
        onMouseEnter={scheduleOpen}
        onMouseLeave={startSafeZoneClose}
        onPointerDownCapture={(event) => {
          if (event.pointerType === "mouse" || event.pointerType === "pen") {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        open={open}
      />
      <LegacyDropdownPopup
        align="start"
        alignOffset={-2}
        className="min-w-[220px]"
        collisionPadding={12}
        data-moreflyout-content=""
        onMouseEnter={() => {
          cancelSafeZone();
          cancelClose();
          scheduleOpen();
        }}
        onMouseLeave={scheduleClose}
        side="right"
        sideOffset={4}
      >
        <MoreFlyoutContent items={items} onCustomizeSidebar={openCustomizeSidebar} onNavigate={selectAndNavigate} text={text} />
      </LegacyDropdownPopup>
    </LegacyDropdownMenu.Root>
  );
}

function useMoreFlyoutState(moreOpen: boolean, onMoreOpenChange: (open: boolean) => void) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const open = moreOpen || hoverOpen;
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const safeZoneCleanupRef = useRef<(() => void) | null>(null);

  const clearTimers = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const cancelClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const cancelSafeZone = () => {
    safeZoneCleanupRef.current?.();
    safeZoneCleanupRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearTimers();
      cancelSafeZone();
    };
  }, []);

  const scheduleOpen = () => {
    cancelSafeZone();
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (!open && openTimerRef.current === null) {
      openTimerRef.current = window.setTimeout(() => {
        openTimerRef.current = null;
        setHoverOpen(true);
      }, 120);
    }
  };

  const scheduleClose = () => {
    cancelSafeZone();
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setHoverOpen(false);
    }, 180);
  };
  const setOpen = (nextOpen: boolean) => {
    clearTimers();
    setHoverOpen(false);
    onMoreOpenChange(nextOpen);
  };

  const closeMore = () => setOpen(false);
  const startSafeZoneClose = (event: ReactMouseEvent<HTMLElement>) => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    cancelSafeZone();
    const popup = document.querySelector<HTMLElement>("[data-moreflyout-content]");
    if (!popup) {
      scheduleClose();
      return;
    }
    const rect = popup.getBoundingClientRect();
    const start = { x: event.clientX, y: event.clientY };
    if (start.x >= rect.left) {
      scheduleClose();
      return;
    }
    const topLeft = { x: rect.left, y: rect.top - 8 };
    const bottomLeft = { x: rect.left, y: rect.bottom + 8 };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const point = { x: moveEvent.clientX, y: moveEvent.clientY };
      if (point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom) {
        cancelSafeZone();
      } else if (!isPointInsideTriangle(point, start, topLeft, bottomLeft)) {
        cancelSafeZone();
        scheduleClose();
      }
    };
    const timeout = window.setTimeout(() => {
      cancelSafeZone();
      scheduleClose();
    }, 500);
    window.addEventListener("mousemove", onMouseMove);
    safeZoneCleanupRef.current = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.clearTimeout(timeout);
    };
  };

  return { cancelClose, cancelSafeZone, closeMore, open, scheduleClose, scheduleOpen, setOpen, startSafeZoneClose };
}

function isPointInsideTriangle(point: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  const cross = (p1: typeof point, p2: typeof point, p3: typeof point) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const ab = cross(point, a, b);
  const bc = cross(point, b, c);
  const ca = cross(point, c, a);
  return (ab >= 0 && bc >= 0 && ca >= 0) || (ab <= 0 && bc <= 0 && ca <= 0);
}

function MoreFlyoutButton({
  activeItem,
  text,
  onMouseEnter,
  onMouseLeave,
  onPointerDownCapture,
  open,
}: {
  activeItem?: SidebarNavItem;
  text: ShellText;
  onMouseEnter: () => void;
  onMouseLeave: (event: ReactMouseEvent<HTMLElement>) => void;
  onPointerDownCapture: (event: ReactPointerEvent<HTMLElement>) => void;
  open: boolean;
}) {
  const label = activeItem ? navLabel(activeItem, text) : text.more;
  return (
    <LegacyDropdownMenu.Trigger
      className="group relative flex h-[var(--df-row-h)] w-full shrink-0 items-center gap-[var(--df-row-gap)] rounded-[var(--df-radius-pill)] border-none px-[var(--df-row-px)] text-left text-[length:var(--df-row-font)] text-text-300 hover:bg-[var(--df-hover)] focus-within:bg-[var(--df-hover)] data-[selected=focused]:bg-bg-200 data-[selected=focused]:text-text-000 data-[selected=open]:bg-bg-200 data-[menu-open=true]:bg-[var(--df-hover)] [&_.df-leading-slot]:text-text-300 data-[selected=focused]:[&_.df-leading-slot]:text-text-000 hide-focus-ring focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--accent-100)),0_0_6px_0_hsl(var(--accent-100)/0.2)]"
      data-row=""
      data-row-main-button=""
      data-menu-open={!activeItem && open || undefined}
      data-selected={activeItem ? "focused" : undefined}
      aria-expanded={open}
      aria-label={activeItem ? navLabel(activeItem, text) : text.more}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerDownCapture={onPointerDownCapture}
      type="button"
    >
      <span className="df-leading-slot relative"><Icon name="CaretDown" size="sm" className={activeItem ? undefined : "opacity-50"} /></span>
      <span className="flex min-w-0 flex-1 items-center"><span className={activeItem ? undefined : "text-text-400"}>{label}</span></span>
    </LegacyDropdownMenu.Trigger>
  );
}

function MoreFlyoutContent({ items, onCustomizeSidebar, onNavigate, text }: {
  items: SidebarNavItem[];
  onCustomizeSidebar: () => void;
  onNavigate: (href: string) => void;
  text: ShellText;
}) {
  return (
    <>
      {items.map((item) => <MoreFlyoutItem item={localizeNavItem(item, text)} key={item.key} onClick={() => onNavigate(item.href)} />)}
      {items.length > 0 ? <LegacyDropdownSeparator /> : null}
      <MoreFlyoutItem icon="Settings" label={text.customizeSidebar} onClick={onCustomizeSidebar} />
    </>
  );
}

function MoreFlyoutItem({ icon, item, label, onClick }: { icon?: string; item?: SidebarNavItem; label?: string; onClick: () => void }) {
  const iconName = item?.icon ?? icon ?? "settings";
  const text = item?.label ?? label ?? "";
  return (
    <LegacyDropdownItem icon={<Icon name={iconName} />} onSelect={onClick}>
      {text}
    </LegacyDropdownItem>
  );
}

export function localizeNavItem(item: SidebarNavItem, text: ShellText): SidebarNavItem {
  return { ...item, label: navLabel(item, text) };
}

function navLabel(item: SidebarNavItem, text: ShellText) {
  if (item.key === "new-session") return item.visibleIn.includes("code") && !item.visibleIn.includes("cowork") ? text.newChat : text.newTask;
  if (item.key === "projects") return text.projects;
  if (item.key === "scheduled") return text.scheduledTasks;
  if (item.key === "customize") return text.customize;
  return item.label;
}
