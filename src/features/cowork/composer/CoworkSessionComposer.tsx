import type { Editor } from "@tiptap/core";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { CoworkImagePayload, CoworkToolState, SendMessageInput, SessionSummary } from "../../../adapters/desktopBridge/types";
import { createCoworkAddMenuItems } from "../newTask/CoworkAddMenuItems";
import { mergeCoworkUploadedFiles, type CoworkUploadedFile } from "../newTask/coworkUploadedFiles";
import { coworkSessionsBridge } from "../session/coworkSessionBridge";
import { stopCoworkSession } from "../session/coworkSessionStop";
import type { CoworkDropdownItem } from "../ui/CoworkMenuTypes";
import { createCoworkComposerSubmission } from "./coworkComposerSubmission";
import { registerCoworkSessionComposerActions } from "./coworkSessionComposerActions";
import { CoworkSessionComposerSurface } from "./CoworkSessionComposerSurface";
import { CoworkAskUserQuestionBanner } from "./CoworkAskUserQuestionBanner";
import { useCoworkAskUserQuestion } from "./CoworkAskUserQuestionContext";
import { CoworkSessionSlashMenu } from "./slash/CoworkSessionSlashMenu";
import { CoworkSkillChip } from "./slash/CoworkSkillChip";
import { CoworkSlashCommandSuggestion } from "./slash/CoworkSlashCommandSuggestion";
import type { CoworkSlashCommandMenuProps } from "./slash/CoworkSlashTypes";

const modelOptions = [{ label: "Default", value: "default" }, { label: "Sonnet", value: "sonnet" }, { label: "Opus", value: "opus" }];

type CoworkSessionComposerProps = {
  disabled: boolean;
  images?: CoworkImagePayload[];
  isResponding: boolean;
  onNavigate: (path: string) => void;
  onScrollToBottom: () => void;
  onSubmit: (text: string, input?: SendMessageInput) => Promise<void>;
  reload: () => Promise<void>;
  session: SessionSummary | null;
  sessionId: string;
  showScrollButton: boolean;
  toolStates?: CoworkToolState[];
  containerRef?: RefObject<HTMLDivElement | null>;
};

export function CoworkSessionComposer(props: CoworkSessionComposerProps) {
  const controller = useCoworkComposerController(props);
  return <CoworkSessionComposerSurface canStop={controller.canStop} canSubmit={controller.canSubmit} childrenAbove={controller.questionBanner} containerRef={props.containerRef} disabled={props.disabled || controller.isConfigBusy} editor={controller.editor} isSubmitting={controller.isSubmitting} modelItems={controller.modelItems} modelLabel={controller.modelLabel} onContainerClick={(event) => { if (!(event.target instanceof HTMLElement && event.target.closest("button"))) controller.editor?.commands.focus("end"); }} onKeyDownCapture={controller.onKeyDownCapture} onRemoveFile={controller.removeFile} onScrollToBottom={props.onScrollToBottom} onStop={() => void controller.stop()} onSubmit={() => void controller.submit()} placeholder={controller.placeholder} plusMenuItems={controller.plusMenuItems} selectedFiles={controller.selectedFiles} showScrollButton={props.showScrollButton} text={controller.text} />;
}

