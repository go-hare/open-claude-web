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
import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LocalSessionsBridge, SessionSummary } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { OfficialButton, OfficialModal } from "../OfficialEpitaxyComponents";
import { PREVIEW_EMPTY_MESSAGES } from "../officialCodeChromeMessages";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { OfficialSpinner } from "./OfficialWorkingStatus";
import { EpitaxyTranscriptActionContext } from "./epitaxyTranscriptActionContext";
import {
  officialChromeImportFnEligible,
  officialChromeImportPreviewId,
  officialNavigatePreviewSucceeded,
  officialPreviewIsHttpUrl,
  officialPreviewNavigateUrl,
  publishOfficialPreviewChrome,
  type OfficialPreviewColorScheme,
  type OfficialPreviewServerRow,
  type OfficialPreviewViewport,
} from "./officialPreviewChrome";
import {
  OFFICIAL_PREVIEW_ADD_SERVER_PROMPT,
  OfficialPreviewLogsPanel,
  OfficialPreviewTranscriptLinksModal,
  readPreviewLogsExpanded,
  writePreviewLogsExpanded,
  type OfficialPreviewLogLine,
} from "./OfficialPreviewXrExtras";
import { useOfficialChromeImport } from "./OfficialChromeImport";
import {
  readTranscriptLinksInPreview,
  writeTranscriptLinksInPreview,
} from "../../settings/coworkTranscriptLinks";
import { useDesktopPreferences } from "../../settings/useDesktopPreferences";
import { AllowedSitesModal } from "../../settings/sections/coworkSettingsDevice";
import { isHtmlPreviewPath, isPreviewImagePath, readPreviewText } from "./officialFilePreviewUtils";
import {
  OfficialPreviewAnnotateOverlay,
  PREVIEW_ANNOTATION_CONTEXT_NOTE,
} from "./OfficialPreviewSketch";
import {
  officialPeekPreviewServerId,
  useOfficialSidePaneSessionStore,
  useOfficialSidePaneStoreApi,
} from "./officialSidePaneSessionStore";
import {
  isOfficialHtmlPreviewServerId,
  isOfficialTtHtmlPreviewPath,
  officialHtmlFilesGlobeItems,
  officialSelectedHtmlFilePath,
} from "./officialHtmlPreviewAutoOpen";

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

/** Official ca80 `Oq` — Globe Add server / empty Detect `Xe=l(()=>{re(nt)})`. */
export const OFFICIAL_PREVIEW_SETUP_PROMPT = OFFICIAL_PREVIEW_ADD_SERVER_PROMPT;

type LaunchBridge = {
  getConfiguredServices?: (cwd: string) => Promise<Array<{ name: string; port?: number }> | null | undefined>;
  startFromConfig?: (
    cwd: string,
    name?: string,
  ) => Promise<{ serverId?: string; error?: string } | null | undefined>;
  getPreviewUrl?: (serverId?: string) => Promise<string | null | undefined>;
  getNavigationState?: (serverId: string) => Promise<{ canGoBack?: boolean; canGoForward?: boolean; url?: string | null } | null | undefined>;
  goBack?: (serverId: string) => Promise<boolean | null | undefined> | boolean;
  goForward?: (serverId: string) => Promise<boolean | null | undefined> | boolean;
  navigatePreview?: (serverId: string, url: string) => Promise<unknown>;
  stopServer?: (serverId: string) => Promise<boolean | null | undefined> | boolean;
  activeServers_$store$_getState?: () => Promise<Array<{ serverId?: string; name?: string; port?: number; status?: string; cwd?: string }> | null | undefined>;
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
  /** Official asar Launch.openPreviewInBrowser(serverId) → shell.openExternal. */
  openPreviewInBrowser?: (serverId: string) => Promise<boolean | null | undefined> | boolean;
  exportPreview?: (
    serverId: string,
    kind: "screenshot" | "file",
  ) => Promise<boolean | null | undefined> | boolean;
  pickHtmlFile?: (cwd?: string) => Promise<string | null | undefined>;
  loadHtmlPreview?: (filePath: string) => Promise<string | null | undefined>;
  getAutoVerify?: (cwd: string) => Promise<boolean | null | undefined>;
  setAutoVerify?: (cwd: string, enabled: boolean) => Promise<boolean | null | undefined> | boolean;
  getPreviewAllowedOrigins?: () => Promise<unknown>;
  getLogs?: (serverId: string) => Promise<OfficialPreviewLogLine[] | null | undefined> | OfficialPreviewLogLine[] | null | undefined;
  openExternalLinkInPreview?: (
    previewId?: string,
    cwd?: string,
    url?: string,
  ) => Promise<unknown> | unknown;
  clearPreviewBrowsingData?: (previewId: string) => Promise<boolean | null | undefined> | boolean;
  getChromeImportAvailability?: () => Promise<{ available?: boolean; touchId?: boolean } | null | undefined>;
  listChromeImportProfiles?: () => Promise<unknown>;
  listChromeImportSites?: (previewId: string, profileId?: string) => Promise<unknown>;
  importChromeLogins?: (
    previewId: string,
    ticket: string,
    roots: string[],
    persistRequested?: boolean,
  ) => Promise<unknown>;
  listImportedChromeLogins?: (previewId: string) => Promise<unknown>;
  removeImportedChromeLogins?: (previewId: string, root?: string) => Promise<unknown>;
  getChromeImportSharedOffer?: (
    previewId: string | { previewId: string; cwd?: string; url?: string },
    anySite?: boolean,
  ) => Promise<{ offer?: boolean; sites?: number; site?: string; storageIsEphemeral?: boolean } | null | undefined>;
  acceptChromeImportSharedOffer?: (
    previewId: string | { previewId: string; cwd?: string; url?: string },
    keepSignedIn?: boolean,
  ) => Promise<{ ok?: boolean; error?: string; reloaded?: boolean } | null | undefined>;
};

