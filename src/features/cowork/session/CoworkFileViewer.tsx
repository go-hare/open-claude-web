/**
 * Official Gzt file detail drawer content for local_session (index-BELzQL5P.pretty.js Gzt).
 * Shell: flex h-full flex-col relative outline-none
 * Header: flex items-center justify-between px-2 py-2 bg-bg-000 gap-2
 * Body: flex-1 min-h-0 bg-bg-000 overflow-auto
 * Load: FileSystem.readLocalFile(sessionId, encodeURIComponent(path)) — see loadCoworkFileDetail.
 * Content: kzt/wzt subset (markdown preview, raw code, image, nonrenderable).
 *
 * Official body gate (Gzt ~216565): if (yt && viewing !== "raw") return ONLY <Izt … />;
 * yt = local_session && isEnabled && Nzt(path) && !nativePreviewFallback.
 * Official Izt onRendered is analytics only; failure alone calls onFallback and leaves native.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { useFrameContext } from "../../../stores/frameContext";
import { CoworkButton } from "../ui/CoworkButton";
import {
  coworkFileBasename,
  coworkFileDisplayParts,
  coworkNativePreviewShowSucceeded,
  coworkSkillFrontmatterLabel,
  encodeCoworkNativePreviewPath,
  formatCoworkFileCodeContent,
  isCoworkNativePreviewPath,
  isCoworkOfficeNativePreviewPath,
  parseCoworkSkillMdFrontmatter,
  resolveCoworkFileDisplay,
  stripCoworkComputerPrefix,
  type CoworkFileDetailState,
  type CoworkFileViewMode,
} from "./coworkFileDetailModel";
import type { CoworkStreamingFileEntry } from "./chatResource/coworkChatResourceStore";
import { useElectronWebContentsViewOccluded } from "./electronWebContentsViewOcclusion";
import { loadCoworkFileDetail } from "./loadCoworkFileDetail";
import { coworkComputerLinkPath } from "./transcript/coworkComputerLink";
import type { CoworkFileTarget } from "./transcript/CoworkTranscriptActions";
import { useCoworkTranscriptActions } from "./transcript/CoworkTranscriptActions";
import { CoworkMarkdownTree, parseCoworkMarkdown } from "./transcript/CoworkMarkdown";

export function CoworkFileViewer({
  goBack,
  onClose,
  sessionId,
  showBackButton = false,
  streamingFile,
  target,
}: {
  goBack?: () => void;
  onClose: () => void;
  sessionId: string;
  showBackButton?: boolean;
  /** Official cFt → Gzt streamingFile: C.get(g.path). */
  streamingFile?: CoworkStreamingFileEntry;
  target: CoworkFileTarget;
}) {
  const path = target.path;
  const actions = useCoworkTranscriptActions();
  const [state, setState] = useState<CoworkFileDetailState>({ isLoading: true });
  const [viewing, setViewing] = useState<CoworkFileViewMode>("normal");
  const [copied, setCopied] = useState(false);
  // Official gt via module-cached isEnabled (Ezt); do not reset false on every path change.
  const nativePreviewHostEnabled = useCoworkNativePreviewEnabled();
  const [nativePreviewFailed, setNativePreviewFailed] = useState(false);
  // Official Gzt resets viewing + nativePreviewFallback when selected path changes (bt(false)).
  // Do this during render so the first paint of a new path does not keep a stale fallback.
  const [nativePreviewPath, setNativePreviewPath] = useState(path);
  if (path !== nativePreviewPath) {
    setNativePreviewPath(path);
    setViewing("normal");
    setNativePreviewFailed(false);
  }
  const onMarkdownLinkClick = useCallback((event: MouseEvent<HTMLAnchorElement>, url: string) => {
    const linkPath = coworkComputerLinkPath(url);
    if (!linkPath) return;
    event.preventDefault();
    actions?.openFile({ path: linkPath, toolType: "create_file" });
  }, [actions]);
  const meta = useMemo(() => {
    // Official Gzt ke: streamingFile.renderAs === Markdown forces markdown syntax into Dme.
    const syntaxOverride = streamingFile?.renderAs === "markdown" ? "markdown" : undefined;
    return resolveCoworkFileDisplay(path, syntaxOverride);
  }, [path, streamingFile?.renderAs]);
  const titleParts = useMemo(() => {
    if (target.title?.trim()) return { displayExt: null as string | null, displayName: target.title.trim() };
    return coworkFileDisplayParts(path);
  }, [path, target.title]);
  // Official: void 0 !== g?.content ? M(g.content) : fs()
  const inlineContent = streamingFile?.content ?? target.content;

  useEffect(() => {
    let alive = true;
    // Live stream updates: apply content without spinner flash when already showing text.
    const preferInline = typeof inlineContent === "string";
    if (!preferInline) setState((current) => (current.content ? { ...current, isLoading: true } : { isLoading: true }));
    void loadCoworkFileDetail(sessionId, path, inlineContent)
      .then((content) => {
        if (!alive) return;
        setState({ content, isLoading: false });
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
  }, [inlineContent, path, sessionId]);

  const text = state.content?.kind === "text" ? state.content.text : undefined;
  const onCopy = useCallback(() => {
    if (text === undefined) return;
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  }, [text]);

  const onOpenLocal = useCallback(() => {
    const localPath = stripCoworkComputerPrefix(path);
    void desktopBridge.FileSystem.openLocalFile?.(sessionId, encodeURIComponent(localPath));
  }, [path, sessionId]);

  const showToggle = meta.showViewToggle && text !== undefined;
  // Official yt = local_session && isEnabled === true && Nzt(path) && !fallback; exclusive Izt body.
  const nativePreview =
    nativePreviewHostEnabled === true &&
    isCoworkNativePreviewPath(path) &&
    !nativePreviewFailed &&
    viewing === "normal";
  const onNativePreviewFallback = useCallback(() => {
    const bag = ((globalThis as { __nativeFallbackLog?: unknown[] }).__nativeFallbackLog ??= []);
    bag.push({
      t: Date.now(),
      path,
      enabled: nativePreviewHostEnabled,
      stack: new Error("native-fallback").stack?.split("\n").slice(0, 8),
    });
    if (bag.length > 30) bag.splice(0, bag.length - 30);
    setNativePreviewFailed(true);
  }, [nativePreviewHostEnabled, path]);

  return (
    <div
      className="flex h-full flex-col relative outline-none"
      data-official-source="index-BELzQL5P.js:Gzt file detail shell"
      data-native-preview={nativePreview ? "native" : "content"}
      data-native-enabled={nativePreviewHostEnabled === true ? "true" : nativePreviewHostEnabled === false ? "false" : "pending"}
      data-native-failed={nativePreviewFailed ? "true" : "false"}
      data-native-nzt={isCoworkNativePreviewPath(path) ? "true" : "false"}
      data-native-viewing={viewing}
      tabIndex={-1}
    >
      <div
        className="flex items-center justify-between px-2 py-2 bg-bg-000 gap-2"
        data-official-source="index-BELzQL5P.js:Gzt header"
      >
        <div className="flex items-center gap-2 flex-1 overflow-hidden pl-3">
          {showToggle ? (
            <CoworkFileViewModeToggle onViewingChange={setViewing} viewing={viewing} />
          ) : null}
          <button
            className="text-sm font-normal text-text-200 truncate flex-1 min-w-0 text-left hover:underline hover:underline-offset-2 cursor-pointer bg-transparent border-0 p-0"
            onClick={onOpenLocal}
            title={path}
            type="button"
          >
            {titleParts.displayName}
            {titleParts.displayExt ? (
              <>
                <span className="text-text-400 opacity-50"> · </span>
                <span className="text-text-400">{titleParts.displayExt}</span>
              </>
            ) : null}
          </button>
          {copied ? (
            <span className="flex items-center gap-1 text-sm text-success-200 ml-2 mr-3 flex-shrink-0">
              Copied
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <CoworkButton
            ariaLabel="Copy"
            disabled={text === undefined}
            icon={copied ? "CheckSelection" : "CopySquareBehind"}
            onClick={onCopy}
          />
          <CoworkButton
            ariaLabel={showBackButton ? "Go back" : "Close"}
            icon="XCrossCloseMedium"
            onClick={showBackButton ? goBack : onClose}
          />
        </div>
      </div>
      <div
        className="flex-1 min-h-0 bg-bg-000 overflow-auto"
        data-official-source="index-BELzQL5P.js:Gzt body flex-1 min-h-0 bg-bg-000 overflow-auto"
      >
        {nativePreview ? (
          <CoworkNativeFilePreview
            filePath={path}
            onFallback={onNativePreviewFallback}
            sessionId={sessionId}
          />
        ) : (
          <CoworkFileDetailBody
            error={state.error}
            fileName={coworkFileBasename(path)}
            isLoading={state.isLoading}
            meta={meta}
            onMarkdownLinkClick={onMarkdownLinkClick}
            onOpenLocal={onOpenLocal}
            onRetry={() => {
              setState({ isLoading: true });
              void loadCoworkFileDetail(sessionId, path, inlineContent)
                .then((content) => setState({ content, isLoading: false }))
                .catch((error) =>
                  setState({
                    error: error instanceof Error ? error.message : String(error),
                    isLoading: false,
                  }),
                );
            }}
            state={state}
            title={titleParts.displayName}
            viewing={viewing}
          />
        )}
      </div>
    </div>
  );
}

const COWORK_NATIVE_PREVIEW_PARKED_BOUNDS = { x: -10_000, y: 0, width: 1, height: 1 };

/** Official module cache Ezt for CoworkFilePreview.isEnabled (Gzt ~215427–215443). */
let coworkNativePreviewEnabledCache: boolean | undefined;

type CoworkNativePreviewCapture = {
  cacheBuster?: string;
  filePath: string;
  height: number;
  sessionId: string;
  src: string;
  width: number;
};

function useCoworkNativePreviewEnabled(): boolean | undefined {
  const [enabled, setEnabled] = useState(coworkNativePreviewEnabledCache);
  useEffect(() => {
    if (coworkNativePreviewEnabledCache !== undefined) return;
    let cancelled = false;
    void Promise.resolve(desktopBridge.CoworkFilePreview.isEnabled())
      .then((value) => {
        coworkNativePreviewEnabledCache = value === true;
        if (!cancelled) setEnabled(coworkNativePreviewEnabledCache);
      })
      .catch(() => {
        coworkNativePreviewEnabledCache = false;
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return enabled;
}

function CoworkNativeFilePreview({
  cacheBuster,
  filePath,
  onFallback,
  sessionId,
}: {
  cacheBuster?: string;
  filePath: string;
  onFallback: () => void;
  sessionId: string;
}) {
  const placeholderRef = useRef<HTMLDivElement>(null);
  const showRef = useRef<(() => void) | null>(null);
  // Official Izt effect deps are only [sessionId, filePath, cacheBuster] — keep onFallback stable via ref.
  const onFallbackRef = useRef(onFallback);
  onFallbackRef.current = onFallback;
  const frame = useFrameContext();
  const overlayOccluded = useElectronWebContentsViewOccluded();
  const occluded = Boolean(frame?.moreOpen) || overlayOccluded;
  const occludedRef = useRef(occluded);
  const [loading, setLoading] = useState(true);
  const [capture, setCapture] = useState<CoworkNativePreviewCapture | null>(null);
  occludedRef.current = occluded;

  useEffect(() => {
    // Official Izt uses globalThis["claude.web"].CoworkFilePreview (lT). Prefer that, then desktopBridge.
    const placeholder = placeholderRef.current;
    const hostPreview =
      (typeof globalThis !== "undefined" &&
        (globalThis as { "claude.web"?: { CoworkFilePreview?: typeof desktopBridge.CoworkFilePreview } })["claude.web"]
          ?.CoworkFilePreview) ||
      desktopBridge.CoworkFilePreview;
    const showApi = hostPreview?.show;
    const hideApi = hostPreview?.hide;
    const bag = ((globalThis as { __nativeIztLog?: unknown[] }).__nativeIztLog ??= []);
    bag.push({
      t: Date.now(),
      phase: "effect",
      filePath,
      hasPlaceholder: Boolean(placeholder),
      showType: typeof showApi,
      host: hostPreview === desktopBridge.CoworkFilePreview ? "desktopBridge" : "claude.web",
    });
    if (bag.length > 40) bag.splice(0, bag.length - 40);
    if (!placeholder || typeof showApi !== "function") {
      placeholderRef.current?.setAttribute(
        "data-native-fallback-reason",
        !placeholder ? "missing-placeholder" : "missing-show-api",
      );
      bag.push({ t: Date.now(), phase: "immediate-fallback", filePath, hasPlaceholder: Boolean(placeholder), showType: typeof showApi });
      onFallbackRef.current();
      return;
    }
    setLoading(true);
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    let firstShow = true;
    const show = () => {
      if (cancelled) return;
      const rect = placeholder.getBoundingClientRect();
      // Drawer spring / first layout can report 0×0. Official clip rejects that as
      // invalid-bounds and Izt would permanently onFallback — wait for ResizeObserver.
      if (!occludedRef.current && (rect.width < 1 || rect.height < 1)) {
        placeholder.setAttribute("data-native-fallback-reason", `zero-size:${rect.width}x${rect.height}`);
        bag.push({ t: Date.now(), phase: "zero-size", filePath, rect: { w: rect.width, h: rect.height } });
        return;
      }
      const wasFirstShow = firstShow;
      firstShow = false;
      const bounds = occludedRef.current
        ? COWORK_NATIVE_PREVIEW_PARKED_BOUNDS
        : { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      placeholder.setAttribute("data-native-fallback-reason", "show-pending");
      bag.push({ t: Date.now(), phase: "show-call", filePath, bounds, occluded: occludedRef.current });
      void Promise.resolve(showApi(sessionId, encodeCoworkNativePreviewPath(filePath), bounds))
        .then((result: boolean | { ok: boolean; declineReason?: unknown; painted?: boolean }) => {
          if (cancelled) {
            bag.push({ t: Date.now(), phase: "show-cancelled", filePath, result });
            return;
          }
          // Official Izt: first completion ends spinner; ok alone keeps native, !ok falls back.
          // onRendered in official is analytics only and is not used as a content gate.
          const ok = coworkNativePreviewShowSucceeded(result);
          const reason =
            typeof result === "object" && result && "declineReason" in result
              ? String((result as { declineReason?: unknown }).declineReason ?? "")
              : "";
          placeholder.setAttribute(
            "data-native-fallback-reason",
            ok ? `ok:${String((result as { painted?: boolean }).painted)}` : `declined:${reason || "false"}`,
          );
          bag.push({ t: Date.now(), phase: "show-result", filePath, ok, result });
          if (wasFirstShow) setLoading(false);
          if (!ok) onFallbackRef.current();
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          placeholder.setAttribute(
            "data-native-fallback-reason",
            `ipc_error:${error instanceof Error ? error.message : String(error)}`,
          );
          bag.push({ t: Date.now(), phase: "show-error", filePath, error: String(error) });
          if (wasFirstShow) setLoading(false);
          onFallbackRef.current();
        });
    };
    const begin = () => {
      showRef.current = show;
      show();
      observer = new ResizeObserver(show);
      observer.observe(placeholder);
      window.addEventListener("resize", show);
    };

    if (isCoworkOfficeNativePreviewPath(filePath)) {
      void Promise.resolve(hostPreview.isVmReady?.() ?? desktopBridge.CoworkFilePreview.isVmReady())
        .then((ready) => {
          if (cancelled) return;
          if (ready) begin();
          else {
            setLoading(false);
            onFallbackRef.current();
          }
        })
        .catch(() => {
          if (!cancelled) begin();
        });
    } else {
      begin();
    }

    return () => {
      cancelled = true;
      showRef.current = null;
      observer?.disconnect();
      window.removeEventListener("resize", show);
      void Promise.resolve(hideApi?.() ?? desktopBridge.CoworkFilePreview.hide()).catch(() => {});
    };
    // Official Izt: [sessionId, filePath, cacheBuster] only (index-BELzQL5P Izt ~214532).
  }, [cacheBuster, filePath, sessionId]);

  // Official Izt park effect deps are only [occluded] (index-BELzQL5P ~214534–214564).
  // Path/session are stamped into capture state and gated by visibleCapture equality.
  useEffect(() => {
    if (!occluded) {
      showRef.current?.();
      return;
    }
    const placeholder = placeholderRef.current;
    const hostPreview =
      (typeof globalThis !== "undefined" &&
        (globalThis as { "claude.web"?: { CoworkFilePreview?: typeof desktopBridge.CoworkFilePreview } })["claude.web"]
          ?.CoworkFilePreview) ||
      desktopBridge.CoworkFilePreview;
    const parkApi = hostPreview?.parkAndCapture;
    if (typeof parkApi !== "function" || !placeholder) {
      showRef.current?.();
      return;
    }
    const rect = placeholder.getBoundingClientRect();
    let cancelled = false;
    void Promise.resolve(parkApi(COWORK_NATIVE_PREVIEW_PARKED_BOUNDS))
      .then(async (base64) => {
        if (cancelled || !base64) return;
        const src = `data:image/png;base64,${base64}`;
        const image = new Image();
        image.src = src;
        await image.decode().catch(() => {});
        if (!cancelled) {
          setCapture({
            cacheBuster,
            filePath,
            height: rect.height,
            sessionId,
            src,
            width: rect.width,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [occluded]);

  const visibleCapture =
    occluded &&
    capture?.sessionId === sessionId &&
    capture.filePath === filePath &&
    capture.cacheBuster === cacheBuster
      ? capture
      : null;

  return (
    <div ref={placeholderRef} className="h-full w-full relative overflow-hidden">
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="animate-spin text-text-300" name="Spinner" size="md" />
        </div>
      ) : null}
      {visibleCapture ? (
        <img
          alt=""
          className="pointer-events-none select-none"
          draggable={false}
          src={visibleCapture.src}
          style={{ width: visibleCapture.width, height: visibleCapture.height }}
        />
      ) : null}
    </div>
  );
}

function CoworkFileDetailBody({
  error,
  fileName,
  isLoading,
  meta,
  onMarkdownLinkClick,
  onOpenLocal,
  onRetry,
  state,
  title,
  viewing,
}: {
  error?: string;
  /** Official ohe basename for Czt/wzt fileName. */
  fileName: string;
  isLoading: boolean;
  meta: ReturnType<typeof resolveCoworkFileDisplay>;
  onMarkdownLinkClick?: (event: MouseEvent<HTMLAnchorElement>, url: string) => void;
  onOpenLocal: () => void;
  onRetry: () => void;
  state: CoworkFileDetailState;
  title: string;
  viewing: CoworkFileViewMode;
}) {
  // Official kzt → yzt loading spinner when isLoading && !content.
  if (isLoading && !state.content) {
    return (
      <div className="flex h-full items-center justify-center" data-official-source="index-BELzQL5P.js:yzt">
        <Icon className="animate-spin text-text-300" name="Spinner" size="md" />
      </div>
    );
  }
  // Official kzt → vzt error + Try again.
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full text-text-300 gap-4"
        data-official-source="index-BELzQL5P.js:vzt"
      >
        <div>{error}</div>
        <button className="rounded-md bg-bg-300 px-3 py-1.5 text-sm text-text-100" onClick={onRetry} type="button">
          Try again
        </button>
      </div>
    );
  }
  // Official kzt → Czt nonrenderable; fileName is basename (ohe) for q5e display parts.
  if (meta.displayFileType === "nonrenderable") {
    return <CoworkNonrenderableFileBody fileName={fileName} onOpenFile={onOpenLocal} />;
  }
  if (state.content?.kind === "image") {
    return (
      <div className="h-full p-5" data-official-source="index-BELzQL5P.js:wzt image">
        <div className="flex items-center justify-center w-full h-full">
          <img
            alt={title}
            className="w-auto h-auto max-w-full max-h-full object-contain"
            src={state.content.dataUrl}
          />
        </div>
      </div>
    );
  }
  if (state.content === undefined) return null;
  const text = state.content?.kind === "text" ? state.content.text : "";
  const isRaw = viewing !== "normal";
  // Official wzt: rich + normal uses sandbox when mime available; without native paint we keep
  // inert source (never allow-scripts+same-origin srcDoc). Raw/code falls through.
  if (meta.isHtml && !isRaw) {
    return (
      <div className="relative h-full" data-official-source="index-BELzQL5P.js:wzt rich plaintext fallback">
        <pre className="absolute inset-0 m-0 overflow-auto select-text p-4 font-mono text-[13px] leading-[18px] text-text-100 whitespace-pre-wrap" id="wiggle-file-content" tabIndex={0}>
          {text}
        </pre>
      </div>
    );
  }
  // Official wzt: ("code" === s || S) — markdown normal uses document padding; raw uses code branch.
  if (meta.isMarkdown && !isRaw) {
    return (
      <div className="relative h-full" data-official-source="index-BELzQL5P.js:wzt markdown normal">
        <div className="absolute inset-0 overflow-auto">
          <CoworkMarkdownDocumentBody fileName={fileName} onLinkClick={onMarkdownLinkClick} text={text} />
        </div>
      </div>
    );
  }
  // Official wzt code/raw: H(content, language) pretty-prints JSON; xzt monospaced lines.
  const codeText = formatCoworkFileCodeContent(text, meta.fileSyntax);
  return (
    <div className="relative h-full" data-official-source="index-BELzQL5P.js:wzt code/raw branch">
      <pre
        className="absolute inset-0 m-0 overflow-auto select-text p-4 font-mono text-[13px] leading-[18px] text-text-100 whitespace-pre-wrap"
        data-file-syntax={meta.fileSyntax}
        id="wiggle-file-content"
        tabIndex={0}
      >
        {codeText}
      </pre>
    </div>
  );
}

/** Official Czt nonrenderable body (index-BELzQL5P ~214107). fileName = ohe basename. */
function CoworkNonrenderableFileBody({
  fileName,
  onOpenFile,
}: {
  fileName: string;
  onOpenFile?: () => void;
}) {
  // Official Czt: const { displayName, displayExt } = q5e(fileName)
  const parts = coworkFileDisplayParts(fileName);
  const body = (
    <>
      <div className="p-6">
        <Icon className="text-text-400" name="Document" size="lg" />
      </div>
      <div className="text-center">
        <div className="text-text-100 font-medium text-lg">{parts.displayName}</div>
        {parts.displayExt ? <div className="text-text-300 text-sm">{parts.displayExt}</div> : null}
      </div>
      <div className="text-text-300">{onOpenFile ? "Click to open file" : "No preview available"}</div>
    </>
  );
  if (onOpenFile) {
    return (
      <button
        className="flex flex-col items-center justify-center h-full gap-4 w-full cursor-pointer hover:bg-bg-100 transition-colors"
        data-official-source="index-BELzQL5P.js:Czt"
        onClick={onOpenFile}
        type="button"
      >
        {body}
      </button>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4" data-official-source="index-BELzQL5P.js:Czt">
      {body}
    </div>
  );
}

/**
 * Official wzt markdown document branch + gzt SkillMdContent when fileName is SKILL.md
 * and frontmatter has description / extra fields (index-BELzQL5P ~214188 / gzt).
 */
function CoworkMarkdownDocumentBody({
  fileName,
  onLinkClick,
  text,
}: {
  fileName: string;
  onLinkClick?: (event: MouseEvent<HTMLAnchorElement>, url: string) => void;
  text: string;
}) {
  const baseName = fileName.split(/[/\\]/).pop() ?? fileName;
  const skillParsed = useMemo(() => {
    if (baseName !== "SKILL.md") return null;
    const parsed = parseCoworkSkillMdFrontmatter(text);
    if (parsed.description === null && parsed.otherFields.length === 0) return null;
    return parsed;
  }, [baseName, text]);

  if (skillParsed) {
    return (
      <div
        className="mx-auto w-full max-w-3xl leading-[1.65rem] py-4 pl-6 pr-6 md:py-6 md:pl-11 md:pr-11"
        data-official-source="index-BELzQL5P.js:gzt SkillMdContent"
        id="wiggle-file-content"
        tabIndex={0}
      >
        {skillParsed.description ? (
          <div className="mt-2">
            <div className="mb-3 text-xs text-text-500">
              Claude uses these descriptions when deciding which skills to use in chat.
            </div>
            <div className="font-claude-response epitaxy-markdown">
              <CoworkMarkdownTree
                onLinkClick={onLinkClick}
                profile="assistant"
                root={parseCoworkMarkdown(skillParsed.description)}
                source={skillParsed.description}
              />
            </div>
          </div>
        ) : null}
        {skillParsed.otherFields.length > 0 ? (
          <div className="grid grid-cols-[max-content_1fr] items-baseline gap-x-8 gap-y-4 mt-6">
            {skillParsed.otherFields.map((field, index) => (
              <div className="contents" key={`${field.key}-${index}`}>
                <div className="text-text-400 text-sm font-medium">{coworkSkillFrontmatterLabel(field.key)}</div>
                <p className="text-text-100">{field.value}</p>
              </div>
            ))}
          </div>
        ) : null}
        {skillParsed.description || skillParsed.otherFields.length > 0 ? (
          skillParsed.content ? <div className="mt-6" /> : null
        ) : null}
        {skillParsed.content ? (
          <div className="font-claude-response epitaxy-markdown">
            <CoworkMarkdownTree
              onLinkClick={onLinkClick}
              profile="assistant"
              root={parseCoworkMarkdown(skillParsed.content)}
              source={skillParsed.content}
            />
          </div>
        ) : null}
      </div>
    );
  }

  const root = parseCoworkMarkdown(text);
  return (
    <div
      className="mx-auto w-full max-w-3xl leading-[1.65rem] py-4 pl-6 pr-6 md:py-6 md:pl-11 md:pr-11"
      data-official-source="index-BELzQL5P.js:wzt markdown document padding"
      id="wiggle-file-content"
      tabIndex={0}
    >
      <div className="font-claude-response epitaxy-markdown">
        <CoworkMarkdownTree onLinkClick={onLinkClick} profile="assistant" root={root} source={text} />
      </div>
    </div>
  );
}

/** Official _zt FileViewModeToggle subset: Preview / Code. */
function CoworkFileViewModeToggle({
  onViewingChange,
  viewing,
}: {
  onViewingChange: (mode: CoworkFileViewMode) => void;
  viewing: CoworkFileViewMode;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-md bg-bg-200 p-0.5 flex-shrink-0" data-official-source="index-BELzQL5P.js:_zt FileViewModeToggle">
      <button
        aria-label="Preview"
        aria-pressed={viewing === "normal"}
        className={`inline-flex h-7 w-7 items-center justify-center rounded ${viewing === "normal" ? "bg-bg-000 text-text-100" : "text-text-400 hover:text-text-200"}`}
        onClick={() => onViewingChange("normal")}
        type="button"
      >
        <Icon name="Eye" size="sm" />
      </button>
      <button
        aria-label="Code"
        aria-pressed={viewing === "raw"}
        className={`inline-flex h-7 w-7 items-center justify-center rounded ${viewing === "raw" ? "bg-bg-000 text-text-100" : "text-text-400 hover:text-text-200"}`}
        onClick={() => onViewingChange("raw")}
        type="button"
      >
        <Icon name="Code" size="sm" />
      </button>
    </div>
  );
}
