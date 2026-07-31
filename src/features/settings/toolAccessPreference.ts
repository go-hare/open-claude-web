/**
 * Tool access mode residual (official c71860c77 we / index S7):
 * - Account key: `tool_search_mode` = "on" | "off" (UI maps auto→on)
 * - "on"  → Load tools when needed (defer / tool-search path)
 * - "off" → Tools already loaded (eager connector tools in new conversations)
 *
 * Settings writes account.settings via PATCH; conversation paths + desktop
 * host-loop read this mirror without re-mounting full bootstrap.
 * Do not invent Anthropic cloud tool-search APIs — only gate local MCP load timing.
 */

export const TOOL_SEARCH_MODE_KEY = "settings:tool_search_mode";
export const TOOL_ACCESS_PREF_EVENT = "claude:tool-access-preference";

export type ToolSearchMode = "on" | "off";

/**
 * Official we(): "off" === (tool_search_mode ?? "auto") ? "off" : "on"
 * Missing / auto / unknown → "on" (load when needed).
 */
export function normalizeToolSearchMode(value: unknown): ToolSearchMode {
  return value === "off" ? "off" : "on";
}

export function readToolSearchMode(): ToolSearchMode {
  if (typeof window === "undefined") return "on";
  try {
    return normalizeToolSearchMode(window.localStorage.getItem(TOOL_SEARCH_MODE_KEY));
  } catch {
    return "on";
  }
}

export function writeToolSearchMode(mode: ToolSearchMode | string) {
  if (typeof window === "undefined") return;
  const next = normalizeToolSearchMode(mode);
  try {
    window.localStorage.setItem(TOOL_SEARCH_MODE_KEY, next);
  } catch {
    /* ignore quota */
  }
  try {
    window.dispatchEvent(new CustomEvent(TOOL_ACCESS_PREF_EVENT, { detail: { mode: next } }));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: TOOL_SEARCH_MODE_KEY,
        newValue: next,
      }),
    );
  } catch {
    /* ignore */
  }
}

/** Sync from account.settings bag (bootstrap load / PATCH). */
export function syncToolSearchModeFromSettings(
  settings: Record<string, unknown> | null | undefined,
) {
  if (!settings || !("tool_search_mode" in settings)) return;
  writeToolSearchMode(normalizeToolSearchMode(settings.tool_search_mode));
}

/** Pure residual for desktop/main without DOM: off = eager, else defer. */
export function isEagerConnectorToolLoad(mode: unknown): boolean {
  return normalizeToolSearchMode(mode) === "off";
}
