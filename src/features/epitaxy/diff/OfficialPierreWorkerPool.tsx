import { registerCustomTheme } from "@pierre/diffs";
import {
  WorkerPoolContext,
  useWorkerPool,
  type WorkerInitializationRenderOptions,
} from "@pierre/diffs/react";
import {
  getOrCreateWorkerPoolSingleton,
  terminateWorkerPoolSingleton,
  type WorkerPoolManager,
} from "@pierre/diffs/worker";
import { useEffect, useInsertionEffect, useMemo, useState, type ReactNode } from "react";
import {
  OFFICIAL_CLAUDE_DARK_THEME,
  OFFICIAL_CLAUDE_DARKER_THEME,
  OFFICIAL_CLAUDE_LIGHT_THEME,
  OFFICIAL_CLAUDE_THEME_NAMES,
} from "./officialClaudeThemes";
import { officialEpitaxyEditorPrefsStore } from "./officialEpitaxyEditorPrefs";
import "./pierreTokenPaint"; // pad FileRenderer + mute Vite overlay before first File.render.

/**
 * Session-root Pierre worker pool for Code Diff (`@pierre/diffs` only).
 * - host + worker from the same npm package (no ion `DlxMyTNL` mix)
 * - poolSize: clamp(hardwareConcurrency/2, 2, 6)
 * - highlighterOptions: `{ theme, lineDiffType: "word-alt", preferredHighlighter: "shiki-js" }`
 * - Provider value stays undefined until initialize() resolves
 *
 * Worker entry is package `worker.js` (imports `shiki/core` etc.), bundled by Vite
 * via `?worker&url`. Official ion uses a self-contained portable blob
 * (`worker-portable-DlxMyTNL.js` via createObjectURL); the npm `worker.js` +
 * Vite transform is the same host/worker package path without mixing ion chunks.
 *
 * Note: FileRenderer.hydrate marks `highlighted:true` before worker tokens land;
 * consumers must pass `onPostRender: pierreTokenPaintOnPostRender` or tokens never paint.
 */
import pierreWorkerUrl from "@pierre/diffs/worker/worker.js?worker&url";

const POOL_SIZE = Math.max(
  2,
  Math.min(6, Math.floor((typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4) / 2)),
);

/**
 * Official theme pair after `E()` / `ae()` / `md()` (c5d464fa3):
 * `{ light, dark }` from epitaxy-editor-prefs (shared-14 R).
 * Passed as FileDiff `options.theme` and WorkerPool `setRenderOptions({ theme })`.
 */
export type OfficialPierreThemePair = {
  dark: string;
  light: string;
};

/** Official Th default pair (c119 Zh={theme:Th}). */
export const OFFICIAL_PIERRE_THEME: OfficialPierreThemePair = {
  light: OFFICIAL_CLAUDE_THEME_NAMES.light,
  dark: OFFICIAL_CLAUDE_THEME_NAMES.dark,
};

let providerMountCount = 0;
let customThemesRegistered = false;

function ensureOfficialClaudeThemesRegistered() {
  if (customThemesRegistered) return;
  customThemesRegistered = true;
  // Official SharedHighlight.registerCustomTheme (cb4f243f3 `a(c|p|d, …)`).
  // Must run before WorkerPoolManager.initialize resolves themes for host + workers.
  registerCustomTheme(OFFICIAL_CLAUDE_THEME_NAMES.light, () => Promise.resolve(OFFICIAL_CLAUDE_LIGHT_THEME));
  registerCustomTheme(OFFICIAL_CLAUDE_THEME_NAMES.dark, () => Promise.resolve(OFFICIAL_CLAUDE_DARK_THEME));
  registerCustomTheme(OFFICIAL_CLAUDE_THEME_NAMES.darker, () => Promise.resolve(OFFICIAL_CLAUDE_DARKER_THEME));
}

// Register at module evaluate so themeResolver has claude-* before any pool/File mounts.
ensureOfficialClaudeThemesRegistered();

/**
 * Vite `?worker&url` emits a module worker URL with shiki deps resolved.
 * Absolute-ize against the page origin for Electron http://127.0.0.1:5176.
 */
function resolvePackageWorkerUrl(): string {
  return new URL(pierreWorkerUrl, window.location.href).href;
}

/**
 * Official `E()` / `md()` theme pair from epitaxy-editor-prefs.
 * Darker-code path: stored claude-dark → claude-darker (B residual).
 */
