/**
 * Official B8t / $8t DirectoryModal (index-BELzQL5P.js).
 * Tm: modalSize 2xl, fullHeight, hasCloseButton, overlayClassName grid-rows-1.
 * This ion-dist: PT/EI false → only Plugins I7t.
 * Body: official `d ? R8t : P8t` (pluginSeed ? BrowsePluginsContent : LocalOrgPluginsContent).
 */
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { Icon } from "../../../shell/icons";
import { useCustomizeText } from "../customizeMessages";
import { OfficialModal } from "../../shared/OfficialModal";
import { OfficialTextInput } from "../../shared/OfficialTextInput";
import { BrowsePluginsContent } from "./BrowsePluginsContent";
import { LocalOrgPluginsContent } from "./LocalOrgPluginsContent";
import {
  isDirectoryPath,
  officialDirectoryStore,
  useOfficialDirectoryStore,
} from "./officialDirectoryStore";

function DirectoryModalInner() {
  const isOpen = useOfficialDirectoryStore((state) => state.isOpen);
  const section = useOfficialDirectoryStore((state) => state.section);
  const itemId = useOfficialDirectoryStore((state) => state.itemId);
  const pluginSeed = useOfficialDirectoryStore((state) => state.pluginSeed);
  useOfficialDirectoryStore((state) => state.connectorAdminMode);
  useOfficialDirectoryStore((state) => state.connectorTypeFilter);
  const openCount = useOfficialDirectoryStore((state) => state.openCount);
  const close = useOfficialDirectoryStore((state) => state.close);
  const text = useCustomizeText();

  const [search, setSearch] = useState("");
  const drilledIn = itemId != null;

  useLayoutEffect(() => {
    if (isOpen) setSearch("");
  }, [isOpen, section, openCount]);

  const navigateToItem = useCallback((nextSection: string, nextItemId: string | null) => {
    const current = officialDirectoryStore.getState();
    if (!current.isOpen) return;
    if (current.section === nextSection && current.itemId === nextItemId) return;
    current.navigate(nextSection, nextItemId);
    const pathname = window.location.pathname;
    if (isDirectoryPath(pathname)) {
      const path = nextItemId
        ? `/directory/${nextSection}/${encodeURIComponent(nextItemId)}`
        : `/directory/${nextSection}`;
      window.history.replaceState({}, "", path);
      window.dispatchEvent(new Event("app:navigation"));
    }
  }, []);

  const navigateToSection = useCallback(
    (nextSection: string) => {
      navigateToItem(nextSection, null);
    },
    [navigateToItem],
  );

  // Official: plugins + itemId without pluginSeed snaps back to the list.
  useEffect(() => {
    if (pluginSeed) return;
    if (section !== "plugins") return;
    if (itemId == null) return;
    navigateToItem("plugins", null);
  }, [pluginSeed, section, itemId, navigateToItem]);

  useDirectoryOpenQueryParams();

  const wasOpen = useRef(isOpen);
  useEffect(() => {
    if (wasOpen.current && !isOpen) {
      const trigger = officialDirectoryStore.getState().triggerElement;
      if (trigger?.isConnected) {
        requestAnimationFrame(() => trigger.focus({ preventScroll: true }));
      }
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  const onClose = useCallback(() => {
    close();
    if (isDirectoryPath(window.location.pathname)) {
      window.history.replaceState({}, "", "/new");
      window.dispatchEvent(new Event("app:navigation"));
    }
  }, [close]);

  const onSectionClick = useCallback(
    (next: string) => {
      if (section === next) return;
      navigateToSection(next);
    },
    [navigateToSection, section],
  );

  const onBodyKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape" && drilledIn && event.currentTarget.contains(event.target as Node)) {
        event.preventDefault();
        event.stopPropagation();
        navigateToItem(section, null);
      }
    },
    [drilledIn, navigateToItem, section],
  );

  const searchPlaceholder = useMemo(() => {
    switch (section) {
      case "skills":
        return text.searchSkillsEllipsis;
      case "connectors":
        return text.searchConnectorsEllipsis;
      case "plugins":
      default:
        return text.searchPluginsEllipsis;
    }
  }, [section, text]);

  return (
    <OfficialModal
      ariaLabel={text.directory}
      className="!min-h-0 max-h-[min(56rem,100%)]"
      fullHeight
      hasCloseButton
      isOpen={isOpen}
      modalSize="2xl"
      onClose={onClose}
      overlayClassName="grid-rows-1 !overflow-hidden"
      title={
        <span className="font-ui-serif font-medium text-2xl text-text-100">{text.directory}</span>
      }
    >
      <div className="flex h-full min-h-0 gap-8" onKeyDown={onBodyKeyDown}>
        <aside className="w-[200px] shrink-0 pt-3">
          <nav aria-label={text.directorySections} className="flex flex-col gap-1">
            <DirectorySectionNavItem
              icon={<Icon customSize={16} name="plugin" />}
              isActive={section === "plugins"}
              onClick={() => onSectionClick("plugins")}
            >
              {text.plugins}
            </DirectorySectionNavItem>
          </nav>
        </aside>
        <div className="flex flex-1 flex-col gap-4 min-w-0 pt-2.5">
          {!drilledIn ? (
            <OfficialTextInput
              aria-label={text.searchDirectory}
              className="!py-0"
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && search) {
                  event.stopPropagation();
                  setSearch("");
                }
              }}
              placeholder={searchPlaceholder}
              prepend={<Icon className="text-text-500" customSize={16} name="Search" />}
              value={search}
            />
          ) : null}
          <div className="flex-1 overflow-y-auto min-h-0">
            {section === "plugins" ? (
              pluginSeed ? (
                <BrowsePluginsContent
                  drillDownPluginId={itemId}
                  initialConfig={pluginSeed}
                  isOpen={isOpen}
                  onClose={close}
                  onDrillDownChange={(id) => navigateToItem("plugins", id)}
                  searchQuery={search}
                />
              ) : (
                <LocalOrgPluginsContent
                  externalSearchQuery={search}
                  isOpen={isOpen}
                  onClose={close}
                />
              )
            ) : null}
          </div>
        </div>
      </div>
    </OfficialModal>
  );
}

/** Official I7t. */
function DirectorySectionNavItem({
  children,
  icon,
  iconOnly = false,
  isActive,
  onClick,
}: {
  children: ReactNode;
  icon: ReactNode;
  iconOnly?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const className = [
    "flex items-center rounded-lg text-sm transition-all",
    iconOnly ? "justify-center p-2" : "gap-3 px-4 py-1.5",
    isActive ? "bg-bg-300 text-text-100 font-semibold" : "text-text-100 hover:bg-bg-300",
  ].join(" ");
  return (
    <button
      aria-current={isActive ? "true" : undefined}
      className={className}
      onClick={onClick}
      type="button"
    >
      <span className="flex size-5 items-center justify-center">{icon}</span>
      <span className={iconOnly ? "sr-only" : undefined}>{children}</span>
    </button>
  );
}

/** Official directory-open / directory-uuid query bootstrap inside B8t. */
function useDirectoryOpenQueryParams() {
  const ran = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openFlag = params.get("directory-open");
    const uuid = params.get("directory-uuid");
    if (!openFlag || ran.current) return;
    ran.current = true;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("directory-open");
      url.searchParams.delete("directory-uuid");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    } catch {
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    }
    if (uuid) officialDirectoryStore.getState().openItem("connectors", uuid);
    else officialDirectoryStore.getState().open("connectors");
  }, []);
}

export const DirectoryModal = memo(DirectoryModalInner);
DirectoryModal.displayName = "DirectoryModal";