function useCoworkComposerController(props: CoworkSessionComposerProps) {
  const ask = useCoworkAskUserQuestion();
  const [text, setText] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [model, setModel] = useState(() => normalizeModel(props.session?.model));
  const [selectedFiles, setSelectedFiles] = useState<CoworkUploadedFile[]>([]);
  const [isConfigBusy, setConfigBusy] = useState(false);
  const [questionMinimized, setQuestionMinimized] = useState(false);
  const submitRef = useRef<() => Promise<void>>(async () => undefined);
  const editor = useCoworkComposerEditor({ disabled: props.disabled, session: props.session, sessionId: props.sessionId, setText, submitRef });
  const canStop = props.isResponding && Boolean(coworkSessionsBridge.stop);
  const canSubmit = Boolean(text.trim() || selectedFiles.length || props.images?.length) && !props.disabled && !isSubmitting && !isConfigBusy;
  const clear = useCallback(() => { editor?.commands.clearContent(true); setText(""); }, [editor]);
  const restore = useCallback((draft: string) => { editor?.commands.setContent(plainTextDoc(draft), { emitUpdate: false }); setText(draft); }, [editor]);
  const submitMessage = useSubmitCoworkMessage({ canSubmit, clear, images: props.images, onSubmit: props.onSubmit, restore, selectedFiles, setSelectedFiles, setSubmitting, text, toolStates: props.toolStates });
  const submit = useCallback(async () => {
    if (!ask.data || !ask.submit || !text.trim()) return submitMessage();
    const response = text.trim();
    clear();
    ask.submit(response);
    ask.clear();
  }, [ask, clear, submitMessage, text]);
  const sendRewindPrompt = useCallback(async (prompt: string) => {
    const submission = createCoworkComposerSubmission({ prompt, selectedFiles: [], toolStates: props.toolStates });
    setSubmitting(true);
    try { await props.onSubmit(submission.text, submission.input); } finally { setSubmitting(false); }
  }, [props.onSubmit, props.toolStates]);
  submitRef.current = submit;
  useEffect(() => { setModel(normalizeModel(props.session?.model)); }, [props.session?.model]);
  useEffect(() => { setSelectedFiles([]); }, [props.sessionId]);
  useEffect(() => { setQuestionMinimized(false); }, [ask.data?.blockId]);
  useEffect(() => { editor?.setEditable(!props.disabled); }, [editor, props.disabled]);
  useEffect(() => registerCoworkSessionComposerActions(props.sessionId, {
    prefillPrompt: restore,
    sendPrompt: sendRewindPrompt,
  }), [props.sessionId, restore, sendRewindPrompt]);
  const actions = useComposerConfiguration({ model, props, setConfigBusy, setModel, setSelectedFiles });
  const modelItems: CoworkDropdownItem[] = modelOptions.map((option) => ({ checked: option.value === model, label: option.label, onSelect: () => void actions.applyModel(option.value) }));
  const plusMenuItems = createCoworkAddMenuItems({ includeAddFolder: true, onAddFiles: () => void actions.addFiles(), onAddFolder: () => void actions.addFolder(), onNavigate: props.onNavigate });
  const minimizeQuestion = () => {
    setQuestionMinimized(true);
    if (!text.trim()) restore("Continue without answering");
    else editor?.commands.focus("end");
  };
  const questionBanner = ask.data && !questionMinimized ? <div className="mb-2"><CoworkAskUserQuestionBanner data={ask.data} onDismiss={minimizeQuestion} onSubmit={(answer) => { ask.submit?.(answer); ask.clear(); }} /></div> : null;
  const stop = async () => { ask.dismiss?.(); ask.clear(); await actions.stop(); };
  return { canStop, canSubmit, editor, isConfigBusy, isSubmitting, modelItems, modelLabel: modelLabel(model), onKeyDownCapture: (event: React.KeyboardEvent<HTMLElement>) => handleComposerKey(event, { askActive: Boolean(ask.data), clear, editor, questionMinimized, reopenQuestion: () => setQuestionMinimized(false), text }), placeholder: ask.data ? "Or reply directly…" : "Write a message...", plusMenuItems, questionBanner, removeFile: (path: string) => setSelectedFiles((current) => current.filter((file) => file.path !== path)), selectedFiles, stop, submit, text };
}

