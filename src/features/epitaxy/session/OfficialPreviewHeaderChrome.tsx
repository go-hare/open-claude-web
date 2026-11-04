/**
 * Official cf580 Preview header: Globe `jr`, address `ta`, trailing `Ko` + overflow `Q`.
 */
import { useState } from "react";
import { OfficialButton, OfficialDropdownButton, type OfficialDropdownItem } from "../OfficialEpitaxyComponents";
import { PREVIEW_EMPTY_MESSAGES } from "../officialCodeChromeMessages";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { useOfficialPreviewChrome, type OfficialPreviewViewport } from "./officialPreviewChrome";

const VIEWPORT_PRESETS: OfficialPreviewViewport[] = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
];

export function OfficialPreviewGlobeMenu({ chrome }: { chrome: Record<string, string> }) {
  const live = useOfficialPreviewChrome();
  const serverItems: OfficialDropdownItem[] =
    live.servers.length > 0
      ? live.servers.map((row) => ({
          checked: row.running,
          keepOpen: true,
          label: row.label,
          subtitle: row.starting ? "Starting…" : row.running ? row.detail : row.detail,
          onSelect: () => {
            if (row.running) {
              const id = row.id.startsWith("srv:") ? row.id.slice(4) : "";
              if (id) live.onStopServer(id);
              return;
            }
            live.onRunServer(row.label);
          },
        }))
      : live.canAddServer
        ? []
        : [{ disabled: true, label: chrome.noDevServerConfigured }];
  const settingsItems: OfficialDropdownItem[] = [
    ...(live.canToggleLogs
      ? [
          {
            label: live.logsExpanded ? chrome.hideDevServerLogs : chrome.showDevServerLogs,
            onSelect: live.onToggleLogs,
          },
        ]
      : []),
    ...(live.canManageAllowedSites
      ? [{ label: chrome.manageAllowedSites, onSelect: live.onAllowedSites }]
      : []),
    ...(live.canSetLinkDestination
      ? [{ label: chrome.setLinkDestination, onSelect: live.onSetLinkDestination }]
      : []),
    ...(live.canAutoVerify
      ? [
          {
            label: live.autoVerify ? chrome.disableAutoVerify : chrome.enableAutoVerify,
            onSelect: live.onAutoVerify,
          },
        ]
      : []),
  ];
  const htmlItems: OfficialDropdownItem[] = [
    ...live.htmlFileItems.map((row) => ({
      checked: row.selected,
      icon: "Code",
      label: row.label,
      onSelect: () => live.onOpenHtmlFile(row.path),
      subtitle: row.hint,
    })),
    // Official TI `$`: always push Open file… (`2BiPVis9sL`); T() no-ops without cwd/pickHtmlFile.
    { icon: "Folder1Open", label: chrome.openFileEllipsis ?? chrome.openHtmlFile, onSelect: live.onOpenHtml },
  ];
  const extraSections = [
    ...(htmlItems.length > 0 ? [{ items: htmlItems }] : []),
    ...(settingsItems.length > 0 ? [{ header: chrome.settings, items: settingsItems }] : []),
    ...(live.canAddServer ? [{ items: [{ label: chrome.addServer, onSelect: live.onAddServer }] }] : []),
  ];
  return (
    <OfficialDropdownButton
      align="start"
      ariaLabel={chrome.serversAndSettings}
      extraSections={extraSections.length > 0 ? extraSections : undefined}
      header={chrome.servers}
      icon="Globe"
      items={serverItems}
      preferFont
      revealChevron="never"
      side="bottom"
      tooltip={chrome.serversAndSettings}
      tooltipSide="bottom"
      variant="ghost"
    />
  );
}

