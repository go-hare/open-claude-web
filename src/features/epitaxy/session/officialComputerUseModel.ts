/**
 * Official Computer Use permission residual helpers.
 * Code Xt (c11959232): yk → wk; fo/Rge → po/Lge (Age); mo/Hge → ho/Vge.
 * Shared pure types — no UI.
 */

export type OfficialComputerUseTier = "click" | "full" | "read";

export type OfficialComputerUseApp = {
  alreadyGranted: boolean;
  isSentinel: boolean;
  proposedTier: OfficialComputerUseTier;
  requestedName: string;
  resolved?: {
    bundleId: string;
    displayName: string;
    iconDataUrl?: string;
  };
};

export type OfficialComputerUseFlags = {
  clipboardRead: boolean;
  clipboardWrite: boolean;
  systemKeyCombos: boolean;
};

export type OfficialComputerUseParsedInput = {
  apps: OfficialComputerUseApp[];
  autoUnhideEnabled: boolean;
  featureDisabled: boolean;
  reason?: string;
  requestedFlags: OfficialComputerUseFlags;
  screenshotFiltering?: string;
  tccState?: unknown;
  willHide: unknown[];
};

/** Official yk (c11959232): normal Code CU app card (wk). */
export function isOfficialComputerUseWkTool(
  toolName: string | undefined | null,
  input: Record<string, unknown> | undefined | null,
): boolean {
  if (!isOfficialComputerRequestAccessTool(toolName)) return false;
  const record = asRecord(input);
  return record.featureDisabled !== true && record.tccState === undefined;
}

/** Official Rge / fo — computer:request_access (Age via Lge when not yk). */
export function isOfficialComputerRequestAccessTool(toolName: string | undefined | null): boolean {
  return toolName === "computer:request_access";
}

/** Official Hge / mo — computer:request_teach_access. */
export function isOfficialComputerTeachAccessTool(toolName: string | undefined | null): boolean {
  return toolName === "computer:request_teach_access";
}

/**
 * Official Age residual (index-BELzQL5P):
 *   featureDisabled → Uge
 *   tccState → Fge
 *   else → Oge
 */
export function officialComputerAccessAgeKind(
  input: Record<string, unknown> | undefined | null,
): "computer-enable" | "computer-tcc" | "computer-access" {
  const record = asRecord(input);
  if (record.featureDisabled === true) return "computer-enable";
  if (record.tccState !== undefined) return "computer-tcc";
  return "computer-access";
}

export function parseOfficialComputerUseInput(
  input: Record<string, unknown> | undefined | null,
): OfficialComputerUseParsedInput {
  const record = asRecord(input);
  const flags = asRecord(record.requestedFlags);
  return {
    apps: parseComputerApps(record.apps),
    autoUnhideEnabled: record.autoUnhideEnabled === true,
    featureDisabled: record.featureDisabled === true,
    reason: typeof record.reason === "string" ? record.reason : undefined,
    requestedFlags: {
      clipboardRead: flags.clipboardRead === true,
      clipboardWrite: flags.clipboardWrite === true,
      systemKeyCombos: flags.systemKeyCombos === true,
    },
    screenshotFiltering: typeof record.screenshotFiltering === "string" ? record.screenshotFiltering : undefined,
    tccState: record.tccState,
    willHide: Array.isArray(record.willHide) ? record.willHide : [],
  };
}

/** Official wk / Oge allow payload: input + _cuGrants. */
export function buildOfficialComputerUseGrantsPayload(
  input: Record<string, unknown>,
  parsed: OfficialComputerUseParsedInput,
  options?: { includeFlags?: boolean },
): Record<string, unknown> {
  const grantedAt = Date.now();
  const granted: Array<{
    bundleId: string;
    displayName: string;
    grantedAt: number;
    tier: OfficialComputerUseTier;
  }> = [];
  const denied: Array<{ bundleId: string; reason: string }> = [];
  for (const app of parsed.apps) {
    if (app.alreadyGranted) continue;
    if (app.resolved) {
      granted.push({
        bundleId: app.resolved.bundleId,
        displayName: app.resolved.displayName,
        grantedAt,
        tier: app.proposedTier,
      });
    } else {
      denied.push({ bundleId: app.requestedName, reason: "not_installed" });
    }
  }
  const includeFlags = options?.includeFlags !== false;
  const flags = includeFlags
    ? {
        clipboardRead: parsed.requestedFlags.clipboardRead,
        clipboardWrite: parsed.requestedFlags.clipboardWrite,
        systemKeyCombos: parsed.requestedFlags.systemKeyCombos,
      }
    : { clipboardRead: false, clipboardWrite: false, systemKeyCombos: false };
  return {
    ...input,
    _cuGrants: { granted, denied, flags },
  };
}

