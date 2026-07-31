/**
 * Official code permission / effort options (c11959232).
 * Model list is NOT hardcoded Sonnet/Opus — use useCodeModelOptions() Ye("ccr_model")
 * from bag bootstrap (userData/configLibrary inferenceModels).
 */

import {
  formatCoworkModelDisplayName,
  normalizeSelectorModelValue,
} from "../../cowork/composer/useCoworkModelOptions";

/** @deprecated Prefer useCodeModelOptions().items — kept as Default-only fallback. */
export const codeModelOptions = [
  { label: "Default", value: "default" },
];

export const permissionModeOptions = [
  { label: "询问权限", value: "default" },
  { label: "接受编辑", value: "acceptEdits" },
  { label: "规划模式", value: "plan" },
  { label: "绕过权限", value: "bypassPermissions" },
];

/**
 * Official Os → planExitTrustMode / planExitAcceptOptions (c11959232 composer).
 * trust: auto if available else acceptEdits else default.
 * acceptOptions: acceptEdits / auto / bypassPermissions present in Os (not default/plan).
 */
export function officialAvailablePermissionModes(): string[] {
  return permissionModeOptions.map((option) => option.value);
}

export function officialPlanExitTrustMode(availableModes: string[] = officialAvailablePermissionModes()): string {
  if (availableModes.includes("auto")) return "auto";
  if (availableModes.includes("acceptEdits")) return "acceptEdits";
  return "default";
}

export function officialPlanExitAcceptOptions(availableModes: string[] = officialAvailablePermissionModes()): string[] {
  // Official ln: only modes present in Os — empty array is valid (Wk qk default only when prop undefined).
  const options: string[] = [];
  if (availableModes.includes("acceptEdits")) options.push("acceptEdits");
  if (availableModes.includes("auto")) options.push("auto");
  if (availableModes.includes("bypassPermissions")) options.push("bypassPermissions");
  return options;
}

/** Official Pk / bR effort ladder (c360a9e1c). Ultracode is session flag + catalog top, not a level id. */
export const effortLevelOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Extra high", value: "xhigh" },
  { label: "Max", value: "max" },
] as const;

export type OfficialEffortLevel = (typeof effortLevelOptions)[number]["value"];

const EFFORT_LEVEL_SET = new Set<string>(effortLevelOptions.map((o) => o.value));

const FULL_CLI_LADDER: OfficialEffortLevel[] = ["low", "medium", "high", "xhigh", "max"];
const GROK_CLI_LADDER: OfficialEffortLevel[] = ["low", "medium", "high"];
const DEEPSEEK_CLI_LADDER: OfficialEffortLevel[] = ["high", "max"];
const KIMI_K3_CLI_LADDER: OfficialEffortLevel[] = ["low", "high", "max"];

/**
 * CLI effortCatalog residual (claude-code-1 `effortCatalog.ts` longest-substring).
 * Used only when host has not yet returned get_settings.applied.effortLevels —
 * so UI never flashes invent Claude 5-stop on grok/deepseek.
 * When CLI returns, always prefer CLI list over this.
 */
export function cliEffortLevelsForModel(model?: string | null): OfficialEffortLevel[] {
  const id = (model ?? "").trim().toLowerCase();
  if (!id || id === "default") {
    // Unknown until sticky/CLI — conservative 3-stop (no invent xhigh/max).
    return [...GROK_CLI_LADDER];
  }
  // More specific matches first (same spirit as CLI longest-substring).
  if (id.includes("grok-4.5") || id.includes("grok")) return [...GROK_CLI_LADDER];
  if (id.includes("deepseek-v4") || id.includes("deepseek")) return [...DEEPSEEK_CLI_LADDER];
  if (id.includes("kimi-k3")) return [...KIMI_K3_CLI_LADDER];
  if (id.includes("kimi-k2.7") || id.includes("kimi-k2")) return ["high"];
  if (id.includes("claude") || id.includes("opus") || id.includes("sonnet") || id.includes("haiku")) {
    return [...FULL_CLI_LADDER];
  }
  // Unknown 3p id: do not invent Extra high / Max.
  return [...GROK_CLI_LADDER];
}

/**
 * Display ladder: CLI applied.effortLevels wins; else model residual of CLI catalog.
 * Never returns empty (slider needs ≥2 stops to open when + ultracode).
 */
export function resolveDisplayEffortLevels(
  cliLevels?: readonly string[] | null,
  model?: string | null,
): OfficialEffortLevel[] {
  if (cliLevels && cliLevels.length > 0) {
    const filtered = cliLevels.filter((v): v is OfficialEffortLevel => EFFORT_LEVEL_SET.has(v));
    if (filtered.length > 0) return filtered;
  }
  return cliEffortLevelsForModel(model);
}

