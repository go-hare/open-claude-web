import { Icon } from "./icons";
import type { SidebarNavItem } from "./sidebarData";

type NavItemProps = {
  item: SidebarNavItem;
  active: boolean;
  onNavigate: (href: string) => void;
};

export function NavItem({ active, item, onNavigate }: NavItemProps) {
  // Official customize row wraps pC icon with group-hover rotate/scale (index-BELzQL5P ~338118).
  const leading =
    item.key === "customize" ? (
      <span className="flex items-center justify-center transition-all ease-in-out group-hover:-rotate-3 group-hover:scale-110 group-active:rotate-6 group-active:scale-[0.98]">
        <Icon name={item.icon} />
      </span>
    ) : (
      <Icon name={item.icon} />
    );

  return (
    <button
      className="group relative flex h-[var(--df-row-h)] w-full shrink-0 items-center gap-[var(--df-row-gap)] rounded-[var(--df-radius-pill)] border-none px-[var(--df-row-px)] text-left text-[length:var(--df-row-font)] text-text-300 hover:bg-[var(--df-hover)] focus-within:bg-[var(--df-hover)] data-[selected=focused]:bg-bg-200 data-[selected=focused]:text-text-000 data-[selected=open]:bg-bg-200 data-[menu-open=true]:bg-[var(--df-hover)] [&_.df-leading-slot]:text-text-300 data-[selected=focused]:[&_.df-leading-slot]:text-text-000 hide-focus-ring focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--accent-100)),0_0_6px_0_hsl(var(--accent-100)/0.2)]"
      data-row=""
      data-row-main-button=""
      data-selected={active ? "focused" : undefined}
      onClick={() => onNavigate(item.href)}
      type="button"
    >
      <span className="df-leading-slot">{leading}</span>
      <span className="flex min-w-0 flex-1 items-center">
        <span className="block w-full min-w-0 truncate">{item.label}</span>
      </span>
      {item.shortcut ? <span className="ml-auto shrink-0 text-footnote text-text-500">{item.shortcut}</span> : null}
    </button>
  );
}
