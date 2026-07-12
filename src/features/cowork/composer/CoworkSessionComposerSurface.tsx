import type { Editor } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, type KeyboardEvent, type MouseEvent, type ReactNode, type RefObject } from "react";
import { Icon } from "../../../shell/icons";
import { CoworkSelectedFiles } from "../newTask/CoworkSelectedFiles";
import type { CoworkUploadedFile } from "../newTask/coworkUploadedFiles";
import { bindCoworkChatInputTopMeasure } from "../session/transcript/coworkChatLayoutStore";
import { CoworkDropdownButton } from "../ui/CoworkDropdownButton";
import type { CoworkDropdownItem } from "../ui/CoworkMenuTypes";
import { CoworkComposerButton } from "./CoworkComposerPrimitives";

type CoworkSessionComposerSurfaceProps = {
  canStop: boolean;
  canSubmit: boolean;
  childrenAbove?: ReactNode;
  containerRef?: RefObject<HTMLDivElement | null>;
  disabled: boolean;
  editor: Editor | null;
  isSubmitting: boolean;
  modelItems: CoworkDropdownItem[];
  modelLabel: ReactNode;
  onContainerClick: (event: MouseEvent<HTMLElement>) => void;
  onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => void;
  onRemoveFile: (filePath: string) => void;
  onScrollToBottom: () => void;
  onStop: () => void;
  onSubmit: () => void;
  placeholder: string;
  plusMenuItems: CoworkDropdownItem[];
  selectedFiles: CoworkUploadedFile[];
  showScrollButton: boolean;
  text: string;
};

