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
import { handleEmptyDocBeforeInput } from "../../shared/tiptapEmptyDocBeforeInput";
import { createCoworkComposerSubmission } from "./coworkComposerSubmission";
import {
  COWORK_STAGED_IMAGE_MAX,
  dataUrlToCoworkImageParts,
  filterCoworkImageFiles,
  imageFilesFromClipboardData,
  readyCoworkStagedImagesToPayloads,
  revokeCoworkStagedImagePreview,
  roomForCoworkStagedImages,
  type CoworkStagedImage,
} from "./coworkComposerStagedImages";
import { useCoworkModelContextToolStates } from "./coworkModelContextStore";
import { registerCoworkSessionComposerActions } from "./coworkSessionComposerActions";
import type { CoworkClaudeAvatarState } from "../session/transcript/CoworkClaudeAvatar";
import { useCoworkConversationAvatar } from "../session/transcript/CoworkConversationAvatarContext";
import { CoworkSessionComposerSurface } from "./CoworkSessionComposerSurface";
import { CoworkAskUserQuestionBanner } from "./CoworkAskUserQuestionBanner";
import { useCoworkAskUserQuestion } from "./CoworkAskUserQuestionContext";
import { CoworkSessionSlashMenu } from "./slash/CoworkSessionSlashMenu";
import { CoworkSkillChip } from "./slash/CoworkSkillChip";
import { CoworkSlashCommandSuggestion } from "./slash/CoworkSlashCommandSuggestion";
import type { CoworkSlashCommandMenuProps } from "./slash/CoworkSlashTypes";
import { coworkSlashSkillChipContent } from "./slash/CoworkSlashTypes";
import { useCoworkModelOptions } from "./useCoworkModelOptions";

type CoworkSessionComposerProps = {
  /**
   * Official t$t avatarState (v$t Et). Optional override; default comes from
   * CoworkConversationAvatarProvider (path Et residual).
   */
  avatarState?: CoworkClaudeAvatarState;
  /** Official kAt connectionState. */
  connectionState?: string | null;
  disabled: boolean;
  images?: CoworkImagePayload[];
  isResponding: boolean;
  /**
   * Official t$t isStreaming (`l`). SessionView passes conversationIsStreaming;
   * Conversation provider also exposes the same flag as residual fallback.
   */
  isStreaming?: boolean;
  /** Official kAt nextReconnectTime. */
  nextReconnectTime?: number | null;
  onNavigate: (path: string) => void;
  /** Official kAt onRetryNow — session path mounts banner when set. */
  onRetryConnection?: () => void;
  onScrollToBottom: () => void;
  onSubmit: (text: string, input?: SendMessageInput) => Promise<void>;
  reload: () => Promise<void>;
  session: SessionSummary | null;
  sessionId: string;
  showScrollButton: boolean;
  /**
   * Optional override for sendMessage arg6 toolStates.
   * Default: official Zte/Kte model-context store when claudeai_mcp_a6k_enabled (V7).
   */
  toolStates?: CoworkToolState[];
  containerRef?: RefObject<HTMLDivElement | null>;
};

