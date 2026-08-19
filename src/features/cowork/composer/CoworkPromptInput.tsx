import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import type { SessionSummary } from "../../../adapters/desktopBridge/types";
import { handleEmptyDocBeforeInput } from "../../shared/tiptapEmptyDocBeforeInput";
import {
  markControlledTiptapUserEdit,
  syncControlledTiptapValue,
  type ControlledTiptapEmitState,
} from "../../shared/syncControlledTiptapValue";
import { coworkSessionsBridge } from "../session/coworkSessionBridge";
import { CoworkRotatingPlaceholder } from "./CoworkRotatingPlaceholder";
import { CoworkSessionSlashMenu } from "./slash/CoworkSessionSlashMenu";
import { CoworkSkillChip } from "./slash/CoworkSkillChip";
import { CoworkSlashCommandSuggestion } from "./slash/CoworkSlashCommandSuggestion";
import type { CoworkSlashCommandMenuProps } from "./slash/CoworkSlashTypes";

export type CoworkPromptInputHandle = {
  focus: () => void;
  getEditor: () => Editor | null;
  insertSlashCommand: () => void;
  /**
   * Official promptInputRef.setContent residual (index-BELzQL5P setPrompt forceUpdateTiptap):
   * imperative hydrate that bypasses controlled sync guards (empty trailingBreak / userEdited).
   */
  setContent: (text: string) => void;
  scrollToEnd: () => void;
};

type CoworkPromptInputProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** Official static yYe fallback when not rotating. */
  placeholder: string;
  /**
   * Official yAt carousel strings (He = XLcM6WHfQR + jGTFVKPV2+).
   * When provided and empty, hides ProseMirror ::before and mounts RotatingPlaceholder.
   */
  rotatingPlaceholders?: string[];
  slashCwd?: string;
  value: string;
};

export const CoworkPromptInput = forwardRef<CoworkPromptInputHandle, CoworkPromptInputProps>(function CoworkPromptInput({ disabled = false, onChange, onSubmit, placeholder, rotatingPlaceholders, slashCwd, value }, ref) {
  const editorRef = useRef<Editor | null>(null);
  const submitRef = useRef(onSubmit);
  const disabledRef = useRef(disabled);
  const onChangeRef = useRef(onChange);
  const slashCwdRef = useRef(slashCwd);
  /** Official vTt k.current residual — after onUpdate only honor parent clear. */
  const emitRef = useRef<ControlledTiptapEmitState>({ lastEmittedValue: value, userEdited: false });
  submitRef.current = onSubmit;
  disabledRef.current = disabled;
  onChangeRef.current = onChange;
  slashCwdRef.current = slashCwd;
  const slashMenu = useMemo(() => function CoworkDraftSlashMenu(props: CoworkSlashCommandMenuProps) {
    return <CoworkSessionSlashMenu {...props} bridge={coworkSessionsBridge} session={draftSession(slashCwdRef.current)} />;
  }, []);
  const editor = useCoworkPromptEditor({
    disabled,
    disabledRef,
    editorRef,
    emitRef,
    onChangeRef,
    placeholder,
    slashMenu,
    submitRef,
    value,
  });
  useImperativeHandle(ref, () => ({
    focus: () => {
      const ed = editor ?? editorRef.current;
      ed?.commands.focus("end");
    },
    getEditor: () => editor ?? editorRef.current,
    insertSlashCommand: () => (editor ?? editorRef.current)?.chain().focus("start").insertContent("/").run(),
    setContent: (text: string) => {
      const ed = editor ?? editorRef.current;
      if (!ed) return;
      // Official forceUpdateTiptap: setContent(plain) + reset userEdited so later clears still work.
      if (!text) {
        ed.commands.clearContent(false);
      } else {
        ed.commands.setContent(tiptapDoc(text), { emitUpdate: false });
      }
      emitRef.current = { lastEmittedValue: text, userEdited: false };
      onChangeRef.current(text);
      ed.commands.focus("end");
      try {
        const end = ed.state.doc.content.size;
        ed.commands.setTextSelection(end);
        ed.view.dispatch(ed.state.tr.scrollIntoView());
      } catch {
        /* editor may be mid-destroy */
      }
    },
    scrollToEnd: () => {
      const ed = editor ?? editorRef.current;
      if (!ed) return;
      try {
        const end = ed.state.doc.content.size;
        ed.commands.setTextSelection(end);
        ed.view.dispatch(ed.state.tr.scrollIntoView());
      } catch {
        /* ignore */
      }
    },
  }), [editor]);
  useEffect(() => { editor?.setEditable(!disabled); }, [disabled, editor]);
  useEffect(() => {
    if (!editor) return;
    emitRef.current = syncControlledTiptapValue({
      editor,
      value,
      emit: emitRef.current,
      docFromPlainText: tiptapDoc,
    });
  }, [editor, value]);
  const isEmpty = value.trim().length === 0;
  // Official rt: new convo + empty → yAt; suppress is-editor-empty ::before when rotating.
  // Official PromptInput (wTt/rjt): editor class includes pl-[6px] pt-[6px]; yAt uses pl-1.5 pt-[5px]
  // against the same relative font-large box so caret and carousel text align.
  const useRotating = Boolean(rotatingPlaceholders?.length) && isEmpty;
  return (
    <>
      <EditorContent
        className={[
          "block [outline:none!important] resize-none w-full overflow-y-auto bg-transparent text-text-100 placeholder:text-text-400 border-0 break-words",
          "pl-[6px] pt-[6px]",
          "[&_.tiptap]:min-h-[48px] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:p-0 [&_.tiptap_p]:m-0",
          useRotating || isEmpty ? "[&_.is-editor-empty]:before:!content-['']" : "",
        ].join(" ")}
        editor={editor}
      />
      {useRotating ? (
        <CoworkRotatingPlaceholder isVisible={useRotating} placeholders={rotatingPlaceholders ?? []} />
      ) : isEmpty ? (
        <p
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none overflow-hidden pl-1.5 pt-[5px] text-text-500 line-clamp-2"
        >
          {placeholder}
        </p>
      ) : null}
    </>
  );
});