export function useOfficialPierreTheme(): OfficialPierreThemePair {
  const light = officialEpitaxyEditorPrefsStore((state) => state.codeThemeLight);
  const darkRaw = officialEpitaxyEditorPrefsStore((state) => state.codeThemeDark);
  return useMemo(() => {
    let dark = darkRaw || OFFICIAL_CLAUDE_THEME_NAMES.dark;
    if (
      dark === OFFICIAL_CLAUDE_THEME_NAMES.dark &&
      typeof document !== "undefined" &&
      document.querySelector(".dframe-root[data-darker-code]") != null
    ) {
      dark = OFFICIAL_CLAUDE_THEME_NAMES.darker;
    }
    const resolvedLight = light || OFFICIAL_CLAUDE_THEME_NAMES.light;
    if (typeof document !== "undefined") {
      document.documentElement.dataset.codeThemeLight = resolvedLight;
      document.documentElement.dataset.codeThemeDark = dark;
    }
    return { light: resolvedLight, dark };
  }, [darkRaw, light]);
}

/**
 * Official c119 `sg` / `kI` residual:
 *   kI wraps the whole session shell with one `sg` (PierreWorkerPool).
 *   Mount count keeps the singleton alive across Code session switches —
 *   do NOT terminate+recreate on every panel remount (that caused ~1s+ longtasks).
 * getOrCreateWorkerPoolSingleton only constructs once; terminate only when
 * last provider unmounts (official `0===tg && mh()`).
 */
export function OfficialPierreWorkerPool({ children }: { children: ReactNode }) {
  const [pool, setPool] = useState<WorkerPoolManager | undefined>(undefined);
  const theme = useOfficialPierreTheme();

  useInsertionEffect(() => {
    providerMountCount += 1;
    return () => {
      providerMountCount -= 1;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    ensureOfficialClaudeThemesRegistered();

    void (async () => {
      try {
        const highlighterOptions: WorkerInitializationRenderOptions = {
          theme: {
            light: officialEpitaxyEditorPrefsStore.getState().codeThemeLight || OFFICIAL_PIERRE_THEME.light,
            dark: officialEpitaxyEditorPrefsStore.getState().codeThemeDark || OFFICIAL_PIERRE_THEME.dark,
          },
          lineDiffType: "word-alt",
          preferredHighlighter: "shiki-js",
        };
        const workerUrl = resolvePackageWorkerUrl();
        // Official: reuse singleton. Product invent terminate-before-create forced
        // full worker re-init on every EpitaxyChatPanel remount (session switch).
        const manager = getOrCreateWorkerPoolSingleton({
          poolOptions: {
            poolSize: POOL_SIZE,
            // Official: new Worker(blobUrl, { type: "module" }); Vite emits module worker URL.
            workerFactory: () => {
              const worker = new Worker(workerUrl, { type: "module" });
              worker.addEventListener("error", (event) => {
                console.error("[OfficialPierreWorkerPool] worker error", event.message, event.filename, event.lineno);
              });
              return worker;
            },
          },
          highlighterOptions,
        });
        const timedOut = await Promise.race([
          manager.initialize().then(() => false),
          new Promise<boolean>((resolve) => {
            window.setTimeout(() => resolve(true), 8000);
          }),
        ]);
        if (cancelled) return;
        if (timedOut) {
          if (providerMountCount === 0) terminateWorkerPoolSingleton();
          throw new Error("pierre-worker init timeout");
        }
        if (import.meta.env.DEV) {
          const stats = manager.getStats?.();
          console.info("[OfficialPierreWorkerPool] ready", stats ?? { poolSize: POOL_SIZE, workerUrl });
        }
        setPool(manager);
      } catch (error) {
        if (!cancelled) {
          console.error("[OfficialPierreWorkerPool]", error);
        }
      }
    })();

    return () => {
      cancelled = true;
      // Official: only drop singleton when no providers remain.
      if (providerMountCount === 0) terminateWorkerPoolSingleton();
    };
  }, []);

  useEffect(() => {
    if (!pool) return;
    void pool.setRenderOptions({ theme }).catch((error: unknown) => {
      console.error("[OfficialPierreWorkerPool] setRenderOptions", error);
    });
  }, [pool, theme]);

  return <WorkerPoolContext.Provider value={pool}>{children}</WorkerPoolContext.Provider>;
}

export { useWorkerPool };
