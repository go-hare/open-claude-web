import { EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialButton, OfficialDropdownButton, type OfficialDropdownItem } from "../OfficialEpitaxyComponents";
import { CoworkSelectedFiles } from "./CoworkSelectedFiles";
import type { CoworkUploadedFile } from "./coworkUploadedFiles";

export function OfficialCoworkSessionHeader({ dragHandle, isTitleLoading, rightAction, title }: { dragHandle?: ReactNode; isTitleLoading: boolean; rightAction?: ReactNode; title: string }) {
  return (
    <div className="relative flex items-center h-[32px] pl-[16px] pr-[16px]" data-official-source="index-BELzQL5P.js:local_agent_mode Cowork session header">
      <div className="draggable absolute inset-0 -z-[1]" aria-hidden="true" />
      <div className="relative z-[1] flex min-w-0 items-center draggable-none">
        {isTitleLoading ? (
          <span aria-hidden="true" className="h-[18px] w-[220px] rounded-r4 bg-t2 animate-pulse" />
        ) : (
          <button className="inline-flex h-base min-w-0 items-center gap-g3 rounded-r5 px-p3 text-left text-heading text-t9 hover:bg-fill-uncontained-hover outline-none hide-focus-ring ring-focus" type="button">
            <span className="truncate">{title}</span>
            <Icon name="ChevronDownSmall" size="sm" className="shrink-0 text-t7" />
          </button>
        )}
      </div>
      <div className="draggable h-full flex-1 min-w-0" aria-hidden="true" />
      {rightAction ? (
        <div
          className="relative z-[1] flex shrink-0 items-center gap-2 draggable-none"
          data-official-source="index-BELzQL5P.js:hFt portals ZZt into dframe-header-actions-slot"
        >
          {rightAction}
        </div>
      ) : null}
      {dragHandle}
    </div>
  );
}

export function OfficialCoworkUserMessage({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1 mt-6 group" data-official-source="index-BELzQL5P.js:pat HumanMessage">
      <div className="flex flex-col items-end gap-1">
        <div
          className="group relative inline-flex gap-2 bg-bg-300 rounded-xl pl-2.5 py-2.5 break-words text-text-100 transition-all max-w-[75ch] flex-col !px-4 max-w-[85%]"
          data-user-message-bubble
          data-official-source="index-BELzQL5P.js:KYe UserMessageBubble className !px-4 max-w-[85%]"
        >
          <div className="flex flex-row gap-2 relative">
            <div className="flex-1">
              <div
                className="font-large !font-user-message grid grid-cols-1 gap-2 py-0.5 relative [&_ul]:!space-y-0 [&_ol]:!space-y-0 [&_ul]:pl-8 [&_ol]:pl-8"
                data-testid="user-message"
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OfficialCoworkThinkingBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    setExpanded(false);
  }, [text]);
  return (
    <div className="flex flex-col w-full" data-official-source="index-BELzQL5P.js:O9e/L9e ThinkingCell Cowork">
      <button
        aria-expanded={expanded}
        className="relative group/tool flex self-start max-w-full items-center py-0 gap-g1 text-left outline-none hide-focus-ring focus:ring-focus rounded-r3 text-assistant-secondary"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <span className="text-left relative text-sm font-claude-response leading-6 whitespace-nowrap text-text-300 text-ellipsis overflow-hidden basis-0 grow min-w-0">Thought process</span>
        <CoworkToolChevron expanded={expanded} />
      </button>
      <OfficialCoworkCollapse expanded={expanded}>
        <div className="mt-[var(--p6)] text-text-300 text-sm font-normal gap-0.5 relative font-claude-response">
          <div className="p-3 pt-0 pr-8 whitespace-pre-wrap break-words">
            {text}
          </div>
        </div>
      </OfficialCoworkCollapse>
    </div>
  );
}

export type OfficialCoworkDirectoryApprovalRequest = {
  alwaysAllowScope?: string;
  input: Record<string, unknown>;
  requestId: string;
  toolName: string;
};