export function CoworkSessionComposer(props: CoworkSessionComposerProps) {
  const controller = useCoworkComposerController(props);
  // Official Et + `l` from Conversation path (Provider); props override when present.
  const conversationAvatar = useCoworkConversationAvatar();
  // Official t$t Ace blur uses v$t `l` (streamingMessageId || isResponding), not stop-button-only isResponding.
  const isStreaming = props.isStreaming
    ?? conversationAvatar?.isStreaming
    ?? props.isResponding;
  const avatarState = props.avatarState ?? conversationAvatar?.avatarState;
  return (
    <CoworkSessionComposerSurface
      avatarState={avatarState}
      canStop={controller.canStop}
      canSubmit={controller.canSubmit}
      childrenAbove={controller.questionBanner}
      connectionState={props.connectionState}
      containerRef={props.containerRef}
      disabled={props.disabled || controller.isConfigBusy}
      editor={controller.editor}
      isStreaming={isStreaming}
      isSubmitting={controller.isSubmitting}
      modelItems={controller.modelItems}
      modelLabel={controller.modelLabel}
      nextReconnectTime={props.nextReconnectTime}
      onContainerClick={(event) => {
        if (!(event.target instanceof HTMLElement && event.target.closest("button"))) {
          controller.editor?.commands.focus("end");
        }
      }}
      onKeyDownCapture={controller.onKeyDownCapture}
      onRemoveFile={controller.removeFile}
      onRemoveStagedImage={controller.removeStagedImage}
      onRetryConnection={props.onRetryConnection}
      onScrollToBottom={props.onScrollToBottom}
      onStop={() => void controller.stop()}
      onSubmit={() => void controller.submit()}
      placeholder={controller.placeholder}
      plusMenuItems={controller.plusMenuItems}
      selectedFiles={controller.selectedFiles}
      showScrollButton={props.showScrollButton}
      stagedImages={controller.stagedImages}
      text={controller.text}
    />
  );
}

