import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { EffortLevel, PermissionMode, WorkspaceContext } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import {
  OfficialDropdownButton,
  type OfficialDropdownItem,
} from "../OfficialEpitaxyComponents";
import { useWorkspaceTrustGate } from "../trust/useWorkspaceTrustGate";
import {
  codeModelOptions,
  effortLabel,
  effortOptions,
  modelLabel,
  permissionModeLabel,
  permissionModeOptions,
} from "./options";
import { numberComposerMenuItems } from "./composerMenuItems";
import { OfficialWorkspaceControls } from "./OfficialWorkspaceControls";

type OfficialCodeComposerProps = {
  busy: boolean;
  effort: EffortLevel;
  model: string;
  onEffortChange: (value: EffortLevel) => void;
  onModelChange: (value: string) => void;
  onPermissionModeChange: (value: PermissionMode) => void;
  onSourceBranchChange: (branch: string) => void;
  onSubmit: () => void;
  onUseWorktreeChange: (enabled: boolean) => void;
  onWorkspaceChange: (workspace: WorkspaceContext) => void;
  permissionMode: PermissionMode;
  prompt: string;
  setPrompt: (value: string) => void;
  sourceBranch: string;
  useWorktree: boolean;
  workspace: WorkspaceContext;
};

const composerIconButtonClass = "group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy pressed:text-uncontained-selected pressed:hover:text-uncontained-selected ring-focus h-base text-body rounded-base justify-center aspect-square px-p3";

