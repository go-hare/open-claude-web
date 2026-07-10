import type { AppRoute } from "../app/routes";
import { useShellText } from "../i18n/shellMessages";
import type { FrameMode } from "../stores/frameStore";
import { NavItem } from "./NavItem";
import { SidebarMoreFlyout, localizeNavItem } from "./SidebarMoreFlyout";
import { moreNavItems, newSessionItemByMode, primaryNavItemsForMode } from "./sidebarData";

type SidebarNavProps = {
  currentRoute: AppRoute;
  hiddenKeys: Set<string>;
  mode: FrameMode;
  moreOpen: boolean;
  onCustomizeSidebar: () => void;
  onMoreOpenChange: (open: boolean) => void;
  onNavigate: (href: string) => void;
};

const isVisible = (mode: FrameMode) => (item: { visibleIn: FrameMode[] }) => item.visibleIn.includes(mode);

export function SidebarNav({ currentRoute, hiddenKeys, mode, moreOpen, onCustomizeSidebar, onMoreOpenChange, onNavigate }: SidebarNavProps) {
  const text = useShellText();
  const visiblePrimary = primaryNavItemsForMode(mode);
  const primary = visiblePrimary.filter((item) => !hiddenKeys.has(item.key));
  const more = [...moreNavItems.filter(isVisible(mode)), ...visiblePrimary.filter((item) => hiddenKeys.has(item.key))];
  const activeInMore = more.find((item) => item.key === currentRoute.navKey);
  const newSessionItem = localizeNavItem(newSessionItemByMode[mode], text);

  return (
    <div className="flex shrink-0 flex-col gap-px">
      <NavItem active={currentRoute.navKey === newSessionItem.key} item={newSessionItem} onNavigate={onNavigate} />
      {primary.map((item) => <NavItem active={currentRoute.navKey === item.key} item={localizeNavItem(item, text)} key={item.key} onNavigate={onNavigate} />)}
      {mode === "code" ? (
        <SidebarMoreFlyout
          activeItem={activeInMore}
          items={more}
          moreOpen={moreOpen}
          onCustomizeSidebar={onCustomizeSidebar}
          onMoreOpenChange={onMoreOpenChange}
          onNavigate={onNavigate}
          text={text}
        />
      ) : null}
      <div className="h-3 shrink-0" aria-hidden="true" />
    </div>
  );
}
