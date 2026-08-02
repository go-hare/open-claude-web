/**
 * Official aYt CodeTipTapEditor subset used by uYt scheduled create modal.
 * Source: index-BELzQL5P.js const aYt + vTt({ plainTextMode: true }) + rjt EditorContent.
 * Class strings must exist in official ion-dist CSS (c6a992d55).
 */
import { Placeholder } from "@tiptap/extensions/placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { handleEmptyDocBeforeInput } from "../../shared/tiptapEmptyDocBeforeInput";

const PROMPT_PLACEHOLDER =
  "Check my Google Calendar for today's meetings and summarize my unread emails. Highlight anything urgent.";

type ScheduledPromptEditorProps = {
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
  onUpdate: (text: string) => void;
  placeholder?: string;
  /** Official remounts aYt with key r?.id ?? "new" */
  resetKey?: string;
  value: string;
};

export function ScheduledPromptEditor({
  ariaLabel = "Prompt",
  className,
  compact = false,
  onUpdate,
  placeholder = PROMPT_PLACEHOLDER,
  resetKey = "new",
  value,
}: ScheduledPromptEditorProps) {
  const onUpdateRef = useRef(onUpdate);
  /** Skip setContent when parent only echoes last onUpdate (stale-empty wipe). */
  const lastEmittedValueRef = useRef(value);
  const lastEmitAtRef = useRef(0);
  onUpdateRef.current = onUpdate;

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      extensions: [
        // Official vTt plainTextMode → MEt.configure(...)
        StarterKit.configure({
          bold: false,
          italic: false,
          strike: false,
          code: false,
          codeBlock: false,
          blockquote: false,
          hardBreak: false,
          heading: false,
          horizontalRule: false,
          bulletList: {},
          orderedList: {},
          listItem: {},
          dropcursor: false,
          link: false,
        }),
        // Official RNt emptyEditorClass
        Placeholder.configure({
          emptyEditorClass: "is-editor-empty before:!text-text-500 before:whitespace-nowrap",
          emptyNodeClass: "is-empty",
          placeholder,
          showOnlyCurrent: false,
          showOnlyWhenEditable: true,
        }),
      ],
      content: textToDoc(value || lastEmittedValueRef.current),
      editorProps: {
        attributes: {
          "aria-label": ariaLabel,
          // TipTap adds "tiptap"; ProseMirror is always present — official min-h targets .ProseMirror
          class: "outline-none border-0",
          enterkeyhint: "enter",
        },
        handleDOMEvents: {
          beforeinput: (view, event) => handleEmptyDocBeforeInput(view, event),
        },
      },
      onUpdate: ({ editor: next }) => {
        const text = next.getText({ blockSeparator: "\n" });
        lastEmittedValueRef.current = text;
        lastEmitAtRef.current = Date.now();
        onUpdateRef.current(text);
      },
    },
    [resetKey, placeholder],
  );

  useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedValueRef.current) return;
    const current = editor.getText({ blockSeparator: "\n" });
    if (current === value) {
      lastEmittedValueRef.current = value;
      return;
    }
    if (
      value === ""
      && current !== ""
      && current === lastEmittedValueRef.current
      && Date.now() - lastEmitAtRef.current < 50
    ) {
      onUpdateRef.current(current);
      return;
    }
    lastEmittedValueRef.current = value;
    lastEmitAtRef.current = 0;
    editor.commands.setContent(textToDoc(value), { emitUpdate: false });
  }, [editor, value]);

  // Official uYt aYt size branch — classes verified in c6a992d55 CSS
  const sizeChrome = compact
    ? "max-h-[200px] [&_.ProseMirror]:min-h-[80px]"
    : "max-h-[300px] [&_.ProseMirror]:min-h-[128px]";

  return (
    <div
      className={[
        // Official aYt: relative + uYt-passed className
        "relative",
        "font-base text-text-000 px-3 py-2 overflow-y-auto",
        "[&_.ProseMirror]:w-full [&_.ProseMirror]:break-words [&_.ProseMirror]:whitespace-pre-wrap",
        "[&_.is-editor-empty]:relative",
        "[&_.is-editor-empty]:before:absolute [&_.is-editor-empty]:before:left-0 [&_.is-editor-empty]:before:right-0 [&_.is-editor-empty]:before:!h-auto",
        "[&_.is-editor-empty]:before:!whitespace-pre-wrap",
        sizeChrome,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-official-source="index-BELzQL5P.js:aYt"
    >
      {/* Official rjt EditorContent classes */}
      <EditorContent
        className={[
          "prose-none [&_.tiptap]:outline-none [&_.tiptap]:border-0",
          "[&_.tiptap_p]:m-0",
          "[&_.tiptap.is-editor-empty]:before:float-left [&_.tiptap.is-editor-empty]:before:pointer-events-none",
        ].join(" ")}
        editor={editor}
      />
    </div>
  );
}

function textToDoc(text: string) {
  if (!text) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }
  return {
    type: "doc",
    content: text.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}