export function OfficialCoworkDirectoryApprovalCard({
  busy,
  children,
  onDecide,
  request,
}: {
  busy?: boolean;
  children?: ReactNode;
  onDecide: (decision: "always" | "deny" | "once") => void;
  request: OfficialCoworkDirectoryApprovalRequest;
}) {
  const path = stringValue(request.input.path);
  return (
    <div className="bg-bg-000 rounded-xl border border-border-300 shadow-lg overflow-hidden p-3" data-official-source="index-BELzQL5P.js:Yge CoworkDirectoryApproval">
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <Icon name="Folder1" size="md" className="text-text-300 flex-shrink-0 mt-0.5" />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm text-text-200">
              {path ? <>Claude would like to <span className="font-semibold">Cowork</span> in:</> : <>Claude would like to <span className="font-semibold">Cowork</span> in a folder</>}
            </span>
            {path ? <span className="font-mono text-sm text-text-100 break-all">{path}</span> : null}
          </div>
        </div>
        {children}
        <div className="flex justify-end gap-2">
          <OfficialButton disabled={busy} onClick={() => onDecide("deny")} size="base" variant="contained">
            Deny
            <span className="ml-1.5 rounded-r3 bg-fill-contained-default px-p3 text-footnote text-t6">Esc</span>
          </OfficialButton>
          <OfficialButton disabled={busy} onClick={() => onDecide("once")} size="base" variant="primary">
            {path ? "Allow" : "Choose folder"}
            <span className="ml-1.5 rounded-r3 bg-fill-contained-default/30 px-p3 text-footnote">↵</span>
          </OfficialButton>
        </div>
      </div>
    </div>
  );
}