function useCoworkComposerEditor(input: { disabled: boolean; session: SessionSummary | null; sessionId: string; setText: (text: string) => void; submitRef: React.MutableRefObject<() => Promise<void>> }) {
  const slashState = useRef({ session: input.session, sessionId: input.sessionId });
  const editorRef = useRef<Editor | null>(null);
  slashState.current = { session: input.session, sessionId: input.sessionId };
  const slashMenu = useMemo(() => function ExistingCoworkSlashMenu(props: CoworkSlashCommandMenuProps) { return <CoworkSessionSlashMenu {...props} bridge={coworkSessionsBridge} session={slashState.current.session} sessionId={slashState.current.sessionId} />; }, []);
  return useEditor({
    content: "",
    editable: !input.disabled,
    editorProps: { attributes: { "aria-describedby": "legacy-model-warning-text claude-code-nudge-body", "aria-invalid": "false", "aria-label": "Write your prompt to Claude", "aria-multiline": "true", "aria-required": "false", class: "tiptap", "data-placeholder": "Write a message...", "data-testid": "chat-input", role: "textbox" }, handleKeyDown: (_view, event) => { if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.isComposing && !slashMenuVisible(editorRef.current)) { event.preventDefault(); void input.submitRef.current(); return true; } return false; } },
    extensions: [StarterKit.configure({ blockquote: false, bulletList: false, code: false, heading: false, horizontalRule: false, listItem: false, orderedList: false }), CoworkSkillChip, CoworkSlashCommandSuggestion.configure({ placement: "onpage", menuComponent: slashMenu })],
    onCreate: ({ editor }) => { editorRef.current = editor; },
    onDestroy: () => { editorRef.current = null; },
    onUpdate: ({ editor }) => input.setText(editor.getText({ blockSeparator: "\n" })),
  }, [slashMenu]);
}

function useSubmitCoworkMessage(input: { canSubmit: boolean; clear: () => void; images?: CoworkImagePayload[]; onSubmit: CoworkSessionComposerProps["onSubmit"]; restore: (draft: string) => void; selectedFiles: CoworkUploadedFile[]; setSelectedFiles: React.Dispatch<React.SetStateAction<CoworkUploadedFile[]>>; setSubmitting: (value: boolean) => void; text: string; toolStates?: CoworkToolState[] }) {
  return useCallback(async () => {
    if (!input.canSubmit) return;
    const draft = input.text;
    const selectedFiles = input.selectedFiles;
    const submission = createCoworkComposerSubmission({ images: input.images, prompt: draft, selectedFiles, toolStates: input.toolStates });
    input.clear();
    input.setSelectedFiles([]);
    input.setSubmitting(true);
    try {
      await input.onSubmit(submission.text, submission.input);
    } catch (error) {
      input.restore(draft);
      input.setSelectedFiles(selectedFiles);
      throw error;
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
    try {
      const result = await coworkSessionsBridge.addFolderToSession?.(input.props.sessionId, folder);
      if (result?.ok) await input.props.reload();
    } finally { input.setConfigBusy(false); }
  };
  const addFiles = async () => {
    const paths = await desktopBridge.FileSystem.browseFiles?.({ defaultPath: input.props.session?.cwd ?? input.props.session?.folders?.[0], title: "Add files or photos" });
    if (paths?.length) input.setSelectedFiles((current) => mergeCoworkUploadedFiles(current, paths));
  };
  const stop = async () => { await stopCoworkSession(coworkSessionsBridge, input.props.sessionId); };
  return { addFiles, addFolder, applyModel, stop };
}

function slashMenuVisible(editor: Editor | null) { const storage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined; return Boolean(storage?.isActive && storage.hasVisibleItems); }
function handleComposerKey(event: React.KeyboardEvent<HTMLElement>, input: { askActive: boolean; clear: () => void; editor: Editor | null; questionMinimized: boolean; reopenQuestion: () => void; text: string }) {
  if (event.key === "ArrowUp" && input.askActive && input.questionMinimized && input.editor?.isEmpty) { event.preventDefault(); input.reopenQuestion(); return; }
  if (event.key === "ArrowUp" && input.askActive && input.questionMinimized && input.text === "Continue without answering") { event.preventDefault(); input.clear(); input.reopenQuestion(); return; }
  if (event.key === "Escape" && !slashMenuVisible(input.editor)) { event.preventDefault(); input.clear(); }
}
function normalizeModel(value?: string) { return modelOptions.some((option) => option.value === value) ? value! : "default"; }
function modelLabel(value: string) { return modelOptions.find((option) => option.value === value)?.label ?? value; }
function plainTextDoc(value: string) { return { type: "doc", content: value.split("\n").map((line) => ({ type: "paragraph", content: line ? [{ type: "text", text: line }] : undefined })) }; }