/**
 * Wire effort for Ultracode / catalog top (CLI densable residual):
 * catalog last stop when present (grok → high; deepseek → max; Claude full → max/xhigh).
 */
export function catalogTopEffort(levels?: readonly string[] | null): OfficialEffortLevel {
  if (levels && levels.length > 0) {
    for (let i = levels.length - 1; i >= 0; i -= 1) {
      const level = levels[i];
      if (EFFORT_LEVEL_SET.has(level)) return level as OfficialEffortLevel;
    }
  }
  return "high";
}

/**
 * Clamp UI effort to catalog ladder. Invalid (e.g. xhigh on grok-4.5) → high if present, else top.
 */
export function clampEffortToCatalog(
  effort: string | undefined,
  levels?: readonly string[] | null,
): OfficialEffortLevel {
  const normalized = normalizeEffortValue(effort);
  if (!levels || levels.length === 0) {
    // Without ladder, still never paint invent xhigh as sticky default for 3p drafts.
    return normalized === "xhigh" || normalized === "max" ? "high" : normalized;
  }
  if (levels.includes(normalized)) return normalized as OfficialEffortLevel;
  if (levels.includes("high")) return "high";
  if (levels.includes("medium")) return "medium";
  const top = catalogTopEffort(levels);
  return levels.includes(top) ? top : (levels[levels.length - 1] as OfficialEffortLevel);
}

/** Official Ultracode help residual (ufa5QA7ilZ / txnCFU+qli). */
export const ULTRACODE_HELP = {
  title: "Ultracode",
  body: "Ultracode is top-catalog effort plus workflows. Most thorough, slowest, and heaviest on your limits. Applies to this chat only. New chats start without it.",
} as const;

export type OfficialEffortMenuItem = {
  accent?: boolean;
  checked: boolean;
  help?: { title: string; body: string };
  label: string;
  onSelect: () => void;
  value: string;
};

export function buildOfficialEffortMenuItems(options: {
  current: string;
  onSelect: (level: OfficialEffortLevel, ultracode: boolean) => void;
  ultracode: boolean;
  /** Official $ gate — show Ultracode stop when workflows + catalog-top path available. */
  showUltracode?: boolean;
  /**
   * Official get_settings.applied.effortLevels (CLI 2.7.16+) when host returned them.
   * Prefer CLI; if null, resolve via model using CLI catalog residual (no invent 5-stop flash).
   */
  effortLevels?: readonly string[] | null;
  /** Model id for provisional CLI catalog when effortLevels not yet from host. */
  model?: string | null;
}): OfficialEffortMenuItem[] {
  const showUltracode = options.showUltracode !== false;
  const levels = resolveDisplayEffortLevels(options.effortLevels, options.model);
  const allowed = new Set(levels);
  const ladder = effortLevelOptions.filter((o) => allowed.has(o.value));
  // Display current must be on the ladder — never leave a ghost xhigh "Extra high" when catalog is 3-stop.
  const current = clampEffortToCatalog(options.current, levels);
  const ultraTop = catalogTopEffort(levels);
  // Explicit OfficialEffortMenuItem[] — Ultracode is residual value "ultra" (not a ladder id).
  const items: OfficialEffortMenuItem[] = ladder.map((option) => ({
    label: option.label,
    value: option.value,
    checked: !options.ultracode && option.value === current,
    onSelect: () => options.onSelect(option.value, false),
  }));
  if (showUltracode) {
    items.push({
      label: "Ultracode",
      value: "ultra",
      accent: true,
      help: { title: ULTRACODE_HELP.title, body: ULTRACODE_HELP.body },
      checked: options.ultracode,
      // CLI residual: Ultracode = catalog top + workflows flag (NOT hard-coded xhigh).
      // grok-4.5 top is high; deepseek max; Claude full ladder xhigh/max.
      onSelect: () => options.onSelect(ultraTop, true),
    });
  }
  return items;
}

export function modelLabel(value: string, allowedValues: string[] = []) {
  const normalized = normalizeCodeModelValue(value, allowedValues);
  if (normalized === "default") return "Default";
  return formatCoworkModelDisplayName(normalized);
}

export function normalizeCodeModelValue(value?: string, allowedValues: string[] = []) {
  return normalizeSelectorModelValue(value, allowedValues);
}

export function formatClaudeModelLabel(value: string) {
  return formatCoworkModelDisplayName(value);
}

export function permissionModeLabel(value: string) {
  return permissionModeOptions.find((option) => option.value === value)?.label ?? value;
}

export function normalizeEffortValue(value?: string) {
  if (value === "ultracode") return "xhigh";
  return effortLevelOptions.some((option) => option.value === value) ? value! : "medium";
}

export function effortLevelLabel(value: string) {
  return effortLevelOptions.find((option) => option.value === value)?.label ?? value;
}

