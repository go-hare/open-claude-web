/**
 * Official c11959232 Preview side-pane residual (Views → Preview / TI + cS + RS).
 *
 * Empty / error feed (cS EpitaxyLaunchActivityFeed):
 * - startError.kind === "no-config":
 *     text t2lqMIHmDm + primary Set up (rrGMSxQd9S) → submitToChat detect prompt
 * - startError.kind === "start-failed":
 *     text KES/W9o+Og + footnote ggso9In8a4
 * - no startError (loading / starting): WalkingClawd + spinner + "Setting up preview"
 *
 * Config source is Launch.getConfiguredServices(cwd) → official .claude/launch.json
 * only (fm residual). Missing config is no-config, not package.json invent.
 */
import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LocalSessionsBridge, SessionSummary } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import { OfficialSpinner } from "./OfficialWorkingStatus";
import { EpitaxyTranscriptActionContext } from "./epitaxyTranscriptActionContext";
import { isHtmlPreviewPath, isPreviewImagePath, readPreviewText } from "./officialFilePreviewUtils";
import {
  OfficialPreviewAnnotateOverlay,
  PREVIEW_ANNOTATION_CONTEXT_NOTE,
} from "./OfficialPreviewSketch";
import {
  officialPeekPreviewServerId,
  useOfficialSidePaneStoreApi,
} from "./officialSidePaneSessionStore";

export type OfficialPreviewTarget = {
  path: string;
  title?: string;
};

type EpitaxySessionRef = {
  id: string;
  type: "local" | "remote" | "bridge";
};

type LaunchStartError =
  | { kind: "no-config" }
  | { kind: "start-failed"; message?: string };

/** Official Set up → submitToChat residual (c11959232). */
export const OFFICIAL_PREVIEW_SETUP_PROMPT = `Detect my project's dev servers and save all their configurations to .claude/launch.json, then ask which ones to start.

\`\`\`json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "<server-name>",
      "runtimeExecutable": "<command>",
      "runtimeArgs": ["<args>"],
      "port": <port>
    }
  ]
}
\`\`\`

Use runtimeExecutable for the command (e.g. "yarn", "npm", "node", "python") and runtimeArgs for its arguments. Call preview_start for each server the user wants to run.`;

type LaunchBridge = {
  getConfiguredServices?: (cwd: string) => Promise<Array<{ name: string; port?: number }> | null | undefined>;
  startFromConfig?: (
    cwd: string,
    name?: string,
  ) => Promise<{ serverId?: string; error?: string } | null | undefined>;
  getPreviewUrl?: (serverId?: string) => Promise<string | null | undefined>;
  isAvailable?: () => boolean | Promise<boolean>;
  /** Official MCP isEnabled residual — gi("launchEnabled"). */
  isEnabled?: () => boolean | Promise<boolean>;
  /**
   * Official showPreview(serverId, bounds) residual — host WebContentsView overlay.
   * When present, live server preview is host-owned (not iframe).
   */
  showPreview?: (
    serverId: string,
    bounds: { x: number; y: number; width: number; height: number },
  ) => Promise<boolean | null | undefined> | boolean;
  hidePreview?: (serverId?: string) => Promise<boolean | null | undefined> | boolean;
  /** Official setPreviewColorScheme(serverId, scheme) residual. */
  setPreviewColorScheme?: (
    serverId: string,
    scheme: "light" | "dark",
  ) => Promise<boolean | null | undefined> | boolean;
  /** Official setPreviewViewport(serverId, width, height) residual. */
  setPreviewViewport?: (
    serverId: string,
    width: number,
    height: number,
  ) => Promise<boolean | null | undefined> | boolean;
  /** Official clearPreviewViewport(serverId) residual — desktop native size. */
  clearPreviewViewport?: (
    serverId: string,
  ) => Promise<boolean | null | undefined> | boolean;
  /** Official toggleSelectionMode(serverId, enabled) residual. */
  toggleSelectionMode?: (
    serverId: string,
    enabled: boolean,
  ) => Promise<boolean | null | undefined> | boolean;
  /**
   * Official capturePreviewScreenshot(serverId) residual — raw base64 PNG (no data: prefix).
   */
  capturePreviewScreenshot?: (
    serverId: string,
  ) => Promise<string | null | undefined> | string | null | undefined;
  refreshPreview?: (serverId: string) => Promise<boolean | null | undefined> | boolean;
};

