import { useEffect, useRef, type MouseEvent } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { PermissionMode, WorkspaceContext } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { OfficialDropdownButton, type OfficialDropdownItem } from "../OfficialEpitaxyComponents";
import { CoworkExternalChin } from "./CoworkExternalChin";
import { CoworkSelectedFiles } from "./CoworkSelectedFiles";

type CoworkPromptComposerProps = {
  busy: boolean;
  focusRequestKey: number;
  model: string;
  onModelChange: (value: string) => void;
  onPermissionModeChange: (value: PermissionMode) => void;
  onWorkspaceChange: (workspace: WorkspaceContext) => void;
  onAddFiles: () => void;
  onRemoveFile: (filePath: string) => void;
  onSubmit: (options?: { keepGoing?: boolean }) => void;
  permissionMode: PermissionMode;
  prompt: string;
  selectedFilePaths: string[];
  setPrompt: (value: string) => void;
  workspace: WorkspaceContext;
};

const promptShellClass = [
  "epitaxy-prompt !box-content flex flex-col bg-bg-000 mx-2 md:mx-0 items-stretch transition-all duration-200 relative z-10 rounded-[20px]",
  "relative z-[1] border border-transparent md:w-full",
  "shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/3.5%),0_0_0_0.5px_hsla(var(--border-300)/0.15)]",
  "hover:shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/3.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)]",
  "focus-within:shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/7.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)]",
  "hover:focus-within:shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/7.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)]",
].join(" ");

const composerIconButtonClass = "group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy pressed:text-uncontained-selected pressed:hover:text-uncontained-selected ring-focus h-base text-body rounded-base justify-center aspect-square px-p3";
const sendButtonClass = `${composerIconButtonClass} text-primary-default hover:text-primary-hover disabled:text-primary-disabled disabled:hover:text-primary-disabled busy:text-primary-busy ring-focus-primary`;

export function CoworkPromptComposer(props: CoworkPromptComposerProps) {
  const hasPrompt = props.prompt.trim().length > 0;
  const canSubmit = hasPrompt || props.selectedFilePaths.length > 0;
  const editor = useCoworkPromptEditor(props, canSubmit);

  return (
    <>
      <fieldset className="flex w-full min-w-0 flex-col">
        <div className="relative">
          <div
            className={`${promptShellClass} ${props.busy ? "cursor-default" : "cursor-text"}`}
            onClick={(event) => focusEditorFromShellClick(event, () => editor?.commands.focus("end"))}
          >
            <div className="flex flex-col m-3.5 gap-3">
              <CoworkPromptEditor editor={editor} hasPrompt={hasPrompt} />
              <CoworkSelectedFiles filePaths={props.selectedFilePaths} onRemove={props.onRemoveFile} />
              <CoworkPromptToolbar busy={props.busy} canSubmit={canSubmit} onAddFiles={props.onAddFiles} onSubmit={props.onSubmit} />
            </div>
          </div>
        </div>
      </fieldset>
      <CoworkExternalChin
        busy={props.busy}
        model={props.model}
        onModelChange={props.onModelChange}
        onPermissionModeChange={props.onPermissionModeChange}
        onWorkspaceChange={props.onWorkspaceChange}
        permissionMode={props.permissionMode}
        workspace={props.workspace}
      />
      <CoworkKeepGoingHint />
    </>
  );
}

function useCoworkPromptEditor(props: CoworkPromptComposerProps, canSubmit: boolean) {
  const { busy, focusRequestKey, onSubmit, prompt, setPrompt } = props;
  const submitStateRef = useRef({ busy, canSubmit, onSubmit });

  useEffect(() => {
    submitStateRef.current = { busy, canSubmit, onSubmit };
  }, [busy, canSubmit, onSubmit]);

  const editor = useEditor({
    content: "",
    editable: !busy,
    editorProps: {
      attributes: { "aria-label": "今天我可以帮你做什么？", class: "tiptap" },
      handleKeyDown: (_view, event) => {
        const isKeepGoing = event.key === "Enter" && !event.shiftKey && !event.altKey && !event.isComposing && (event.metaKey || event.ctrlKey);
        if (isKeepGoing) {
          event.preventDefault();
          submitFromRef(submitStateRef, { keepGoing: true });
          return true;
        }
        const isPlainEnter = event.key === "Enter" && !event.shiftKey && !event.altKey && !event.isComposing;
        if (!isPlainEnter) return false;
        event.preventDefault();
        submitFromRef(submitStateRef);
        return true;
      },
    },
    extensions: [StarterKit.configure({ blockquote: false, bulletList: false, code: false, heading: false, horizontalRule: false, listItem: false, orderedList: false })],
    onUpdate: ({ editor: nextEditor }) => {
      if (!nextEditor.isDestroyed) setPrompt(nextEditor.getText({ blockSeparator: "\n" }));
    },
  }, [setPrompt]);

  useEffect(() => { if (!editor?.isDestroyed) editor?.setEditable(!busy); }, [busy, editor]);
  useEffect(() => syncEditorContent(editor, prompt), [editor, prompt]);
  useEffect(() => {
    if (!editor || editor.isDestroyed || focusRequestKey === 0) return;
    window.setTimeout(() => { if (!editor.isDestroyed) editor.commands.focus("end"); }, 0);
  }, [editor, focusRequestKey]);

  return editor;
}

