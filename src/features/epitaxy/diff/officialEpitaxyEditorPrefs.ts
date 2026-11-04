/**
 * Official editor prefs (shared-14 R persist `epitaxy-editor-prefs`).
 * Fields: editorFont, codeThemeLight, codeThemeDark, chatTextSize, transcriptWidthChoice.
 * Legacy keys migrate once: LSS-epitaxy:editorFont / codeThemeLight / codeThemeDark, epitaxy.chatTextSize.
 */
import { createJSONStorage, persist } from "zustand/middleware";
import { create, type StoreApi, type UseBoundStore } from "zustand";

export type EditorSize = "s" | "m" | "l";

export type EpitaxyEditorPrefsState = {
  chatTextSize: EditorSize;
  codeThemeDark: string;
  codeThemeLight: string;
  editorFont: string;
  setChatTextSize: (value: EditorSize) => void;
  setCodeThemeDark: (value: string) => void;
  setCodeThemeLight: (value: string) => void;
  setEditorFont: (value: string) => void;
  setTranscriptWidth: (value: EditorSize | null) => void;
  transcriptWidthChoice: EditorSize | null;
};

const STORE_NAME = "epitaxy-editor-prefs";
const LEGACY_KEYS = {
  editorFont: "LSS-epitaxy:editorFont",
  codeThemeLight: "LSS-epitaxy:codeThemeLight",
  codeThemeDark: "LSS-epitaxy:codeThemeDark",
  chatTextSize: "epitaxy.chatTextSize",
} as const;

const PRODUCT_LEGACY_BAG = "editorPrefs";
const PRODUCT_LEGACY_EPITAXY_LIGHT = "epitaxy:codeThemeLight";
const PRODUCT_LEGACY_EPITAXY_DARK = "epitaxy:codeThemeDark";

function isSize(value: unknown): value is EditorSize {
  return value === "s" || value === "m" || value === "l";
}

function parseStoredString(raw: string | null): string | undefined {
  if (raw === null) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed && "value" in parsed && typeof (parsed as { value: unknown }).value === "string") {
      return (parsed as { value: string }).value;
    }
    if (typeof parsed === "string") return parsed;
  } catch {
    if (raw.length > 0) return raw;
  }
  return undefined;
}

function migrateLegacy(storage: Storage): Partial<EpitaxyEditorPrefsState> {
  const next: Partial<EpitaxyEditorPrefsState> = {};
  try {
    const chat = storage.getItem(LEGACY_KEYS.chatTextSize);
    if (isSize(chat)) next.chatTextSize = chat;
    const font = parseStoredString(storage.getItem(LEGACY_KEYS.editorFont));
    if (font !== undefined) next.editorFont = font;
    const light = parseStoredString(storage.getItem(LEGACY_KEYS.codeThemeLight));
    if (light !== undefined) next.codeThemeLight = light;
    const dark = parseStoredString(storage.getItem(LEGACY_KEYS.codeThemeDark));
    if (dark !== undefined) next.codeThemeDark = dark;

    const productBagRaw = storage.getItem(PRODUCT_LEGACY_BAG);
    if (productBagRaw) {
      try {
        const bag = JSON.parse(productBagRaw) as Record<string, unknown>;
        if (typeof bag.editorFont === "string" && next.editorFont === undefined) next.editorFont = bag.editorFont;
        if (typeof bag.codeThemeLight === "string" && next.codeThemeLight === undefined) next.codeThemeLight = bag.codeThemeLight;
        if (typeof bag.codeThemeDark === "string" && next.codeThemeDark === undefined) next.codeThemeDark = bag.codeThemeDark;
        if (isSize(bag.chatTextSize) && next.chatTextSize === undefined) next.chatTextSize = bag.chatTextSize;
        if (isSize(bag.transcriptWidthChoice) && next.transcriptWidthChoice === undefined) {
          next.transcriptWidthChoice = bag.transcriptWidthChoice;
        }
      } catch {
        /* ignore */
      }
    }
    const epitaxyLight = storage.getItem(PRODUCT_LEGACY_EPITAXY_LIGHT);
    if (epitaxyLight && next.codeThemeLight === undefined) next.codeThemeLight = epitaxyLight;
    const epitaxyDark = storage.getItem(PRODUCT_LEGACY_EPITAXY_DARK);
    if (epitaxyDark && next.codeThemeDark === undefined) next.codeThemeDark = epitaxyDark;
  } catch {
    /* ignore */
  }
  return next;
}

