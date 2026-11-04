/**
 * Official Directory overlay (shared-19 PH + c99ed1520 Qi).
 * CDS Dialog.Popup vg size 2xl (`max-w-[1024px]`) + MH height
 * `h-[calc(100vh-5rem)] !max-h-[min(56rem,calc(100vh-5rem))]`.
 * Header CH: Title wraps `font-ui-serif font-medium` Directory + Close.
 * Not OfficialModal Tm (font-xl-bold / max-w-5xl / bg-bg-100).
 * Body: pluginSeed ? BrowsePluginsContent : LocalOrgPluginsContent.
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
import { Dialog } from "@base-ui-components/react/dialog";
import { Icon } from "../../../shell/icons";
import { useCustomizeText } from "../customizeMessages";
import { readResolvedColorMode, THEME_MODE_CHANGE_EVENT } from "../../settings/appearanceSettings";
import { CdsDialogBackdrop, CdsDialogCloseButton } from "../../settings/CdsDialog";
import { OfficialTextInput } from "../../shared/OfficialTextInput";
import { BrowsePluginsContent } from "./BrowsePluginsContent";
import { LocalOrgPluginsContent } from "./LocalOrgPluginsContent";
import {
  isDirectoryPath,
  officialDirectoryStore,
  useOfficialDirectoryStore,
} from "./officialDirectoryStore";

/** Official shared-frame vg Uh + popover Vh + size 2xl + shared-19 MH. */
const DIRECTORY_POPUP_CLASS = [
  "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
  "flex flex-col w-[calc(100vw-2rem)] max-w-[1024px]",
  "h-[calc(100vh-5rem)] !max-h-[min(56rem,calc(100vh-5rem))]",
  "rounded-card bg-surface-3 shadow-panel shadow-panel-lg",
  "cds-reset text-body font-normal text-primary outline-none",
  "transition-[opacity,scale] duration-base ease-out",
  "data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.98]",
  "data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.98]",
  "draggable-none z-modal",
].join(" ");

/** Official shared-frame Wh inner of vg Popup. */
const DIRECTORY_BODY_CLASS =
  "isolate flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[inherit] p-xl";

function useColorMode(): "light" | "dark" {
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
  return mode;
}

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
  const colorMode = useColorMode();
  const mode = colorMode === "dark" ? "dark" : "light";

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
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={isOpen}
    >
      <Dialog.Portal>
        <div className="cds-root" data-density="comfortable" data-mode={mode} data-official-source="shared-19:PH c99ed1520:Qi" data-platform="desktop">
          <CdsDialogBackdrop />
          <Dialog.Popup className={DIRECTORY_POPUP_CLASS} data-cds="Dialog" initialFocus={false}>
            <div className={DIRECTORY_BODY_CLASS}>
              <div className="mb-pad-md flex items-start gap-2">
                <div className="-mt-1 flex min-w-0 flex-1 flex-col gap-1">
                  <Dialog.Title className="break-words text-title font-semibold text-primary">
                    <span className="font-ui-serif font-medium">{text.directory}</span>
                  </Dialog.Title>
                </div>
                <CdsDialogCloseButton aria-label="Close" className="-me-pad-sm -mt-pad-sm" />
              </div>
              <div className="flex min-h-0 flex-1 gap-8" onKeyDown={onBodyKeyDown}>
                <aside className="w-[200px] shrink-0 pt-3">
                  <nav aria-label={text.directorySections} className="flex flex-col gap-1">
                    <DirectorySectionNavItem
                      icon={<Icon name="Plugin" size="md" />}
                      isActive={section === "plugins"}
                      onClick={() => onSectionClick("plugins")}
                    >
                      {text.plugins}
                    </DirectorySectionNavItem>
                  </nav>
                </aside>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 pt-2.5">
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
                  <div className="-mx-6 -my-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-2">
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
            </div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Official c99ed1520 Ki. */
function DirectorySectionNavItem({
  children,
  icon,
  isActive,
  onClick,
}: {
  children: ReactNode;
  icon: ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const className = [
    "flex items-center gap-3 rounded-lg px-4 py-1.5 text-sm",
    isActive ? "bg-fill-ghost-selected text-primary font-semibold" : "text-primary hover:bg-fill-ghost-hover",
  ].join(" ");
  return (
    <button
      aria-current={isActive ? "true" : undefined}
      className={className}
      onClick={onClick}
      type="button"
    >
      <span className="flex size-5 items-center justify-center">{icon}</span>
      <span>{children}</span>
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