function launchBridge(): LaunchBridge | null {
  const web = (window as Window & { "claude.web"?: { Launch?: LaunchBridge } })["claude.web"];
  return web?.Launch ?? null;
}

function basename(value?: string): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}

/**
 * Official cf580 `gr` / `Or` empty residual — Globe browse empty, not live toolbar + blank view.
 * Loading: `Tr` clawd gif + "Setting up preview". start-failed: Warning + /jkMgZaQEi.
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
  const text = useI18nText(PREVIEW_EMPTY_MESSAGES);
  if (startError?.kind === "no-config") {
    return (
      <div role="status" className="flex h-full w-full items-center justify-center overflow-y-auto p-lg">
        <div className="flex w-full max-w-[420px] flex-col items-center gap-md text-center">
          <Icon name="Globe" className="text-disabled" preferFont size="xl" />
          <div className="flex flex-col items-center gap-[4px]">
            <p className="m-0 max-w-[36ch] text-body text-primary">{text.browseWithClaude}</p>
            <p className="m-0 max-w-[44ch] text-footnote text-muted">{text.typeAUrl}</p>
          </div>
          {onSetup ? (
            <p className="m-0 flex flex-wrap items-center justify-center gap-x-[3px] text-footnote text-muted">
              <span>{text.previewYourAppInstead}</span>
              <OfficialButton onClick={onSetup} size="small" variant="ghost">
                {text.detectDevServer}
              </OfficialButton>
            </p>
          ) : null}
        </div>
      </div>
    );
  }
  if (startError) {
    return (
      <div role="status" className="flex h-full w-full items-center justify-center overflow-y-auto p-lg">
        <div className="flex w-full max-w-[400px] flex-col items-center gap-md text-center">
          <Icon name="Warning" className="text-disabled" preferFont size="xl" />
          <p className="m-0 text-body text-primary">{text.devServerFailed}</p>
          <p className="m-0 text-footnote text-muted">{text.errorDetailsSent}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-md px-lg">
      <img
        alt=""
        className="select-none [image-rendering:pixelated]"
        draggable={false}
        height={94}
        src="/assets/v1/clawd-laptop-official.gif"
        width={140}
      />
      <div role="status" className="flex items-center gap-xs text-body text-secondary">
        <OfficialSpinner />
        <span>{loadingLabel ?? text.settingUpPreview}</span>
      </div>
    </div>
  );
}

export function OfficialPreviewPane({
  bridge,
  landingCwd,
  previewTarget,
  session,
  sessionRef,
}: {
  bridge: LocalSessionsBridge;
  /** Official RS/TI cwd when sessionRef is null (draft). */
  landingCwd?: string | null;
  previewTarget: OfficialPreviewTarget | null;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
}) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const previewText = useI18nText(PREVIEW_EMPTY_MESSAGES);
  const [preferences, setPreference] = useDesktopPreferences();
  // Residual Ur — bind/peek against this pane's Nr store (not shared singleton).
  const sidePaneStore = useOfficialSidePaneStoreApi();
  const htmlFiles = useOfficialSidePaneSessionStore((state) => state.htmlFiles);
  const boundPreviewServerId = useOfficialSidePaneSessionStore((state) => state.previewServerId);
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
  /** Official PreviewToolbar residual: colorScheme / viewport / selectionMode / sketchMode. */
  const [colorScheme, setColorScheme] = useState<OfficialPreviewColorScheme>("system");
  const [viewport, setViewport] = useState<OfficialPreviewViewport | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [autoVerify, setAutoVerify] = useState(true);
  const [autoVerifyPrompt, setAutoVerifyPrompt] = useState(false);
  const [allowedSitesOpen, setAllowedSitesOpen] = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(readPreviewLogsExpanded);
  const [logs, setLogs] = useState<OfficialPreviewLogLine[]>([]);
  const [transcriptLinksOpen, setTranscriptLinksOpen] = useState(false);
  const [linksInPreview, setLinksInPreview] = useState(readTranscriptLinksInPreview);
  /** Official sketchMode residual — Annotate preview (Pencil). */
  const [sketchMode, setSketchMode] = useState(false);
  const [sketchBackdrop, setSketchBackdrop] = useState<string | null>(null);
  const sketchGenRef = useRef(0);
  const browseIdRef = useRef(`browse_${sessionRef?.id ?? "local"}`);
  const [servers, setServers] = useState<OfficialPreviewServerRow[]>([]);
  const [nav, setNav] = useState({ canGoBack: false, canGoForward: false });
  const [pageUrl, setPageUrl] = useState("");
  const cwd = session?.cwd || landingCwd || undefined;
  /**
   * Official cf580 `Fn`/`Oe`: `eligible: M && !ze && !Be && ie?.type==="local"`,
   * `previewId: i??null`. Empty Globe / setup feed has no server id — D overlay
   * must not fire on open.
   */
  const chromeImportHttpPage = officialPreviewIsHttpUrl(pageUrl || previewUrl || "");
  const chromeImportEligible = officialChromeImportFnEligible({
    sessionType: sessionRef?.type,
    previewId: liveServerId,
  });
  const chromeImportId = officialChromeImportPreviewId({
    eligible: chromeImportEligible,
    liveServerId,
    browseId: browseIdRef.current,
    httpPage: chromeImportHttpPage,
  });
  const chromeImport = useOfficialChromeImport(chromeImportId, cwd, pageUrl || previewUrl || "");

  const previewTargetRef = useRef(previewTarget);
  previewTargetRef.current = previewTarget;

  useEffect(() => {
    // Official `tt` html/svg/pdf/video uses Launch host view, not the srcDoc file chrome.
    if (previewTarget?.path && isOfficialTtHtmlPreviewPath(previewTarget.path)) {
      setSelectedTarget(null);
      return;
    }
    setSelectedTarget(previewTarget);
  }, [previewTarget]);

  // Official TI auto-start residual: getConfiguredServices(cwd) → empty ⇒ no-config;
  // first service ⇒ startFromConfig; failure ⇒ start-failed.
  // Residual Nr previewServerId restore: reattach saved durable serverId before startFromConfig.
  useEffect(() => {
    let alive = true;
    const cwd = session?.cwd || landingCwd || undefined;
    // Official RS sessionId is m?.id??null — draft still probes launch.json at landing cwd.
    // Remote session stays no-config here (JS remote preview). Local-or-null is TI/RS.
    if (sessionRef?.type === "remote" || !cwd) {
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
    const ttPath = previewTargetRef.current?.path;
    const holdingTt = Boolean(ttPath && isOfficialTtHtmlPreviewPath(ttPath));
    if (!holdingTt) {
      setPreviewUrl(null);
      setLiveServerId(null);
      liveServerIdRef.current = null;
    }
    setSelectionMode(false);
    setViewport(null);
    setSketchMode(false);
    setSketchBackdrop(null);
    sketchGenRef.current++;
    void (async () => {
      const launch = launchBridge();
      try {
        // Residual: restored previewServerIdBySession[session] → try getPreviewUrl before start.
        const restoredServerId = sessionRef?.id
          ? officialPeekPreviewServerId(sessionRef.id, sidePaneStore)
          : undefined;
        if (restoredServerId) {
          try {
            const url = (await launch?.getPreviewUrl?.(restoredServerId)) ?? null;
            if (!alive) return;
            // Official Or: live chrome only with a running page. Crop 43 empty is
            // Globe + Browse with Claude until Detect / a live URL.
            if (typeof url === "string" && url.length > 0) {
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
            /* fall through to empty */
          }
        }
        // Official Or/gr: do not auto startFromConfig on pane open.
        // Official `tt` already bound a file URL — do not clobber it with empty.
        const ttPath = previewTargetRef.current?.path;
        if (ttPath && isOfficialTtHtmlPreviewPath(ttPath)) {
          /* keep tt previewUrl */
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
  }, [landingCwd, session?.cwd, sessionRef?.id, sessionRef?.type, sidePaneStore]);

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

  // Official setPreviewColorScheme residual — light/dark emulate; system leaves page default.
  useEffect(() => {
    if (!liveServerId) return;
    const launch = launchBridge();
    if (colorScheme === "system") return;
    if (typeof launch?.setPreviewColorScheme !== "function") return;
    void launch.setPreviewColorScheme(liveServerId, colorScheme);
  }, [liveServerId, colorScheme]);

  // Official Li viewport: Responsive → clearPreviewViewport; else setPreviewViewport(w,h).
  useEffect(() => {
    if (!liveServerId) return;
    const launch = launchBridge();
    if (!viewport) {
      if (typeof launch?.clearPreviewViewport === "function") {
        void launch.clearPreviewViewport(liveServerId);
      }
      return;
    }
    if (typeof launch?.setPreviewViewport === "function") {
      void launch.setPreviewViewport(liveServerId, viewport.width, viewport.height);
    }
  }, [liveServerId, viewport]);

  useEffect(() => {
    if (!cwd) return;
    const launch = launchBridge();
    if (typeof launch?.getAutoVerify !== "function") return;
    void launch.getAutoVerify(cwd).then((value) => {
      if (typeof value === "boolean") setAutoVerify(value);
    });
  }, [cwd]);

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

  const onColorScheme = useCallback((scheme: OfficialPreviewColorScheme) => {
    setColorScheme(scheme);
  }, []);

  const onViewport = useCallback((preset: OfficialPreviewViewport | null) => {
    setViewport(preset);
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

  useEffect(() => {
    let alive = true;
    const target = selectedTarget;
    if (!target || (!sessionRef && !landingCwd)) {
      setState({ isLoading: false });
      return () => {
        alive = false;
      };
    }
    setState({ isLoading: true });
    const load = isPreviewImagePath(target.path)
      ? sessionRef && bridge.readSessionImageAsDataUrl
        ? bridge.readSessionImageAsDataUrl(sessionRef.id, target.path).then((dataUrl) => ({
            dataUrl: dataUrl ?? undefined,
          }))
        : Promise.reject(new Error("Image preview is unavailable."))
      : readPreviewText(bridge, sessionRef?.id ?? "", target.path, landingCwd).then((result) => ({
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
  }, [bridge, landingCwd, selectedTarget, sessionRef]);

  const onSetup = useCallback(() => {
    // Official S → submitToChat(detect prompt). Prefer true submit over composer attach-only.
    if (actions?.submitToChat) {
      void actions.submitToChat(OFFICIAL_PREVIEW_SETUP_PROMPT);
      return;
    }
    actions?.attachAsContext?.(OFFICIAL_PREVIEW_SETUP_PROMPT);
  }, [actions]);

  const activePreviewId = liveServerId ?? (pageUrl ? browseIdRef.current : "");

  const refreshNav = useCallback(async (id: string) => {
    const launch = launchBridge();
    const state = await launch?.getNavigationState?.(id);
    if (!state) return;
    setNav({
      canGoBack: state.canGoBack === true,
      canGoForward: state.canGoForward === true,
    });
    if (typeof state.url === "string" && state.url && state.url !== "about:blank") {
      setPageUrl(state.url);
      setPreviewUrl(state.url);
    }
  }, []);

  const onNavigate = useCallback((raw: string) => {
    const url = officialPreviewNavigateUrl(raw);
    if (!url) return;
    const launch = launchBridge();
    const id = liveServerIdRef.current || browseIdRef.current;
    const hostOwned = typeof launch?.showPreview === "function";
    // Official `_Oi`: loadURL first; only then live chrome. Painting host
    // before navigatePreview returns leaves an empty Preview pane.
    void (async () => {
      let navigated = !hostOwned;
      if (typeof launch?.navigatePreview === "function") {
        try {
          const result = await launch.navigatePreview(id, url);
          navigated = officialNavigatePreviewSucceeded(result, hostOwned);
        } catch {
          navigated = false;
        }
      }
      if (!navigated) return;
      liveServerIdRef.current = id;
      setLiveServerId(id);
      setPreviewUrl(url);
      setPageUrl(url);
      setHostMode(hostOwned);
      setStartError(null);
      setProbeDone(true);
      void refreshNav(id);
    })();
  }, [refreshNav]);

  const onRunServer = useCallback((name: string) => {
    const launch = launchBridge();
    if (!cwd) return;
    void launch?.startFromConfig?.(cwd, name).then(async (started) => {
      if (!started?.serverId) {
        if (started?.error && started.error !== "launch_disabled") {
          setStartError({ kind: "start-failed", message: started.error });
          if (started.error) {
            void actions?.submitToChat?.(
              `Preview dev server failed to start:\n\`\`\`\n${started.error}\n\`\`\``,
            );
          }
        }
        return;
      }
      const url = (await launch?.getPreviewUrl?.(started.serverId)) ?? null;
      if (typeof url === "string" && url.length > 0) {
        liveServerIdRef.current = started.serverId;
        setLiveServerId(started.serverId);
        setPreviewUrl(url);
        setPageUrl(url);
        setHostMode(typeof launch?.showPreview === "function");
        setStartError(null);
        sidePaneStore.getState().bindPreviewServer(started.serverId);
        void launch?.navigatePreview?.(started.serverId, url);
      } else {
        setStartError({ kind: "start-failed" });
      }
    });
  }, [actions, cwd, sidePaneStore]);

  const onStopServer = useCallback((serverId: string) => {
    void launchBridge()?.stopServer?.(serverId);
  }, []);

  const onBack = useCallback(() => {
    const id = liveServerIdRef.current;
    if (!id) return;
    void Promise.resolve(launchBridge()?.goBack?.(id)).then(() => refreshNav(id));
  }, [refreshNav]);

  const onForward = useCallback(() => {
    const id = liveServerIdRef.current;
    if (!id) return;
    void Promise.resolve(launchBridge()?.goForward?.(id)).then(() => refreshNav(id));
  }, [refreshNav]);

  const onReloadLive = useCallback(() => {
    const id = liveServerIdRef.current;
    if (!id) return;
    void launchBridge()?.refreshPreview?.(id);
  }, []);

  const onOpenExternal = useCallback(() => {
    const id = liveServerIdRef.current;
    const launch = launchBridge();
    if (id && typeof launch?.openPreviewInBrowser === "function") {
      void launch.openPreviewInBrowser(id);
      return;
    }
    const url = pageUrl || previewUrl;
    if (!url || !officialPreviewIsHttpUrl(url)) return;
    const web = (window as Window & {
      "claude.web"?: { CoworkArtifactBridge?: { openExternalUrl?: (href: string) => Promise<unknown> } };
    })["claude.web"];
    void web?.CoworkArtifactBridge?.openExternalUrl?.(url);
  }, [pageUrl, previewUrl]);

  const onCopyUrl = useCallback(() => {
    const url = pageUrl || previewUrl;
    if (!url || !officialPreviewIsHttpUrl(url)) return;
    void navigator.clipboard?.writeText(url);
  }, [pageUrl, previewUrl]);

  const onScreenshot = useCallback(() => {
    const id = liveServerIdRef.current;
    if (!id) return;
    const launch = launchBridge();
    if (typeof launch?.exportPreview === "function") {
      void launch.exportPreview(id, "screenshot");
      return;
    }
    void Promise.resolve(launch?.capturePreviewScreenshot?.(id)).then((raw) => {
      if (!raw) return;
      const fs = (window as Window & {
        "claude.web"?: {
          FileSystem?: {
            writeFileDownload?: (name: string, data: string, options?: { encoding?: string }) => Promise<unknown>;
          };
        };
      })["claude.web"]?.FileSystem;
      void fs?.writeFileDownload?.("preview.png", raw, { encoding: "base64" });
    });
  }, []);

  /** Official TI `P(e)`: loadHtmlPreview + addHtmlFile + bindPreviewServer + setSidePane("preview").
   * Official loadHtmlPreview returns html-preview-* id; product Launch returns file:// URL —
   * only bind when the id is html-preview-* (do not persist file:// as previewServerId).
   */
  const applyHtmlFile = useCallback(async (picked: string) => {
    const launch = launchBridge();
    const loaded = await launch?.loadHtmlPreview?.(picked);
    const href =
      typeof loaded === "string" && (loaded.startsWith("file:") || loaded.startsWith("http"))
        ? loaded
        : picked.startsWith("file:")
          ? picked
          : `file://${picked}`;
    const boundId = isOfficialHtmlPreviewServerId(typeof loaded === "string" ? loaded : null)
      ? loaded as string
      : isOfficialHtmlPreviewServerId(liveServerIdRef.current)
        ? liveServerIdRef.current
        : browseIdRef.current;
    liveServerIdRef.current = boundId;
    setLiveServerId(boundId);
    setPreviewUrl(href);
    setPageUrl(href);
    setHostMode(typeof launch?.showPreview === "function");
    setStartError(null);
    setSelectedTarget({ path: picked });
    setProbeDone(true);
    sidePaneStore.getState().addHtmlFile(picked);
    if (isOfficialHtmlPreviewServerId(boundId)) {
      sidePaneStore.getState().bindPreviewServer(boundId);
    }
    sidePaneStore.getState().setSidePane("preview");
    void launch?.navigatePreview?.(boundId, href);
  }, [sidePaneStore]);

  // Official `tt` `a` already loadHtmlPreview + addHtmlFile + setSidePane("preview").
  // Bind Launch URL here so html/svg/pdf/video skip the srcDoc file chrome (`if (selectedTarget)`).
  useEffect(() => {
    const path = previewTarget?.path;
    if (!path || !isOfficialTtHtmlPreviewPath(path)) return;
    const launch = launchBridge();
    const href = path.startsWith("file:") ? path : `file://${path}`;
    const boundId = isOfficialHtmlPreviewServerId(liveServerIdRef.current)
      ? liveServerIdRef.current
      : browseIdRef.current;
    liveServerIdRef.current = boundId;
    setLiveServerId(boundId);
    setPreviewUrl(href);
    setPageUrl(href);
    setHostMode(typeof launch?.showPreview === "function");
    setStartError(null);
    setProbeDone(true);
    void launch?.navigatePreview?.(boundId, href);
  }, [previewTarget?.path]);

  const onOpenHtml = useCallback(() => {
    // Official TI `T`: if (!m) return; await Ci?.pickHtmlFile?.(m); picked && P(picked).
    if (!cwd) return;
    const pick = launchBridge()?.pickHtmlFile;
    if (typeof pick !== "function") return;
    void pick(cwd).then(async (picked) => {
      if (!picked) return;
      await applyHtmlFile(picked);
    });
  }, [applyHtmlFile, cwd]);

  const onOpenHtmlFile = useCallback((path: string) => {
    void applyHtmlFile(path);
  }, [applyHtmlFile]);

  const onAllowedSites = useCallback(() => {
    setAllowedSitesOpen(true);
  }, []);

  const onAutoVerify = useCallback(() => {
    setAutoVerifyPrompt(true);
  }, []);

  const onConfirmAutoVerify = useCallback(() => {
    const next = !autoVerify;
    setAutoVerify(next);
    setAutoVerifyPrompt(false);
    if (cwd) void launchBridge()?.setAutoVerify?.(cwd, next);
  }, [autoVerify, cwd]);

  const onAddServer = useCallback(() => {
    if (actions?.submitToChat) {
      void actions.submitToChat(OFFICIAL_PREVIEW_ADD_SERVER_PROMPT);
      return;
    }
    actions?.attachAsContext?.(OFFICIAL_PREVIEW_ADD_SERVER_PROMPT);
  }, [actions]);

  const onExport = useCallback(() => {
    const id = liveServerIdRef.current;
    if (!id) return;
    void launchBridge()?.exportPreview?.(id, "screenshot");
  }, []);

  const onExportHtml = useCallback(() => {
    const id = liveServerIdRef.current;
    if (!id) return;
    void launchBridge()?.exportPreview?.(id, "file");
  }, []);

  const onPreviewStorage = useCallback((value: "none" | "shared" | "session") => {
    setPreference("launchPreviewStorage", value);
    setPreference("launchPreviewPersistSession", value !== "none");
  }, [setPreference]);

  const onClearBrowsingData = useCallback(() => {
    const id = liveServerIdRef.current;
    if (!id) return;
    void launchBridge()?.clearPreviewBrowsingData?.(id);
  }, []);

  const onToggleLogs = useCallback(() => {
    setLogsExpanded((current) => {
      const next = !current;
      writePreviewLogsExpanded(next);
      return next;
    });
  }, []);

  const onSetLinkDestination = useCallback(() => {
    setTranscriptLinksOpen(true);
  }, []);

  const onToggleLinksInPreview = useCallback(() => {
    setLinksInPreview((current) => {
      const next = !current;
      writeTranscriptLinksInPreview(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const launch = launchBridge();
      const [active, configured] = await Promise.all([
        launch?.activeServers_$store$_getState?.() ?? [],
        cwd ? launch?.getConfiguredServices?.(cwd) ?? [] : [],
      ]);
      if (!alive) return;
      const running = Array.isArray(active) ? active : [];
      const byName = new Map(running.map((row) => [row.name ?? "", row]));
      const rows: OfficialPreviewServerRow[] = [];
      for (const cfg of configured ?? []) {
        const live = byName.get(cfg.name);
        rows.push({
          id: live?.serverId ? `srv:${live.serverId}` : `cfg:${cfg.name}`,
          label: cfg.name,
          detail: live?.port ? `:${live.port}` : cfg.port ? `:${cfg.port}` : undefined,
          running: live?.status === "running" || live?.status === "starting",
          starting: live?.status === "starting",
        });
      }
      setServers(rows);
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 2000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [cwd]);

  useEffect(() => {
    const id = liveServerId;
    if (!id) return;
    void refreshNav(id);
    const timer = window.setInterval(() => void refreshNav(id), 1000);
    return () => window.clearInterval(timer);
  }, [liveServerId, refreshNav]);

  useEffect(() => {
    if (!logsExpanded) {
      setLogs([]);
      return;
    }
    const id = liveServerId;
    if (!id) return;
    let alive = true;
    const tick = async () => {
      const next = await launchBridge()?.getLogs?.(id);
      if (!alive) return;
      if (Array.isArray(next)) setLogs(next);
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 1000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [liveServerId, logsExpanded]);

  const hasPage = Boolean(previewUrl);
  const httpPage = officialPreviewIsHttpUrl(pageUrl || previewUrl || "");
  const canOpenHtml = typeof launchBridge()?.pickHtmlFile === "function";
  const selectedHtmlPath = officialSelectedHtmlFilePath(
    boundPreviewServerId,
    htmlFiles,
    selectedTarget?.path ?? previewTarget?.path,
  );
  const htmlFileItems = useMemo(
    () => officialHtmlFilesGlobeItems(htmlFiles, cwd, selectedHtmlPath),
    [cwd, htmlFiles, selectedHtmlPath],
  );
  const canManageAllowedSites = typeof launchBridge()?.getPreviewAllowedOrigins === "function";
  const canAutoVerify = Boolean(cwd) && typeof launchBridge()?.getAutoVerify === "function";
  const canAddServer = Boolean(actions?.submitToChat || actions?.attachAsContext);
  const canExport = typeof launchBridge()?.exportPreview === "function";
  const canToggleLogs = Boolean(liveServerId) && typeof launchBridge()?.getLogs === "function";
  const canSetLinkDestination = typeof launchBridge()?.openExternalLinkInPreview === "function";
  const canSetPreviewStorage = typeof setPreference === "function";
  const canClearBrowsingData = Boolean(liveServerId) && typeof launchBridge()?.clearPreviewBrowsingData === "function";
  const canExportHtml = canExport && Boolean(pageUrl.startsWith("file:") || previewUrl?.startsWith("file:"));
  const canImportChromeLogins = Boolean(chromeImport.onMenuImport);
  const canUseImportedCookies = Boolean(chromeImport.onMenuUseImported);
  const previewStorage =
    preferences.launchPreviewStorage === "shared" || preferences.launchPreviewStorage === "session"
      ? preferences.launchPreviewStorage
      : "none";
  useEffect(() => {
    publishOfficialPreviewChrome({
      browseId: browseIdRef.current,
      canGoBack: nav.canGoBack,
      canGoForward: nav.canGoForward,
      isHtmlPreview: Boolean(boundPreviewServerId?.startsWith("html-preview-")),
      canReload: hasPage,
      canSelect: hasPage,
      canOpenExternal: httpPage,
      canCopyUrl: httpPage,
      canScreenshot: hasPage,
      canAnnotate: hasPage,
      canOpenHtml,
      htmlFileItems,
      onOpenHtmlFile,
      canManageAllowedSites,
      canAutoVerify,
      canAddServer,
      canExport,
      canToggleLogs,
      logsExpanded,
      canSetLinkDestination,
      linksInPreview,
      previewStorage,
      canSetPreviewStorage,
      canClearBrowsingData,
      canExportHtml,
      canImportChromeLogins,
      canUseImportedCookies,
      hasPage,
      pageUrl: pageUrl || previewUrl || "",
      servers,
      viewport,
      colorScheme,
      autoVerify,
      onBack,
      onForward,
      onReload: onReloadLive,
      onSelect: onToggleSelectionMode,
      onOpenExternal,
      onCopyUrl,
      onScreenshot,
      onOpenHtml,
      onAnnotate: onToggleSketchMode,
      onViewport,
      onColorScheme,
      onAllowedSites,
      onAutoVerify,
      onAddServer,
      onExport,
      onToggleLogs,
      onSetLinkDestination,
      onToggleLinksInPreview,
      onPreviewStorage,
      onClearBrowsingData,
      onExportHtml,
      onImportChromeLogins: chromeImport.onMenuImport ?? (() => undefined),
      onUseImportedCookies: chromeImport.onMenuUseImported ?? (() => undefined),
      onNavigate,
      onRunServer,
      onStopServer,
      onDetect: onSetup,
      selectionOn: selectionMode,
    });
    return () => publishOfficialPreviewChrome(null);
  }, [
    autoVerify,
    boundPreviewServerId,
    canAddServer,
    canAutoVerify,
    canExport,
    canManageAllowedSites,
    canOpenHtml,
    htmlFileItems,
    onOpenHtmlFile,
    canClearBrowsingData,
    canExportHtml,
    canImportChromeLogins,
    canUseImportedCookies,
    chromeImport.onMenuImport,
    chromeImport.onMenuUseImported,
    canSetLinkDestination,
    canSetPreviewStorage,
    canToggleLogs,
    colorScheme,
    cwd,
    hasPage,
    httpPage,
    linksInPreview,
    logsExpanded,
    nav.canGoBack,
    nav.canGoForward,
    onAddServer,
    onAllowedSites,
    onAutoVerify,
    onBack,
    onColorScheme,
    onCopyUrl,
    onClearBrowsingData,
    onExport,
    onExportHtml,
    onForward,
    onNavigate,
    onOpenExternal,
    onOpenHtml,
    onReloadLive,
    onRunServer,
    onScreenshot,
    onSetLinkDestination,
    onSetup,
    onStopServer,
    onPreviewStorage,
    onToggleLinksInPreview,
    onToggleLogs,
    onToggleSelectionMode,
    onToggleSketchMode,
    onViewport,
    pageUrl,
    previewStorage,
    previewUrl,
    selectionMode,
    servers,
    viewport,
  ]);

  // File / image path preview. Official `tt` html/svg/pdf/video uses Launch (`applyHtmlFile`), not srcDoc.
  if (selectedTarget && !isOfficialTtHtmlPreviewPath(selectedTarget.path)) {
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

  const chromeDialogs = (
    <>
      <AllowedSitesModal open={allowedSitesOpen} onClose={() => setAllowedSitesOpen(false)} />
      <OfficialModal
        isOpen={autoVerifyPrompt}
        onClose={() => setAutoVerifyPrompt(false)}
        title={autoVerify ? previewText.disableAutoVerify : previewText.enableAutoVerify}
        width="w-[420px]"
      >
        <p className="m-0 text-body text-secondary">
          {autoVerify ? previewText.autoVerifyDisableBody : previewText.autoVerifyEnableBody}
        </p>
        <div className="mt-md flex justify-end gap-sm">
          <OfficialButton onClick={() => setAutoVerifyPrompt(false)} size="small" variant="uncontained">
            Cancel
          </OfficialButton>
          <OfficialButton onClick={onConfirmAutoVerify} size="small" variant="primary">
            {autoVerify ? previewText.disable : previewText.enable}
          </OfficialButton>
        </div>
      </OfficialModal>
      <OfficialPreviewTranscriptLinksModal
        isOpen={transcriptLinksOpen}
        onClose={() => {
          setTranscriptLinksOpen(false);
          setLinksInPreview(readTranscriptLinksInPreview());
        }}
      />
      {chromeImport.modal}
    </>
  );

  const logsSource = (() => {
    const live = servers.find((row) => row.id === `srv:${liveServerId}` && row.running);
    if (!live?.detail) return undefined;
    const port = Number(live.detail.replace(/^:/, ""));
    if (!Number.isFinite(port) || port <= 0) return undefined;
    return { name: live.label, port };
  })();

  const logsPanel =
    logsExpanded && liveServerId ? (
      <OfficialPreviewLogsPanel logs={logs} onClose={onToggleLogs} source={logsSource} />
    ) : null;

  // Official live Preview: host WebContentsView via showPreview(bounds) when available;
  // iframe fallback only when bridge lacks showPreview (non-desktop / tests).
  // Header chrome (jr/ta/Ko/Q) lives in EpitaxySidePanes — no inner CS toolbar.
  if (previewUrl && !startError) {
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
          {chromeDialogs}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              ref={hostSurfaceRef}
              className="h-full w-full min-h-0 bg-white"
              data-launch-preview-host={liveServerId}
              data-viewport={viewport ? `${viewport.width}x${viewport.height}` : "responsive"}
              data-selection-mode={selectionMode ? "1" : "0"}
              data-sketch-mode={sketchMode ? "1" : "0"}
              // Host paints WebContentsView over this rect; keep empty for layout.
              // During sketchMode host view is hidden so overlay receives pointers.
            />
            {annotateOverlay}
            {chromeImport.prompt}
          </div>
          {logsPanel}
        </div>
      );
    }
    if (previewUrl) {
      return (
        <div className="h-full min-w-0 flex flex-col bg-bg-000">
          {chromeDialogs}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {!sketchMode ? (
              <iframe className="h-full w-full min-h-0 flex-1 border-0 bg-white" src={previewUrl} title="Preview" />
            ) : null}
            {annotateOverlay}
            {chromeImport.prompt}
          </div>
          {logsPanel}
        </div>
      );
    }
  }

  // Official cS feed: loading until probe finishes, then no-config / start-failed.
  return (
    <div className="relative h-full min-w-0 flex flex-col bg-bg-000">
      {chromeDialogs}
      <OfficialLaunchActivityFeed
        loadingLabel={probeDone ? null : "Setting up preview"}
        onSetup={onSetup}
        startError={probeDone ? startError : null}
      />
    </div>
  );
}