export function OfficialPreviewAddressBar() {
  const live = useOfficialPreviewChrome();
  const chrome = useI18nText(PREVIEW_EMPTY_MESSAGES);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const display = live.pageUrl;
  let host = chrome.enterAUrl;
  let path = "";
  try {
    if (display) {
      const parsed = new URL(display);
      host = parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
      path = `${parsed.pathname === "/" ? "" : parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    host = display || chrome.enterAUrl;
  }
  return (
    <div className="relative z-[1] flex min-w-0 flex-1 items-center draggable-none">
      {editing ? (
        <input
          aria-label={chrome.pageUrl}
          autoFocus
          className="mr-[calc(1.5rem*var(--cds-rem-scale,1))] flex h-[calc(1.5rem*var(--cds-rem-scale,1))] min-w-0 flex-1 rounded-[5px] bg-alpha-2 px-sm text-body text-primary outline-none hide-focus-ring shadow-focus"
          onBlur={() => setEditing(false)}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              live.onNavigate(draft);
              setEditing(false);
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setEditing(false);
            }
          }}
          spellCheck={false}
          value={draft}
        />
      ) : (
        <button
          aria-label={display ? `${chrome.pageUrl}: ${display}` : chrome.pageUrl}
          className="mr-[calc(1.5rem*var(--cds-rem-scale,1))] flex h-[calc(1.5rem*var(--cds-rem-scale,1))] min-w-0 flex-1 items-center overflow-hidden rounded-[5px] bg-transparent px-sm text-left text-body outline-none hide-focus-ring hover:bg-alpha-1"
          onClick={() => {
            setDraft(display);
            setEditing(true);
          }}
          type="button"
        >
          <span className="max-w-full shrink-0 truncate text-secondary">{host}</span>
          {path ? <span className="min-w-0 truncate text-muted">{path}</span> : null}
        </button>
      )}
    </div>
  );
}

function officialPreviewOverflowSections(
  chrome: Record<string, string>,
  live: ReturnType<typeof useOfficialPreviewChrome>,
) {
  const viewport = live.viewport;
  const pageTools: OfficialDropdownItem[] = [
    {
      disabled: !live.canOpenExternal,
      label: chrome.openInDefaultBrowser,
      onSelect: live.onOpenExternal,
      subtitle: live.canOpenExternal ? undefined : chrome.openExternalUnavailable,
    },
    {
      disabled: !live.canCopyUrl,
      label: chrome.copyUrl,
      onSelect: live.onCopyUrl,
      subtitle: live.canCopyUrl ? undefined : chrome.openExternalUnavailable,
    },
    {
      disabled: !live.canScreenshot,
      label: chrome.screenshot,
      onSelect: live.onScreenshot,
    },
    {
      disabled: !live.canAnnotate,
      label: chrome.showAnnotationTools,
      onSelect: live.onAnnotate,
    },
    ...(live.canOpenHtml ? [{ label: chrome.openHtmlFile, onSelect: live.onOpenHtml }] : []),
    ...(live.canExportHtml
      ? [
          {
            disabled: !live.hasPage,
            label: chrome.exportHtml,
            onSelect: live.onExportHtml,
          },
        ]
      : []),
    ...(live.canExport
      ? [
          {
            disabled: !live.hasPage,
            label: chrome.export,
            onSelect: live.onExport,
          },
        ]
      : []),
  ];
  const matches = (preset: OfficialPreviewViewport) =>
    viewport?.width === preset.width && viewport?.height === preset.height;
  const viewportItems: OfficialDropdownItem[] = [
    {
      checked: viewport === null,
      keepOpen: true,
      label: chrome.responsive,
      onSelect: () => live.onViewport(null),
    },
    ...VIEWPORT_PRESETS.map((preset, index) => ({
      checked: matches(preset),
      keepOpen: true,
      label: index === 0 ? chrome.mobile : chrome.tablet,
      onSelect: () => live.onViewport(preset),
      subtitle: `${preset.width} × ${preset.height}`,
    })),
    ...(viewport && !VIEWPORT_PRESETS.some(matches)
      ? [
          {
            checked: true,
            keepOpen: true,
            label: chrome.custom,
            onSelect: () => live.onViewport(viewport),
            subtitle: `${viewport.width} × ${viewport.height}`,
          },
        ]
      : []),
  ];
  const schemeItems: OfficialDropdownItem[] = [
    {
      checked: live.colorScheme === "light",
      keepOpen: true,
      label: chrome.colorSchemeLight,
      onSelect: () => live.onColorScheme("light"),
    },
    {
      checked: live.colorScheme === "dark",
      keepOpen: true,
      label: chrome.colorSchemeDark,
      onSelect: () => live.onColorScheme("dark"),
    },
    {
      checked: live.colorScheme === "system",
      keepOpen: true,
      label: chrome.colorSchemeSystem,
      onSelect: () => live.onColorScheme("system"),
    },
  ];
  const settingsItems: OfficialDropdownItem[] = [
    ...(live.canSetLinkDestination
      ? [
          {
            checked: live.linksInPreview,
            keepOpen: true,
            label: chrome.openLinksInPreview,
            onSelect: live.onToggleLinksInPreview,
          },
        ]
      : []),
    ...(live.canAutoVerify
      ? [
          {
            checked: live.autoVerify,
            keepOpen: true,
            label: chrome.autoVerifyChanges,
            onSelect: live.onAutoVerify,
          },
        ]
      : []),
    ...(live.canManageAllowedSites
      ? [{ label: chrome.manageAllowedSites, onSelect: live.onAllowedSites }]
      : []),
  ];
  const persistHint =
    live.previewStorage === "shared"
      ? chrome.persistSharedHint
      : live.previewStorage === "session"
        ? chrome.persistSessionHint
        : chrome.persistNoneHint;
  const cookieItems: OfficialDropdownItem[] = [
    ...(live.canSetPreviewStorage
      ? [
          {
            hint: persistHint,
            items: [
              {
                checked: live.previewStorage === "none",
                keepOpen: true,
                label: chrome.persistNone,
                onSelect: () => live.onPreviewStorage("none"),
                subtitle: chrome.persistNoneHint,
              },
              {
                checked: live.previewStorage === "shared",
                keepOpen: true,
                label: chrome.persistShared,
                onSelect: () => live.onPreviewStorage("shared"),
                subtitle: chrome.persistSharedHint,
              },
              {
                checked: live.previewStorage === "session",
                keepOpen: true,
                label: chrome.persistSession,
                onSelect: () => live.onPreviewStorage("session"),
                subtitle: chrome.persistSessionHint,
              },
            ],
            label: chrome.keepCookies,
          },
        ]
      : []),
    ...(live.canImportChromeLogins
      ? [{ label: chrome.importCookies, onSelect: live.onImportChromeLogins }]
      : []),
    ...(live.canUseImportedCookies
      ? [{ label: chrome.useImportedCookies, onSelect: live.onUseImportedCookies }]
      : []),
    ...(live.canClearBrowsingData
      ? [{ label: chrome.clearBrowsingData, onSelect: live.onClearBrowsingData, variant: "danger" as const }]
      : []),
  ];
  return [
    { items: pageTools },
    {
      items: [
        {
          disabled: !live.hasPage,
          items: viewportItems,
          label: chrome.viewport,
          subtitle: live.hasPage
            ? viewport
              ? `${viewport.width} × ${viewport.height}`
              : chrome.responsive
            : chrome.viewportUnavailable,
        },
        { items: schemeItems, label: chrome.colorScheme },
        ...(live.canToggleLogs
          ? [
              {
                label: live.logsExpanded ? chrome.hideDevServerLogs : chrome.showDevServerLogs,
                onSelect: live.onToggleLogs,
              },
            ]
          : []),
      ],
    },
    ...(settingsItems.length > 0 ? [{ items: settingsItems }] : []),
    ...(cookieItems.length > 0 ? [{ header: chrome.cookiesHeader, items: cookieItems }] : []),
  ];
}

export function OfficialPreviewTrailingChrome({
  chrome,
  paneSettings,
}: {
  chrome: Record<string, string>;
  paneSettings: string;
}) {
  const live = useOfficialPreviewChrome();
  const extraSections = officialPreviewOverflowSections(chrome, live);
  // Official cf580 `Ko` tools: `ko` back/forward (null when `ze` html-preview), `Bo` Cursor, `Wo` ArrowOutSquare, `Go` ArrowClockwise.
  // Official `Q` ⋮ is `Xr split:!0` (`data-preview-settings-menu`), not inside the Ko five.
  return (
    <div className="flex shrink-0 items-center gap-1">
      {live.isHtmlPreview ? null : (
        <span className="flex items-center gap-1">
          <OfficialButton
            ariaLabel={chrome.goBack}
            disabled={!live.canGoBack}
            icon="CaretLeft"
            onClick={live.onBack}
            preferFont
            tooltipSide="bottom"
            variant="ghost"
          />
          <OfficialButton
            ariaLabel={chrome.goForward}
            disabled={!live.canGoForward}
            icon="CaretRight"
            onClick={live.onForward}
            preferFont
            tooltipSide="bottom"
            variant="ghost"
          />
        </span>
      )}
      <OfficialButton
        ariaLabel={live.selectionOn ? chrome.exitSelectionMode : chrome.selectElement}
        disabled={!live.canSelect}
        icon="Cursor"
        onClick={live.onSelect}
        preferFont
        pressed={live.selectionOn}
        tooltipSide="bottom"
        variant="ghost"
      />
      <OfficialButton
        ariaLabel={chrome.openInDefaultBrowser}
        disabled={!live.canOpenExternal}
        icon="ArrowOutSquare"
        onClick={live.onOpenExternal}
        preferFont
        tooltipSide="bottom"
        variant="ghost"
      />
      <OfficialButton
        ariaLabel={chrome.reload}
        disabled={!live.canReload}
        icon="ArrowClockwise"
        onClick={live.onReload}
        preferFont
        tooltipSide="bottom"
        variant="ghost"
      />
      <div data-preview-settings-menu="">
        <OfficialDropdownButton
          align="end"
          ariaLabel={paneSettings}
          extraSections={extraSections}
          icon="DotsVertical"
          items={[]}
          preferFont
          revealChevron="never"
          tooltip={paneSettings}
          tooltipSide="bottom"
          variant="ghost"
        />
      </div>
    </div>
  );
}
