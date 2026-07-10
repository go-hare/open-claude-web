import type { Editor } from "@tiptap/core";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { SendMessageInput, SessionSummary } from "../../../adapters/desktopBridge/types";
import { createCoworkAddMenuItems } from "../newTask/CoworkAddMenuItems";
import { coworkUploadedFilePaths, formatCoworkPromptWithUploadedFiles, mergeCoworkUploadedFiles, type CoworkUploadedFile } from "../newTask/coworkUploadedFiles";
import { coworkSessionsBridge } from "../session/coworkSessionBridge";
import type { CoworkDropdownItem } from "../ui/CoworkMenuTypes";
import { CoworkPermissionApprovals } from "./CoworkPermissionApprovals";
import { CoworkSessionComposerSurface } from "./CoworkSessionComposerSurface";
import { CoworkSessionSlashMenu } from "./slash/CoworkSessionSlashMenu";
import { CoworkSkillChip } from "./slash/CoworkSkillChip";
import { CoworkSlashCommandSuggestion } from "./slash/CoworkSlashCommandSuggestion";
import type { CoworkSlashCommandMenuProps } from "./slash/CoworkSlashTypes";

const modelOptions = [{ label: "Default", value: "default" }, { label: "Sonnet", value: "sonnet" }, { label: "Opus", value: "opus" }];

type CoworkSessionComposerProps = {
  disabled: boolean;
  isResponding: boolean;
  onNavigate: (path: string) => void;
  onScrollToBottom: () => void;
  onSubmit: (text: string, input?: SendMessageInput) => Promise<void>;
  reload: () => Promise<void>;
  session: SessionSummary | null;
  sessionId: string;
  showScrollButton: boolean;
};

export function CoworkSessionComposer(props: CoworkSessionComposerProps) {
  const controller = useCoworkComposerController(props);
  return <CoworkSessionComposerSurface canStop={controller.canStop} canSubmit={controller.canSubmit} childrenAbove={<CoworkPermissionApprovals bridge={coworkSessionsBridge} sessionId={props.sessionId} />} disabled={props.disabled} editor={controller.editor} isSubmitting={controller.isSubmitting} modelItems={controller.modelItems} modelLabel={controller.modelLabel} onContainerClick={(event) => { if (!(event.target instanceof HTMLElement && event.target.closest("button"))) controller.editor?.commands.focus("end"); }} onKeyDownCapture={controller.onKeyDownCapture} onRemoveFile={controller.removeFile} onScrollToBottom={props.onScrollToBottom} onStop={() => void controller.stop()} onSubmit={() => void controller.submit()} plusMenuItems={controller.plusMenuItems} selectedFiles={controller.selectedFiles} showScrollButton={props.showScrollButton} text={controller.text} />;
}

function useCoworkComposerController(props: CoworkSessionComposerProps) {
  const [text, setText] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [model, setModel] = useState(() => normalizeModel(props.session?.model));
  const [selectedFiles, setSelectedFiles] = useState<CoworkUploadedFile[]>([]);
  const [isConfigBusy, setConfigBusy] = useState(false);
  const submitRef = useRef<() => Promise<void>>(async () => undefined);
  const editor = useCoworkComposerEditor({ disabled: props.disabled, session: props.session, sessionId: props.sessionId, setText, submitRef });
  const canStop = props.isResponding && Boolean(coworkSessionsBridge.stop);
  const canSubmit = Boolean(text.trim() || selectedFiles.length) && !props.disabled && !isSubmitting;
  const clear = useCallback(() => { editor?.commands.clearContent(true); setText(""); }, [editor]);
  const submit = useSubmitCoworkMessage({ canSubmit, clear, onSubmit: props.onSubmit, selectedFiles, setSelectedFiles, setSubmitting, text });
  submitRef.current = submit;
  useEffect(() => { setModel(normalizeModel(props.session?.model)); }, [props.session?.model]);
  useEffect(() => { setSelectedFiles([]); }, [props.sessionId]);
  useEffect(() => { editor?.setEditable(!props.disabled); }, [editor, props.disabled]);
  const actions = useComposerConfiguration({ model, props, setConfigBusy, setModel, setSelectedFiles });
  const modelItems: CoworkDropdownItem[] = modelOptions.map((option) => ({ checked: option.value === model, label: option.label, onSelect: () => void actions.applyModel(option.value) }));
  const plusMenuItems = createCoworkAddMenuItems({ includeAddFolder: true, onAddFiles: () => void actions.addFiles(), onAddFolder: () => void actions.addFolder(), onNavigate: props.onNavigate });
  return { canStop, canSubmit, editor, isConfigBusy, isSubmitting, modelItems, modelLabel: modelLabel(model), onKeyDownCapture: (event: React.KeyboardEvent<HTMLElement>) => { if (event.key === "Escape" && !slashMenuVisible(editor)) { event.preventDefault(); clear(); } }, plusMenuItems, removeFile: (path: string) => setSelectedFiles((current) => current.filter((file) => file.path !== path)), selectedFiles, stop: actions.stop, submit, text };
}

