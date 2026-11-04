/**
 * Package `@pierre/diffs` 1.2.x FileRenderer / DiffHunksRenderer hydrate sets
 * `renderCache.highlighted = true` before the worker returns token AST.
 * `onHighlightSuccess` then skips `onRenderUpdate` when highlighted is already
 * true, so Read/Write/markdown/user previews stay plain forever.
 *
 * OfficialDiffFileRow already had this re-paint path for the side Diff pane.
 * Share it for every File / FileDiff / PatchDiff that freezes a worker manager.
 *
 * Official ion File.render (`c64baa838`) catches processFileResult throws:
 * `console.error(e)` + `this.applyErrorToDOM(e, t)`. Vite turns that
 * `console.error(Error)` into an overlay — pad worker `code[]` so the throw
 * is rare; File.render wrapper still mutes that one console.error and calls
 * `applyErrorToDOM` when it exists on the instance (onPostRender is too late).
 */
import { File as PierreFile, FileDiff as PierreFileDiff, FileRenderer as PierreFileRenderer } from "@pierre/diffs";

type PierreRenderCache = {
  file?: { contents?: string };
  result?: unknown;
  highlighted?: boolean;
};

const EMPTY_LINE_HAST = {
  type: "element",
  tagName: "span",
  properties: { "data-line": "" },
  children: [{ type: "text", value: "" }],
};

type PierrePaintInstance = {
  constructor?: { prototype?: FileHostProto };
  rerender: () => void;
  fileRenderer?: {
    constructor?: { prototype?: FileRendererProto };
    renderCache?: PierreRenderCache;
  };
  hunksRenderer?: { renderCache?: PierreRenderCache };
};

type FileRendererProto = {
  __claudexLinePad?: boolean;
  getLineCount?: (file: { contents?: string }) => number;
  processFileResult?: (
    file: { contents?: string },
    range: { startingLine?: number; totalLines?: number },
    result: { code?: unknown[] },
  ) => unknown;
};

type FileHostInstance = {
  applyErrorToDOM?: (error: Error, container: unknown) => void;
  fileContainer?: unknown;
};

type FileHostProto = FileHostInstance & {
  __claudexRenderCatch?: boolean;
  render?: (this: FileHostInstance, ...args: unknown[]) => unknown;
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
 * Pierre FileRenderer.processFileResult throws "Line doesnt exist" when worker
 * `code[]` is shorter than splitFileContents(file). Do not force-rerender that.
 */
export function pierreHighlightedResultFitsFile(cache: PierreRenderCache): boolean {
  const result = cache.result;
  if (!result || typeof result !== "object") return true;
  const code = (result as { code?: unknown }).code;
  if (!Array.isArray(code)) return true;
  const contents = typeof cache.file?.contents === "string" ? cache.file.contents : "";
  const lines = contents !== "" ? contents.split(/(?<=\n)/) : [];
  const lastLine = lines.at(-1);
  const lastLineIndex =
    lastLine === "" || lastLine === "\n" || lastLine === "\r\n" || lastLine === "\r"
      ? Math.max(0, lines.length - 2)
      : Math.max(0, lines.length - 1);
  return lastLineIndex < code.length;
}

/** Pad worker `code[]` so FileRenderer.processFileResult does not throw (ion File.render catch). */
export function padPierreHighlightCode(
  file: { contents?: string } | undefined,
  result: { code?: unknown[] } | undefined,
  minLength = 0,
): boolean {
  if (!result || typeof result !== "object") return false;
  if (!Array.isArray(result.code)) result.code = [];
  const contents = typeof file?.contents === "string" ? file.contents : "";
  const lines = contents !== "" ? contents.split(/(?<=\n)/) : [];
  const need = Math.max(lines.length, Number.isFinite(minLength) ? minLength : 0);
  let padded = false;
  for (let index = 0; index < need; index += 1) {
    if (result.code[index] != null) continue;
    result.code[index] = {
      ...EMPTY_LINE_HAST,
      children: [{ type: "text", value: "" }],
    };
    padded = true;
  }
  return padded;
}

export function isPierreLineMissingError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("Line doesnt exist");
}

function pierreFileRenderContainer(instance: FileHostInstance, args: unknown[]): unknown {
  const props = args[0];
  if (props && typeof props === "object" && "fileContainer" in props) {
    const container = (props as { fileContainer?: unknown }).fileContainer;
    if (container != null) return container;
  }
  return instance.fileContainer;
}