function mergePersisted(
  persisted: unknown,
  current: EpitaxyEditorPrefsState,
): EpitaxyEditorPrefsState {
  if (typeof persisted !== "object" || !persisted || Array.isArray(persisted)) return current;
  const bag = persisted as Record<string, unknown>;
  const widthFromChoice = isSize(bag.transcriptWidthChoice) ? bag.transcriptWidthChoice : null;
  const widthLegacy =
    "transcriptWidthChoice" in bag
      ? widthFromChoice
      : isSize(bag.transcriptWidth) && bag.transcriptWidth !== "m"
        ? bag.transcriptWidth
        : current.transcriptWidthChoice;
  return {
    ...current,
    editorFont: typeof bag.editorFont === "string" ? bag.editorFont : current.editorFont,
    codeThemeLight: typeof bag.codeThemeLight === "string" ? bag.codeThemeLight : current.codeThemeLight,
    codeThemeDark: typeof bag.codeThemeDark === "string" ? bag.codeThemeDark : current.codeThemeDark,
    chatTextSize: isSize(bag.chatTextSize) ? bag.chatTextSize : current.chatTextSize,
    transcriptWidthChoice: widthLegacy,
  };
}

const migrated =
  typeof window === "undefined" ? {} : migrateLegacy(window.localStorage);

export const officialEpitaxyEditorPrefsStore: UseBoundStore<StoreApi<EpitaxyEditorPrefsState>> = create<EpitaxyEditorPrefsState>()(
  persist(
    (set) => ({
      editorFont: migrated.editorFont ?? "",
      codeThemeLight: migrated.codeThemeLight ?? "claude-light",
      codeThemeDark: migrated.codeThemeDark ?? "claude-dark",
      chatTextSize: isSize(migrated.chatTextSize) ? migrated.chatTextSize : "m",
      transcriptWidthChoice: isSize(migrated.transcriptWidthChoice) ? migrated.transcriptWidthChoice : null,
      setEditorFont: (editorFont) => set({ editorFont }),
      setCodeThemeLight: (codeThemeLight) => set({ codeThemeLight }),
      setCodeThemeDark: (codeThemeDark) => set({ codeThemeDark }),
      setChatTextSize: (chatTextSize) => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(LEGACY_KEYS.chatTextSize, chatTextSize);
        }
        set({ chatTextSize });
      },
      setTranscriptWidth: (transcriptWidthChoice) => set({ transcriptWidthChoice }),
    }),
    {
      name: STORE_NAME,
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => mergePersisted(persisted, current),
      partialize: (state) => ({
        editorFont: state.editorFont,
        codeThemeLight: state.codeThemeLight,
        codeThemeDark: state.codeThemeDark,
        chatTextSize: state.chatTextSize,
        transcriptWidthChoice: state.transcriptWidthChoice,
      }),
    },
  ),
);

export function resolvedTranscriptWidth(choice: EditorSize | null): EditorSize {
  return choice ?? "s";
}

/** Official He / Ge fan-out onto html dataset for ion CSS. */
export function applyEpitaxyEditorPrefsDom(state: {
  chatTextSize: EditorSize;
  codeThemeDark: string;
  codeThemeLight: string;
  editorFont: string;
  transcriptWidthChoice: EditorSize | null;
}): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.chatTextSize = state.chatTextSize;
  root.dataset.codeThemeLight = state.codeThemeLight;
  root.dataset.codeThemeDark = state.codeThemeDark;
  const width = resolvedTranscriptWidth(state.transcriptWidthChoice);
  root.dataset.transcriptWidth = width;
  const widthRem = width === "l" ? "64rem" : width === "m" ? "48rem" : "36rem";
  root.style.setProperty("--transcript-width", widthRem);
  const font = state.editorFont.trim();
  if (font) {
    root.style.setProperty("--epitaxy-editor-font", font);
    root.style.setProperty("--font-mono-user", font);
    root.style.setProperty("--font-anthropic-mono", font);
  } else {
    root.style.removeProperty("--epitaxy-editor-font");
    root.style.removeProperty("--font-mono-user");
    root.style.removeProperty("--font-anthropic-mono");
  }
}

export function bootstrapEpitaxyEditorPrefsFromStorage(): void {
  applyEpitaxyEditorPrefsDom(officialEpitaxyEditorPrefsStore.getState());
}

officialEpitaxyEditorPrefsStore.subscribe((state) => {
  applyEpitaxyEditorPrefsDom(state);
});

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORE_NAME) void officialEpitaxyEditorPrefsStore.persist.rehydrate();
  });
  applyEpitaxyEditorPrefsDom(officialEpitaxyEditorPrefsStore.getState());
}