/** Official kS residual — mobile 375×812; desktop clears viewport. */
const PREVIEW_DEVICE_PRESETS = {
  desktop: { w: 0, h: 0 },
  mobile: { w: 375, h: 812 },
} as const;

function launchBridge(): LaunchBridge | null {
  const web = (window as Window & { "claude.web"?: { Launch?: LaunchBridge } })["claude.web"];
  return web?.Launch ?? null;
}

function basename(value?: string): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}

/**
 * Official cS empty/error residual — no file-picker invent, no spinner on no-config.
 */
function OfficialLaunchActivityFeed({
  startError,
  onSetup,
  loadingLabel,
}: {
  startError: LaunchStartError | null;
  onSetup?: () => void;
  loadingLabel?: string | null;
}) {
  if (startError) {
    return (
      <div role="status" className="flex h-full flex-col items-center justify-center gap-g6 px-p8 text-center">
        <p className="text-body text-t7 max-w-[36ch]">
          {startError.kind === "no-config"
            ? "Run your dev server to inspect network requests, debug with logs, and see changes live."
            : "Dev server failed to start."}
        </p>
        {startError.kind === "no-config" && onSetup ? (
          <OfficialButton onClick={onSetup} variant="contained">
            Set up
          </OfficialButton>
        ) : null}
        {startError.kind === "start-failed" ? (
          <p className="text-footnote text-t5">Error details were sent to Claude.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-g8 px-p8">
      <img
        alt=""
        className="select-none"
        draggable={false}
        height={94}
        src="/assets/v1/clawd-laptop-official.gif"
        width={140}
      />
      <div role="status" className="flex items-center gap-g3 text-body text-t7">
        <OfficialSpinner />
        <span>{loadingLabel ?? "Setting up preview"}</span>
      </div>
    </div>
  );
}

export function OfficialPreviewPane({
  bridge,
  previewTarget,
  session,
  sessionRef,
}: {
  bridge: LocalSessionsBridge;
  previewTarget: OfficialPreviewTarget | null;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
}) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  // Residual Ur — bind/peek against this pane's Nr store (not shared singleton).
  const sidePaneStore = useOfficialSidePaneStoreApi();
  const [selectedTarget, setSelectedTarget] = useState<OfficialPreviewTarget | null>(previewTarget);
  const [state, setState] = useState<{ dataUrl?: string; error?: string; isLoading: boolean; text?: string }>({
    isLoading: false,
  });
  const [startError, setStartError] = useState<LaunchStartError | null>(null);
  const [probeDone, setProbeDone] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  /** Official showPreview residual — host WebContentsView when bridge exposes it. */
  const [liveServerId, setLiveServerId] = useState<string | null>(null);
  const hostSurfaceRef = useRef<HTMLDivElement | null>(null);
  const liveServerIdRef = useRef<string | null>(null);
  const [hostMode, setHostMode] = useState(false);
  /** Official PreviewToolbar residual: colorScheme / deviceMode / selectionMode / sketchMode. */
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light");
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [selectionMode, setSelectionMode] = useState(false);
  /** Official sketchMode residual — Annotate preview (Pencil). */
  const [sketchMode, setSketchMode] = useState(false);
  const [sketchBackdrop, setSketchBackdrop] = useState<string | null>(null);
  const sketchGenRef = useRef(0);

  useEffect(() => {
    setSelectedTarget(previewTarget);
  }, [previewTarget]);

  // Official TI auto-start residual: getConfiguredServices(cwd) → empty ⇒ no-config;
  // first service ⇒ startFromConfig; failure ⇒ start-failed.
  // Residual Nr previewServerId restore: reattach saved durable serverId before startFromConfig.
  useEffect(() => {
    let alive = true;
    const cwd = session?.cwd;
    if (!sessionRef || sessionRef.type !== "local" || !cwd) {
      setStartError({ kind: "no-config" });
      setProbeDone(true);
      setPreviewUrl(null);
      setLiveServerId(null);
      liveServerIdRef.current = null;
      return () => {
        alive = false;
      };
    }
    setProbeDone(false);
    setStartError(null);
    setPreviewUrl(null);
    setLiveServerId(null);
    liveServerIdRef.current = null;
    setSelectionMode(false);
    setDeviceMode("desktop");
    setSketchMode(false);
    setSketchBackdrop(null);
    sketchGenRef.current++;
    void (async () => {
      const launch = launchBridge();
      try {
        // Residual: restored previewServerIdBySession[session] → try getPreviewUrl before start.
        const restoredServerId = officialPeekPreviewServerId(sessionRef.id, sidePaneStore);
        if (restoredServerId) {
          try {
            const url = (await launch?.getPreviewUrl?.(restoredServerId)) ?? null;
            if (!alive) return;
            if (url != null || typeof launch?.showPreview === "function") {
              liveServerIdRef.current = restoredServerId;
              setLiveServerId(restoredServerId);
              setPreviewUrl(url);
              setHostMode(typeof launch?.showPreview === "function");
              setStartError(null);
              sidePaneStore.getState().bindPreviewServer(restoredServerId);
              setProbeDone(true);
              return;
            }
          } catch {
            // Fall through to startFromConfig when reattach fails.
          }
        }

        // Official Ea residual: launchEnabled false → do not auto-start (isEnabled gate).
        // Prefer Launch.isEnabled(); fall back to startFromConfig returning launch_disabled.
        const enabledRaw = launch?.isEnabled?.();
        const enabled =
          typeof enabledRaw === "boolean"
            ? enabledRaw
            : enabledRaw
              ? await enabledRaw
              : true;
        if (!alive) return;
        if (enabled === false) {
          setStartError({ kind: "no-config" });
          setProbeDone(true);
          return;
        }
        const services = (await launch?.getConfiguredServices?.(cwd)) ?? [];
        if (!alive) return;
        if (!services.length) {
          setStartError({ kind: "no-config" });
          setProbeDone(true);
          return;
        }
        const name = services[0]?.name;
        const started = await launch?.startFromConfig?.(cwd, name);
        if (!alive) return;
        if (started?.serverId) {
          const url = (await launch?.getPreviewUrl?.(started.serverId)) ?? null;
          if (!alive) return;
          liveServerIdRef.current = started.serverId;
          setLiveServerId(started.serverId);
          setPreviewUrl(url);
          setHostMode(typeof launch?.showPreview === "function");
          setStartError(null);
          // Residual ca0135 bindPreviewServer — durable id into Nr for A→B→A restore.
          sidePaneStore.getState().bindPreviewServer(started.serverId);
        } else if (started?.error === "launch_disabled") {
          // Preference off — treat as inactive preview surface, not a start failure.
          setStartError({ kind: "no-config" });
        } else if (started?.error) {
          setStartError({ kind: "start-failed", message: started.error });
          // Official: Error details were sent to Claude — forward message when submit available.
          if (started.error) {
            void actions?.submitToChat?.(
              `Preview dev server failed to start:\n\`\`\`\n${started.error}\n\`\`\``,
            );
          }
        } else {
          setStartError({ kind: "no-config" });
        }
      } catch (err) {
        if (!alive) return;
        setStartError({
          kind: "start-failed",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (alive) setProbeDone(true);
      }
    })();
    return () => {
      alive = false;
      // Official hidePreview + disable selection on unmount / session switch.
      // Residual: do NOT unbindPreviewServer here — Nr keeps durable serverId for restore.
      // Unbind only when user closes preview tile / server dies.
      const launch = launchBridge();
      const sid = liveServerIdRef.current;
      try {
        if (sid && typeof launch?.toggleSelectionMode === "function") {
          void launch.toggleSelectionMode(sid, false);
        }
      } catch {
        /* ignore */
      }
      try {
        void launch?.hidePreview?.(sid ?? undefined);
      } catch {
        /* ignore */
      }
      liveServerIdRef.current = null;
    };
    // session cwd / id drive re-probe; submitToChat identity not required each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.cwd, sessionRef?.id, sessionRef?.type, sidePaneStore]);

  // Official showPreview(serverId, bounds) residual — host WebContentsView over pane rect.
  // When sketchMode is on, hide host view so annotate overlay (screenshot) can receive pointer events
  // (official Mi residual hides preview while overlay is active).
  useLayoutEffect(() => {
    if (!liveServerId || !hostMode || selectedTarget || startError || sketchMode) {
      if (liveServerId && sketchMode) {
        try {
          void launchBridge()?.hidePreview?.(liveServerId);
        } catch {
          /* ignore */
        }
      }
      return;
    }
    const el = hostSurfaceRef.current;
    if (!el) return;
    const launch = launchBridge();
    if (typeof launch?.showPreview !== "function") return;

    const pushBounds = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      void launch.showPreview?.(liveServerId, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    };
    pushBounds();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => pushBounds())
        : null;
    ro?.observe(el);
    window.addEventListener("resize", pushBounds);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", pushBounds);
      try {
        void launch.hidePreview?.(liveServerId);
      } catch {
        /* ignore */
      }
    };
  }, [liveServerId, hostMode, selectedTarget, startError, sketchMode]);

  // Official setPreviewColorScheme residual when scheme or server changes.
  useEffect(() => {
    if (!liveServerId) return;
    const launch = launchBridge();
    if (typeof launch?.setPreviewColorScheme !== "function") return;
    void launch.setPreviewColorScheme(liveServerId, colorScheme);
  }, [liveServerId, colorScheme]);

  // Official device mode residual: mobile → setPreviewViewport(375,812); desktop → clear.
  useEffect(() => {
    if (!liveServerId) return;
    const launch = launchBridge();
    if (deviceMode === "desktop") {
      if (typeof launch?.clearPreviewViewport === "function") {
        void launch.clearPreviewViewport(liveServerId);
      }
      return;
    }
    const preset = PREVIEW_DEVICE_PRESETS.mobile;
    if (typeof launch?.setPreviewViewport === "function") {
      void launch.setPreviewViewport(liveServerId, preset.w, preset.h);
    }
  }, [liveServerId, deviceMode]);

  // Official toggleSelectionMode residual + cmd+shift+s shortcut.
  useEffect(() => {
    if (!liveServerId) return;
    const launch = launchBridge();
    if (typeof launch?.toggleSelectionMode === "function") {
      void launch.toggleSelectionMode(liveServerId, selectionMode);
    }
  }, [liveServerId, selectionMode]);

  useEffect(() => {
    if (!liveServerId || selectedTarget || startError) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      // Official ck("toggleSelectionMode"): cmd/ctrl+shift+s
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.shiftKey && !event.altKey && event.code === "KeyS") {
        event.preventDefault();
        setSelectionMode((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [liveServerId, selectedTarget, startError]);

  const onToggleColorScheme = useCallback(() => {
    setColorScheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const onToggleDeviceMode = useCallback(() => {
    setDeviceMode((prev) => (prev === "mobile" ? "desktop" : "mobile"));
  }, []);

  const onToggleSelectionMode = useCallback(() => {
    // Official: entering selection while sketch is open cancels sketch first.
    if (sketchMode) {
      sketchGenRef.current++;
      setSketchMode(false);
      setSketchBackdrop(null);
    }
    setSelectionMode((prev) => !prev);
  }, [sketchMode]);

  /** Official onToggleSketchMode residual — capture screenshot then open annotate overlay. */
  const onToggleSketchMode = useCallback(() => {
    if (sketchMode) {
      sketchGenRef.current++;
      setSketchMode(false);
      setSketchBackdrop(null);
      return;
    }
    if (!liveServerId) return;
    const gen = ++sketchGenRef.current;
    setSelectionMode(false);
    setSketchMode(true);
    const launch = launchBridge();
    void Promise.resolve(launch?.capturePreviewScreenshot?.(liveServerId)).then((raw) => {
      if (sketchGenRef.current !== gen) return;
      if (raw && typeof raw === "string") {
        setSketchBackdrop(
          raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`,
        );
      }
    });
  }, [liveServerId, sketchMode]);

  const onSketchCancel = useCallback(() => {
    sketchGenRef.current++;
    setSketchMode(false);
    setSketchBackdrop(null);
  }, []);

  const onSketchAttach = useCallback(
    (dataUrl: string) => {
      void actions?.attachPreviewAnnotation?.({
        name: "preview-annotation.png",
        dataUrl,
        contextNote: PREVIEW_ANNOTATION_CONTEXT_NOTE,
      });
      sketchGenRef.current++;
      setSketchMode(false);
      setSketchBackdrop(null);
    },
    [actions],
  );

  const onRefreshPreview = useCallback(() => {
    if (!liveServerId) return;
    const launch = launchBridge();
    void launch?.refreshPreview?.(liveServerId);
  }, [liveServerId]);

  useEffect(() => {
    let alive = true;
    const target = selectedTarget;
    if (!target || !sessionRef) {
      setState({ isLoading: false });
      return () => {
        alive = false;
      };
    }
    setState({ isLoading: true });
    const load = isPreviewImagePath(target.path)
      ? bridge.readSessionImageAsDataUrl
        ? bridge.readSessionImageAsDataUrl(sessionRef.id, target.path).then((dataUrl) => ({
            dataUrl: dataUrl ?? undefined,
          }))
        : Promise.reject(new Error("Image preview is unavailable."))
      : readPreviewText(bridge, sessionRef.id, target.path).then((result) => ({
          text: result.text,
          unreadable: result.unreadable,
        }));
    void load
      .then((result) => {
        if (!alive) return;
        setState({ ...result, isLoading: false });
      })
      .catch((error) => {
        if (!alive) return;
        setState({
          error: error instanceof Error ? error.message : String(error),
          isLoading: false,
        });
      });
    return () => {
      alive = false;
    };
  }, [bridge, selectedTarget, sessionRef]);

  const onSetup = useCallback(() => {
    // Official S → submitToChat(detect prompt). Prefer true submit over composer attach-only.
    if (actions?.submitToChat) {
      void actions.submitToChat(OFFICIAL_PREVIEW_SETUP_PROMPT);
      return;
    }
    actions?.attachAsContext?.(OFFICIAL_PREVIEW_SETUP_PROMPT);
  }, [actions]);

  // File / HTML path preview when transcript opened a concrete target.
  if (selectedTarget) {
    const title = selectedTarget.title ?? basename(selectedTarget.path) ?? selectedTarget.path;
    return (
      <div className="h-full min-w-0 flex flex-col bg-bg-000">
        <div className="flex items-center gap-g4 border-b border-border-300 px-p6 py-p4">
          <Icon name="NoteSquareLines" size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-body text-t8">{title}</div>
            <div className="truncate text-caption text-t5">{selectedTarget.path}</div>
          </div>
          <OfficialButton
            ariaLabel="Copy path"
            icon="CopySquareBehind"
            onClick={() => void navigator.clipboard?.writeText(selectedTarget.path)}
          />
          {bridge.openInEditor ? (
            <OfficialButton
              ariaLabel="Open in editor"
              icon="Folder1Open"
              onClick={() => void bridge.openInEditor?.(selectedTarget.path)}
            />
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {state.isLoading ? (
            <div role="status" className="h-full flex items-center justify-center text-t5">
              <OfficialSpinner />
              <span className="sr-only">Loading preview</span>
            </div>
          ) : state.error ? (
            <div className="h-full flex items-center justify-center px-p8 text-center text-body text-extended-pink">
              {state.error}
            </div>
          ) : state.dataUrl ? (
            <div className="flex min-h-full items-center justify-center p-p8">
              <img alt={title} className="max-h-full max-w-full rounded-r4 object-contain" src={state.dataUrl} />
            </div>
          ) : isHtmlPreviewPath(selectedTarget.path) && state.text !== undefined ? (
            <iframe
              className="h-full w-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin"
              srcDoc={state.text}
              title={title}
            />
          ) : (
            <pre className="m-0 min-w-max p-p8 text-code text-t8 leading-[18px] whitespace-pre-wrap">
              {state.text ?? ""}
            </pre>
          )}
        </div>
      </div>
    );
  }

  // Official live Preview: host WebContentsView via showPreview(bounds) when available;
  // iframe fallback only when bridge lacks showPreview (non-desktop / tests).
  // Official PreviewToolbar residual (CS): color / device / selection / sketch(Pencil) / refresh.
  if ((previewUrl || liveServerId) && !startError) {
    const toolbar = liveServerId ? (
      <div className="flex items-center gap-g2 border-b border-border-300 px-p4 py-p2 shrink-0">
        <OfficialButton
          ariaLabel="Refresh"
          icon="ArrowRotateClockwise"
          onClick={onRefreshPreview}
          size="base"
          variant="uncontained"
        />
        <div className="flex-1 min-w-0" />
        <OfficialButton
          ariaLabel={colorScheme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          icon={colorScheme === "light" ? "SunLight" : "MoonDark"}
          onClick={onToggleColorScheme}
          size="base"
          variant="toggle"
        />
        <OfficialButton
          ariaLabel="Toggle device toolbar"
          icon="SystemComputerLaptopMacbook"
          onClick={onToggleDeviceMode}
          pressed={deviceMode === "mobile"}
          size="base"
          variant="toggle"
        />
        <OfficialButton
          ariaLabel={selectionMode ? "Exit selection mode" : "Select element"}
          icon="Cursor"
          onClick={onToggleSelectionMode}
          pressed={selectionMode}
          size="base"
          tooltipShortcut="⌘⇧S"
          variant="toggle"
        />
        <OfficialButton
          ariaLabel="Annotate preview"
          icon="Pencil"
          onClick={onToggleSketchMode}
          pressed={sketchMode}
          size="base"
          variant="toggle"
        />
      </div>
    ) : null;

    const annotateOverlay = sketchMode ? (
      <OfficialPreviewAnnotateOverlay
        backdropDataUrl={sketchBackdrop}
        onAttach={onSketchAttach}
        onCancel={onSketchCancel}
      />
    ) : null;

    if (hostMode && liveServerId) {
      return (
        <div className="h-full min-w-0 flex flex-col bg-bg-000">
          {toolbar}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              ref={hostSurfaceRef}
              className="h-full w-full min-h-0 bg-white"
              data-launch-preview-host={liveServerId}
              data-device-mode={deviceMode}
              data-selection-mode={selectionMode ? "1" : "0"}
              data-sketch-mode={sketchMode ? "1" : "0"}
              // Host paints WebContentsView over this rect; keep empty for layout.
              // During sketchMode host view is hidden so overlay receives pointers.
            />
            {annotateOverlay}
          </div>
        </div>
      );
    }
    if (previewUrl) {
      return (
        <div className="h-full min-w-0 flex flex-col bg-bg-000">
          {toolbar}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {!sketchMode ? (
              <iframe className="h-full w-full min-h-0 flex-1 border-0 bg-white" src={previewUrl} title="Preview" />
            ) : null}
            {annotateOverlay}
          </div>
        </div>
      );
    }
  }

  // Official cS feed: loading until probe finishes, then no-config / start-failed.
  return (
    <OfficialLaunchActivityFeed
      loadingLabel={probeDone ? null : "Setting up preview"}
      onSetup={onSetup}
      startError={probeDone ? startError : null}
    />
  );
}