export function OfficialCoworkComposer({
  canStop,
  canSubmit,
  childrenAbove,
  disabled,
  editor,
  isSubmitting,
  modelItems,
  modelLabel,
  modelPickerDisabled,
  onAddMenuOpenChange,
  onContainerClick,
  onKeyDownCapture,
  onRemoveFile,
  onScrollToBottom,
  onStop,
  onSubmit,
  plusMenuItems,
  selectedFiles,
  showScrollButton,
  text,
}: {
  canStop: boolean;
  canSubmit: boolean;
  childrenAbove?: ReactNode;
  disabled: boolean;
  editor: Editor | null;
  isSubmitting: boolean;
  modelItems: OfficialDropdownItem[];
  modelLabel: ReactNode;
  modelPickerDisabled?: boolean;
  onAddMenuOpenChange?: (open: boolean) => void;
  onContainerClick: (event: MouseEvent<HTMLElement>) => void;
  onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => void;
  onRemoveFile: (filePath: string) => void;
  onScrollToBottom: () => void;
  onStop: () => void;
  onSubmit: () => void;
  plusMenuItems: OfficialDropdownItem[];
  selectedFiles: CoworkUploadedFile[];
  showScrollButton: boolean;
  text: string;
}) {
  const showPlaceholder = text.trim().length === 0;
  const queueDisabled = !canSubmit || disabled || isSubmitting;
  return (
    <div
      className="epitaxy-chat-column relative shrink-0 flex flex-col gap-g5 [contain:layout] sticky bottom-0 mx-auto w-full pt-6 z-[5]"
      data-chat-input-container
      data-official-source="index-BELzQL5P.js:CAt Cowork composer"
      style={{ maxWidth: "58rem", paddingInline: "clamp(24px, 4%, 48px)" }}
    >
      <button
        aria-hidden={!showScrollButton}
        aria-label="Scroll to bottom"
        className={`inline-flex items-center h-[24px] px-p3 rounded-r5 bg-fill-contained-default text-contained-default effect-contained-default hover:bg-fill-contained-hover hover:text-contained-hover cursor-default border-0 outline-none hide-focus-ring ring-focus absolute -top-[32px] left-1/2 -translate-x-1/2 z-[1] transition-opacity duration-150 ${showScrollButton ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onScrollToBottom}
        tabIndex={showScrollButton ? 0 : -1}
        type="button"
      >
        <Icon name="ChevronDownSmall" size="s" />
      </button>
      {childrenAbove}
      <div
        className="epitaxy-prompt !box-content flex flex-col bg-bg-000 mx-2 md:mx-0 items-stretch transition-all duration-200 relative z-10 rounded-[20px] border border-transparent shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/3.5%),0_0_0_0.5px_hsla(var(--border-300)/0.15)] hover:shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/3.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)] focus-within:shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/7.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)]"
        onClick={onContainerClick}
      >
        <div className="flex flex-col m-3.5 gap-3">
          <div className="relative font-large min-h-[48px]">
            <EditorContent
              className={`epitaxy-prompt-input min-w-0 text-text-100 [&_.tiptap]:min-h-[48px] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:bg-transparent [&_.tiptap]:p-0 [&_.tiptap_p]:m-0 ${showPlaceholder ? "[&_.is-editor-empty]:before:!content-['']" : ""}`}
              editor={editor}
              onKeyDownCapture={onKeyDownCapture}
            />
            {showPlaceholder ? <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 text-text-500">Write a message...</span> : null}
          </div>
          <CoworkSelectedFiles files={selectedFiles} onRemove={onRemoveFile} />
          <div className="relative flex w-full items-center gap-2">
            <div className="relative flex-1 flex items-center shrink min-w-0 gap-1">
              <OfficialDropdownButton
                align="start"
                alignOffset={-10}
                ariaLabel="Add files, connectors, and more"
                disabled={disabled}
                icon="PlusLarge"
                items={plusMenuItems}
                onOpenChange={onAddMenuOpenChange}
                popupClassName="max-h-[min(var(--available-height),24rem)]"
                revealChevron="never"
                side="bottom"
                sideOffset={4}
                size="small"
                variant="uncontained"
              />
            </div>
            <OfficialDropdownButton
              align="end"
              ariaLabel="模型"
              disabled={modelPickerDisabled || disabled}
              header="Models"
              items={modelItems}
              label={modelLabel}
              mode="text"
              revealChevron="always"
              side="bottom"
              size="small"
              variant="uncontained"
            />
            {canStop ? <OfficialCoworkStopButton disabled={disabled} onStop={onStop} /> : null}
            {canStop ? (
              <OfficialCoworkQueueButton disabled={queueDisabled} isSubmitting={isSubmitting} onSubmit={onSubmit} />
            ) : (
              <OfficialCoworkSendButton disabled={queueDisabled} isSubmitting={isSubmitting} onSubmit={onSubmit} />
            )}
          </div>
        </div>
      </div>
      <CoworkComposerDisclaimer />
    </div>
  );
}

function OfficialCoworkStopButton({ disabled, onStop }: { disabled?: boolean; onStop: () => void }) {
  return (
    <button
      aria-label="Stop response"
      className="epitaxy-pill-body inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-0 text-contained-default outline-none ring-focus transition-colors hover:text-contained-hover disabled:text-contained-disabled"
      disabled={disabled}
      onClick={onStop}
      style={{ backgroundColor: "var(--fill-contained-default)", boxShadow: "0 0 0 0.5px var(--border-default)", height: "2rem", width: "2rem" }}
      type="button"
    >
      <Icon name="Stop" size="sm" />
    </button>
  );
}

function OfficialCoworkQueueButton({ disabled, isSubmitting, onSubmit }: { disabled?: boolean; isSubmitting: boolean; onSubmit: () => void }) {
  return (
    <button
      aria-label="Queue message"
      className="epitaxy-pill-body inline-flex h-8 shrink-0 items-center justify-center rounded-lg border-0 px-4 text-body text-primary-default outline-none ring-focus-primary transition-transform active:scale-[0.98] disabled:cursor-default"
      disabled={disabled}
      onClick={onSubmit}
      style={{ backgroundColor: "var(--accent-brand)", color: "var(--core-white)", gap: "0.375rem", opacity: disabled ? 0.62 : 1 }}
      type="button"
    >
      <Icon name="ArrowReturn" size="sm" />
      <span>{isSubmitting ? "Queueing..." : "Queue"}</span>
    </button>
  );
}

function OfficialCoworkSendButton({ disabled, isSubmitting, onSubmit }: { disabled?: boolean; isSubmitting: boolean; onSubmit: () => void }) {
  return (
    <button
      aria-label="Send"
      className="epitaxy-pill-body inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-0 text-primary-default outline-none ring-focus-primary transition-transform active:scale-[0.98] disabled:cursor-default"
      disabled={disabled}
      onClick={onSubmit}
      style={{ backgroundColor: "var(--accent-brand)", color: "var(--core-white)", height: "2rem", opacity: disabled ? 0.62 : 1, width: "2rem" }}
      type="button"
    >
      <Icon name={isSubmitting ? "Stop" : "ArrowReturn"} size="sm" />
    </button>
  );
}

export function CoworkComposerDisclaimer() {
  return (
    <div role="note" data-disclaimer className="bg-bg-100 text-text-500 text-center text-xs py-2">
      Claude 是 AI，可能会出错。请务必再次核对回复内容。
    </div>
  );
}

export function isCoworkDirectoryToolName(name: string) {
  const normalized = name.replace(/[_-]/g, " ").toLowerCase();
  return normalized.includes("cowork") && normalized.includes("director");
}

export function isCoworkDirectoryPermissionRequest(request: { input: Record<string, unknown>; toolName: string }) {
  return isCoworkDirectoryToolName(request.toolName) || typeof request.input.path === "string" && request.toolName.toLowerCase().includes("directory");
}

function OfficialCoworkCollapse({ children, expanded }: { children: ReactNode; expanded: boolean }) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return expanded ? <div>{children}</div> : null;
  return (
    <AnimatePresence initial={false}>
      {expanded ? (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          transition={{ height: { type: "spring", duration: 0.35, bounce: 0 }, opacity: { duration: 0.2, ease: "easeOut" } }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function CoworkToolChevron({ expanded }: { expanded: boolean }) {
  return (
    <span className="shrink-0 text-assistant-secondary" style={{ "--class-base-icon": "14px" } as CSSProperties}>
      <Icon name={expanded ? "ChevronDownSmall" : "ChevronRightSmall"} size="sm" />
    </span>
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