export function OfficialCodeComposer({
  busy,
  effort,
  model,
  onEffortChange,
  onModelChange,
  onPermissionModeChange,
  onSourceBranchChange,
  onSubmit,
  onUseWorktreeChange,
  onWorkspaceChange,
  permissionMode,
  prompt,
  setPrompt,
  sourceBranch,
  useWorktree,
  workspace,
}: OfficialCodeComposerProps) {
  const { ensureTrusted, modal } = useWorkspaceTrustGate(workspace.cwd);
  const [replayKey, setReplayKey] = useState(0);
  const [openFooterMenu, setOpenFooterMenu] = useState<"effort" | "mode" | "model" | null>(null);
  const hasPrompt = prompt.trim().length > 0;
  const isModelMenuOpen = openFooterMenu === "model" || openFooterMenu === "effort";

  const permissionItems: OfficialDropdownItem[] = permissionModeOptions.map((option) => ({
    checked: option.value === permissionMode,
    label: option.label,
    onSelect: () => onPermissionModeChange(option.value),
  }));
  const modelItems: OfficialDropdownItem[] = codeModelOptions.map((option) => ({
    checked: option.value === model,
    label: option.label,
    onSelect: () => onModelChange(option.value),
  }));
  const effortItems: OfficialDropdownItem[] = effortOptions.map((option) => ({
    checked: option.value === effort,
    label: option.label,
    onSelect: () => onEffortChange(option.value),
  }));
  const numberedPermissionItems = useMemo(() => (
    openFooterMenu === "mode" ? numberComposerMenuItems(permissionItems) : permissionItems
  ), [openFooterMenu, permissionItems]);
  const numberedModelItems = useMemo(() => (
    openFooterMenu === "model" ? numberComposerMenuItems(modelItems) : modelItems
  ), [modelItems, openFooterMenu]);
  const numberedEffortItems = useMemo(() => (
    openFooterMenu === "effort" ? numberComposerMenuItems(effortItems) : effortItems
  ), [effortItems, openFooterMenu]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hasOnlyDigit = !(event.metaKey || event.ctrlKey || event.altKey || event.shiftKey);
      if (openFooterMenu && hasOnlyDigit && event.code.startsWith("Digit")) {
        const index = Number(event.code.slice(5)) - 1;
        const items = openFooterMenu === "mode"
          ? numberedPermissionItems
          : openFooterMenu === "effort"
            ? numberedEffortItems
            : numberedModelItems;
        const item = items[index];
        if (item?.onSelect && !item.disabled) {
          event.preventDefault();
          event.stopPropagation();
          item.onSelect();
          setOpenFooterMenu(null);
        }
        return;
      }

      if (openFooterMenu && hasOnlyDigit && event.key === "Escape") {
        event.preventDefault();
        setOpenFooterMenu(null);
        return;
      }

      const commandKey = navigator.platform.toLowerCase().includes("mac") ? event.metaKey : event.ctrlKey;
      if (!commandKey || !event.shiftKey || event.altKey) return;
      if (event.code === "KeyM" && permissionItems.length > 0) {
        event.preventDefault();
        setOpenFooterMenu("mode");
      } else if (event.code === "KeyI" && modelItems.length > 0) {
        event.preventDefault();
        setOpenFooterMenu("model");
      } else if (event.code === "KeyE" && effortItems.length > 0) {
        event.preventDefault();
        setOpenFooterMenu("effort");
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [effortItems, modelItems, numberedEffortItems, numberedModelItems, numberedPermissionItems, openFooterMenu, permissionItems.length]);

  const submitWithTrust = useCallback(() => {
    if (!hasPrompt || busy) return;
    void ensureTrusted(workspace.cwd, onSubmit);
  }, [busy, ensureTrusted, hasPrompt, onSubmit, workspace.cwd]);

  const editor = useEditor({
    content: "",
    editable: !busy,
    editorProps: {
      attributes: {
        "aria-label": "描述一个任务，或提一个问题",
        class: "tiptap",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.isComposing) {
          event.preventDefault();
          submitWithTrust();
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
    ],
    onUpdate: ({ editor: nextEditor }) => {
      setPrompt(nextEditor.getText({ blockSeparator: "\n" }));
    },
  }, [submitWithTrust]);

  useEffect(() => {
    editor?.setEditable(!busy);
  }, [busy, editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getText({ blockSeparator: "\n" });
    if (current !== prompt) editor.commands.setContent(prompt);
  }, [editor, prompt]);

  return (
    <div className="flex flex-col gap-g5">
      <OfficialWorkspaceControls
        disabled={busy}
        ensureTrusted={ensureTrusted}
        onSourceBranchChange={onSourceBranchChange}
        onUseWorktreeChange={onUseWorktreeChange}
        onWorkspaceChange={onWorkspaceChange}
        sourceBranch={sourceBranch}
        useWorktree={useWorktree}
        workspace={workspace}
      />
      <div className="relative h-0 -mb-[var(--g5)] pointer-events-none">
        <button
          aria-hidden="true"
          className="absolute right-[-16px] bottom-[-13px] w-[80px] h-[80px] -scale-x-100 border-0 bg-transparent p-0 outline-none hide-focus-ring cursor-default pointer-events-auto"
          onClick={() => setReplayKey((key) => key + 1)}
          onMouseDown={(event) => event.preventDefault()}
          tabIndex={-1}
          type="button"
        >
          <img alt="" className="h-full w-full" draggable={false} key={replayKey} src="/assets/v1/clawd-laptop-official.gif" />
        </button>
      </div>
      <div
        className="epitaxy-prompt relative isolate rounded-r7 transition-shadow duration-300"
        onClick={(event) => {
          if (event.target instanceof HTMLElement && event.target.closest("button")) return;
          editor?.commands.focus("end");
        }}
        style={{ boxShadow: "var(--df-shadow-card)" }}
      >
        <div className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-prompt-blur effect-prompt-blur" />
        <span className="sr-only" role="status" />
        <div className="grid min-w-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none" style={{ gridTemplateRows: "0fr" }}>
          <div className="min-h-0 overflow-hidden" />
        </div>
        <div className="relative flex w-full">
          <EditorContent
            className="epitaxy-prompt-input flex-1 min-w-0 text-heading text-t9 [&_.tiptap]:min-h-[var(--h8)] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:py-[13px] [&_.tiptap]:pl-p7 [&_.tiptap]:pr-p3 [&_.tiptap_p]:m-0"
            editor={editor}
          />
          {!hasPrompt ? <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 right-[var(--h8)] truncate pl-p7 pt-[13px] text-heading text-t5">描述一个任务，或提一个问题</span> : null}
          <div className="flex self-end p-p7 pl-p3">
            <button className={composerIconButtonClass} disabled={busy || !hasPrompt} onClick={submitWithTrust} type="button" aria-label="Send">
              <span aria-hidden="true" className="btn-squish absolute inset-0 -z-[1] rounded-[inherit] bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)]" />
              <Icon name={busy ? "Stop" : "ArrowReturn"} customSize={16} />
            </button>
          </div>
        </div>
      </div>
      <div className="w-full flex items-center gap-g5 py-[4px]">
        <div className="flex items-center gap-g5 min-w-0">
          <OfficialDropdownButton
            align="start"
            ariaLabel="Permission mode"
            disabled={busy}
            header="模式"
            items={numberedPermissionItems}
            label={<span className={permissionMode === "bypassPermissions" ? "text-extended-yellow" : undefined}>{permissionModeLabel(permissionMode)}</span>}
            mode="text"
            onOpenChange={(open) => setOpenFooterMenu(open ? "mode" : null)}
            open={openFooterMenu === "mode"}
            revealChevron="never"
            side="top"
            size="small"
            triggerKey="cmd+shift+m"
            variant="uncontained"
          />
          <OfficialDropdownButton ariaLabel="Add" disabled={busy} icon="PlusLarge" items={[{ icon: "Folder1", label: "Add folder" }]} revealChevron="never" side="top" size="small" variant="uncontained" />
        </div>
        <div className="ml-auto flex items-center gap-g4">
          <OfficialDropdownButton
            align="end"
            ariaLabel="Model"
            disabled={busy}
            extraSections={[{
              header: "Effort",
              items: numberedEffortItems,
              triggerKey: "cmd+shift+e",
            }]}
            header="Models"
            items={numberedModelItems}
            label={<OfficialModelFooterLabel effortLabel={effortLabel(effort)} modelLabel={modelLabel(model)} />}
            mode="text"
            onOpenChange={(open) => setOpenFooterMenu(open ? (openFooterMenu === "effort" ? "effort" : "model") : null)}
            open={isModelMenuOpen}
            revealChevron="never"
            side="top"
            size="small"
            triggerKey="cmd+shift+i"
            variant="uncontained"
          />
          <button className={`${composerIconButtonClass} h-small text-footnote rounded-small shrink-0`} type="button" aria-label="Usage">
            <span aria-hidden="true" className="btn-squish absolute inset-0 -z-[1] rounded-[inherit] bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)]" />
            <span className="size-[12px] rounded-full border-2 border-border-400" aria-hidden="true" />
          </button>
        </div>
      </div>
      {modal}
    </div>
  );
}

function OfficialModelFooterLabel({ effortLabel, modelLabel }: { effortLabel?: ReactNode; modelLabel: ReactNode }) {
  if (!effortLabel) return <>{modelLabel}</>;
  return (
    <span className="flex items-baseline gap-g3 min-w-0">
      <span className="truncate">{modelLabel}</span>
      <span className="text-t6 shrink-0">· {effortLabel}</span>
    </span>
  );
}
