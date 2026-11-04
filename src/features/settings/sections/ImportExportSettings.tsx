/**
 * Official ImportSettingsClient Nt (c432d56b4-C5uhYadz.js).
 * Capabilities from HistoryImport.getImportCapabilities (shared-23 eL / QI).
 * Product host keeps every arm false — do not invent claude.ai OAuth / zip / remote-pull.
 * Export row only when sessionExport (official L).
 */
import { useQuery } from "@tanstack/react-query";
import { SettingsSection } from "../SettingsShell";
import { useI18nText, type MessageDescriptors } from "../../../i18n/footerMenuMessages";
import { historyImportBridge, type HistoryImportCapabilities } from "../settingsDesktopBridge";

const IMPORT_MESSAGES = {
  import: { defaultMessage: "Import", id: "9XUYQtJvwF" },
  notEnabled: {
    defaultMessage:
      "Import isn’t enabled for this deployment. Contact your organization’s administrator to turn it on.",
    id: "r3JVDltSqg",
  },
  hostLoopRequired: {
    defaultMessage:
      "Import needs host-loop mode. This app is configured for VM mode, so import isn’t available yet.",
    id: "Sz+4NInfBy",
  },
  export: { defaultMessage: "Export", id: "SVwJTM5AmL" },
  exportDescription: {
    defaultMessage:
      "Save this {platform}’s Cowork and Code sessions as a zip you can import on another computer. Terminal sessions aren’t included.",
    id: "g38fG0kjfx",
  },
  importHistory: { defaultMessage: "Import history", id: "EUNZRB0Gmy" },
  noImportsYet: { defaultMessage: "No imports yet", id: "dv4SpB8M8J" },
} as const satisfies MessageDescriptors;

const CAPABILITIES_OFF: HistoryImportCapabilities = {
  remotePull: false,
  remotePullConfigured: false,
  localZip: false,
  localSessions: false,
  sessionExport: false,
  hostLoopRequired: false,
  cliUpdateRequired: false,
  hasImportableSessions: false,
  local1PSessionCount: 0,
  promptBanner: "off",
};

export function ImportExportSettings() {
  const text = useI18nText(IMPORT_MESSAGES);
  const host = historyImportBridge();
  const capabilitiesQuery = useQuery({
    queryKey: ["history-import-capabilities"],
    queryFn: async () => {
      if (typeof host?.getImportCapabilities !== "function") return CAPABILITIES_OFF;
      return { ...CAPABILITIES_OFF, ...(await host.getImportCapabilities()) };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const historyQuery = useQuery({
    queryKey: ["history-import-history"],
    queryFn: async () => {
      if (typeof host?.getImportHistory !== "function") return [];
      return (await host.getImportHistory()) ?? [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const capabilities = capabilitiesQuery.data ?? CAPABILITIES_OFF;
  const history = historyQuery.data ?? [];
  const description = capabilities.hostLoopRequired
    ? text.hostLoopRequired
    : text.notEnabled;
  const showExport = !capabilities.hostLoopRequired && capabilities.sessionExport;
  const isMac =
    typeof navigator !== "undefined" && /Mac/i.test(navigator.platform || navigator.userAgent);
  const exportDescription = text.exportDescription.replace("{platform}", isMac ? "Mac" : "PC");

  return (
    <div className="flex flex-col gap-8">
      <SettingsSection description={description} title={text.import} />
      {showExport ? (
        <SettingsSection description={exportDescription} title={text.export} />
      ) : null}
      {history.length > 0 ? (
        <SettingsSection title={text.importHistory}>
          <p className="text-body text-muted">{text.noImportsYet}</p>
        </SettingsSection>
      ) : null}
    </div>
  );
}