export function CoworkSessionComposerSurface(props: CoworkSessionComposerSurfaceProps) {
  const showPlaceholder = !props.text.trim();
  const sendDisabled = !props.canSubmit || props.disabled || props.isSubmitting;
  // Official AYe writer: measure sticky chat input top → viewport bottom.
  useLayoutEffect(
    () => bindCoworkChatInputTopMeasure(props.containerRef?.current ?? null),
    [props.containerRef, props.canStop, props.canSubmit, props.selectedFiles.length, props.showScrollButton, props.text],
  );
  return (
    <div className="sticky bottom-0 mx-auto w-full pt-6 z-[5]" data-chat-input-container ref={props.containerRef}>
      <ScrollToBottomButton onScroll={props.onScrollToBottom} visible={props.showScrollButton} />
      {props.childrenAbove}
      <div onKeyDownCapture={props.onKeyDownCapture}>
        <fieldset className="flex w-full min-w-0 flex-col">
          <input aria-hidden="true" className="absolute -z-10 h-0 w-0 overflow-hidden opacity-0 select-none" data-testid="file-upload" tabIndex={-1} type="file" />
          <div className="relative">
            <div
              className={`!box-content flex flex-col bg-bg-000 mx-2 md:mx-0 items-stretch transition-all duration-200 relative z-10 rounded-[20px] relative z-[1] border border-transparent md:w-full shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/3.5%),0_0_0_0.5px_hsla(var(--border-300)/0.15)] hover:shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/3.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)] focus-within:shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/7.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)] hover:focus-within:shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/7.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)] ${props.disabled ? "cursor-default" : "cursor-text"}`}
              onClick={props.onContainerClick}
            >
              <SelectedFiles files={props.selectedFiles} onRemove={props.onRemoveFile} />
              <div className="flex flex-col m-3.5 gap-3">
                <div className="relative font-large">
                  <EditorContent
                    className={`w-full overflow-y-auto font-large break-words transition-opacity duration-200 max-h-96 min-h-[1.5rem] pl-[6px] pt-[6px] [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:bg-transparent [&_.tiptap]:p-0 [&_.tiptap_p]:m-0 ${props.disabled ? "opacity-60 cursor-default" : ""} ${showPlaceholder ? "[&_.is-editor-empty]:before:!content-['']" : ""}`}
                    editor={props.editor}
                  />
                  {showPlaceholder ? <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden pl-1.5 pt-[5px] text-text-500">{props.placeholder}</span> : null}
                </div>
                <ComposerToolbar {...props} sendDisabled={sendDisabled} />
              </div>
            </div>
          </div>
        </fieldset>
      </div>
      <div className="bg-bg-100 text-text-500 text-center text-xs py-2" role="note">Claude 是 AI，可能会出错。请务必再次核对回复内容。</div>
    </div>
  );
}

function SelectedFiles({ files, onRemove }: { files: CoworkUploadedFile[]; onRemove: (filePath: string) => void }) {
  return (
    <AnimatePresence initial={false}>
      {files.length ? <motion.div animate={{ height: "auto" }} className="overflow-hidden" exit={{ height: 0 }} initial={{ height: 0 }} key="attachments"><div className="p-3.5 pb-2.5"><CoworkSelectedFiles files={files} onRemove={onRemove} /></div></motion.div> : null}
    </AnimatePresence>
  );
}

function ComposerToolbar(props: CoworkSessionComposerSurfaceProps & { sendDisabled: boolean }) {
  return (
    <div className="relative flex gap-2 w-full items-center">
      <div className="relative flex-1 flex items-center shrink min-w-0 gap-1">
        <CoworkDropdownButton align="start" alignOffset={-10} ariaLabel="Add files, connectors, and more" className="!rounded-lg hover:!bg-bg-200 aria-expanded:!bg-bg-300 active:!scale-100 ml-[2px] h-8 w-8" disabled={props.disabled} icon="PlusSmall" items={props.plusMenuItems} popupClassName="max-h-[min(var(--available-height),24rem)]" revealChevron="never" side="bottom" sideOffset={4} size="small" />
      </div>
      <CoworkDropdownButton ariaLabel="Model" disabled={props.disabled} header="Models" items={props.modelItems} label={props.modelLabel} mode="text" side="bottom" size="small" />
      <div className="shrink-0 flex items-center">
        <ComposerActions canStop={props.canStop} disabled={props.sendDisabled} isSubmitting={props.isSubmitting} onStop={props.onStop} onSubmit={props.onSubmit} />
      </div>
    </div>
  );
}

function ComposerActions({ canStop, disabled, isSubmitting, onStop, onSubmit }: {
  canStop: boolean;
  disabled: boolean;
  isSubmitting: boolean;
  onStop: () => void;
  onSubmit: () => void;
}) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {canStop ? (
        <motion.div animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1" initial={{ opacity: 0, scale: 0.3 }} key="sampling">
          <CoworkComposerButton ariaLabel="Stop response" className="!rounded-lg" onClick={onStop} size="icon-sm" variant="secondary"><Icon bold customSize={16} name="Stop" /></CoworkComposerButton>
          <CoworkComposerButton ariaLabel="Queue message" className="!rounded-lg gap-1.5" disabled={disabled} onClick={onSubmit} size="sm" variant="claude"><Icon bold customSize={16} name="ArrowUp" />{isSubmitting ? <Icon className="animate-spin" customSize={14} name="Spinner" /> : <span>Queue</span>}</CoworkComposerButton>
        </motion.div>
      ) : (
        <motion.div animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.3 }} initial={{ opacity: 0, scale: 0.3 }} key="send" transition={{ delay: 0.15, opacity: { duration: 0.1 }, scale: { damping: 30, stiffness: 600, type: "spring" } }}>
          <CoworkComposerButton ariaLabel="Send message" className="!rounded-lg !h-8 !w-8 disabled:cursor-default" disabled={disabled} onClick={onSubmit} size="icon-sm" variant="claude">{isSubmitting ? <Icon className="animate-spin" customSize={16} name="Spinner" /> : <Icon bold customSize={16} name="ArrowUp" />}</CoworkComposerButton>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ScrollToBottomButton({ onScroll, visible }: { onScroll: () => void; visible: boolean }) {
  return <button aria-hidden={!visible} aria-label="Scroll to bottom" className={`inline-flex items-center h-[24px] px-p3 rounded-r5 bg-fill-contained-default text-contained-default absolute -top-[32px] left-1/2 -translate-x-1/2 z-[1] transition-opacity ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={onScroll} tabIndex={visible ? 0 : -1} type="button"><Icon name="ChevronDownSmall" size="s" /></button>;
}
