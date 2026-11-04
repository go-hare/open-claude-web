/**
 * Official c9a `ku` / `Cu` / `Su` / `Eu` file menus.
 * ku items: Attach, Copy path, Copy relative, Copy filename, then vu Open in submenu.
 * Cu is the same copy/attach set + Su (no ku extraSections).
 * Directory extra: Open in terminal (M1fJAb8qse) via ca0135 addTab + setSidePane.
 * Cu / Diff header do not use this extra.
 */
import { Fragment, useCallback, useContext, useMemo, type ReactNode } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import {
  BaseContextMenuItem,
  BaseContextMenuPopup,
  BaseContextMenuSeparator,
  BaseContextMenuSubmenu,
  ContextMenu,
} from "../../../shell/BaseMenu";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { useErrorsOptional } from "../../settings/errorsToast";
import { OfficialDropdownButton, type OfficialDropdownItem } from "../OfficialEpitaxyComponents";
import { SHOW_IN_FOLDER_MESSAGES, SIDE_PANE_CHROME_MESSAGES } from "../officialCodeChromeMessages";
import { officialShowInFolderLabel } from "./officialFilePreviewUtils";
import { EpitaxyTranscriptActionContext } from "./epitaxyTranscriptActionContext";
import { officialKuAbsPath, officialKuBasename, officialKuRelPath } from "./officialKuFileMenuPaths";
import { officialEpitaxyTerminalTabsStore } from "./officialEpitaxyTerminalTabsStore";
import { useOfficialCodeSessionBucket } from "./officialCodeSessionStore";
import { useOfficialSidePaneStoreApi } from "./officialSidePaneSessionStore";

export type OfficialKuMenuItem = {
  icon?: string;
  items?: OfficialKuMenuItem[];
  label: string;
  onSelect?: () => void;
  separatorBefore?: boolean;
};

export type OfficialKuMenuSection = {
  items: OfficialKuMenuItem[];
};

export function useOfficialKuFileMenu(input: {
  absPath: string;
  isDirectory?: boolean;
  line?: number;
  mentionPath?: string;
  relPath: string;
}): { extraSections: OfficialKuMenuSection[]; items: OfficialKuMenuItem[] } {
  const chrome = useI18nText(SIDE_PANE_CHROME_MESSAGES);
  const folderText = useI18nText(SHOW_IN_FOLDER_MESSAGES);
  const errors = useErrorsOptional();
  const actions = useContext(EpitaxyTranscriptActionContext);
  const bridge = actions?.bridge ?? desktopBridge.LocalSessions;
  const copyText = useCallback(
    (value: string) => {
      if (!value) return;
      void navigator.clipboard
        ?.writeText(value)
        .then(() => {
          errors?.addSuccess(chrome.copiedToClipboard);
        })
        .catch(() => undefined);
    },
    [chrome.copiedToClipboard, errors],
  );
  const attachPath = input.mentionPath || input.relPath;
  const canOpenInEditor = Boolean(bridge.openInEditor) && Boolean(input.absPath);
  const canShowInFolder = Boolean(desktopBridge.FileSystem.showInFolder) && Boolean(input.absPath);
  const folderLabel = officialShowInFolderLabel(folderText);
  const sidePaneStore = useOfficialSidePaneStoreApi();
  const extraSections = useMemo((): OfficialKuMenuSection[] => {
    if (!input.isDirectory) return [];
    const sessionId = actions?.sessionId;
    if (!sessionId || !bridge.startShellPty) return [];
    return [
      {
        items: [
          {
            icon: "TerminalOpenCommandLine",
            label: chrome.openInTerminal,
            onSelect: () => {
              officialEpitaxyTerminalTabsStore.getState().addTab(
                sessionId,
                input.absPath,
                officialKuBasename(input.absPath),
              );
              sidePaneStore.getState().setSidePane("terminal");
            },
          },
        ],
      },
    ];
  }, [
    actions?.sessionId,
    bridge.startShellPty,
    chrome.openInTerminal,
    input.absPath,
    input.isDirectory,
    sidePaneStore,
  ]);
  const items = useMemo(() => {
    const openInItems: OfficialKuMenuItem[] = [];
    if (canOpenInEditor) {
      openInItems.push({
        label: "Editor",
        onSelect: () => {
          void bridge.openInEditor?.(input.absPath, undefined, input.line);
        },
      });
    }
    if (canShowInFolder) {
      openInItems.push({
        label: folderLabel,
        onSelect: () => {
          void desktopBridge.FileSystem.showInFolder?.(input.absPath)?.catch(() => undefined);
        },
        separatorBefore: openInItems.length > 0,
      });
    }
    const next: OfficialKuMenuItem[] = [
      {
        label: chrome.attachAsContext,
        onSelect: () => {
          if (attachPath) actions?.insertFileMention?.(attachPath);
        },
      },
      {
        label: chrome.copyPath,
        onSelect: () => copyText(input.absPath),
      },
      {
        label: chrome.copyRelativePath,
        onSelect: () => copyText(input.relPath),
      },
      {
        label: chrome.copyFilename,
        onSelect: () => copyText(officialKuBasename(input.absPath)),
      },
    ];
    if (openInItems.length > 0) {
      next.push({
        label: chrome.openIn,
        separatorBefore: true,
        items: openInItems,
      });
    }
    return next;
  }, [
    actions,
    attachPath,
    bridge,
    canOpenInEditor,
    canShowInFolder,
    chrome.attachAsContext,
    chrome.copyFilename,
    chrome.copyPath,
    chrome.copyRelativePath,
    chrome.openIn,
    copyText,
    folderLabel,
    input.absPath,
    input.line,
    input.relPath,
  ]);
  return { extraSections, items };
}

