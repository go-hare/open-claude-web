/**
 * Official F5 / z5 (index-BELzQL5P.js) + hash M (cc011544b-CliL4MDd.js).
 * Modal deep-link is `#settings/{section}` on the current page, not a /settings route.
 */

export const SETTINGS_HASH_PREFIX = "#settings";

/** Official z5 — longest-prefix match in F5. */
export const SETTINGS_SECTION_IDS = [
  "general",
  "account",
  "data-privacy-controls",
  "members",
  "billing",
  "usage",
  "sys-prompt",
  "capabilities",
  "cardinal",
  "connectors",
  "claude-code",
  "cowork",
  "browser-extension",
  "ai-fluency",
  "import",
  "customize-skills",
  "customize-connectors",
  "customize-plugins",
  "desktop",
  "desktop/extensions",
  "desktop/developer",
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number];

export type ParsedSettingsPath = {
  section: string;
  subpath: string | undefined;
};

function stripSettingsPrefix(pathname: string): string {
  return pathname.replace(/^\/settings\/?/, "");
}

/** Official F5(e). Alias `/settings/privacy` → data-privacy-controls (product Zn id). */
export function parseSettingsPath(pathname: string): ParsedSettingsPath | null {
  const relative = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (relative === "/settings/privacy" || relative.startsWith("/settings/privacy/")) {
    const rest = relative.slice("/settings/privacy".length).replace(/^\//, "");
    return { section: "data-privacy-controls", subpath: rest || undefined };
  }
  if (!relative.startsWith("/settings")) return null;
  const t = stripSettingsPrefix(relative);
  if (t === "") return { section: "general", subpath: undefined };
  let matched: string | null = null;
  for (const id of SETTINGS_SECTION_IDS) {
    if ((t === id || t.startsWith(`${id}/`)) && (matched === null || id.length > matched.length)) {
      matched = id;
    }
  }
  if (matched === null) return null;
  return {
    section: matched,
    subpath: t.slice(matched.length).replace(/^\//, "") || undefined,
  };
}

/** Official M(hash): `#settings` / `#settings/general` → F5(`/${hash.slice(1)}`). */
export function parseSettingsHash(hash: string): ParsedSettingsPath | null {
  if (hash === SETTINGS_HASH_PREFIX || hash.startsWith(`${SETTINGS_HASH_PREFIX}/`)) {
    return parseSettingsPath(`/${hash.slice(1)}`);
  }
  return null;
}

export function settingsHashFor(section: string, subpath?: string): string {
  return `${SETTINGS_HASH_PREFIX}/${section}${subpath ? `/${subpath}` : ""}`;
}

export function settingsPathnameFor(section: string, subpath?: string): string {
  return `/settings/${section}${subpath ? `/${subpath}` : ""}`;
}
