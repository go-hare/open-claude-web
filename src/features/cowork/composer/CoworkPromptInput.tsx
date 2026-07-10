import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import type { SessionSummary } from "../../../adapters/desktopBridge/types";
import { coworkSessionsBridge } from "../session/coworkSessionBridge";
import { CoworkSessionSlashMenu } from "./slash/CoworkSessionSlashMenu";
import { CoworkSkillChip } from "./slash/CoworkSkillChip";
import { CoworkSlashCommandSuggestion } from "./slash/CoworkSlashCommandSuggestion";
import type { CoworkSlashCommandMenuProps } from "./slash/CoworkSlashTypes";

export type CoworkPromptInputHandle = {
  focus: () => void;
  getEditor: () => Editor | null;
  insertSlashCommand: () => void;
};

type CoworkPromptInputProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  slashCwd?: string;
  value: string;
};

export const CoworkPromptInput = forwardRef<CoworkPromptInputHandle, CoworkPromptInputProps>(function CoworkPromptInput({ disabled = false, onChange, onSubmit, placeholder, slashCwd, value }, ref) {
  const editorRef = useRef<Editor | null>(null);
  const submitRef = useRef(onSubmit);
  const disabledRef = useRef(disabled);
  const onChangeRef = useRef(onChange);
  const slashCwdRef = useRef(slashCwd);
  submitRef.current = onSubmit;
  disabledRef.current = disabled;
  onChangeRef.current = onChange;
  slashCwdRef.current = slashCwd;
  const slashMenu = useMemo(() => function CoworkDraftSlashMenu(props: CoworkSlashCommandMenuProps) {
    return <CoworkSessionSlashMenu {...props} bridge={coworkSessionsBridge} session={draftSession(slashCwdRef.current)} />;
  }, []);
  const editor = useCoworkPromptEditor({ disabled, disabledRef, editorRef, onChangeRef, placeholder, slashMenu, submitRef, value });
  useImperativeHandle(ref, () => ({
    focus: () => editor?.commands.focus(),
    getEditor: () => editor ?? null,
    insertSlashCommand: () => editor?.chain().focus("start").insertContent("/").run(),
  }), [editor]);
  useEffect(() => { editor?.setEditable(!disabled); }, [disabled, editor]);
  useEffect(() => syncEditorContent(editor, value), [editor, value]);
  const isEmpty = value.trim().length === 0;
  return (
    <>
      <EditorContent className={`block [outline:none!important] resize-none w-full bg-transparent text-text-100 placeholder:text-text-400 border-0 [&_.tiptap]:min-h-[48px] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:p-0 [&_.tiptap_p]:m-0 ${isEmpty ? "[&_.is-editor-empty]:before:!content-['']" : ""}`} editor={editor} />
      {isEmpty ? <p aria-hidden="true" className="self-start absolute pointer-events-none inset-0 text-text-500 line-clamp-2">{placeholder}</p> : null}
    </>
  );
});

type CoworkPromptEditorInput = {
  disabled: boolean;
  disabledRef: React.MutableRefObject<boolean>;
  editorRef: React.MutableRefObject<Editor | null>;
  onChangeRef: React.MutableRefObject<(value: string) => void>;
  placeholder: string;
  slashMenu: React.ComponentType<CoworkSlashCommandMenuProps>;
  submitRef: React.MutableRefObject<() => void>;
  value: string;
};

function useCoworkPromptEditor(input: CoworkPromptEditorInput) {
  return useEditor({
    content: tiptapDoc(input.value),
    editable: !input.disabled,
    editorProps: {
      attributes: { "aria-label": "Prompt", class: "tiptap", "data-placeholder": input.placeholder },
      handleKeyDown: (_view, event) => handlePromptKeyDown(event, input.editorRef.current, input.disabledRef, input.submitRef),
    },
    extensions: [
      StarterKit.configure({ blockquote: false, bulletList: false, code: false, heading: false, horizontalRule: false, listItem: false, orderedList: false }),
      CoworkSkillChip,
      CoworkSlashCommandSuggestion.configure({ placement: "onpage", menuComponent: input.slashMenu }),
    ],
    onCreate: ({ editor }) => { input.editorRef.current = editor; },
    onDestroy: () => { input.editorRef.current = null; },
    onUpdate: ({ editor }) => input.onChangeRef.current(editor.getText({ blockSeparator: "\n" })),
  }, [input.slashMenu]);
}

function handlePromptKeyDown(event: KeyboardEvent, editor: Editor | null, disabledRef: React.MutableRefObject<boolean>, submitRef: React.MutableRefObject<() => void>) {
  const storage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
  if (event.key !== "Enter" || !event.metaKey && !event.ctrlKey || storage?.isActive && storage.hasVisibleItems) return false;
  event.preventDefault();
  if (!disabledRef.current) submitRef.current();
  return true;
}

function syncEditorContent(editor: Editor | null, value: string) {
  if (!editor || editor.getText({ blockSeparator: "\n" }) === value) return;
  editor.commands.setContent(tiptapDoc(value), { emitUpdate: false });
}

function tiptapDoc(value: string) {
  return { type: "doc", content: (value.split("\n").length ? value.split("\n") : [""]).map((line) => ({ type: "paragraph", content: line ? [{ type: "text", text: line }] : undefined })) };
}

function draftSession(cwd?: string): SessionSummary | null {
  return cwd ? { id: "__cowork_draft__", title: "Draft", createdAtMs: 0, updatedAt: "", updatedAtMs: 0, kind: "epitaxy", sessionKind: "cowork", cwd } : null;
}