function useCoworkComposerEditor(input: { disabled: boolean; session: SessionSummary | null; sessionId: string; setText: (text: string) => void; submitRef: React.MutableRefObject<() => Promise<void>> }) {
  const slashState = useRef({ session: input.session, sessionId: input.sessionId });
  const editorRef = useRef<Editor | null>(null);
  slashState.current = { session: input.session, sessionId: input.sessionId };
  const slashMenu = useMemo(() => function ExistingCoworkSlashMenu(props: CoworkSlashCommandMenuProps) { return <CoworkSessionSlashMenu {...props} bridge={coworkSessionsBridge} session={slashState.current.session} sessionId={slashState.current.sessionId} />; }, []);
  return useEditor({
    content: "",
    editable: !input.disabled,
    editorProps: { attributes: { "aria-label": "Prompt", class: "tiptap", "data-placeholder": "Write a message..." }, handleKeyDown: (_view, event) => { if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.isComposing && !slashMenuVisible(editorRef.current)) { event.preventDefault(); void input.submitRef.current(); return true; } return false; } },
    extensions: [StarterKit.configure({ blockquote: false, bulletList: false, code: false, heading: false, horizontalRule: false, listItem: false, orderedList: false }), CoworkSkillChip, CoworkSlashCommandSuggestion.configure({ placement: "onpage", menuComponent: slashMenu })],
    onCreate: ({ editor }) => { editorRef.current = editor; },
    onDestroy: () => { editorRef.current = null; },
    onUpdate: ({ editor }) => input.setText(editor.getText({ blockSeparator: "\n" })),
  }, [slashMenu]);
}

function useSubmitCoworkMessage(input: { canSubmit: boolean; clear: () => void; onSubmit: CoworkSessionComposerProps["onSubmit"]; selectedFiles: CoworkUploadedFile[]; setSelectedFiles: React.Dispatch<React.SetStateAction<CoworkUploadedFile[]>>; setSubmitting: (value: boolean) => void; text: string }) {
  return useCallback(async () => {
    if (!input.canSubmit) return;
    const payload = formatCoworkPromptWithUploadedFiles(input.text.trim(), input.selectedFiles);
    const filePaths = coworkUploadedFilePaths(input.selectedFiles);
    input.setSubmitting(true);
    try {
      await input.onSubmit(payload, filePaths.length ? { userSelectedFiles: filePaths } : undefined);
      input.clear();
      input.setSelectedFiles([]);
    } finally { input.setSubmitting(false); }
  }, [input]);
}

function useComposerConfiguration(input: { model: string; props: CoworkSessionComposerProps; setConfigBusy: (value: boolean) => void; setModel: (value: string) => void; setSelectedFiles: React.Dispatch<React.SetStateAction<CoworkUploadedFile[]>> }) {
  const applyModel = async (model: string) => {
    if (model === input.model) return;
    input.setModel(model); input.setConfigBusy(true);
    try { await coworkSessionsBridge.setModel?.(input.props.sessionId, model); await input.props.reload(); } finally { input.setConfigBusy(false); }
  };
  const addFolder = async () => {
    const folder = (await desktopBridge.Preferences.getDirectoryPath?.(false))?.[0];
    if (!folder) return;
    input.setConfigBusy(true);
    try { await coworkSessionsBridge.addFolderToSession?.(input.props.sessionId, folder); await input.props.reload(); } finally { input.setConfigBusy(false); }
  };
  const addFiles = async () => {
    const paths = await desktopBridge.FileSystem.browseFiles?.({ defaultPath: input.props.session?.cwd ?? input.props.session?.folders?.[0], title: "Add files or photos" });
    if (paths?.length) input.setSelectedFiles((current) => mergeCoworkUploadedFiles(current, paths));
  };
  const stop = async () => { await coworkSessionsBridge.stop?.(input.props.sessionId); await input.props.reload(); };
  return { addFiles, addFolder, applyModel, stop };
}

function slashMenuVisible(editor: Editor | null) { const storage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined; return Boolean(storage?.isActive && storage.hasVisibleItems); }
function normalizeModel(value?: string) { return modelOptions.some((option) => option.value === value) ? value! : "default"; }
function modelLabel(value: string) { return modelOptions.find((option) => option.value === value)?.label ?? value; }
