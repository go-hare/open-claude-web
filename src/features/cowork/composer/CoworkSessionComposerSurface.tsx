import type { Editor } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { CoworkSelectedFiles } from "../newTask/CoworkSelectedFiles";
import type { CoworkUploadedFile } from "../newTask/coworkUploadedFiles";
import { CoworkDropdownButton } from "../ui/CoworkDropdownButton";
import type { CoworkDropdownItem } from "../ui/CoworkMenuTypes";

type CoworkSessionComposerSurfaceProps = {
  canStop: boolean;
  canSubmit: boolean;
  childrenAbove?: ReactNode;
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
  plusMenuItems: CoworkDropdownItem[];
  selectedFiles: CoworkUploadedFile[];
  showScrollButton: boolean;
  text: string;
};

export function CoworkSessionComposerSurface(props: CoworkSessionComposerSurfaceProps) {
  const showPlaceholder = !props.text.trim();
  const queueDisabled = !props.canSubmit || props.disabled || props.isSubmitting;
  return (
    <div className="epitaxy-chat-column relative shrink-0 flex flex-col gap-g5 [contain:layout] sticky bottom-0 mx-auto w-full pt-6 z-[5]" data-chat-input-container style={{ maxWidth: "58rem", paddingInline: "clamp(24px, 4%, 48px)" }}>
      <ScrollToBottomButton onScroll={props.onScrollToBottom} visible={props.showScrollButton} />
      {props.childrenAbove}
      <div className="epitaxy-prompt !box-content flex flex-col bg-bg-000 mx-2 md:mx-0 items-stretch transition-all duration-200 relative z-10 rounded-[20px] border border-transparent shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/3.5%),0_0_0_0.5px_hsla(var(--border-300)/0.15)]" onClick={props.onContainerClick}>
        <div className="flex flex-col m-3.5 gap-3">
          <div className="relative font-large min-h-[48px]"><EditorContent className={`epitaxy-prompt-input min-w-0 text-text-100 [&_.tiptap]:min-h-[48px] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:bg-transparent [&_.tiptap]:p-0 [&_.tiptap_p]:m-0 ${showPlaceholder ? "[&_.is-editor-empty]:before:!content-['']" : ""}`} editor={props.editor} onKeyDownCapture={props.onKeyDownCapture} />{showPlaceholder ? <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 text-text-500">Write a message...</span> : null}</div>
          <CoworkSelectedFiles files={props.selectedFiles} onRemove={props.onRemoveFile} />
          <div className="relative flex w-full items-center gap-2"><div className="relative flex-1 flex items-center min-w-0"><CoworkDropdownButton align="start" alignOffset={-10} ariaLabel="Add files, connectors, and more" disabled={props.disabled} icon="PlusLarge" items={props.plusMenuItems} popupClassName="max-h-[min(var(--available-height),24rem)]" revealChevron="never" side="bottom" sideOffset={4} size="small" /></div><CoworkDropdownButton ariaLabel="模型" disabled={props.disabled} header="Models" items={props.modelItems} label={props.modelLabel} mode="text" side="bottom" size="small" />{props.canStop ? <ComposerActionButton label="Stop response" onClick={props.onStop} /> : null}{props.canStop ? <QueueButton disabled={queueDisabled} isSubmitting={props.isSubmitting} onClick={props.onSubmit} /> : <ComposerActionButton disabled={queueDisabled} label="Send" onClick={props.onSubmit} />}</div>
        </div>
      </div>
      <div className="bg-bg-100 text-text-500 text-center text-xs py-2" role="note">Claude 是 AI，可能会出错。请务必再次核对回复内容。</div>
    </div>
  );
}

function ScrollToBottomButton({ onScroll, visible }: { onScroll: () => void; visible: boolean }) {
  return <button aria-hidden={!visible} aria-label="Scroll to bottom" className={`inline-flex items-center h-[24px] px-p3 rounded-r5 bg-fill-contained-default text-contained-default absolute -top-[32px] left-1/2 -translate-x-1/2 z-[1] transition-opacity ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={onScroll} tabIndex={visible ? 0 : -1} type="button"><Icon name="ChevronDownSmall" size="s" /></button>;
}

function ComposerActionButton({ disabled, label, onClick }: { disabled?: boolean; label: string; onClick: () => void }) {
  return <button aria-label={label} className="epitaxy-pill-body inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-0 text-primary-default outline-none ring-focus-primary" disabled={disabled} onClick={onClick} style={{ backgroundColor: label.startsWith("Stop") ? "var(--fill-contained-default)" : "var(--accent-brand)", color: "var(--core-white)" }} type="button"><Icon name={label.startsWith("Stop") ? "Stop" : "ArrowReturn"} size="sm" /></button>;
}

function QueueButton({ disabled, isSubmitting, onClick }: { disabled: boolean; isSubmitting: boolean; onClick: () => void }) {
  return <button aria-label="Queue message" className="epitaxy-pill-body inline-flex h-8 shrink-0 items-center justify-center rounded-lg border-0 px-4 text-body text-primary-default outline-none ring-focus-primary" disabled={disabled} onClick={onClick} style={{ backgroundColor: "var(--accent-brand)", color: "var(--core-white)", gap: "0.375rem" }} type="button"><Icon name="ArrowReturn" size="sm" /><span>{isSubmitting ? "Queueing..." : "Queue"}</span></button>;
}
