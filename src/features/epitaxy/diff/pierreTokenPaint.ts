/**
 * Package `@pierre/diffs` 1.2.x FileRenderer / DiffHunksRenderer hydrate sets
 * `renderCache.highlighted = true` before the worker returns token AST.
 * `onHighlightSuccess` then skips `onRenderUpdate` when highlighted is already
 * true, so Read/Write/markdown/user previews stay plain forever.
 *
 * OfficialDiffFileRow already had this re-paint path for the side Diff pane.
 * Share it for every File / FileDiff / PatchDiff that freezes a worker manager.
 */

type PierreRenderCache = {
  result?: unknown;
  highlighted?: boolean;
};

type PierrePaintInstance = {
  rerender: () => void;
  fileRenderer?: { renderCache?: PierreRenderCache };
  hunksRenderer?: { renderCache?: PierreRenderCache };
};

type HostWithPaintState = HTMLElement & {
  __pierreTokenPaintTimer?: number;
  __pierreTokenPaintLastRerender?: number;
};

function resultHasDiffTokens(result: unknown): boolean {
  if (result == null) return false;
  try {
    return JSON.stringify(result).includes("--diffs-token");
  } catch {
    return false;
  }
}

function domHasDiffTokens(host: HTMLElement): boolean {
  const root = host.shadowRoot ?? host;
  const html = root.querySelector("[data-code]")?.innerHTML ?? root.innerHTML ?? "";
  return html.includes("--diffs-token");
}

function getRenderCaches(instance: PierrePaintInstance): PierreRenderCache[] {
  const caches: PierreRenderCache[] = [];
  if (instance.fileRenderer?.renderCache) caches.push(instance.fileRenderer.renderCache);
  if (instance.hunksRenderer?.renderCache) caches.push(instance.hunksRenderer.renderCache);
  return caches;
}

/**
 * File / FileDiff / PatchDiff `options.onPostRender`.
 * Polls until token CSS vars appear, force-clearing the false `highlighted`
 * flag so a subsequent `rerender()` applies the worker AST.
 */
export function pierreTokenPaintOnPostRender(
  node: HTMLElement,
  instance: { rerender: () => void },
  phase: string,
): void {
  const host = node as HostWithPaintState;
  const paintInstance = instance as PierrePaintInstance;

  if (phase === "unmount") {
    if (host.__pierreTokenPaintTimer != null) {
      window.clearInterval(host.__pierreTokenPaintTimer);
      host.__pierreTokenPaintTimer = undefined;
    }
    host.__pierreTokenPaintLastRerender = undefined;
    return;
  }

  if (domHasDiffTokens(host) || host.__pierreTokenPaintTimer != null) return;

  for (const cache of getRenderCaches(paintInstance)) {
    if (cache.highlighted && !resultHasDiffTokens(cache.result)) {
      cache.highlighted = false;
    }
  }

  const started = Date.now();
  const stop = () => {
    if (host.__pierreTokenPaintTimer != null) {
      window.clearInterval(host.__pierreTokenPaintTimer);
      host.__pierreTokenPaintTimer = undefined;
    }
  };

  const tick = () => {
    if (domHasDiffTokens(host)) {
      stop();
      return;
    }

    const caches = getRenderCaches(paintInstance);
    if (caches.some((cache) => resultHasDiffTokens(cache.result))) {
      const now = Date.now();
      if (
        host.__pierreTokenPaintLastRerender == null ||
        now - host.__pierreTokenPaintLastRerender > 80
      ) {
        host.__pierreTokenPaintLastRerender = now;
        instance.rerender();
      }
      return;
    }

    for (const cache of caches) {
      if (cache.highlighted && !resultHasDiffTokens(cache.result)) {
        cache.highlighted = false;
      }
    }

    // Give the worker enough time for cold language/theme load in Electron.
    if (Date.now() - started > 8000) stop();
  };

  host.__pierreTokenPaintTimer = window.setInterval(tick, 50);
  tick();
}