function useCoworkComposerController(props: CoworkSessionComposerProps) {
  const ask = useCoworkAskUserQuestion();
  const modelOptions = useCoworkModelOptions();
  // Official rt=V7 / it=Zte(conversationUuid): model-context tool_states → sendMessage arg6.
  const modelContextToolStates = useCoworkModelContextToolStates(props.sessionId);
  const toolStates = props.toolStates ?? modelContextToolStates;
  const [text, setText] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [model, setModel] = useState(() => normalizeModel(props.session?.model, []));
  const [selectedFiles, setSelectedFiles] = useState<CoworkUploadedFile[]>([]);
  /**
   * Official imageBlocks / stagedImages residual for local Cowork:
   * paste (j0) + file picker image/* → strip → LZe → sendMessage arg3.
   * props.images remains an external inject path (quick entry / parent).
   */
  const [stagedImages, setStagedImages] = useState<CoworkStagedImage[]>([]);
  const stagedImagesRef = useRef(stagedImages);
  stagedImagesRef.current = stagedImages;
  const [isConfigBusy, setConfigBusy] = useState(false);
  const [questionMinimized, setQuestionMinimized] = useState(false);
  const submitRef = useRef<() => Promise<void>>(async () => undefined);
  const addImageFiles = useAddCoworkImageFiles(setStagedImages, stagedImagesRef);
  const editor = useCoworkComposerEditor({
    addImageFiles,
    disabled: props.disabled,
    session: props.session,
    sessionId: props.sessionId,
    setText,
    submitRef,
  });
  const readyImageCount = stagedImages.filter((image) => image.status === "ready" && image.base64).length;
  const canStop = props.isResponding && Boolean(coworkSessionsBridge.stop);
  // Official allows image-only send when LZe payloads exist (text optional).
  const canSubmit = Boolean(
    text.trim() || selectedFiles.length || readyImageCount > 0 || props.images?.length,
  ) && !props.disabled && !isSubmitting && !isConfigBusy;
  const clearStagedImages = useCallback(() => {
    for (const image of stagedImagesRef.current) revokeCoworkStagedImagePreview(image);
    stagedImagesRef.current = [];
    setStagedImages([]);
  }, []);
  const clear = useCallback(() => {
    editor?.commands.clearContent(true);
    setText("");
    clearStagedImages();
  }, [clearStagedImages, editor]);
  const restore = useCallback((draft: string) => { editor?.commands.setContent(plainTextDoc(draft), { emitUpdate: false }); setText(draft); }, [editor]);
  const submitMessage = useSubmitCoworkMessage({
    canSubmit,
    clear,
    externalImages: props.images,
    onSubmit: props.onSubmit,
    restore,
    selectedFiles,
    setSelectedFiles,
    setStagedImages,
    setSubmitting,
    stagedImagesRef,
    text,
    toolStates,
  });
  const submit = useCallback(async () => {
    if (!ask.data || !ask.submit || !text.trim()) return submitMessage();
    const response = text.trim();
    clear();
    ask.submit(response);
    ask.clear();
  }, [ask, clear, submitMessage, text]);
  const sendRewindPrompt = useCallback(async (prompt: string) => {
    const submission = createCoworkComposerSubmission({ prompt, selectedFiles: [], toolStates });
    setSubmitting(true);
    try { await props.onSubmit(submission.text, submission.input); } finally { setSubmitting(false); }
  }, [props.onSubmit, toolStates]);
  submitRef.current = submit;
  useEffect(() => {
    setModel(normalizeModel(props.session?.model, modelOptions.items.map((item) => item.value)));
  }, [modelOptions.items, props.session?.model]);
  useEffect(() => {
    setSelectedFiles([]);
    clearStagedImages();
  }, [clearStagedImages, props.sessionId]);
  useEffect(() => { setQuestionMinimized(false); }, [ask.data?.blockId]);
  useEffect(() => { editor?.setEditable(!props.disabled); }, [editor, props.disabled]);
  // Official composer imperative handle: setContent / executeSkill / sendMessage.
  // hUt Schedule → executeSkill("schedule"); Turn into skill → setContent(...).
  const executeSkill = useCallback((skillId: string, skillDisplayName: string, skillDescription = "") => {
    if (!editor) return false;
    return editor
      .chain()
      .focus()
      .clearContent()
      .insertContent(coworkSlashSkillChipContent(skillId, skillDisplayName, skillDescription))
      .run();
  }, [editor]);
  useEffect(() => registerCoworkSessionComposerActions(props.sessionId, {
    executeSkill,
    prefillPrompt: restore,
    sendPrompt: sendRewindPrompt,
  }), [executeSkill, props.sessionId, restore, sendRewindPrompt]);
  const actions = useComposerConfiguration({
    model,
    props,
    setConfigBusy,
    setModel: (value) => {
      modelOptions.setStickyModelPreference(value);
      setModel(value);
    },
    setSelectedFiles,
  });
  const modelItems: CoworkDropdownItem[] = modelOptions.items.map((option) => ({
    checked: option.value === model,
    label: option.label,
    onSelect: () => void actions.applyModel(option.value),
  }));
  // Official local_session / agent path: dqe || isAgentNewRoute → hide project/Drive/GitHub + modes.
  const plusMenuItems = createCoworkAddMenuItems({ isAgentRoute: true, includeAddFolder: true, onAddFiles: () => void actions.addFiles(), onAddFolder: () => void actions.addFolder(), onNavigate: props.onNavigate });
  const minimizeQuestion = () => {
    setQuestionMinimized(true);
    if (!text.trim()) restore("Continue without answering");
    else editor?.commands.focus("end");
  };
  const questionBanner = ask.data && !questionMinimized ? <div className="mb-2"><CoworkAskUserQuestionBanner data={ask.data} onDismiss={minimizeQuestion} onSubmit={(answer) => { ask.submit?.(answer); ask.clear(); }} /></div> : null;
  const stop = async () => { ask.dismiss?.(); ask.clear(); await actions.stop(); };
  const removeStagedImage = useCallback((id: string) => {
    setStagedImages((prev) => {
      const hit = prev.find((item) => item.id === id);
      if (hit) revokeCoworkStagedImagePreview(hit);
      return prev.filter((item) => item.id !== id);
    });
  }, []);
  return {
    canStop,
    canSubmit,
    editor,
    isConfigBusy,
    isSubmitting,
    modelItems,
    modelLabel: modelOptions.labelFor(model),
    onKeyDownCapture: (event: React.KeyboardEvent<HTMLElement>) => handleComposerKey(event, {
      askActive: Boolean(ask.data),
      clear,
      editor,
      questionMinimized,
      reopenQuestion: () => setQuestionMinimized(false),
      text,
    }),
    placeholder: ask.data ? "Or reply directly…" : "Write a message...",
    plusMenuItems,
    questionBanner,
    removeFile: (path: string) => setSelectedFiles((current) => current.filter((file) => file.path !== path)),
    removeStagedImage,
    selectedFiles,
    stagedImages,
    stop,
    submit,
    text,
  };
}