function syncEditorContent(editor: ReturnType<typeof useEditor>, prompt: string) {
  if (!editor || editor.isDestroyed) return;
  const current = editor.getText({ blockSeparator: "\n" });
  if (current !== prompt) editor.commands.setContent(prompt);
}

function submitFromRef(ref: { current: { busy: boolean; canSubmit: boolean; onSubmit: (options?: { keepGoing?: boolean }) => void } }, options?: { keepGoing?: boolean }) {
  const { busy, canSubmit, onSubmit } = ref.current;
  if (!canSubmit || busy) return;
  onSubmit(options);
}

function CoworkPromptEditor({ editor, hasPrompt }: { editor: ReturnType<typeof useEditor>; hasPrompt: boolean }) {
  return (
    <div className="relative font-large">
      <EditorContent
        className="epitaxy-prompt-input min-w-0 text-text-100 [&_.tiptap]:min-h-[48px] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:bg-transparent [&_.tiptap]:p-0 [&_.tiptap_p]:m-0"
        editor={editor}
      />
      {!hasPrompt ? <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 text-text-500">今天我可以帮你做什么？</span> : null}
    </div>
  );
}

function CoworkPromptToolbar({
  busy,
  canSubmit,
  onAddFiles,
  onSubmit,
}: {
  busy: boolean;
  canSubmit: boolean;
  onAddFiles: () => void;
  onSubmit: () => void;
}) {
  const addMenuItems: OfficialDropdownItem[] = [
    { icon: "FileAdd", label: "Add files or photos", onSelect: onAddFiles },
  ];
  return (
    <div className="relative flex gap-2 w-full items-center">
      <div className="relative flex-1 flex items-center shrink min-w-0 gap-1">
        <OfficialDropdownButton ariaLabel="Add files, connectors, and more" disabled={busy} icon="PlusLarge" items={addMenuItems} revealChevron="never" side="top" size="small" variant="uncontained" />
      </div>
      <div className="shrink-0 flex items-center w-8 z-10 justify-end">
        <button aria-label="开始任务" className={sendButtonClass} disabled={busy || !canSubmit} onClick={() => onSubmit()} type="button">
          <span aria-hidden="true" className="btn-squish absolute inset-0 -z-[1] rounded-[inherit] bg-[var(--fill-primary-default)] group-hover/btn:bg-[var(--fill-primary-hover)] group-disabled/btn:bg-[var(--fill-primary-disabled)]" />
          <Icon name={busy ? "Stop" : "ArrowUp"} customSize={18} bold />
        </button>
      </div>
    </div>
  );
}

function CoworkKeepGoingHint() {
  return (
    <div className="mt-3 flex items-center justify-end gap-2 font-small text-text-500 transition-opacity duration-150">
      <ShortcutKeys keys="cmd+enter" />
      <span>to start a task and keep going</span>
    </div>
  );
}

function ShortcutKeys({ keys }: { keys: string }) {
  return (
    <span className="flex items-center gap-px shrink-0 text-footnote text-t6">
      {shortcutParts(keys).map((key, index) => <kbd className="font-ui flex items-center justify-center h-[16px]" key={`${key}-${index}`}>{key}</kbd>)}
    </span>
  );
}

function focusEditorFromShellClick(event: MouseEvent<HTMLElement>, focus: () => void) {
  if (event.target instanceof HTMLElement && event.target.closest("button,[role='button'],[role='menuitem']")) return;
  focus();
}

function shortcutParts(keys: string) {
  const labels: Record<string, string> = { alt: "⌥", cmd: "⌘", ctrl: "⌃", enter: "↵", shift: "⇧" };
  return keys.toLowerCase().split("+").filter(Boolean).map((part) => labels[part] ?? part.toUpperCase());
}