export function OfficialKuContextMenuItems({
  extraSections = [],
  items,
  leadingItems = [],
}: {
  extraSections?: OfficialKuMenuSection[];
  items: OfficialKuMenuItem[];
  leadingItems?: OfficialKuMenuItem[];
}) {
  const rows = [...leadingItems, ...items];
  return (
    <>
      {rows.map((item, index) => (
        <OfficialKuContextMenuRow item={item} key={`ku-${index}`} />
      ))}
      {extraSections.map((section, sectionIndex) => (
        <Fragment key={`ku-extra-${sectionIndex}`}>
          {(rows.length > 0 || sectionIndex > 0) ? <BaseContextMenuSeparator /> : null}
          {section.items.map((item, index) => (
            <OfficialKuContextMenuRow item={item} key={`ku-extra-${sectionIndex}-${index}`} />
          ))}
        </Fragment>
      ))}
    </>
  );
}

function OfficialKuContextMenuRow({ item }: { item: OfficialKuMenuItem }) {
  if (item.items?.length) {
    return (
      <>
        {item.separatorBefore ? <BaseContextMenuSeparator /> : null}
        <BaseContextMenuSubmenu label={item.label}>
          {item.items.map((child, index) => (
            <OfficialKuContextMenuRow item={child} key={`ku-sub-${index}`} />
          ))}
        </BaseContextMenuSubmenu>
      </>
    );
  }
  return (
    <>
      {item.separatorBefore ? <BaseContextMenuSeparator /> : null}
      <BaseContextMenuItem onClick={item.onSelect}>{item.label}</BaseContextMenuItem>
    </>
  );
}

export function officialKuDropdownItems(items: OfficialKuMenuItem[]): OfficialDropdownItem[] {
  return items.map((item) => ({
    icon: item.icon,
    items: item.items ? officialKuDropdownItems(item.items) : undefined,
    label: item.label,
    onSelect: item.onSelect,
    separatorBefore: item.separatorBefore,
    type: item.items?.length ? "submenu" : undefined,
  }));
}

export function OfficialKuFileActionsOverflow({
  ariaLabel,
  extraSections,
  items,
}: {
  ariaLabel?: string;
  extraSections: OfficialKuMenuSection[];
  items: OfficialKuMenuItem[];
}) {
  const chrome = useI18nText(SIDE_PANE_CHROME_MESSAGES);
  return (
    <OfficialDropdownButton
      align="end"
      ariaLabel={ariaLabel ?? chrome.fileActions}
      extraSections={extraSections.map((section) => ({ items: officialKuDropdownItems(section.items) }))}
      icon="DotGrid3DotsVerticalTight"
      items={officialKuDropdownItems(items)}
      revealChevron="never"
      size="small"
    />
  );
}

/** Official Eu — markdown file-ref chip with Cu context menu. */
export function OfficialEuFileRef({
  children,
  className,
  fileRef,
  source,
}: {
  children: ReactNode;
  className: string;
  fileRef: { line?: number; path: string };
  source: string;
}) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const bucket = useOfficialCodeSessionBucket(actions?.sessionId);
  const cwd = bucket.session?.cwd;
  const absPath = officialKuAbsPath(cwd, fileRef.path);
  const relPath = officialKuRelPath(cwd, absPath) || fileRef.path;
  const ku = useOfficialKuFileMenu({
    absPath,
    line: fileRef.line,
    mentionPath: fileRef.path,
    relPath,
  });
  const onOpen = () => {
    window.dispatchEvent(
      new CustomEvent("epitaxy-open-file", {
        detail: { path: fileRef.path, line: fileRef.line },
      }),
    );
  };
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        render={(props) => (
          <button
            {...props}
            className={className}
            data-official-source={source}
            onClick={(event) => {
              props.onClick?.(event);
              onOpen();
            }}
            type="button"
          >
            {children}
          </button>
        )}
      />
      <BaseContextMenuPopup>
        <OfficialKuContextMenuItems extraSections={ku.extraSections} items={ku.items} />
      </BaseContextMenuPopup>
    </ContextMenu.Root>
  );
}