function useCoworkComposerEditor(input: {
  addImageFiles: (files: File[]) => void;
  disabled: boolean;
  session: SessionSummary | null;
  sessionId: string;
  setText: (text: string) => void;
  submitRef: React.MutableRefObject<() => Promise<void>>;
}) {
  const slashState = useRef({ session: input.session, sessionId: input.sessionId });
  const editorRef = useRef<Editor | null>(null);
  const addImageFilesRef = useRef(input.addImageFiles);
  addImageFilesRef.current = input.addImageFiles;
  slashState.current = { session: input.session, sessionId: input.sessionId };
  const slashMenu = useMemo(() => function ExistingCoworkSlashMenu(props: CoworkSlashCommandMenuProps) { return <CoworkSessionSlashMenu {...props} bridge={coworkSessionsBridge} session={slashState.current.session} sessionId={slashState.current.sessionId} />; }, []);
  return useEditor({
    content: "",
    editable: !input.disabled,
    editorProps: {
      attributes: {
        "aria-describedby": "legacy-model-warning-text claude-code-nudge-body",
        "aria-invalid": "false",
        "aria-label": "Write your prompt to Claude",
        "aria-multiline": "true",
        "aria-required": "false",
        class: "tiptap",
        "data-placeholder": "Write a message...",
        "data-testid": "chat-input",
        role: "textbox",
      },
      // Packaged app:// Chromium adaptation (d5f261d): transaction-owned insertText.
      handleDOMEvents: {
        beforeinput: (view, event) => handleEmptyDocBeforeInput(view, event),
      },
      // Official j0 residual: image paste → stage strip (not plain-text path).
      handlePaste: (_view, event) => {
        const imageFiles = imageFilesFromClipboardData(event.clipboardData);
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        addImageFilesRef.current(imageFiles);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        const imageFiles = filterCoworkImageFiles(files);
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        addImageFilesRef.current(imageFiles);
        return true;
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.isComposing && !slashMenuVisible(editorRef.current)) {
          event.preventDefault();
          void input.submitRef.current();
          return true;
        }
        return false;
      },
    },
    extensions: [StarterKit.configure({ blockquote: false, bulletList: false, code: false, heading: false, horizontalRule: false, listItem: false, orderedList: false }), CoworkSkillChip, CoworkSlashCommandSuggestion.configure({ placement: "onpage", menuComponent: slashMenu })],
    onCreate: ({ editor }) => { editorRef.current = editor; },
    onDestroy: () => { editorRef.current = null; },
    onUpdate: ({ editor }) => input.setText(editor.getText({ blockSeparator: "\n" })),
  }, [slashMenu]);
}

/**
 * Official un(File[]) residual — stage image Files (max 5; p0 mime).
 * Async FileReader → ready base64 for LZe on submit.
 */
function useAddCoworkImageFiles(
  setStagedImages: React.Dispatch<React.SetStateAction<CoworkStagedImage[]>>,
  stagedImagesRef: React.MutableRefObject<CoworkStagedImage[]>,
) {
  return useCallback((files: File[]) => {
    const allowed = filterCoworkImageFiles(files);
    if (allowed.length === 0) return;
    setStagedImages((prev) => {
      const room = roomForCoworkStagedImages(prev.length);
      if (room <= 0) return prev;
      const slice = allowed.slice(0, room);
      const loading: CoworkStagedImage[] = slice.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name || "image.png",
        previewUrl: URL.createObjectURL(file),
        status: "loading",
      }));
      slice.forEach((file, index) => {
        const id = loading[index]!.id;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = typeof reader.result === "string" ? reader.result : "";
          if (!dataUrl) {
            setStagedImages((cur) => {
              const hit = cur.find((item) => item.id === id);
              if (hit) revokeCoworkStagedImagePreview(hit);
              return cur.filter((item) => item.id !== id);
            });
            return;
          }
          const payload = dataUrlToCoworkImageParts(dataUrl, file.name || "image.png");
          setStagedImages((cur) =>
            cur.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: "ready" as const,
                    base64: payload.base64,
                    mimeType: payload.mimeType,
                  }
                : item,
            ),
          );
        };
        reader.onerror = () => {
          setStagedImages((cur) => {
            const hit = cur.find((item) => item.id === id);
            if (hit) revokeCoworkStagedImagePreview(hit);
            return cur.filter((item) => item.id !== id);
          });
        };
        reader.readAsDataURL(file);
      });
      const next = [...prev, ...loading].slice(0, COWORK_STAGED_IMAGE_MAX);
      stagedImagesRef.current = next;
      return next;
    });
  }, [setStagedImages, stagedImagesRef]);
}

