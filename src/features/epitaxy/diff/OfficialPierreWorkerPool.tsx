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

/**
 * Session-root Pierre worker pool for Code Diff (`@pierre/diffs` only).
 * - host + worker from the same npm package (no ion `DlxMyTNL` mix)
 * - poolSize: clamp(hardwareConcurrency/2, 2, 6)
 * - highlighterOptions: `{ theme, lineDiffType: "word-alt" }`
 * - Provider value stays undefined until initialize() resolves
 */
import pierreWorkerPortableUrl from "@pierre/diffs/worker/worker-portable.js?url";

const POOL_SIZE = Math.max(
  2,
  Math.min(6, Math.floor((typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4) / 2)),
);

/** Official code-theme storage keys (cb4f243f3 `epitaxy:codeThemeLight` / `epitaxy:codeThemeDark`). */
const CODE_THEME_LIGHT_KEY = "epitaxy:codeThemeLight";
const CODE_THEME_DARK_KEY = "epitaxy:codeThemeDark";

/**
 * Official theme pair shape after `const { theme } = B()` / `ae()` / `md()`:
 * `{ light: claude-light, dark: claude-dark | claude-darker }`.
 * Passed as FileDiff `options.theme` and WorkerPool `setRenderOptions({ theme })`.
 */
export type OfficialPierreThemePair = {
  light: typeof OFFICIAL_CLAUDE_THEME_NAMES.light;
  dark: typeof OFFICIAL_CLAUDE_THEME_NAMES.dark | typeof OFFICIAL_CLAUDE_THEME_NAMES.darker;
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
  // Drop any prior singleton that may have been created with pierre-light defaults.
  terminateWorkerPoolSingleton();
  // Official SharedHighlight.registerCustomTheme (cb4f243f3 `a(c|p|d, …)`).
  registerCustomTheme(OFFICIAL_CLAUDE_THEME_NAMES.light, () => Promise.resolve(OFFICIAL_CLAUDE_LIGHT_THEME));
  registerCustomTheme(OFFICIAL_CLAUDE_THEME_NAMES.dark, () => Promise.resolve(OFFICIAL_CLAUDE_DARK_THEME));
  registerCustomTheme(OFFICIAL_CLAUDE_THEME_NAMES.darker, () => Promise.resolve(OFFICIAL_CLAUDE_DARKER_THEME));
}

/**
 * Package worker-portable uses relative dynamic imports — serve via Vite URL
 * (not blob:) so `./wasm-*` / `./core.js` resolve next to the worker module.
 */
function resolvePackageWorkerUrl(): string {
  return new URL(pierreWorkerPortableUrl, window.location.href).href;
}

function readStoredThemeName(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Official `md()` / `B()` theme pair:
 * light from epitaxy:codeThemeLight (default claude-light);
 * dark from epitaxy:codeThemeDark (claude-dark → claude-darker when darker-code path).
 */
export function useOfficialPierreTheme(): OfficialPierreThemePair {
  return useMemo(() => {
    const light = OFFICIAL_CLAUDE_THEME_NAMES.light;
    const darkRaw = readStoredThemeName(CODE_THEME_DARK_KEY, OFFICIAL_CLAUDE_THEME_NAMES.dark);
    let dark: OfficialPierreThemePair["dark"] =
      darkRaw === OFFICIAL_CLAUDE_THEME_NAMES.darker
        ? OFFICIAL_CLAUDE_THEME_NAMES.darker
        : OFFICIAL_CLAUDE_THEME_NAMES.dark;
    // Official B(): if stored dark is claude-dark and darker-code path, use claude-darker.
    if (
      dark === OFFICIAL_CLAUDE_THEME_NAMES.dark &&
      typeof document !== "undefined" &&
      document.querySelector(".dframe-root[data-darker-code]") != null
    ) {
      dark = OFFICIAL_CLAUDE_THEME_NAMES.darker;
    }
    void readStoredThemeName(CODE_THEME_LIGHT_KEY, light);
    // Keep dataset attributes for official CSS that keys off data-code-theme-*.
    if (typeof document !== "undefined") {
      document.documentElement.dataset.codeThemeLight = light;
      document.documentElement.dataset.codeThemeDark = dark;
    }
    return { light, dark };
  }, []);
}

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
          theme: OFFICIAL_PIERRE_THEME,
          lineDiffType: "word-alt",
        };
        const workerUrl = resolvePackageWorkerUrl();
        const manager = getOrCreateWorkerPoolSingleton({
          poolOptions: {
            poolSize: POOL_SIZE,
            workerFactory: () => new Worker(workerUrl, { type: "module" }),
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
        setPool(manager);
      } catch (error) {
        if (!cancelled) {
          console.error("[OfficialPierreWorkerPool]", error);
        }
      }
    })();

    return () => {
      cancelled = true;
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
