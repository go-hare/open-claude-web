import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import type { SessionSummary } from "../../adapters/desktopBridge";
import type { LocalSessionsBridge } from "../../adapters/desktopBridge/types";
import { handleEmptyDocBeforeInput } from "../shared/tiptapEmptyDocBeforeInput";
import { syncControlledTiptapValue } from "../shared/syncControlledTiptapValue";
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
  const onChangeRef = useRef(onChange);
  const bashModeRef = useRef(false);
  const slashMenuStateRef = useRef({ bridge, session, sessionRef, slashCwd });
  /**
   * Controlled TipTap residual: only setContent for *external* value changes
   * (reset, suggestion pick, clear). Never re-apply a stale empty parent `value`
   * after onUpdate — that wiped keystrokes in packaged app:// (~2ms after insert).
   * Lag window (~50ms): empty prop while last emit still matches live doc → heal, don't wipe.
   * Intentional parent clear (submit/reset) arrives later and still setContents.
   */
  const lastEmittedValueRef = useRef(value);
  const lastEmitAtRef = useRef(0);
  const isBashMode = value.trimStart().startsWith("!");
  const canSubmit = value.trim().length > 0 && !disabled && !busy;

  submitRef.current = onSubmit;
  disabledRef.current = disabled || busy;
  onChangeRef.current = onChange;
  bashModeRef.current = isBashMode;
  slashMenuStateRef.current = { bridge, session, sessionRef, slashCwd };

  const slashMenuComponent = useMemo(() => function OfficialComposerSlashCommandMenuRenderer(props: OfficialSlashCommandMenuProps) {
    const state = slashMenuStateRef.current;
    // New-session draft residual (no open session id): still resolve / commands against
    // the selected folder cwd, and treat the draft as a local Code session so the same
    // local extras (model, btw, schedule, …) surface. clear is gated off __draft__ in the menu.
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

  const editor = useEditor({
    // Prefer live emit if parent value lags (editor recreate mid-keystroke).
    content: tiptapDocFromPlainText(value || lastEmittedValueRef.current),
    editable: !disabled && !busy,
    editorProps: {
      attributes: {
        "aria-label": "Prompt",
        class: "tiptap",
        "data-placeholder": placeholder,
      },
      handleDOMEvents: {
        beforeinput: (view, event) => handleEmptyDocBeforeInput(view, event),
      },
      handleKeyDown: (_view, event) => {
        // Enter submit is handled in onKeyDownCapture (official wTt residual).
        // ProseMirror skips handleKeyDown while view.composing / keyCode 229, so
        // capture is the source of truth; keep Escape here for bash-mode exit.
        const slashStorage = (editorRef.current?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
        const hasSlashMenu = Boolean(slashStorage?.isActive && slashStorage?.hasVisibleItems);
        if (event.key === "Escape" && bashModeRef.current && !hasSlashMenu) {
          event.preventDefault();
          lastEmittedValueRef.current = "";
          lastEmitAtRef.current = 0;
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
      OfficialSkillChip,
      OfficialSlashCommandSuggestion.configure({ placement: "onpage", menuComponent: slashMenuComponent }),
    ],
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onUpdate: ({ editor }) => {
      const next = editor.getText({ blockSeparator: "\n" });
      lastEmittedValueRef.current = next;
      lastEmitAtRef.current = Date.now();
      onChangeRef.current(next);
    },
    // Avoid TipTap re-render storms on each keystroke; parent owns controlled value.
    shouldRerenderOnTransaction: false,
  }, [slashMenuComponent]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      // Prefer DOM focus first so Base UI returnFocus cannot leave the folder
      // pill as activeElement while PM thinks it is focused.
      const dom = editor?.view?.dom as HTMLElement | undefined;
      if (dom && typeof dom.focus === "function") {
        try {
          dom.focus({ preventScroll: true });
        } catch {
          dom.focus();
        }
      }
      editor?.commands.focus("end");
    },
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
    // Official c119: typing is editor-owned; only external setText/clear setContent.
    // Lagging parent value (e.g. "4" while doc is "45") must not wipe further keys.
    const next = syncControlledTiptapValue({
      editor,
      value,
      emit: {
        lastEmittedValue: lastEmittedValueRef.current,
        lastEmitAt: lastEmitAtRef.current,
      },
      onChange: (text) => onChangeRef.current(text),
      docFromPlainText: tiptapDocFromPlainText,
    });
    lastEmittedValueRef.current = next.lastEmittedValue;
    lastEmitAtRef.current = next.lastEmitAt;
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
              lastEmittedValueRef.current = "";
              lastEmitAtRef.current = 0;
              onChangeRef.current("");
              editor?.commands.clearContent(true);
              return;
            }
            // Official wTt residual: Enter submits in capture so PM composition skip
            // (view.composing / keyCode 229) cannot swallow the key. Manual Send still
            // works via onClick. Never submit while IME is actively composing.
            if (event.key !== "Enter" || event.shiftKey || event.altKey || event.isComposing || event.keyCode === 229 || hasSlashMenu) {
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            if (!disabledRef.current) submitRef.current();
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