function useSubmitCoworkMessage(input: {
  canSubmit: boolean;
  clear: () => void;
  externalImages?: CoworkImagePayload[];
  onSubmit: CoworkSessionComposerProps["onSubmit"];
  restore: (draft: string) => void;
  selectedFiles: CoworkUploadedFile[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<CoworkUploadedFile[]>>;
  setStagedImages: React.Dispatch<React.SetStateAction<CoworkStagedImage[]>>;
  setSubmitting: (value: boolean) => void;
  stagedImagesRef: React.MutableRefObject<CoworkStagedImage[]>;
  text: string;
  toolStates?: CoworkToolState[];
}) {
  return useCallback(async () => {
    if (!input.canSubmit) return;
    const draft = input.text;
    const selectedFiles = input.selectedFiles;
    const stagedSnapshot = input.stagedImagesRef.current;
    // Official LZe path: ready staged → {base64,mimeType}; merge optional external inject.
    const stagedPayloads = readyCoworkStagedImagesToPayloads(stagedSnapshot) ?? [];
    const external = input.externalImages ?? [];
    const images = [...stagedPayloads, ...external];
    const submission = createCoworkComposerSubmission({
      images: images.length > 0 ? images : undefined,
      prompt: draft,
      selectedFiles,
      toolStates: input.toolStates,
    });
    input.clear();
    input.setSelectedFiles([]);
    input.setStagedImages([]);
    input.stagedImagesRef.current = [];
    input.setSubmitting(true);
    try {
      await input.onSubmit(submission.text, submission.input);
    } catch (error) {
      input.restore(draft);
      input.setSelectedFiles(selectedFiles);
      input.setStagedImages(stagedSnapshot);
      input.stagedImagesRef.current = stagedSnapshot;
      throw error;
    } finally { input.setSubmitting(false); }
  }, [input]);
}

function useComposerConfiguration(input: {
  model: string;
  props: CoworkSessionComposerProps;
  setConfigBusy: (value: boolean) => void;
  setModel: (value: string) => void;
  setSelectedFiles: React.Dispatch<React.SetStateAction<CoworkUploadedFile[]>>;
}) {
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
    // Official host browse roots use userSelectedFolders; virtual cwd `/sessions/<id>` is not a host path.
    const hostFolder =
      input.props.session?.userSelectedFolders?.find(Boolean) ??
      input.props.session?.folders?.find(Boolean) ??
      (input.props.session?.cwd && !/^\/sessions\//i.test(input.props.session.cwd) ? input.props.session.cwd : undefined);
    // Official title residual for image-capable picker.
    // Host browse returns absolute paths only (FileSystemBridge has no readFileAsDataUrl).
    // Path chips stay userSelectedFiles; paste/drop (j0) stages base64 for LZe arg3.
    const paths = await desktopBridge.FileSystem.browseFiles?.({ defaultPath: hostFolder, title: "Add files or photos" });
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
function normalizeModel(value: string | undefined, allowedValues: string[]) {
  if (!value) return "default";
  if (value === "default") return "default";
  if (allowedValues.length === 0) return value;
  return allowedValues.includes(value) ? value : "default";
}
function plainTextDoc(value: string) { return { type: "doc", content: value.split("\n").map((line) => ({ type: "paragraph", content: line ? [{ type: "text", text: line }] : undefined })) }; }
