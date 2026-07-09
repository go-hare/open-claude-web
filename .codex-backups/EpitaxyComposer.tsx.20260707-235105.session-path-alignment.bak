import { useRef, useState } from "react";
import { desktopBridge, type WorkspaceContext } from "../../adapters/desktopBridge";
import { Icon } from "../../shell/icons";

type EpitaxyComposerProps = {
  workspace: WorkspaceContext;
  onNavigate: (path: string) => void;
  placeholder?: string;
  compact?: boolean;
};

export function EpitaxyComposer({ onNavigate, placeholder, workspace }: EpitaxyComposerProps) {
  const [prompt, setPrompt] = useState("");
  const [permissionMode, setPermissionMode] = useState<"default" | "bypass">("bypass");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isBashMode = prompt.trimStart().startsWith("!");

  const submit = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const session = await desktopBridge.LocalAgentModeSessions.start({
        kind: "epitaxy",
        permissionMode,
        prompt: trimmedPrompt,
        workspace,
      });
      setPrompt("");
      onNavigate(`/epitaxy/${encodeURIComponent(session.id)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className={`epitaxy-prompt relative isolate rounded-r7 transition-shadow duration-300 ${isBashMode ? "[&_.tiptap]:font-mono [&_.tiptap]:text-[length:var(--text-code)]" : ""}`}
        onClick={(event) => {
          if (event.target instanceof HTMLElement && event.target.closest("button")) return;
          textareaRef.current?.focus();
        }}
        style={{ boxShadow: "var(--df-shadow-card)" }}
      >
        <div className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-prompt-blur effect-prompt-blur" />
        {isBashMode ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-r7 shadow-[inset_0_0_0_1px_var(--extended-purple)]" /> : null}
        <span className="sr-only" role="status">
          {isBashMode ? "Bash mode. Press Escape to return to chat." : "Chat mode"}
        </span>
        <div aria-hidden="true" className="grid min-w-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none" style={{ gridTemplateRows: "0fr" }}>
          <div className="min-h-0 overflow-hidden" />
        </div>
        <div className="relative flex w-full">
          {isBashMode ? (
            <span aria-hidden="true" title="Run as a shell command" className="ml-[var(--p7)] mt-[13px] shrink-0 select-none self-start rounded-r2 bg-extended-purple px-p3 text-code text-[var(--core-black)]">
              bash
            </span>
          ) : null}
          <div className="epitaxy-prompt-input flex-1 min-w-0 text-heading text-t9 [&_.tiptap]:min-h-[var(--h8)] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:py-[13px] [&_.tiptap]:pl-p7 [&_.tiptap]:pr-p3 [&_.tiptap_p]:m-0">
            <textarea
              aria-label="Prompt"
              className="tiptap block w-full resize-none bg-transparent placeholder:text-t5"
              disabled={isSubmitting}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && isBashMode) {
                  event.preventDefault();
                  setPrompt("");
                  return;
                }
                if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void submit();
                }
              }}
              placeholder={placeholder ?? "描述一个任务，或提一个问题"}
              ref={textareaRef}
              rows={1}
              value={prompt}
            />
          </div>
          <div className="flex self-end p-p7 pl-p3">
            <button className={composerIconButtonClass} disabled={!prompt.trim() || isSubmitting} onClick={() => void submit()} type="button" aria-label="Send">
              <span aria-hidden="true" className="btn-squish absolute inset-0 -z-[1] rounded-[inherit] bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)]" />
              <Icon name={isSubmitting ? "Stop" : "ArrowReturn"} customSize={16} />
            </button>
          </div>
        </div>
      </div>
      <div className="w-full flex items-center gap-g5 py-[4px]">
        <div className="flex items-center gap-g5 min-w-0">
          <button
            className={composerDropdownButtonClass}
            data-active={permissionMode === "bypass" || undefined}
            onClick={() => setPermissionMode((current) => (current === "bypass" ? "default" : "bypass"))}
            type="button"
          >
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)]" />
            <span className={`min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap ${permissionMode === "bypass" ? "text-extended-yellow" : ""}`}>
              {permissionMode === "bypass" ? "绕过权限" : "默认权限"}
            </span>
          </button>
          <button className={composerIconDropdownButtonClass} type="button" onClick={() => setPrompt((current) => (current.startsWith("!") ? current : `! ${current}`))} aria-label="Add">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)]" />
            <Icon name="Add" customSize={16} />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-g4">
          <button className={composerDropdownButtonClass} type="button">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)]" />
            <span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">Opus 4</span>
          </button>
          <button className={`${composerIconButtonClass} h-small text-footnote rounded-small shrink-0`} type="button" aria-label="Usage">
            <span aria-hidden="true" className="btn-squish absolute inset-0 -z-[1] rounded-[inherit] bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)]" />
            <span className="size-[12px] rounded-full border-2 border-border-400" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}

const composerDropdownButtonClass = "group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)] h-small rounded-small text-footnote justify-between pl-p5 pr-p2";
const composerIconDropdownButtonClass = "group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)] h-small rounded-small text-footnote justify-between pl-p3 pr-p2 shrink-0";
const composerIconButtonClass = "group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy pressed:text-uncontained-selected pressed:hover:text-uncontained-selected ring-focus h-base text-body rounded-base justify-center aspect-square px-p3";
