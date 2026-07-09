import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import type { SessionSummary } from "../../adapters/desktopBridge";
import type { LocalSessionsBridge } from "../../adapters/desktopBridge/types";
import { OfficialButton, type OfficialSessionRef } from "./OfficialEpitaxyComponents";
import { OfficialEpitaxySlashCommandMenu } from "./slash/OfficialEpitaxySlashCommandMenu";
import { OfficialSkillChip } from "./slash/OfficialSkillChip";
import { OfficialSlashCommandSuggestion } from "./slash/OfficialSlashCommandSuggestion";
import type { OfficialSlashCommandMenuProps } from "./slash/OfficialSlashTypes";

export type OfficialPromptEditorHandle = {
  focus: () => void;
  insertSlashCommand: () => void;
};

type OfficialPromptEditorProps = {
  bridge: LocalSessionsBridge;
  busy?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  session?: SessionSummary | null;
  sessionRef?: OfficialSessionRef | null;
  slashCwd?: string;
  value: string;
};

export const OfficialPromptEditor = forwardRef<OfficialPromptEditorHandle, OfficialPromptEditorProps>(function OfficialPromptEditor({
  bridge,
  busy = false,
  disabled = false,
  onChange,
  onSubmit,
  placeholder,
  session = null,
  sessionRef = null,
  slashCwd,
  value,
}, ref) {
  const editorRef = useRef<Editor | null>(null);
  const submitRef = useRef(onSubmit);
  const disabledRef = useRef(disabled || busy);
  const bashModeRef = useRef(false);
  const slashMenuStateRef = useRef({ bridge, session, sessionRef, slashCwd });
  const isBashMode = value.trimStart().startsWith("!");
  const canSubmit = value.trim().length > 0 && !disabled && !busy;

  submitRef.current = onSubmit;
  disabledRef.current = disabled || busy;
  bashModeRef.current = isBashMode;
  slashMenuStateRef.current = { bridge, session, sessionRef, slashCwd };

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
    return <OfficialEpitaxySlashCommandMenu {...props} bridge={state.bridge} session={draftSession} sessionRef={state.sessionRef} />;
  }, []);

  const editor = useEditor({
    content: tiptapDocFromPlainText(value),
    editable: !disabled && !busy,
    editorProps: {
      attributes: {
        "aria-label": "Prompt",
        class: "tiptap",
        "data-placeholder": placeholder,
      },
      handleKeyDown: (_view, event) => {
        const slashStorage = (editorRef.current?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
        const hasSlashMenu = Boolean(slashStorage?.isActive && slashStorage?.hasVisibleItems);
        if (event.key === "Escape" && bashModeRef.current && !hasSlashMenu) {
          event.preventDefault();
          onChange("");
          editorRef.current?.commands.clearContent(true);
          return true;
        }
        if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.isComposing && !hasSlashMenu) {
          event.preventDefault();
          if (!disabledRef.current) submitRef.current();
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
      OfficialSkillChip,
      OfficialSlashCommandSuggestion.configure({ placement: "onpage", menuComponent: slashMenuComponent }),
    ],
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getText({ blockSeparator: "\n" }));
    },
  }, [slashMenuComponent]);

  useImperativeHandle(ref, () => ({
    focus: () => editor?.commands.focus(),
    insertSlashCommand: () => {
      editor?.chain().focus("start").insertContent("/").run();
    },
  }), [editor]);

  useEffect(() => {
    editor?.setEditable(!disabled && !busy);
  }, [busy, disabled, editor]);

  useEffect(() => {
    const slashStorage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { disabled?: boolean } | undefined;
    if (slashStorage) slashStorage.disabled = isBashMode;
  }, [editor, isBashMode]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getText({ blockSeparator: "\n" });
    if (current !== value) editor.commands.setContent(tiptapDocFromPlainText(value), { emitUpdate: false });
  }, [editor, value]);

  return (
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
      <div aria-hidden="true" className="grid min-w-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none" style={{ gridTemplateRows: "0fr" }}>
        <div className="min-h-0 overflow-hidden" />
      </div>
      <div className="relative flex w-full">
        {isBashMode ? <span aria-hidden="true" title="Run as a shell command" className="ml-[var(--p7)] mt-[13px] shrink-0 select-none self-start rounded-r2 bg-extended-purple px-p3 text-code text-[var(--core-black)]">bash</span> : null}
        <EditorContent
          className={`epitaxy-prompt-input flex-1 min-w-0 text-heading text-t9 [&_.tiptap]:min-h-[var(--h8)] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:py-[13px] [&_.tiptap]:pl-p7 [&_.tiptap]:pr-p3 [&_.tiptap_p]:m-0 ${value.trim().length === 0 ? "[&_.is-editor-empty]:before:!content-['']" : ""}`}
          editor={editor}
          onKeyDownCapture={(event) => {
            const slashStorage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
            const hasSlashMenu = Boolean(slashStorage?.isActive && slashStorage?.hasVisibleItems);
            if (event.key === "Escape" && isBashMode && !hasSlashMenu) {
              event.preventDefault();
              onChange("");
              editor?.commands.clearContent(true);
            }
          }}
        />
        {value.trim().length === 0 ? <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 right-[var(--h8)] truncate pl-p7 pt-[13px] text-heading text-t5">{isBashMode ? "Enter a shell command" : placeholder}</span> : null}
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
