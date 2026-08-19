import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { SessionSummary } from "../../adapters/desktopBridge";
import type { LocalSessionsBridge } from "../../adapters/desktopBridge/types";
import {
  filterCoworkImageFiles,
  imageFilesFromClipboardData,
} from "../cowork/composer/coworkComposerStagedImages";
import { OfficialRNtPlaceholder } from "../shared/officialRNtPlaceholder";
import { handleEmptyDocBeforeInput } from "../shared/tiptapEmptyDocBeforeInput";
import { OfficialButton, type OfficialSessionRef } from "./OfficialEpitaxyComponents";
import {
  OfficialComposerStagedImages,
  type StagedComposerImage,
} from "./session/OfficialComposerStagedImages";
import { OfficialEpitaxySlashCommandMenu } from "./slash/OfficialEpitaxySlashCommandMenu";
import { OfficialSkillChip } from "./slash/OfficialSkillChip";
import { OfficialSlashCommandSuggestion } from "./slash/OfficialSlashCommandSuggestion";
import type { OfficialSlashCommandMenuProps } from "./slash/OfficialSlashTypes";

export type OfficialPromptEditorHandle = {
  focus: () => void;
  /** Official aYt / c119 Ye residual — used by Ase type-to-composer. */
  getEditor: () => Editor | null;
  insertSlashCommand: () => void;
  /** Insert plain text at cursor and focus (Ase residual). */
  insertText: (text: string) => void;
  /** Official aYt setText / clear — imperative only, not continuous controlled value. */
  setText: (text: string) => void;
  clear: () => void;
};

type OfficialPromptEditorProps = {
  bridge: LocalSessionsBridge;
  /**
   * Residual H busy — Stop chrome only (existing-session isResponding).
   * Does NOT lock editable or Te send. Draft home create uses disabled (Ns), not busy Stop.
   */
  busy?: boolean;
  /**
   * Residual Qj disabled: "spawning"===Os || J || Ns>0 || Ga || xn
   * setEditable(!disabled) only.
   */
  disabled?: boolean;
  /**
   * Residual Qj submitDisabled: cn.isProcessingImages || mn.isUploading || bi
   * Blocks Te send only — does not setEditable(false).
   */
  submitDisabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  session?: SessionSummary | null;
  sessionRef?: OfficialSessionRef | null;
  slashCwd?: string;
  /**
   * Parent mirror of prompt text (submit / draft restore).
   * Official Qj/vTt: tipTap owns the doc; parent is notified via onUpdate only.
   * Continuous value→setContent is NOT residual — only clear / external hydrate.
   */
  value: string;
  /**
   * Official Qj handleImagePaste / un(addImages) — parent owns cn.images strip.
   * TipTap paste/drop only stages when this callback is provided.
   */
  onAddImageFiles?: (files: File[]) => void;
  /** Official cn.images strip above the prompt (draft + existing share residual). */
  stagedImages?: StagedComposerImage[];
  onRemoveStagedImage?: (id: string) => void;
  /**
   * Official Te `(he||m)` — ready staged images count as attachments so Send
   * stays enabled for image-only submits.
   */
  hasAttachments?: boolean;
};

/**
 * Official residual:
 * - c11959232 Qj: EpitaxyComposer Prompt shell + wa EditorContent classes
 * - index vTt: tipTapEditorState + RNt Placeholder; onUpdate → text + hasText
 * - index aYt CodeTipTapEditor: setEditable(!disabled); setText imperative
 * - Qj `_e` absolute span is **only** promptSuggestion — product has none
 * - setEditable(!disabled) only; busy = Stop chrome; submitDisabled blocks Te
 *
 * Host packaged app:// only: handleEmptyDocBeforeInput (empty trailingBreak).
 */
