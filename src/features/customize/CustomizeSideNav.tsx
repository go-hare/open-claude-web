import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { desktopBridge } from "../../adapters/desktopBridge";
import { Icon } from "../../shell/icons";
import { readPersistedFrameMode } from "../../stores/frameStoreHelpers";
import { LOCAL_PLUGINS_VISIBLE, PLUGINS_SECTION_ENABLED, SKILLS_ENABLED } from "./customizeGates";
import { FolderPill } from "./FolderPill";
import { PluginsSidebarSection } from "./plugins/PluginsSidebarSection";
import { getSelectedFolder, setSelectedFolder, subscribeSelectedFolder } from "./selectedFolderStore";
import { SkillDocumentIcon } from "./skills/SkillDocumentIcon";

type CustomizeSideNavProps = {
  activePath: string;
  /** Official H6t back target: cowork → /task/new, code → /code. */
  backHref: string;
  onBrowsePlugins: () => void;
  onCreateWithClaude?: () => void;
  onNavigate: (path: string) => void;
  onUploadPlugin?: () => void;
};

/**
 * Official E7t unframed customize sidebar (index-BELzQL5P ~269274):
 * nav w-[256px], back/title, KK folder pill, Skills(QZ)+Vv, Connectors+Ky, o7t plugins.
 */
export function CustomizeSideNav({
  activePath,
  backHref,
  onBrowsePlugins,
  onCreateWithClaude,
  onNavigate,
  onUploadPlugin,
}: CustomizeSideNavProps) {
  // Official KK: code / epitaxy mode shows project folder control (vK.selectedFolder + V6t).
  const isCodeMode = readPersistedFrameMode() === "code";
  const selectedFolder = useSyncExternalStore(subscribeSelectedFolder, getSelectedFolder, () => null);

  const browseFolder = useCallback(async () => {
    // Official E7t: bT.browseFolder("Select a project folder") → setSelectedFolder.
    // Local shell: Preferences.getDirectoryPath (same host picker used by Ikt/scheduled).
    const paths = await desktopBridge.Preferences.getDirectoryPath?.(false).catch(() => null);
    if (paths?.[0]) {
      setSelectedFolder(paths[0]);
      return;
    }
    const workspace = await desktopBridge.Preferences.getWorkspaceContext().catch(() => null);
    if (workspace?.cwd) setSelectedFolder(workspace.cwd);
  }, []);

  return (
    <nav className="flex flex-col h-full shrink-0 overflow-hidden border-r border-border-300 bg-bg-100 w-[256px]">
      <div className="flex items-center gap-2 py-3 px-4">
        <button
          type="button"
          aria-label="Back"
          onClick={() => onNavigate(backHref)}
          className="cds-reset inline-flex size-8 items-center justify-center rounded-lg text-text-300 hover:bg-bg-300 hover:text-text-100 focus-visible:shadow-focus"
        >
          <Icon name="arrowLeft" />
        </button>
        <span className="font-large-bold">自定义</span>
      </div>

      {isCodeMode ? (
        <div className="pb-2 px-3">
          {selectedFolder ? (
            <FolderPill folderPath={selectedFolder} onClick={() => void browseFolder()} className="w-full" />
          ) : (
            <button
              type="button"
              onClick={() => void browseFolder()}
              className="cds-reset inline-flex h-8 w-full items-center justify-center rounded-lg border border-border-300 bg-bg-000 px-3 text-sm text-text-100 shadow-sm hover:bg-bg-100 focus-visible:shadow-focus"
            >
              选择文件夹
            </button>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-px flex-1 overflow-y-auto p-2">
        {SKILLS_ENABLED ? (
          <CustomizeNavButton
            active={activePath.startsWith("/customize/skills")}
            icon={<SkillDocumentIcon size={16} />}
            onClick={() => onNavigate("/customize/skills")}
          >
            Skills
          </CustomizeNavButton>
        ) : null}
        <CustomizeNavButton
          active={activePath.startsWith("/customize/connectors")}
          icon={<Icon name="connectors" customSize={16} />}
          onClick={() => onNavigate("/customize/connectors")}
        >
          Connectors
        </CustomizeNavButton>

        {PLUGINS_SECTION_ENABLED ? (
          <PluginsSidebarSection
            localPluginsVisible={LOCAL_PLUGINS_VISIBLE}
            onBrowsePlugins={onBrowsePlugins}
            onCreateWithClaude={onCreateWithClaude}
            onUploadPlugin={onUploadPlugin}
          />
        ) : null}
      </div>
    </nav>
  );
}

function CustomizeNavButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: string;
  /** Official I7t: icon is ReactNode (Vv/Ky size 16), not a string name. */
  icon: ReactNode;
  onClick: () => void;
}) {
  // Official I7t (~269519): flex items-center rounded-lg text-sm gap-3 px-4 py-1.5 + size-5 icon slot.
  const className = [
    "cds-reset flex items-center rounded-lg text-sm transition-all gap-3 px-4 py-1.5",
    active ? "bg-bg-300 text-text-100 font-semibold" : "text-text-100 hover:bg-bg-300",
  ].join(" ");

  return (
    <button type="button" onClick={onClick} className={className} aria-current={active ? "true" : undefined}>
      <span className="flex size-5 items-center justify-center">{icon}</span>
      <span>{children}</span>
    </button>
  );
}
