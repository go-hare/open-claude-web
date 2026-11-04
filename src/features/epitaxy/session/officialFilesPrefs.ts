/**
 * Official cccc `jC` Files ⋯ prefs (localStorage `Qr`/`ci`).
 * GB missing → show the row (screenshot 25 has the full list).
 */
export const EPITAXY_FILES_WORD_WRAP_KEY = "epitaxy-files-word-wrap";
const PREVIEW_TABS_KEY = "epitaxy-files-preview-tabs";
const AUTO_SAVE_KEY = "epitaxy-thimble";
const TAB_INDENTS_KEY = "epitaxy-files-tab-indents";
const INDENT_GUIDES_KEY = "epitaxy-files-indent-guides";
const SHOW_WHITESPACE_KEY = "epitaxy-files-show-whitespace";
const SCROLL_PAST_END_KEY = "epitaxy-files-scroll-past-end";
const TAB_SIZE_KEY = "epitaxy-files-tab-size";
export const OFFICIAL_FILES_TAB_SIZES = [2, 4, 8] as const;
const DEFAULT_TAB_SIZE = 4;

function readFlag(key: string, defaultOn: boolean): boolean {
  if (typeof window === "undefined") return defaultOn;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return defaultOn;
    return raw !== "false";
  } catch {
    return defaultOn;
  }
}

function writeFlag(key: string, enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, enabled ? "true" : "false");
  } catch {
    /* ignore */
  }
}

export function readOfficialFilesWordWrap(): boolean {
  return readFlag(EPITAXY_FILES_WORD_WRAP_KEY, true);
}

export function writeOfficialFilesWordWrap(enabled: boolean) {
  writeFlag(EPITAXY_FILES_WORD_WRAP_KEY, enabled);
}

export type OfficialFilesViewPrefs = {
  autoSave: boolean;
  indentGuides: boolean;
  previewTabs: boolean;
  scrollPastEnd: boolean;
  showWhitespace: boolean;
  tabIndents: boolean;
  tabSize: number;
  wordWrap: boolean;
};

export function readOfficialFilesViewPrefs(): OfficialFilesViewPrefs {
  let tabSize = DEFAULT_TAB_SIZE;
  if (typeof window !== "undefined") {
    try {
      const raw = Number(window.localStorage.getItem(TAB_SIZE_KEY));
      if (OFFICIAL_FILES_TAB_SIZES.includes(raw as (typeof OFFICIAL_FILES_TAB_SIZES)[number])) tabSize = raw;
    } catch {
      /* ignore */
    }
  }
  return {
    autoSave: readFlag(AUTO_SAVE_KEY, true),
    indentGuides: readFlag(INDENT_GUIDES_KEY, true),
    previewTabs: readFlag(PREVIEW_TABS_KEY, true),
    scrollPastEnd: readFlag(SCROLL_PAST_END_KEY, false),
    showWhitespace: readFlag(SHOW_WHITESPACE_KEY, false),
    tabIndents: readFlag(TAB_INDENTS_KEY, true),
    tabSize,
    wordWrap: readOfficialFilesWordWrap(),
  };
}

export function writeOfficialFilesViewPref<K extends keyof OfficialFilesViewPrefs>(
  key: K,
  value: OfficialFilesViewPrefs[K],
) {
  if (key === "tabSize") {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(TAB_SIZE_KEY, String(value));
    } catch {
      /* ignore */
    }
    return;
  }
  const map: Record<Exclude<keyof OfficialFilesViewPrefs, "tabSize">, string> = {
    autoSave: AUTO_SAVE_KEY,
    indentGuides: INDENT_GUIDES_KEY,
    previewTabs: PREVIEW_TABS_KEY,
    scrollPastEnd: SCROLL_PAST_END_KEY,
    showWhitespace: SHOW_WHITESPACE_KEY,
    tabIndents: TAB_INDENTS_KEY,
    wordWrap: EPITAXY_FILES_WORD_WRAP_KEY,
  };
  writeFlag(map[key], Boolean(value));
}

export function fileTabBasename(path: string): string {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return slash >= 0 ? path.slice(slash + 1) : path;
}