export const OfficialPromptEditor = forwardRef<OfficialPromptEditorHandle, OfficialPromptEditorProps>(function OfficialPromptEditor({
  bridge,
  busy = false,
  disabled = false,
  submitDisabled = false,
  onChange,
  onSubmit,
  placeholder,
  session = null,
  sessionRef = null,
  slashCwd,
  value,
  onAddImageFiles,
  stagedImages = [],
  onRemoveStagedImage,
  hasAttachments = false,
}, ref) {
  const editorRef = useRef<Editor | null>(null);
  const submitRef = useRef(onSubmit);
  const disabledRef = useRef(disabled);
  // Residual z / Te block: disabled || submitDisabled — busy is NOT in Te gate.
  const submitBlockedRef = useRef(disabled || submitDisabled);
  const onChangeRef = useRef(onChange);
  /** Official Qj handleImagePaste → un(addImages); stable for TipTap editorProps. */
  const onAddImageFilesRef = useRef(onAddImageFiles);
  const bashModeRef = useRef(false);
  const slashMenuStateRef = useRef({ bridge, session, sessionRef, slashCwd });
  /** Official vTt `g` / `x.current` — live placeholder string for RNt. */
  const placeholderRef = useRef(placeholder);
  /** Official vTt `k.current` — user has edited; block hydrate overwrite. */
  const userEditedRef = useRef(false);
  /** Pending setText before editor ready (aYt `z.current`). */
  const pendingTextRef = useRef<string | null>(null);
  /**
   * Last text we emitted / accepted from parent clear.
   * Used only to detect external clear (value → "") and initial hydrate — not every keystroke setContent.
   */
  const lastParentValueRef = useRef(value);

  // Official Qj `he`: has non-empty tipTap text (from onUpdate), not React placeholder.
  const [hasText, setHasText] = useState(() => value.trim().length > 0);
  const hasTextRef = useRef(hasText);

  const isBashMode = value.trimStart().startsWith("!");
  // Official Te = (he||m) && !disabled && !submitDisabled — busy does NOT block send.
  const canSubmit = (hasText || hasAttachments) && !disabled && !submitDisabled;

  submitRef.current = onSubmit;
  disabledRef.current = disabled;
  submitBlockedRef.current = disabled || submitDisabled;
  onChangeRef.current = onChange;
  onAddImageFilesRef.current = onAddImageFiles;
  bashModeRef.current = isBashMode;
  slashMenuStateRef.current = { bridge, session, sessionRef, slashCwd };
  // Official: bash → "Enter a shell command"; else prop placeholder.
  placeholderRef.current = isBashMode ? "Enter a shell command" : placeholder;
  hasTextRef.current = hasText;

  const slashMenuComponent = useMemo(() => function OfficialComposerSlashCommandMenuRenderer(props: OfficialSlashCommandMenuProps) {
    const state = slashMenuStateRef.current;
    const draftSession = state.session ?? (state.slashCwd ? {
      id: "__draft__",
      title: "Draft",
      createdAtMs: 0,
      updatedAt: "",
      updatedAtMs: 0,
      kind: "code",
      sessionKind: "code",
      cwd: state.slashCwd,
    } satisfies SessionSummary : null);
    const draftSessionRef = state.sessionRef ?? (state.slashCwd ? { id: "__draft__", type: "local" as const } : null);
    return <OfficialEpitaxySlashCommandMenu {...props} bridge={state.bridge} session={draftSession} sessionRef={draftSessionRef} />;
  }, []);

  const applyPlainText = (editor: Editor, text: string) => {
    if (!text) {
      editor.commands.clearContent(false);
      return;
    }
    editor.commands.setContent(tiptapDocFromPlainText(text), { emitUpdate: false });
  };

  const editor = useEditor({
    // Official vTt: immediatelyRender: typeof document !== "undefined" (browser/Electron = true).
    // false leaves a non-editable empty ProseMirror shell for a frame → placeholder flash.
    immediatelyRender: typeof document !== "undefined",
    content: tiptapDocFromPlainText(value || ""),
    // Official c119 Qj / aYt: setEditable(!disabled) only.
    editable: !disabled,
    editorProps: {
      attributes: {
        "aria-label": "Prompt",
        // epitaxy-root is select-none; contenteditable must opt back into text selection.
        class: "tiptap select-text",
        enterkeyhint: "enter",
      },
      // Host packaged app:// empty trailingBreak only (d5f261d) — not UI residual invent.
      handleDOMEvents: {
        beforeinput: (view, event) => handleEmptyDocBeforeInput(view, event),
      },
      // Official Qj handleImagePaste: clipboard images ∩ Fy allowlist → un(addImages).
      // Filter before preventDefault so SVG/BMP/HEIC fall through (not swallowed).
      handlePaste: (_view, event) => {
        if (!onAddImageFilesRef.current) return false;
        const imageFiles = filterCoworkImageFiles(
          imageFilesFromClipboardData(event.clipboardData),
        );
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        onAddImageFilesRef.current(imageFiles);
        return true;
      },
      handleDrop: (_view, event) => {
        if (!onAddImageFilesRef.current) return false;
        const imageFiles = filterCoworkImageFiles(Array.from(event.dataTransfer?.files ?? []));
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        onAddImageFilesRef.current(imageFiles);
        return true;
      },
      handleKeyDown: (_view, event) => {
        const slashStorage = (editorRef.current?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
        const hasSlashMenu = Boolean(slashStorage?.isActive && slashStorage?.hasVisibleItems);
        if (event.key === "Escape" && bashModeRef.current && !hasSlashMenu) {
          event.preventDefault();
          userEditedRef.current = false;
          hasTextRef.current = false;
          setHasText(false);
          lastParentValueRef.current = "";
          onChangeRef.current("");
          editorRef.current?.commands.clearContent(true);
          return true;
        }
        return false;
      },
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
      // Official index vTt RNt (= INt) — simple decorations, NO TipTap 3.27 viewport plugin.
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
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onUpdate: ({ editor }) => {
      // Official vTt: k.current = true; setTipTapEditorState(json); Qj: he from trim.
      userEditedRef.current = true;
      // Residual TipTap getText() default blockSeparator is "\n\n" — do not invent "\n" collapse.
      const next = editor.getText();
      const nextHas = next.trim().length > 0;
      if (nextHas !== hasTextRef.current) {
        hasTextRef.current = nextHas;
        setHasText(nextHas);
      }
      lastParentValueRef.current = next;
      onChangeRef.current(next);
    },
    shouldRerenderOnTransaction: false,
  }, [slashMenuComponent]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      const ed = editor ?? editorRef.current;
      const dom = (ed?.view?.dom ?? null) as HTMLElement | null;
      // Official Pe / aYt O: focus end — never thrash mid-composition.
      if (ed?.view?.composing) return;
      if (dom && document.activeElement === dom) return;
      if (dom && typeof dom.focus === "function") {
        try {
          dom.focus({ preventScroll: true });
        } catch {
          dom.focus();
        }
      }
      try {
        ed?.commands.focus("end");
      } catch {
        /* destroyed */
      }
    },
    getEditor: () => editor ?? editorRef.current,
    insertSlashCommand: () => {
      editor?.chain().focus("start").insertContent("/").run();
    },
    insertText: (text: string) => {
      const ed = editor ?? editorRef.current;
      if (!ed || !text) return;
      if (ed.view?.composing) return;
      ed.chain().insertContent(text).focus("end").run();
    },
    setText: (text: string) => {
      const ed = editor ?? editorRef.current;
      if (!ed) {
        pendingTextRef.current = text;
        return;
      }
      pendingTextRef.current = null;
      userEditedRef.current = false;
      applyPlainText(ed, text);
      const nextHas = text.trim().length > 0;
      hasTextRef.current = nextHas;
      setHasText(nextHas);
      lastParentValueRef.current = text;
    },
    clear: () => {
      const ed = editor ?? editorRef.current;
      pendingTextRef.current = null;
      userEditedRef.current = false;
      ed?.commands.clearContent(false);
      hasTextRef.current = false;
      setHasText(false);
      lastParentValueRef.current = "";
    },
  }), [editor]);

  useEffect(() => {
    // Official c119: ve?.setEditable(!l)
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    const slashStorage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { disabled?: boolean } | undefined;
    if (slashStorage) slashStorage.disabled = isBashMode;
  }, [editor, isBashMode]);

  // Official vTt: g.current = a; dispatch placeholderUpdate meta (not full setContent).
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.view?.composing) return;
    editor.view.dispatch(editor.state.tr.setMeta("placeholderUpdate", true));
  }, [editor, isBashMode, placeholder]);

  // Official aYt: pending setText once editor mounts.
  useEffect(() => {
    if (!editor || pendingTextRef.current === null) return;
    const text = pendingTextRef.current;
    pendingTextRef.current = null;
    userEditedRef.current = false;
    applyPlainText(editor, text);
    const nextHas = text.trim().length > 0;
    hasTextRef.current = nextHas;
    setHasText(nextHas);
    lastParentValueRef.current = text;
  }, [editor]);

  /**
   * Official residual: tipTap owns doc after first edit (vTt k.current).
   * Parent `value` only:
   *  - clear after submit (value → "")
   *  - hydrate before userEdited (draft restore)
   * Never setContent on every keystroke (that is product invent and IME-hostile).
   */
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (value === lastParentValueRef.current) return;
    if (editor.view?.composing) return;

    // Clear after send / Escape handled parent-side.
    if (value === "") {
      if (!editor.isEmpty) editor.commands.clearContent(false);
      userEditedRef.current = false;
      hasTextRef.current = false;
      setHasText(false);
      lastParentValueRef.current = "";
      return;
    }

    // Hydrate only before first user edit into empty editor (official vTt).
    if (userEditedRef.current) {
      lastParentValueRef.current = value;
      return;
    }
    if (!editor.isEmpty) {
      lastParentValueRef.current = value;
      return;
    }
    applyPlainText(editor, value);
    const nextHas = value.trim().length > 0;
    hasTextRef.current = nextHas;
    setHasText(nextHas);
    lastParentValueRef.current = value;
  }, [editor, value]);

  return (
    <div
      className={`epitaxy-prompt relative isolate rounded-r7 transition-shadow duration-300 ${isBashMode ? "[&_.tiptap]:font-mono [&_.tiptap]:text-[length:var(--text-code)]" : ""}`}
      onClick={(event) => {
        if (event.target instanceof HTMLElement && event.target.closest("button")) return;
        // Official Pe: focus end.
        try {
          editor?.commands.focus("end");
        } catch {
          /* destroyed */
        }
      }}
    >
      <div className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-prompt-blur effect-prompt-blur" data-surface="prompt" />
      {isBashMode ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-r7 shadow-[inset_0_0_0_1px_var(--extended-purple)]" /> : null}
      <span className="sr-only" role="status">{isBashMode ? "Bash mode. Press Escape to return to chat." : "Chat mode"}</span>
      <div aria-hidden="true" className="grid min-w-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none" style={{ gridTemplateRows: "0fr" }}>
        <div className="min-h-0 overflow-hidden" />
      </div>
      {onRemoveStagedImage ? (
        <OfficialComposerStagedImages images={stagedImages} onRemove={onRemoveStagedImage} />
      ) : null}
      <div className="relative flex w-full">
        {isBashMode ? <span aria-hidden="true" title="Run as a shell command" className="ml-[var(--p7)] mt-[13px] shrink-0 select-none self-start rounded-r2 bg-extended-purple px-p3 text-code text-[var(--core-black)]">bash</span> : null}
        {/*
          Official c119 Qj wa EditorContent className (exact residual string):
            epitaxy-prompt-input flex-1 min-w-0 text-heading text-t9
            [&_.tiptap]:min-h-[var(--h8)] … [&_.tiptap_p]:m-0
            + (_e ? "[&_.is-editor-empty]:before:!content-['']" : "")
          _e = promptSuggestion only — product has none → no suppress class.
          float-left / pointer-events-none live in residual base CSS
          (.ProseMirror p.is-editor-empty:first-child:before), NOT on Qj wa.
        */}
        <EditorContent
          className="epitaxy-prompt-input flex-1 min-w-0 text-heading text-t9 [&_.tiptap]:min-h-[var(--h8)] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:py-[13px] [&_.tiptap]:pl-p7 [&_.tiptap]:pr-p3 [&_.tiptap_p]:m-0"
          editor={editor}
          onKeyDownCapture={(event) => {
            const slashStorage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
            const hasSlashMenu = Boolean(slashStorage?.isActive && slashStorage?.hasVisibleItems);
            if (event.key === "Escape" && isBashMode && !hasSlashMenu) {
              event.preventDefault();
              userEditedRef.current = false;
              hasTextRef.current = false;
              setHasText(false);
              lastParentValueRef.current = "";
              onChangeRef.current("");
              editor?.commands.clearContent(true);
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
            if (!submitBlockedRef.current) submitRef.current();
          }}
        />
        {/* Official Qj: absolute placeholder span ONLY when _e (promptSuggestion). No default value span. */}
        <div className="flex self-end p-p7 pl-p3">
          <OfficialButton
            ariaLabel="Send"
            disabled={!canSubmit}
            icon={busy ? "Stop" : "ArrowReturn"}
            onClick={onSubmit}
          />
        </div>
      </div>
    </div>
  );
});

function tiptapDocFromPlainText(value: string) {
  const lines = value.split("\n");
  return {
    type: "doc",
    content: (lines.length ? lines : [""]).map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : undefined,
    })),
  };
}