type CoworkPromptEditorInput = {
  disabled: boolean;
  disabledRef: React.MutableRefObject<boolean>;
  editorRef: React.MutableRefObject<Editor | null>;
  emitRef: React.MutableRefObject<ControlledTiptapEmitState>;
  onChangeRef: React.MutableRefObject<(value: string) => void>;
  placeholder: string;
  slashMenu: React.ComponentType<CoworkSlashCommandMenuProps>;
  submitRef: React.MutableRefObject<() => void>;
  value: string;
};

function useCoworkPromptEditor(input: CoworkPromptEditorInput) {
  return useEditor({
    content: tiptapDoc(input.value || input.emitRef.current.lastEmittedValue),
    editable: !input.disabled,
    editorProps: {
      attributes: { "aria-label": "Prompt", class: "tiptap", "data-placeholder": input.placeholder },
      // Packaged app:// Chromium adaptation (d5f261d): transaction-owned insertText.
      handleDOMEvents: {
        beforeinput: (view, event) => handleEmptyDocBeforeInput(view, event),
      },
      handleKeyDown: (_view, event) => handlePromptKeyDown(event, input.editorRef.current, input.disabledRef, input.submitRef),
    },
    extensions: [
      StarterKit.configure({ blockquote: false, bulletList: false, code: false, heading: false, horizontalRule: false, listItem: false, orderedList: false }),
      CoworkSkillChip,
      CoworkSlashCommandSuggestion.configure({ placement: "onpage", menuComponent: input.slashMenu }),
    ],
    onCreate: ({ editor }) => { input.editorRef.current = editor; },
    onDestroy: () => { input.editorRef.current = null; },
    onUpdate: ({ editor }) => {
      const next = editor.getText({ blockSeparator: "\n" });
      input.emitRef.current = markControlledTiptapUserEdit(next);
      input.onChangeRef.current(next);
    },
    shouldRerenderOnTransaction: false,
  }, [input.slashMenu]);
}

/**
 * Official wTt onKeyDownCapture (index-BELzQL5P ~6746850):
 * Enter submits when slash menu idle, !shiftKey, !altKey, !isComposing.
 * On desktop (!Yh mobile) plain Enter submits; Shift+Enter inserts newline.
 * Meta/Ctrl+Enter also submits (mobile path when Yh()).
 */
function handlePromptKeyDown(event: KeyboardEvent, editor: Editor | null, disabledRef: React.MutableRefObject<boolean>, submitRef: React.MutableRefObject<() => void>) {
  if (event.key !== "Enter") return false;
  const storage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
  if (storage?.isActive && storage.hasVisibleItems) return false;
  if (event.shiftKey || event.altKey || event.isComposing) return false;
  // Desktop: plain Enter; always allow mod+Enter (official !Yh() || meta/ctrl).
  event.preventDefault();
  if (!disabledRef.current) submitRef.current();
  return true;
}

function tiptapDoc(value: string) {
  return { type: "doc", content: (value.split("\n").length ? value.split("\n") : [""]).map((line) => ({ type: "paragraph", content: line ? [{ type: "text", text: line }] : undefined })) };
}

function draftSession(cwd?: string): SessionSummary | null {
  return cwd ? { id: "__cowork_draft__", title: "Draft", createdAtMs: 0, updatedAt: "", updatedAtMs: 0, kind: "epitaxy", sessionKind: "cowork", cwd } : null;
}