/**
 * Official ion File.render (`c64baa838`): catch → `console.error` + `applyErrorToDOM`.
 * Official `applyErrorToDOM(e, t)`:
 *   this.cleanupErrorWrapper(); this.pre?.remove(); this.pre = void 0;
 *   this.appliedPreAttributes = void 0;
 *   const n = t.shadowRoot ?? t.attachShadow({ mode: "open" });
 *   this.errorWrapper ??= document.createElement("div");
 *   this.errorWrapper.dataset.errorWrapper = "";
 *   this.errorWrapper.textContent = "";
 *   n.appendChild(this.errorWrapper);
 *   const r = document.createElement("div");
 *   r.dataset.errorMessage = ""; r.innerText = e.message;
 *   this.errorWrapper.appendChild(r);
 *   const i = document.createElement("pre");
 *   i.dataset.errorStack = ""; i.innerText = e.stack ?? "No Error Stack";
 *   this.errorWrapper.appendChild(i);
 * Vite turns console.error into the overlay. Pad first (crash fix); mute that
 * one console.error; if Line doesnt exist still throws, call applyErrorToDOM
 * when it exists on the instance.
 */
export function installPierreFileSafety(
  FileCtor?: { prototype?: FileHostProto },
  FileRendererCtor?: { prototype?: FileRendererProto },
) {
  const rendererProto = FileRendererCtor?.prototype;
  if (rendererProto && typeof rendererProto.processFileResult === "function" && !rendererProto.__claudexLinePad) {
    const original = rendererProto.processFileResult;
    rendererProto.processFileResult = function (
      this: FileRendererProto,
      file: { contents?: string },
      range: { startingLine?: number; totalLines?: number },
      result: { code?: unknown[] },
    ) {
      const span =
        typeof range?.startingLine === "number"
        && typeof range?.totalLines === "number"
        && Number.isFinite(range.totalLines)
          ? range.startingLine + range.totalLines
          : 0;
      const counted = typeof this.getLineCount === "function" ? this.getLineCount(file) : 0;
      padPierreHighlightCode(file, result, Math.max(span, counted));
      try {
        return original.call(this, file, range, result);
      } catch (error) {
        if (!isPierreLineMissingError(error)) throw error;
        padPierreHighlightCode(file, result, Math.max(span, counted, (result.code?.length ?? 0) + 1));
        return original.call(this, file, range, result);
      }
    };
    rendererProto.__claudexLinePad = true;
  }

  const fileProto = FileCtor?.prototype;
  if (fileProto && typeof fileProto.render === "function" && !fileProto.__claudexRenderCatch) {
    const originalRender = fileProto.render;
    fileProto.render = function (this: FileHostInstance, ...args: unknown[]) {
      const error = console.error;
      console.error = (...consoleArgs: unknown[]) => {
        if (isPierreLineMissingError(consoleArgs[0])) return;
        error.apply(console, consoleArgs);
      };
      try {
        return originalRender.apply(this, args);
      } catch (caught) {
        if (!isPierreLineMissingError(caught)) throw caught;
        if (typeof this.applyErrorToDOM === "function" && caught instanceof Error) {
          this.applyErrorToDOM(caught, pierreFileRenderContainer(this, args));
        }
        return true;
      } finally {
        console.error = error;
      }
    };
    fileProto.__claudexRenderCatch = true;
  }
}

function installPierreFileRendererPad(instance: PierrePaintInstance) {
  installPierreFileSafety(
    instance.constructor as { prototype?: FileHostProto } | undefined,
    instance.fileRenderer?.constructor as { prototype?: FileRendererProto } | undefined,
  );
}

function installPierreConsoleErrorFilter() {
  const host = console as Console & { __claudexPierreLineErrorFilter?: boolean };
  if (host.__claudexPierreLineErrorFilter) return;
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (isPierreLineMissingError(args[0])) return;
    original(...args);
  };
  host.__claudexPierreLineErrorFilter = true;
}

installPierreConsoleErrorFilter();
installPierreFileSafety(
  PierreFile as { prototype?: FileHostProto },
  PierreFileRenderer as { prototype?: FileRendererProto },
);
installPierreFileSafety(PierreFileDiff as { prototype?: FileHostProto });

function safePierreRerender(instance: { rerender: () => void }): boolean {
  try {
    instance.rerender();
    return true;
  } catch {
    // Package FileRenderer throws into the transcript (Vite overlay). Swallow.
    return false;
  }
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

  installPierreFileRendererPad(paintInstance);
  for (const cache of getRenderCaches(paintInstance)) {
    padPierreHighlightCode(cache.file, cache.result as { code?: unknown[] } | undefined);
  }

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
      for (const cache of caches) {
        padPierreHighlightCode(cache.file, cache.result as { code?: unknown[] } | undefined);
      }
      if (caches.some((cache) => resultHasDiffTokens(cache.result) && !pierreHighlightedResultFitsFile(cache))) {
        stop();
        return;
      }
      const now = Date.now();
      if (
        host.__pierreTokenPaintLastRerender == null ||
        now - host.__pierreTokenPaintLastRerender > 80
      ) {
        host.__pierreTokenPaintLastRerender = now;
        if (!safePierreRerender(instance)) {
          stop();
          return;
        }
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
