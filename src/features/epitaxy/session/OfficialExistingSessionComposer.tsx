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

export function ExistingSessionComposer({
  attachRef,
  bridge,
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
  attachRef?: MutableRefObject<((text: string) => void) | null>;
  bridge: LocalSessionsBridge;
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
  const [model, setModel] = useState(() => normalizeSelectorModelValue(session?.model, []));
  const [permissionMode, setPermissionMode] = useState(session?.permissionMode ?? "default");
  const [effort, setEffort] = useState(() => normalizeEffortValue(session?.effort === "ultracode" ? "xhigh" : session?.effort));
  /** Official yR session ultracode map — session-only; new chats start without it. */
  const [ultracode, setUltracode] = useState(() => session?.effort === "ultracode");
  /**
   * Official get_settings.applied (CLI 2.7.16+): per-model catalog ladder + Ultracode gate.
   * null/empty → buildOfficialEffortMenuItems keeps full residual ladder (5f75ff4);
   * never lock to a single stop (106e129 regression). Catalog present → filter only.
   */
  const [effortLevels, setEffortLevels] = useState<string[] | null>(null);
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
  const pendingAnnotationCount = usePreviewAnnotationPendingCount(sessionRef?.id);
  /**
   * Official jR `N`/`R(L)` lock: after user picks effort via X, local b/H win over
   * session meta T until session id changes. Prevents silent reload / stale
   * session_updated from snapping the Effort slider 2→3→2.
   */
  const effortLocalLockRef = useRef<string | null>(null);
  const [isConfigBusy, setConfigBusy] = useState(false);
  const selectedModel = normalizeSelectorModelValue(model, allowedModelValues);
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
  const isBashMode = text.trimStart().startsWith("!");
  const placeholder = "Type / for commands";
  const canStop = isResponding && Boolean(sessionRef && bridge.stop);
  const readyImageCount = stagedImages.filter((image) => image.status === "ready" && image.base64).length;
  // Official: allow send with images only (text optional when d.length > 0).
  const canSubmit =
    (text.trim().length > 0 || readyImageCount > 0)
    && !disabled
    && !isSubmitting
    && !isResponding;
  const editor = useEditor({
    content: "",
    editable: !disabled && !isSubmitting && !isResponding,
    editorProps: {
      attributes: {
        "aria-label": "Prompt",
        class: "tiptap",
        "data-placeholder": placeholder,
      },
      handleKeyDown: (_view, event) => {
        const slashStorage = (tiptapEditorRef.current?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
        const hasSlashMenu = Boolean(slashStorage?.isActive && slashStorage?.hasVisibleItems);
        if (event.key === "Escape" && bashModeRef.current && !hasSlashMenu) {
          event.preventDefault();
          clearComposerRef.current();
          return true;
        }
        if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.isComposing && !hasSlashMenu) {
          event.preventDefault();
          if (!respondingRef.current) void submitRef.current();
          return true;
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
      OfficialSkillChip,
      OfficialSlashCommandSuggestion.configure({ placement: "onpage", menuComponent: slashMenuComponent }),
    ],
    onUpdate: ({ editor: nextEditor }) => {
      setText(nextEditor.getText({ blockSeparator: "\n" }));
    },
  }, [placeholder, slashMenuComponent]);

  useEffect(() => {
    setModel(normalizeSelectorModelValue(session?.model, allowedModelValues));
    setPermissionMode(session?.permissionMode ?? "default");
    // Official D = N!==L && T!=null ? T : b — while lock is this session, keep local effort.
    const sessionId = sessionRef?.id ?? null;
    if (sessionId && effortLocalLockRef.current === sessionId) {
      return;
    }
    if (session?.effort === "ultracode") {
      setEffort("xhigh");
      setUltracode(true);
    } else {
      setEffort(normalizeEffortValue(session?.effort));
      setUltracode(false);
    }
  }, [allowedModelValues, session?.effort, session?.model, session?.permissionMode, sessionRef?.id]);

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
    void (async () => {
      try {
        const applied = await getEffort(sessionId);
        if (cancelled || !applied || typeof applied === "string") return;
        let levels = applied.effortLevels ?? null;
        let ultracode = applied.ultracodeOfferable ?? null;
        if ((!levels || levels.length === 0) && getEffortCatalogDefaults) {
          const catalog = await getEffortCatalogDefaults(
            selectedModel === "default" ? undefined : selectedModel,
          ).catch(() => null);
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
        setEffortLevels(levels);
        setUltracodeOfferable(ultracode);
        if (effortLocalLockRef.current === sessionId) return;
        if (applied.effort === "ultracode") {
          setEffort("xhigh");
          setUltracode(true);
        } else if (applied.effort) {
          setEffort(normalizeEffortValue(applied.effort));
          setUltracode(false);
        }
      } catch {
        // ignore — leave null; UI uses full residual ladder (5f75ff4) until retry
      }
    })();
    return () => { cancelled = true; };
  }, [bridge, sessionRef?.id, selectedModel]);

  // Drop shell-leaked session model (grok/kimi) once bag list is known.
  useEffect(() => {
    if (!codeModelOptions.ready) return;
    const normalized = normalizeSelectorModelValue(model, allowedModelValues);
    if (normalized !== model) {
      setModel(normalized);
      if (sessionRef && bridge.setModel && normalized === "default") {
        void bridge.setModel(sessionRef.id, "default").catch(() => undefined);
      }
    }
  }, [allowedModelValues, bridge, codeModelOptions.ready, model, sessionRef]);

  useEffect(() => {
    bashModeRef.current = isBashMode;
    respondingRef.current = isResponding;
  }, [isBashMode, isResponding]);

  useEffect(() => {
    const slashStorage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { disabled?: boolean } | undefined;
    if (slashStorage) slashStorage.disabled = isBashMode;
  }, [editor, isBashMode]);

  useEffect(() => {
    editor?.setEditable(!disabled && !isSubmitting && !isResponding);
  }, [disabled, editor, isResponding, isSubmitting]);

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
    const allowed = files.filter((file) =>
      ["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type),
    );
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

  /** Official onAttachAsContext → setComposerText + focus (c119 Ye.current). */
  const attachTextAsContext = useCallback((value: string) => {
    const next = value.trim();
    if (!next || !editor || editor.isDestroyed) return;
    const current = editor.getText({ blockSeparator: "\n" }).trim();
    const combined = current ? `${current}\n\n${next}` : next;
    editor.commands.setContent(tiptapDocFromPlainText(combined), { emitUpdate: true });
    setText(editor.getText({ blockSeparator: "\n" }));
    editor.commands.focus("end");
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
      await onSubmit(textWithNotes.trim() || " ", images ? { images } : undefined);
      clearComposer();
    } finally {
      setSubmitting(false);
    }
  }, [bridge, canSubmit, clearComposer, onSubmit, sessionRef, text]);

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

  const stopResponse = async () => {
    if (!sessionRef || !bridge.stop) return;
    // Official wt(): clear local stream first, then await LocalSessions.stop.
    await onStop?.();
    try {
      await bridge.stop(sessionRef.id);
    } finally {
      await reload({ silent: true });
    }
  };

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
    setPermissionMode(nextMode);
    // User Mode menu is authoritative until CLI emits a newer system/status (Fke).
    // Mirror into liveMeta so silent reload / stale session_updated cannot snap back.
    officialCodeSessionStore.getState().mergeLiveMeta(sessionRef.id, { permissionMode: nextMode });
    setConfigBusy(true);
    try {
      await bridge.setPermissionMode?.(sessionRef.id, nextMode);
      await reload({ silent: true });
    } finally {
      setConfigBusy(false);
    }
  }, [bridge, permissionMode, reload, sessionRef]);

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
        onClick={(event) => {
          if (event.target instanceof HTMLElement && event.target.closest("button")) return;
          editor?.commands.focus();
        }}
      >
        <div className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-prompt-blur effect-prompt-blur" data-surface="prompt" />
        {isBashMode ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-r7 shadow-[inset_0_0_0_1px_var(--extended-purple)]" /> : null}
        <span className="sr-only" role="status">{isBashMode ? "Bash mode. Press Escape to return to chat." : "Chat mode"}</span>
        <div aria-hidden="true" className="grid min-w-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none" style={{ gridTemplateRows: "0fr" }}><div className="min-h-0 overflow-hidden" /></div>
        <OfficialComposerStagedImages images={stagedImages} onRemove={removeStagedImage} />
        <div className="relative flex w-full">
          {isBashMode ? <span aria-hidden="true" title="Run as a shell command" className="ml-[var(--p7)] mt-[13px] shrink-0 select-none self-start rounded-r2 bg-extended-purple px-p3 text-code text-[var(--core-black)]">bash</span> : null}
          <EditorContent
            className={`epitaxy-prompt-input flex-1 min-w-0 text-heading text-t9 [&_.tiptap]:min-h-[var(--h8)] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:py-[13px] [&_.tiptap]:pl-p7 [&_.tiptap]:pr-p3 [&_.tiptap_p]:m-0 ${text.trim().length === 0 ? "[&_.is-editor-empty]:before:!content-['']" : ""}`}
            editor={editor}
            onKeyDownCapture={(event) => {
              const slashStorage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
              const hasSlashMenu = Boolean(slashStorage?.isActive && slashStorage?.hasVisibleItems);
              if (event.key === "Escape" && isBashMode && !hasSlashMenu) {
                event.preventDefault();
                clearComposer();
              }
            }}
          />
          {text.trim().length === 0 ? <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 right-[var(--h8)] truncate pl-p7 pt-[13px] text-heading text-t5">{placeholder}</span> : null}
          <div className="flex self-end p-p7 pl-p3">
            <OfficialButton
              ariaLabel={canStop ? "Stop response" : "Send"}
              disabled={!canSubmit && !canStop}
              icon={canStop || isSubmitting ? "Stop" : "ArrowReturn"}
              onClick={() => void (canStop ? stopResponse() : submit())}
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