/** Official Mk title for wk. */
export function officialComputerUseWkTitle(
  apps: OfficialComputerUseApp[],
  hasFlags: boolean,
): { kind: "single" | "multi" | "capabilities" | "computer"; app?: string; count?: number } {
  const pending = apps.filter((app) => !app.alreadyGranted);
  if (pending.length === 1 && !hasFlags) {
    return {
      kind: "single",
      app: pending[0].resolved?.displayName ?? pending[0].requestedName,
    };
  }
  if (pending.length > 1 && !hasFlags) {
    return { kind: "multi", count: pending.length };
  }
  if (pending.length > 0 || hasFlags) {
    return { kind: "capabilities" };
  }
  return { kind: "computer" };
}

/** Official bk tier label. */
export function officialComputerUseTierLabel(tier: OfficialComputerUseTier): string {
  switch (tier) {
    case "read":
      return "View only";
    case "click":
      return "Click only";
    case "full":
      return "Full control";
  }
}

/**
 * Official Wfe / Da sentinel kind (index-BELzQL5P zfe/Ffe/Ufe + Windows sets).
 * Used only when app.isSentinel for yellow footnote.
 */
export function officialComputerUseSentinelKind(
  bundleOrName: string | undefined | null,
): "shell" | "filesystem" | "system_settings" | null {
  if (!bundleOrName) return null;
  if (SHELL_BUNDLES.has(bundleOrName)) return "shell";
  if (FILESYSTEM_BUNDLES.has(bundleOrName)) return "filesystem";
  if (SYSTEM_SETTINGS_BUNDLES.has(bundleOrName)) return "system_settings";
  if (SHELL_PREFIXES.some((prefix) => bundleOrName.startsWith(prefix))) return "shell";
  if (SYSTEM_SETTINGS_PREFIXES.some((prefix) => bundleOrName.startsWith(prefix))) return "system_settings";
  const base = bundleOrName.toLowerCase().split(/[\\/]/).pop() ?? "";
  if (SHELL_EXES.has(base)) return "shell";
  if (FILESYSTEM_EXES.has(base)) return "filesystem";
  if (SYSTEM_SETTINGS_EXES.has(base)) return "system_settings";
  return null;
}

export function officialComputerUseSentinelLabel(
  kind: "shell" | "filesystem" | "system_settings" | null,
): string | null {
  if (kind === "shell") return "Can run commands on your computer";
  if (kind === "filesystem") return "Can access all your files";
  if (kind === "system_settings") return "Can change system settings";
  return null;
}

function parseComputerApps(value: unknown): OfficialComputerUseApp[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const app = asRecord(item);
    const resolved = asRecord(app.resolved);
    const requestedName = typeof app.requestedName === "string" ? app.requestedName : "";
    if (!requestedName) return [];
    const proposedTier: OfficialComputerUseTier =
      app.proposedTier === "read" || app.proposedTier === "click" ? app.proposedTier : "full";
    const bundleId = typeof resolved.bundleId === "string" ? resolved.bundleId : undefined;
    const displayName = typeof resolved.displayName === "string" ? resolved.displayName : undefined;
    return [{
      alreadyGranted: app.alreadyGranted === true,
      isSentinel: app.isSentinel === true,
      proposedTier,
      requestedName,
      resolved: bundleId && displayName
        ? {
            bundleId,
            displayName,
            iconDataUrl: typeof resolved.iconDataUrl === "string" ? resolved.iconDataUrl : undefined,
          }
        : undefined,
    }];
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const SHELL_BUNDLES = new Set([
  "com.apple.Terminal",
  "com.googlecode.iterm2",
  "com.microsoft.VSCode",
  "dev.warp.Warp-Stable",
  "com.github.wez.wezterm",
  "org.alacritty",
  "io.alacritty",
  "net.kovidgoyal.kitty",
  "co.zeit.hyper",
  "com.mitchellh.ghostty",
  "com.todesktop.230313mzl4w4u92",
  "com.vscodium",
  "com.exafunction.windsurf",
  "dev.zed.Zed",
  "org.tabby",
  "com.jetbrains.intellij",
  "com.jetbrains.pycharm",
]);
const FILESYSTEM_BUNDLES = new Set(["com.apple.finder"]);
const SYSTEM_SETTINGS_BUNDLES = new Set(["com.apple.systempreferences"]);
const SHELL_EXES = new Set([
  "cmd.exe",
  "powershell.exe",
  "pwsh.exe",
  "wt.exe",
  "windowsterminal.exe",
  "code.exe",
  "cursor.exe",
  "vscodium.exe",
  "windsurf.exe",
  "zed.exe",
  "alacritty.exe",
  "wezterm-gui.exe",
  "warp.exe",
  "hyper.exe",
  "tabby.exe",
  "idea64.exe",
  "pycharm64.exe",
  "conemu.exe",
  "conemu64.exe",
]);
const FILESYSTEM_EXES = new Set(["explorer.exe"]);
const SYSTEM_SETTINGS_EXES = new Set(["systemsettings.exe"]);
const SHELL_PREFIXES = [
  "Microsoft.WindowsTerminal_",
  "Microsoft.WindowsTerminalPreview_",
  "Microsoft.PowerShell_",
];
const SYSTEM_SETTINGS_PREFIXES = ["windows.immersivecontrolpanel_"];
