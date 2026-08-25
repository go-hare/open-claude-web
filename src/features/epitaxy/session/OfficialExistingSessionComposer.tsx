/**
 * Official existing-session composer (TipTap + footer + usage) — c11959232 / c360a9e1c Effort.
 * Effort chip is OfficialComposerFooter → OfficialEffortControl (not Models extraSections list).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { desktopBridge, type SessionSummary } from "../../../adapters/desktopBridge";
import type { LocalSessionsBridge, SendMessageInput } from "../../../adapters/desktopBridge/types";
import { OfficialRNtPlaceholder } from "../../shared/officialRNtPlaceholder";
import { officialTiptapEditorAttributes } from "../../shared/officialTiptapEditorAttributes";
import { handleEmptyDocBeforeInput } from "../../shared/tiptapEmptyDocBeforeInput";
import { useOfficialTypeToComposer } from "../../shared/useOfficialTypeToComposer";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import { OfficialComposerFooter } from "../OfficialComposerFooter";
import { OfficialEpitaxyBranchRows } from "../OfficialEpitaxyBranchRows";
import { EpitaxyPermissionModeModal } from "../composer/EpitaxyPermissionModeModal";
import { usePermissionModeConfirm } from "../composer/usePermissionModeConfirm";
import { OfficialEpitaxySlashCommandMenu } from "../slash/OfficialEpitaxySlashCommandMenu";
import { OfficialSkillChip } from "../slash/OfficialSkillChip";
import { OfficialSlashCommandSuggestion } from "../slash/OfficialSlashCommandSuggestion";
import type { OfficialSlashCommandMenuProps } from "../slash/OfficialSlashTypes";
import type { EpitaxySessionRef } from "./epitaxyTranscriptActionContext";
import { officialCodeSessionStore } from "./officialCodeSessionStore";
import { InlineToolPermissionApprovals } from "./OfficialToolPermissionApprovals";
import {
  normalizeSelectorModelValue,
  useCodeModelOptions,
} from "../../cowork/composer/useCoworkModelOptions";
import {
  buildOfficialEffortMenuItems,
  catalogTopEffort,
  clampEffortToCatalog,
  cliEffortLevelsForModel,
  normalizeEffortValue,
  permissionModeLabel,
  type OfficialEffortLevel,
} from "./officialComposerOptions";
import { useCodePermissionModeOptions } from "../composer/useBypassPermissionsEnabled";
import { setOfficialUltrareviewLaunching } from "./officialUltrareviewLaunch";
import {
  OfficialComposerStagedImages,
  dataUrlToImagePayload,
  type StagedComposerImage,
} from "./OfficialComposerStagedImages";
import {
  previewAnnotationQueue,
  usePreviewAnnotationPendingCount,
} from "./previewAnnotationQueue";
import { resolveDraftPermissionMode, setDraftPermissionMode } from "../codeDraftComposerStore";
import type { PermissionMode } from "../../../adapters/desktopBridge";
import { residualQjSubmitDisabled } from "./officialQjComposerGate";
import {
  filterCoworkImageFiles,
  imageFilesFromClipboardData,
} from "../../cowork/composer/coworkComposerStagedImages";

/** Plain text → TipTap doc (same shape as OfficialCodeComposer). */
function tiptapDocFromPlainText(value: string) {
  if (!value) return { type: "doc", content: [] as Array<{ type: string; content?: Array<{ type: string; text: string }> }> };
  return {
    type: "doc",
    content: value.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}

/** Stable ladder identity so setEffortLevels does not thrash when content is equal. */
function sameEffortLevels(a: readonly string[] | null | undefined, b: readonly string[] | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Official Ye composer surface residual used by session tile:
 * attachAsContext / setComposerText / getText / focus for rewind + type-to-composer.
 */
export type OfficialComposerSurfaceApi = {
  attachAsContext: (text: string) => void;
  focus: () => void;
  getText: () => string;
  setComposerText: (text: string) => void;
};

export function ExistingSessionComposer({
  attachRef,
  bridge,
  composerApiRef,
  disabled,
  isResponding,
  onOpenDiff,
  onOpenPlan,
  onPermissionModeChange,
  onScrollToBottom,
  onStop,
  onSubmit,
  reload,
  session,
  sessionRef,
  showScrollButton,
}: {
  /** @deprecated prefer composerApiRef.attachAsContext — kept for attach-as-context only. */
  attachRef?: MutableRefObject<((text: string) => void) | null>;
  bridge: LocalSessionsBridge;
  /** Official Ye.current residual: setText / focus / getText for rewind + Esc Esc. */
  composerApiRef?: MutableRefObject<OfficialComposerSurfaceApi | null>;
  disabled: boolean;
  isResponding: boolean;
  onOpenDiff?: () => void;
  /** Official Wk onOpenPlan → setSidePane("plan"). */
  onOpenPlan?: () => void;
  /** Official Wk onModeChange after plan accept (target permission mode). */
  onPermissionModeChange?: (mode: string) => void | Promise<void>;
  onScrollToBottom: () => void;
  onStop?: () => void | Promise<void>;
  onSubmit: (text: string, input?: SendMessageInput) => Promise<void>;
  reload: (options?: { silent?: boolean }) => Promise<void>;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
  showScrollButton: boolean;
}) {
  const codeModelOptions = useCodeModelOptions();
  const allowedModelValues = useMemo(
    () => codeModelOptions.items.map((item) => item.value),
    [codeModelOptions.items],
  );
  const [text, setText] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  /**
   * Residual jR model seed: keep host/live session model id as-is.
   * Do NOT normalize against empty bag on first paint — that mapped 3p ids (grok/kimi/…)
   * to "default" and the follow-up effect even wrote setModel("default") to host
   * (switch-back footer → Default). Residual never auto-setModel("default").
   */
  const [model, setModel] = useState(() => {
    const liveModel = sessionRef?.id
      ? officialCodeSessionStore.getState().buckets[sessionRef.id]?.liveMeta?.model
      : undefined;
    const raw = session?.model ?? liveModel;
    if (typeof raw === "string" && raw.length > 0 && raw !== "<synthetic>") return raw;
    return "default";
  });
  /**
   * Residual Mode seed (`be(n.permissionMode)`):
   * 1. host session prop / bucket.session (openSession after start already filled this)
   * 2. liveMeta (user menu / system status)
   * 3. draft sticky (folder/landing) when meta not yet painted — same rn as Code home
   * Never invent bare "default" (询问权限) when draft already shows bypass/accept.
   */
  const [permissionMode, setPermissionMode] = useState(() => {
    const id = sessionRef?.id;
    const bucket = id ? officialCodeSessionStore.getState().buckets[id] : undefined;
    const hostMode =
      (typeof session?.permissionMode === "string" && session.permissionMode.length > 0
        ? session.permissionMode
        : undefined)
      ?? (typeof bucket?.session?.permissionMode === "string" && bucket.session.permissionMode.length > 0
        ? bucket.session.permissionMode
        : undefined);
    const liveMode =
      typeof bucket?.liveMeta?.permissionMode === "string" && bucket.liveMeta.permissionMode.length > 0
        ? bucket.liveMeta.permissionMode
        : undefined;
    const seeded = hostMode ?? liveMode;
    if (typeof seeded === "string" && seeded.length > 0) return seeded;
    // Meta still empty on first paint (create→detail race / cold open): keep draft rn.
    return resolveDraftPermissionMode({
      cwd: session?.cwd ?? bucket?.session?.cwd,
      preferOverride: true,
    });
  });
  const [effort, setEffort] = useState(() =>
    clampEffortToCatalog(
      session?.effort === "ultracode" ? catalogTopEffort(null) : session?.effort,
      // Seed ladder from session model (not empty → invent grok 3-stop) so switch-back
      // does not clamp real effort off the wrong provisional catalog.
      cliEffortLevelsForModel(
        session?.model
        ?? (sessionRef?.id
          ? officialCodeSessionStore.getState().buckets[sessionRef.id]?.liveMeta?.model
          : undefined),
      ),
    ),
  );
  /** Official yR session ultracode map — session-only; new chats start without it. */
  const [ultracode, setUltracode] = useState(() => session?.effort === "ultracode");
  /**
   * Official get_settings.applied (CLI 2.7.16+): per-model catalog ladder + Ultracode gate.
   * null/empty → buildOfficialEffortMenuItems keeps full residual ladder (5f75ff4);
   * never lock to a single stop (106e129 regression). Catalog present → filter only.
   */
  const [effortLevels, setEffortLevels] = useState<string[] | null>(() =>
    cliEffortLevelsForModel(
      session?.model
      ?? (sessionRef?.id
        ? officialCodeSessionStore.getState().buckets[sessionRef.id]?.liveMeta?.model
        : undefined),
    ),
  );
  const [ultracodeOfferable, setUltracodeOfferable] = useState<boolean | null>(null);
  /**
   * Official cn.images residual — staged image attachments (max 5).
   * Preview Annotate drains qy.pending into this list (not immediate send).
   */
  const [stagedImages, setStagedImages] = useState<StagedComposerImage[]>([]);
  /** Official wn Map residual — filename → contextNote for preview-annotation. */
  const contextNotesRef = useRef(new Map<string, string>());
  const stagedImagesRef = useRef(stagedImages);
  stagedImagesRef.current = stagedImages;
  /** Stable ref for TipTap paste/drop — addImageFiles is declared after useEditor. */
  const addImageFilesRef = useRef<(files: File[]) => void>(() => undefined);
  const pendingAnnotationCount = usePreviewAnnotationPendingCount(sessionRef?.id);
  /**
   * Official jR `N`/`R(L)` lock: after user picks effort via X, local b/H win over
   * session meta T until session id changes. Prevents silent reload / stale
   * session_updated from snapping the Effort slider 2→3→2.
   */
  const effortLocalLockRef = useRef<string | null>(null);
  const [isConfigBusy, setConfigBusy] = useState(false);
  /**
   * Residual selector value: collapse only residual aliases when bag is ready.
   * Keep raw session model id when bag is empty or omits it — never paint "Default"
   * over a live 3p model (switch-back regression).
   */
  const selectedModel = useMemo(() => {
    if (!model || model === "default" || model === "opus-4") return "default";
    if (model === "sonnet-4") {
      return allowedModelValues.includes("sonnet") ? "sonnet" : "default";
    }
    if (allowedModelValues.length === 0) return model;
    if (allowedModelValues.includes(model)) return model;
    return model;
  }, [allowedModelValues, model]);
  const submitRef = useRef<() => Promise<void>>(async () => {});
  const clearComposerRef = useRef<() => void>(() => {});
  const tiptapEditorRef = useRef<Editor | null>(null);
  const slashMenuStateRef = useRef({ bridge, session, sessionRef });
  slashMenuStateRef.current = { bridge, session, sessionRef };
  const slashMenuComponent = useMemo(() => function EpitaxySlashCommandMenuRenderer(props: OfficialSlashCommandMenuProps) {
    const state = slashMenuStateRef.current;
    return <OfficialEpitaxySlashCommandMenu {...props} bridge={state.bridge} session={state.session} sessionRef={state.sessionRef} />;
  }, []);
  const bashModeRef = useRef(false);
  const respondingRef = useRef(isResponding);
  /**
   * Official c119 Qj: `q` — arm Escape→onStop once per busy cycle.
   * Reset when busy/isResponding clears so the next stream can be stopped again.
   */
  const stopOnceRef = useRef(false);
  /** Official Qj `B` isPanelActive — product footer uses !disabled. */
  const isPanelActiveRef = useRef(!disabled);
  /** Official Qj `H` onStop ref — product path is stopResponse (Wr markInterrupting + interrupt). */
  const stopResponseRef = useRef<() => void | Promise<void>>(async () => {});
  const isBashMode = text.trimStart().startsWith("!");
  // Official Qj: bash → shell placeholder; else chat. Ref-backed for RNt without remount.
  const placeholderRef = useRef("Type / for commands");
  placeholderRef.current = isBashMode ? "Enter a shell command" : "Type / for commands";
  const canStop = isResponding && Boolean(sessionRef && (bridge.interrupt || bridge.stop));
  const readyImageCount = stagedImages.filter((image) => image.status === "ready" && image.base64).length;
  // Residual Qj submitDisabled: cn.isProcessingImages || mn.isUploading || bi
  // Product: staged image status==="loading" ≡ isProcessingImages; remote mn N/A local-first.
  // bi is draft-only (showGitRequired) — existing shell never bi.
  const isProcessingImages = stagedImages.some((image) => image.status === "loading");
  const submitDisabled = residualQjSubmitDisabled({
    isProcessingImages,
    isRemoteUploading: false,
    gitRequiredBlocksSubmit: false,
  });
  // Official Qj Te: has text/attachments && !disabled && !submitDisabled — busy does NOT block submit.
  // Mid-turn Enter/send → Gr noteQueuedSend + enqueue (pendingQueuedSends); button click while busy = Stop.
  // isSubmitting is only ultrareview/in-flight double-click guard (not residual disabled matrix).
  const canSubmit =
    (text.trim().length > 0 || readyImageCount > 0)
    && !disabled
    && !submitDisabled
    && !isSubmitting;

  /**
   * Official c119 Qj Escape residual (editor path):
   * slash/mention → no-op; defaultPrevented → no-op;
   * busy && !q → prevent + stopPropagation + arm q + onStop;
   * busy (already armed) → return;
   * bash → exit bash; else blur.
   * Returns true when ProseMirror should treat the key as handled.
   */
  const handleComposerEscapeKey = useCallback((event: KeyboardEvent, options?: { stopPropagation?: boolean }): boolean => {
    const slashStorage = (tiptapEditorRef.current?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
    const hasSlashMenu = Boolean(slashStorage?.isActive && slashStorage?.hasVisibleItems);
    if (hasSlashMenu) return false;
    if (event.defaultPrevented) return false;
    if (respondingRef.current && !stopOnceRef.current) {
      event.preventDefault();
      if (options?.stopPropagation) event.stopPropagation();
      stopOnceRef.current = true;
      void stopResponseRef.current();
      return true;
    }
    if (respondingRef.current) return true;
    if (bashModeRef.current) {
      event.preventDefault();
      clearComposerRef.current();
      return true;
    }
    // Official: ve?.commands.blur() when not bash and not busy.
    try {
      tiptapEditorRef.current?.commands.blur();
    } catch {
      /* destroyed */
    }
    return false;
  }, []);

  const editor = useEditor({
    // Official vTt: immediatelyRender when document exists (Electron renderer).
    immediatelyRender: typeof document !== "undefined",
    content: "",
    // Official c119 Qj: setEditable(!disabled) only. busy/isResponding → Stop, not lock typing.
    editable: !disabled,
    editorProps: {
      attributes: officialTiptapEditorAttributes({
        "aria-label": "Prompt",
        class: "tiptap select-text",
        enterkeyhint: "enter",
      }),
      // Host packaged app:// empty trailingBreak only (d5f261d).
      handleDOMEvents: {
        beforeinput: (view, event) => handleEmptyDocBeforeInput(view, event),
      },
      // Official Qj handleImagePaste: clipboard images ∩ Fy allowlist → un(addImages).
      // Filter before preventDefault so SVG/BMP/HEIC fall through (not swallowed).
      handlePaste: (_view, event) => {
        const imageFiles = filterCoworkImageFiles(
          imageFilesFromClipboardData(event.clipboardData),
        );
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        addImageFilesRef.current(imageFiles);
        return true;
      },
      handleDrop: (_view, event) => {
        const imageFiles = filterCoworkImageFiles(Array.from(event.dataTransfer?.files ?? []));
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        addImageFilesRef.current(imageFiles);
        return true;
      },
      handleKeyDown: (_view, event) => {
        // Enter submit is handled in onKeyDownCapture (official wTt residual).
        // ProseMirror skips handleKeyDown while view.composing / keyCode 229.
        if (event.key === "Escape") {
          return handleComposerEscapeKey(event, { stopPropagation: true });
        }
        return false;
      },
    },
    onCreate: ({ editor }) => {
      tiptapEditorRef.current = editor;
    },
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        code: false,
        heading: false,
        horizontalRule: false,
        listItem: false,
        orderedList: false,
      }),
      // Official index vTt RNt (= INt) — simple decorations, no TipTap 3.27 viewport.
      OfficialRNtPlaceholder.configure({
        emptyEditorClass: "is-editor-empty before:!text-text-500 before:whitespace-nowrap",
        emptyNodeClass: "is-empty",
        placeholder: () => placeholderRef.current,
        showOnlyCurrent: true,
        showOnlyWhenEditable: true,
      }),
      OfficialSkillChip,
      OfficialSlashCommandSuggestion.configure({ placement: "onpage", menuComponent: slashMenuComponent }),
    ],
    onUpdate: ({ editor: nextEditor }) => {
      // Official TipTap getText() default blockSeparator is "\n\n" (paragraph breaks).
      // "\n" invents single-newline collapse → multi-paragraph short sends look glued.
      setText(nextEditor.getText());
    },
    shouldRerenderOnTransaction: false,
  }, [slashMenuComponent]);

  bashModeRef.current = isBashMode;
  respondingRef.current = isResponding;
  isPanelActiveRef.current = !disabled;

  // Official Ase residual: printable keys while focus is on chrome still insert into TipTap.
  // Official does not gate Ase on busy/isResponding — only disabled locks the editor.
  useOfficialTypeToComposer(
    useCallback((key: string) => {
      const ed = tiptapEditorRef.current ?? editor;
      if (!ed || disabled) return;
      if (ed.view?.composing) return;
      ed.chain().insertContent(key).focus("end").run();
    }, [disabled, editor]),
    !disabled,
  );

  // Official Qj: q.current = false when busy clears.
  useEffect(() => {
    if (!isResponding) stopOnceRef.current = false;
  }, [isResponding]);

  // Official Qj window keydown (bubble, not capture): Escape → onStop when panel active + busy + !q.
  // Permission cards use capture+stopPropagation so they win when open (Ow/Wk/wk/Age).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (!isPanelActiveRef.current || !respondingRef.current || stopOnceRef.current) return;
      event.preventDefault();
      stopOnceRef.current = true;
      void stopResponseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    // Official c119: ve?.setEditable(!l)
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    const slashStorage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { disabled?: boolean } | undefined;
    if (slashStorage) slashStorage.disabled = isBashMode;
  }, [editor, isBashMode]);

  // Bash/chat placeholder string change: nudge decorations (RNt reads placeholderRef).
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta("addToHistory", false));
  }, [editor, isBashMode]);

  // Official c119: Ye.current?.focus() once — never re-focus storm mid-IME.
  const sessionAutofocusedRef = useRef(false);
  useEffect(() => {
    if (disabled || sessionAutofocusedRef.current) return;
    if (!editor) return;
    sessionAutofocusedRef.current = true;
    const run = () => {
      if (editor.view?.composing) return;
      const dom = editor.view?.dom as HTMLElement | undefined;
      if (dom && document.activeElement === dom) return;
      try {
        editor.commands.focus("end");
      } catch {
        /* ignore */
      }
      if (dom) {
        try {
          dom.focus({ preventScroll: true });
        } catch {
          dom.focus();
        }
      }
    };
    run();
    for (const ms of [50, 150, 400]) window.setTimeout(run, ms);
  }, [disabled, editor]);

  useEffect(() => {
    // Residual: keep host/live model id. Only map to selector "default" when bag is
    // ready and the id is the residual default aliases — never invent default over a
    // real session model just because the bag list is empty or mid-load.
    const liveModel = sessionRef?.id
      ? officialCodeSessionStore.getState().buckets[sessionRef.id]?.liveMeta?.model
      : undefined;
    const hostModel =
      typeof session?.model === "string" && session.model.length > 0 && session.model !== "<synthetic>"
        ? session.model
        : undefined;
    const nextModel = hostModel ?? (typeof liveModel === "string" && liveModel.length > 0 && liveModel !== "<synthetic>" ? liveModel : undefined);
    if (nextModel) {
      if (codeModelOptions.ready && allowedModelValues.length > 0) {
        // In-list → keep; out-of-list still keep raw id for label (residual st/Fm path),
        // only collapse residual aliases (opus-4 / empty) via normalize.
        if (allowedModelValues.includes(nextModel) || nextModel === "default" || nextModel === "opus-4" || nextModel === "sonnet-4") {
          setModel(normalizeSelectorModelValue(nextModel, allowedModelValues));
        } else {
          setModel(nextModel);
        }
      } else {
        setModel(nextModel);
      }
    }
    // Host session Mode is authoritative when present (official be(n.permissionMode)).
    // When sparse session_updated / mid-load omits the field, keep liveMeta or current
    // pill — never invent "default" here (that wiped bypass after leave/return).
    const id = sessionRef?.id;
    const bucket = id ? officialCodeSessionStore.getState().buckets[id] : undefined;
    const liveMode =
      typeof bucket?.liveMeta?.permissionMode === "string" && bucket.liveMeta.permissionMode.length > 0
        ? bucket.liveMeta.permissionMode
        : undefined;
    const hostMode =
      typeof session?.permissionMode === "string" && session.permissionMode.length > 0
        ? session.permissionMode
        : (typeof bucket?.session?.permissionMode === "string" && bucket.session.permissionMode.length > 0
          ? bucket.session.permissionMode
          : undefined);
    const nextMode = hostMode ?? liveMode;
    if (typeof nextMode === "string" && nextMode.length > 0) {
      setPermissionMode(nextMode);
    }
    // Session switch with empty meta: do not invent "default"; leave local until host lands.
    // Official D = N!==L && T!=null ? T : b — while lock is this session, keep local effort.
    const sessionId = sessionRef?.id ?? null;
    if (sessionId && effortLocalLockRef.current === sessionId) {
      return;
    }
    if (session?.effort === "ultracode") {
      // Prefer catalog top when ladder already known; else residual normalize until probe.
      setEffort(clampEffortToCatalog(catalogTopEffort(effortLevels), effortLevels));
      setUltracode(true);
    } else if (session?.effort) {
      setEffort(clampEffortToCatalog(session.effort, effortLevels));
      setUltracode(false);
    }
    // Sparse session_updated without effort: keep local effort (do not invent medium).
  }, [allowedModelValues, codeModelOptions.ready, effortLevels, session?.effort, session?.model, session?.permissionMode, sessionRef?.id]);

  // New session id: drop official N lock so meta T can seed again.
  useEffect(() => {
    effortLocalLockRef.current = null;
  }, [sessionRef?.id]);

  /**
   * Official get_settings → applied (CLI 2.7.16+): pull runtime effort + per-model
   * catalog ladder (effortLevels) + Ultracode gate on session/model change and after
   * our own apply. effort applied syncs through host store → session_updated → the
   * session?.effort effect above; here we only lift the ladder/gate + reconcile
   * effort when there is no local lock (CLI is authoritative).
   *
   * Cold existing sessions often return effortLevels:null from getEffort (resume
   * probe miss) while the new-chat path uses getEffortCatalogDefaults and works.
   * Align: when session bag has no ladder, fall back to the same catalog probe as
   * EpitaxyHome — still CLI-sourced, never invent low…max.
   */
  useEffect(() => {
    const sessionId = sessionRef?.id;
    // Capture optional bridge methods — TS does not narrow object props into async closures.
    const getEffort = bridge.getEffort;
    const getEffortCatalogDefaults = bridge.getEffortCatalogDefaults;
    if (!sessionId || !getEffort) return;
    let cancelled = false;
    // Provisional ladder from the real model id (not selector "default" collapse).
    // Using selectedModel when it was wrongly "default" re-clamped effort on switch-back.
    const modelForCatalog =
      model && model !== "default" ? model : (session?.model && session.model !== "default" ? session.model : undefined);
    const provisional = cliEffortLevelsForModel(modelForCatalog);
    // Only replace ladder when content changes — identical provisional re-set caused
    // session-sync effect re-run + Effort chip remount (first-open footer jitter).
    setEffortLevels((prev) => (sameEffortLevels(prev, provisional) ? prev : provisional));
    if (effortLocalLockRef.current !== sessionId) {
      setEffort((prev) => clampEffortToCatalog(prev, provisional));
    }
    void (async () => {
      try {
        const applied = await getEffort(sessionId);
        if (cancelled || !applied || typeof applied === "string") return;
        let levels = applied.effortLevels ?? null;
        let ultracode = applied.ultracodeOfferable ?? null;
        if ((!levels || levels.length === 0) && getEffortCatalogDefaults) {
          const catalog = await getEffortCatalogDefaults(modelForCatalog).catch(() => null);
          if (cancelled) return;
          if (catalog && typeof catalog !== "string") {
            if (catalog.effortLevels && catalog.effortLevels.length > 0) {
              levels = catalog.effortLevels;
            }
            if (ultracode == null && catalog.ultracodeOfferable != null) {
              ultracode = catalog.ultracodeOfferable;
            }
          }
        }
        if (cancelled) return;
        // CLI wins; if still empty keep provisional (CLI catalog residual for model).
        const resolved =
          levels && levels.length > 0 ? levels : provisional;
        setEffortLevels((prev) => (sameEffortLevels(prev, resolved) ? prev : resolved));
        setUltracodeOfferable(ultracode);
        if (effortLocalLockRef.current === sessionId) return;
        // Prefer host session wire for Ultracode. CLI densable often returns catalog-top
        // (high) while product store keeps effort === "ultracode" — do not clear the flag.
        if (applied.effort === "ultracode" || session?.effort === "ultracode") {
          setEffort(clampEffortToCatalog(catalogTopEffort(resolved), resolved));
          setUltracode(true);
        } else if (applied.effort) {
          setEffort(clampEffortToCatalog(applied.effort, resolved));
          setUltracode(false);
        } else {
          setEffort((prev) => clampEffortToCatalog(prev, resolved));
        }
      } catch {
        // keep provisional model ladder — never invent residual 5-stop
      }
    })();
    return () => { cancelled = true; };
  }, [bridge, model, session?.effort, session?.model, sessionRef?.id]);

  // Residual: never auto bridge.setModel("default") when bag list omits a session id.
  // Display may still show Default only for residual aliases via labelFor/normalize.

  useEffect(() => {
    bashModeRef.current = isBashMode;
    respondingRef.current = isResponding;
    isPanelActiveRef.current = !disabled;
  }, [disabled, isBashMode, isResponding]);

  useEffect(() => {
    const slashStorage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { disabled?: boolean } | undefined;
    if (slashStorage) slashStorage.disabled = isBashMode;
  }, [editor, isBashMode]);

  useEffect(() => {
    // Official c119: ve?.setEditable(!l) — disabled prop only.
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const clearComposer = useCallback(() => {
    editor?.commands.clearContent(true);
    setText("");
    for (const image of stagedImagesRef.current) {
      if (image.previewUrl.startsWith("blob:")) URL.revokeObjectURL(image.previewUrl);
    }
    setStagedImages([]);
    contextNotesRef.current.clear();
  }, [editor]);

  const removeStagedImage = useCallback((id: string) => {
    setStagedImages((prev) => {
      const hit = prev.find((item) => item.id === id);
      if (hit) {
        if (hit.previewUrl.startsWith("blob:")) URL.revokeObjectURL(hit.previewUrl);
        contextNotesRef.current.delete(hit.name);
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  /**
   * Official un(File[]) residual — stage image Files (max 5; PNG/JPEG/GIF/WebP).
   */
  const addImageFiles = useCallback((files: File[]) => {
    const allowed = filterCoworkImageFiles(files);
    if (allowed.length === 0) return;
    setStagedImages((prev) => {
      const room = 5 - prev.length;
      if (room <= 0) return prev;
      const slice = allowed.slice(0, room);
      const loading: StagedComposerImage[] = slice.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name || "image.png",
        previewUrl: URL.createObjectURL(file),
        status: "loading",
      }));
      // Async decode each file → ready base64
      slice.forEach((file, index) => {
        const id = loading[index]!.id;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = typeof reader.result === "string" ? reader.result : "";
          if (!dataUrl) {
            setStagedImages((cur) => cur.filter((item) => item.id !== id));
            return;
          }
          const payload = dataUrlToImagePayload(dataUrl, file.name || "image.png");
          setStagedImages((cur) =>
            cur.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: "ready",
                    base64: payload.base64,
                    mimeType: payload.mimeType,
                    // keep blob previewUrl for strip; dataUrl also fine
                  }
                : item,
            ),
          );
        };
        reader.onerror = () => {
          setStagedImages((cur) => {
            const hit = cur.find((item) => item.id === id);
            if (hit?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(hit.previewUrl);
            return cur.filter((item) => item.id !== id);
          });
        };
        reader.readAsDataURL(file);
      });
      return [...prev, ...loading];
    });
  }, []);
  addImageFilesRef.current = addImageFiles;

  /**
   * Official yn residual: on real session switch, clear local staged strip + previous
   * session's qy pending. Do NOT clear the *current* session on mount — that races Mn
   * drain and drops preview-annotation chips pushed before/while composer mounts.
   * Declared BEFORE Mn drain so switch cleanup cannot wipe a same-commit drain into B.
   */
  const prevSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    const sessionId = sessionRef?.id ?? null;
    const prev = prevSessionIdRef.current;
    if (prev === sessionId) return;
    if (prev !== null) {
      // Sync ref immediately so same-commit Mn drain sees empty strip for the new session.
      for (const image of stagedImagesRef.current) {
        if (image.previewUrl.startsWith("blob:")) URL.revokeObjectURL(image.previewUrl);
      }
      stagedImagesRef.current = [];
      setStagedImages([]);
      contextNotesRef.current.clear();
      previewAnnotationQueue.getState().clearSession(prev);
    }
    prevSessionIdRef.current = sessionId;
  }, [sessionRef?.id]);

  /**
   * Official Mn drain residual: qy.take → File → un(addImages); wn.set contextNote.
   * Must not race a mount-time clear of the *current* session queue (see prevSessionIdRef).
   */
  useEffect(() => {
    const sessionId = sessionRef?.id;
    if (!sessionId || pendingAnnotationCount === 0) return;
    const room = 5 - stagedImagesRef.current.length;
    if (room <= 0) return;
    const items = previewAnnotationQueue.getState().take(sessionId, room);
    if (items.length === 0) return;
    const next: StagedComposerImage[] = [];
    for (const item of items) {
      const payload = dataUrlToImagePayload(item.dataUrl, item.name || "preview-annotation.png");
      if (item.contextNote) contextNotesRef.current.set(payload.filename, item.contextNote);
      next.push({
        id: crypto.randomUUID(),
        name: payload.filename,
        previewUrl: payload.previewUrl,
        status: "ready",
        base64: payload.base64,
        mimeType: payload.mimeType,
      });
    }
    if (next.length > 0) {
      setStagedImages((prev) => [...prev, ...next].slice(0, 5));
      // Official residual after stage: focus composer so user can Send (not auto-submit).
      queueMicrotask(() => {
        tiptapEditorRef.current?.commands.focus("end");
      });
    }
  }, [pendingAnnotationCount, sessionRef?.id]);

  const insertSlashCommand = useCallback(() => {
    editor?.chain().focus("start").insertContent("/").run();
  }, [editor]);

  /**
   * Official le (c119): insert quoted `> line` paragraphs at end + empty trailing para.
   * Does not replace existing composer text.
   */
  const attachTextAsContext = useCallback((value: string) => {
    const next = value.trim();
    if (!next || !editor || editor.isDestroyed) return;
    const nodes = next.split("\n").map((line) => {
      const text = `> ${line}`;
      return {
        type: "paragraph" as const,
        content: text ? [{ type: "text" as const, text }] : [],
      };
    });
    nodes.push({ type: "paragraph", content: [] });
    editor.chain().focus("end").insertContent(nodes).run();
    setText(editor.getText());
  }, [editor]);

  /** Official setComposerText / xt — replace editor contents (rewind prefill). */
  const setComposerText = useCallback((value: string) => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setContent(tiptapDocFromPlainText(value), { emitUpdate: true });
    setText(editor.getText());
    editor.commands.focus("end");
  }, [editor]);

  const getComposerText = useCallback(() => {
    if (!editor || editor.isDestroyed) return text;
    return editor.getText();
  }, [editor, text]);

  const focusComposer = useCallback(() => {
    editor?.commands.focus("end");
  }, [editor]);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    const trimmed = text.trim();
    // Official Ms: /^\/ultrareview\b/ → fe.launchUltrareview, bs chrome while in flight.
    const ultraMatch = trimmed.match(/^\/ultrareview\b\s*(.*)$/is);
    if (ultraMatch && sessionRef?.type === "local" && bridge.launchUltrareview) {
      setSubmitting(true);
      setOfficialUltrareviewLaunching(sessionRef.id, true);
      try {
        const args = ultraMatch[1]?.trim() ?? "";
        const result = await bridge.launchUltrareview(sessionRef.id, args);
        const status = result && typeof result === "object" && "status" in result
          ? String((result as { status?: unknown }).status ?? "")
          : "";
        if (status === "error" || status === "blocked") {
          // Surface via normal send only if bridge rejects; clear chrome either way.
        }
        clearComposer();
      } catch {
        // Fall through: keep composer text on hard failure so user can retry.
      } finally {
        setOfficialUltrareviewLaunching(sessionRef.id, false);
        setSubmitting(false);
      }
      return;
    }
    if (ultraMatch && (!sessionRef || sessionRef.type !== "local" || !bridge.launchUltrareview)) {
      // Official: "/ultrareview is only available in a local Claude Code session."
      // Still clear slash and avoid sending as chat noise when bridge missing.
      clearComposer();
      return;
    }
    setSubmitting(true);
    try {
      // Official f(): contextNotes for staged image names prepended to textWithFiles.
      const ready = stagedImagesRef.current.filter(
        (image) => image.status === "ready" && image.base64,
      );
      const noteNames = new Set(ready.map((image) => image.name));
      const notes = Array.from(
        new Set(
          Array.from(contextNotesRef.current.entries())
            .filter(([name]) => noteNames.has(name))
            .map(([, note]) => note),
        ),
      ).join("\n\n");
      const textWithNotes = notes ? `${notes}\n\n${trimmed}` : trimmed;
      // Official allows image-only send; still require non-empty combined payload.
      if (!textWithNotes.trim() && ready.length === 0) return;
      const images =
        ready.length > 0
          ? ready.map((image) => ({
              base64: image.base64!,
              mimeType: image.mimeType ?? "image/png",
              filename: image.name,
            }))
          : undefined;
      // Pass live Mode pill so host spawn matches UI even if session store lags.
      await onSubmit(textWithNotes.trim() || " ", {
        ...(images ? { images } : {}),
        permissionMode,
      });
      clearComposer();
    } finally {
      setSubmitting(false);
    }
  }, [bridge, canSubmit, clearComposer, onSubmit, permissionMode, sessionRef, text]);

  useEffect(() => {
    submitRef.current = submit;
    clearComposerRef.current = clearComposer;
  }, [clearComposer, submit]);

  useEffect(() => {
    if (!attachRef) return undefined;
    attachRef.current = attachTextAsContext;
    return () => {
      if (attachRef.current === attachTextAsContext) attachRef.current = null;
    };
  }, [attachRef, attachTextAsContext]);

  useEffect(() => {
    if (!composerApiRef) return undefined;
    const api: OfficialComposerSurfaceApi = {
      attachAsContext: attachTextAsContext,
      focus: focusComposer,
      getText: getComposerText,
      setComposerText,
    };
    composerApiRef.current = api;
    return () => {
      if (composerApiRef.current === api) composerApiRef.current = null;
    };
  }, [attachTextAsContext, composerApiRef, focusComposer, getComposerText, setComposerText]);

  const stopResponse = async () => {
    if (!sessionRef || !(bridge.interrupt || bridge.stop)) return;
    // Official Wr: onMutate markInterrupting, mutationFn transport.stop = interrupt.
    // Do not silent-reload; do not drop queuedMessages.
    await onStop?.();
    await (bridge.interrupt ?? bridge.stop)?.(sessionRef.id);
  };
  stopResponseRef.current = () => void stopResponse();

  const applyModel = async (nextModel: string) => {
    if (!sessionRef || nextModel === selectedModel) return;
    codeModelOptions.setStickyModelPreference(nextModel);
    setModel(nextModel);
    setConfigBusy(true);
    try {
      await bridge.setModel?.(sessionRef.id, nextModel);
      await reload({ silent: true });
    } finally {
      setConfigBusy(false);
    }
  };

  const applyPermissionMode = useCallback(async (nextMode: string) => {
    if (!sessionRef || nextMode === permissionMode) return;
    const previousMode = permissionMode;
    // Optimistic Mode pill (official ion); host may reject when active CLI turn fails set_permission_mode.
    setPermissionMode(nextMode);
    // User Mode menu is authoritative until CLI emits a newer system/status (Fke).
    // Mirror into liveMeta + session so leave/return and silent reload cannot snap to default.
    officialCodeSessionStore.getState().mergeLiveMeta(
      sessionRef.id,
      { permissionMode: nextMode },
      { mirrorPermissionMode: true },
    );
    setConfigBusy(true);
    try {
      const result = await bridge.setPermissionMode?.(sessionRef.id, nextMode);
      // Host returns null when live CLI control fails (CLI-first residual) — roll back pill.
      if (result == null) {
        setPermissionMode(previousMode);
        officialCodeSessionStore.getState().mergeLiveMeta(
          sessionRef.id,
          { permissionMode: previousMode },
          { mirrorPermissionMode: true },
        );
        return;
      }
      // Prefer host session when present; never force "default" if field absent.
      const applied =
        result && typeof (result as { permissionMode?: string }).permissionMode === "string"
          ? (result as { permissionMode: string }).permissionMode
          : nextMode;
      setPermissionMode(applied);
      // Official jn: also persist folder map (+ landing when !Sm) so Code home draft
      // keeps the Mode after leave/return — not only host session field.
      setDraftPermissionMode(applied as PermissionMode, {
        cwd: session?.cwd,
      });
      // Do not full silent reload just for Mode — reload can race sparse session meta
      // and briefly clear permissionMode → 询问权限. Host already emits permission_mode_changed.
    } catch {
      setPermissionMode(previousMode);
      officialCodeSessionStore.getState().mergeLiveMeta(
        sessionRef.id,
        { permissionMode: previousMode },
        { mirrorPermissionMode: true },
      );
    } finally {
      setConfigBusy(false);
    }
  }, [bridge, permissionMode, session?.cwd, sessionRef]);

  // Official Sm + EpitaxyPermissionModeModal: first bypass/auto selection confirms per workspace.
  const permissionModeConfirm = usePermissionModeConfirm(
    session?.cwd ?? null,
    (mode) => void applyPermissionMode(mode),
  );

  /**
   * Official jR `X(level, ultracode)`:
   *   R(L); k(e); H(t); V({level, ultracode})  — local state first, then async apply.
   * Wire "ultracode" for CLI --effort ultracode; else level id.
   * Do NOT let reload/session_updated overwrite local b while N===L.
   */
  const applyEffort = async (nextEffort: OfficialEffortLevel, nextUltracode: boolean) => {
    if (!sessionRef) return;
    if (nextEffort === effort && nextUltracode === ultracode) return;
    // Official R(L) + k(e) + H(t) — sync before any await so Ene h(null)+onSelect batches.
    effortLocalLockRef.current = sessionRef.id;
    setEffort(nextEffort);
    setUltracode(nextUltracode);
    // Official V success `a(..., {effort})` patchMeta — keep bucket session.effort aligned.
    const wireEffort = nextUltracode ? "ultracode" : nextEffort;
    officialCodeSessionStore.setState((state) => {
      const prev = state.buckets[sessionRef.id];
      if (!prev?.session || prev.session.effort === wireEffort) return state;
      return {
        ...state,
        buckets: {
          ...state.buckets,
          [sessionRef.id]: {
            ...prev,
            session: { ...prev.session, effort: wireEffort },
          },
        },
      };
    });
    // Official X/V: local state already drives Ene; async apply must NOT flip
    // modelPickerDisabled/isConfigBusy — that remounts stop dots (Image #31 flash)
    // via EffortControl disabled → stopTooltips tree swap.
    try {
      // Official V: E?.(L,t) / applyFlagSettings — UI already updated; no full reload.
      await bridge.setEffort?.(sessionRef.id, wireEffort);
    } catch {
      // Keep local effort selection; bridge errors surface via session status elsewhere.
    }
  };

  const addFolder = async () => {
    if (!sessionRef) return;
    const paths = await desktopBridge.Preferences.getDirectoryPath?.(false);
    const folder = paths?.[0];
    if (!folder) return;
    setConfigBusy(true);
    try {
      await bridge.addFolderToSession?.(sessionRef.id, folder);
      await reload({ silent: true });
    } finally {
      setConfigBusy(false);
    }
  };

  const modelItems = codeModelOptions.items.map((option) => ({
    label: option.label,
    checked: option.value === selectedModel,
    onSelect: () => void applyModel(option.value),
  }));
  // Official te() residual: Mode menu omits bypass unless pref enabled.
  const codePermissionModeOptions = useCodePermissionModeOptions();
  const permissionItems = codePermissionModeOptions.map((option) => ({
    label: option.label,
    checked: option.value === permissionMode,
    onSelect: () => permissionModeConfirm.select(option.value),
  }));
  const effortItems = buildOfficialEffortMenuItems({
    current: effort,
    ultracode,
    // Official $ gate: CLI 2.7.16+ ultracodeOfferable=false → hide the Ultracode stop
    // (model catalog / workflows latch off). null (not reported) → keep residual default on.
    showUltracode: Boolean(bridge.setEffort) && ultracodeOfferable !== false,
    effortLevels,
    model: selectedModel,
    onSelect: (level, nextUltracode) => void applyEffort(level, nextUltracode),
  });
  const modelExtraSections = bridge.setEffort ? [{ key: "effort", header: "Effort", items: effortItems }] : undefined;
  const plusMenuItems = [{ icon: "Folder1", label: "Add folder", onSelect: () => void addFolder() }];

  return (
    <div data-skip-approval-enter={undefined} className="epitaxy-chat-column epitaxy-chat-size relative shrink-0 flex flex-col gap-g5 [contain:layout]">
      <button
        aria-hidden={!showScrollButton}
        aria-label="Scroll to bottom"
        className={`inline-flex items-center h-[24px] px-p3 rounded-r5 bg-fill-contained-default text-contained-default effect-contained-default hover:bg-fill-contained-hover hover:text-contained-hover cursor-default border-0 outline-none hide-focus-ring ring-focus absolute -top-[32px] left-1/2 -translate-x-1/2 z-[1] transition-opacity duration-150 ${showScrollButton ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onScrollToBottom}
        tabIndex={showScrollButton ? 0 : -1}
        type="button"
      >
        <Icon name="ChevronDownSmall" size="s" />
      </button>
      <OfficialEpitaxyBranchRows bridge={bridge} onOpenDiff={onOpenDiff} session={session} sessionRef={sessionRef} />
      <InlineToolPermissionApprovals
        bridge={bridge}
        onOpenPlan={onOpenPlan}
        onPermissionModeChange={onPermissionModeChange ?? ((mode) => void applyPermissionMode(mode))}
        sessionId={sessionRef?.id}
      />
      <div
        className={`epitaxy-prompt relative isolate rounded-r7 transition-shadow duration-300 ${isBashMode ? "[&_.tiptap]:font-mono [&_.tiptap]:text-[length:var(--text-code)]" : ""}`}
      >
        <div className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-prompt-blur effect-prompt-blur" data-surface="prompt" />
        {isBashMode ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-r7 shadow-[inset_0_0_0_1px_var(--extended-purple)]" /> : null}
        <span className="sr-only" role="status">{isBashMode ? "Bash mode. Press Escape to return to chat." : "Chat mode"}</span>
        <div aria-hidden="true" className="grid min-w-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none" style={{ gridTemplateRows: "0fr" }}><div className="min-h-0 overflow-hidden" /></div>
        <OfficialComposerStagedImages images={stagedImages} onRemove={removeStagedImage} />
        <div className="relative flex w-full">
          {isBashMode ? <span aria-hidden="true" title="Run as a shell command" className="ml-[var(--p7)] mt-[13px] shrink-0 select-none self-start rounded-r2 bg-extended-purple px-p3 text-code text-[var(--core-black)]">bash</span> : null}
          {/*
            Official c119 Qj wa EditorContent className (exact residual):
              epitaxy-prompt-input … [&_.tiptap_p]:m-0
              + (_e ? suppress : "") — product has no promptSuggestion.
              float-left/height:0 from residual base CSS, not Qj class invent.
          */}
          <EditorContent
            className="epitaxy-prompt-input flex-1 min-w-0 text-heading text-t9 [&_.tiptap]:min-h-[var(--h8)] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:py-[13px] [&_.tiptap]:pl-p7 [&_.tiptap]:pr-p3 [&_.tiptap_p]:m-0"
            editor={editor}
            onKeyDownCapture={(event) => {
              const slashStorage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
              const hasSlashMenu = Boolean(slashStorage?.isActive && slashStorage?.hasVisibleItems);
              // Official Qj editor Escape: busy→onStop, bash exit, else blur (via handleComposerEscapeKey).
              if (event.key === "Escape") {
                handleComposerEscapeKey(event.nativeEvent, { stopPropagation: true });
                return;
              }
              // Official Qj: Enter + !shift + !alt + !nativeEvent.isComposing (no keyCode 229 invent).
              if (
                event.key !== "Enter"
                || event.shiftKey
                || event.altKey
                || event.nativeEvent.isComposing
                || hasSlashMenu
              ) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              // Official Qj: Enter always Ee while !disabled — busy mid-turn queues (not blocked).
              void submitRef.current();
            }}
          />
          <div className="flex self-end p-p7 pl-p3">
            {/* Official Qj (c119): yd icon Stop | ReturnArrowCornerDownLeft; aria Stop | Send. */}
            <OfficialButton
              ariaLabel={canStop ? "Stop" : "Send"}
              disabled={!canSubmit && !canStop}
              icon={canStop ? "Stop" : "ReturnArrowCornerDownLeft"}
              onClick={() => void (canStop ? stopResponse() : submit())}
              tooltipShortcut={canStop ? "escape" : "enter"}
            />
          </div>
        </div>
      </div>
      <OfficialComposerFooter
        bridge={bridge}
        // Official existing-session xk: onCoordinatorModeChange:void 0 (spawn-only toggle).
        // fastModeOn / loops from session meta when bridge provides them; dictation via hideDictation:!In.
        coordinatorMode={false}
        fastModeOn={false}
        hideDictation
        isPanelActive={!disabled}
        loops={undefined}
        modelExtraSections={modelExtraSections}
        modelItems={modelItems}
        modelLabel={codeModelOptions.labelFor(selectedModel)}
        modelPickerDisabled={disabled || isConfigBusy}
        onCoordinatorModeChange={undefined}
        permissionDanger={permissionMode === "bypassPermissions"}
        permissionItems={permissionItems}
        permissionLabel={permissionModeLabel(permissionMode)}
        plusMenuItems={plusMenuItems}
        session={session}
        sessionRef={sessionRef}
        onAddFiles={addImageFiles}
        onInsertSlashCommand={insertSlashCommand}
      />
      <EpitaxyPermissionModeModal
        mode={permissionModeConfirm.confirming}
        onCancel={permissionModeConfirm.cancel}
        onConfirm={permissionModeConfirm.confirm}
        workspace={permissionModeConfirm.workspace}
      />
    </div>
  );
}
