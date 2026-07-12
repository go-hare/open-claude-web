import { useState, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { labelFromCron } from "../scheduled/scheduleUtils";
import type { CoworkPermissionDecision, CoworkPermissionRequest } from "../session/coworkPermissionTypes";
import { CoworkMarkdown } from "../session/transcript/CoworkMarkdown";
import {
  CoworkChevronDownGlyph,
  CoworkChevronRightSmallGlyph,
  CoworkScheduledTaskClockGlyph,
  CoworkSkillGlyph,
} from "../ui/CoworkOfficialGlyphs";
import { CoworkComposerButton } from "./CoworkComposerPrimitives";
import { useCoworkPermissionKeyboard } from "./useCoworkPermissionKeyboard";

type ApprovalProps = {
  busy: boolean;
  disableKeyboardShortcuts?: boolean;
  isScheduledTask?: boolean;
  onDecide: (decision: CoworkPermissionDecision, input?: Record<string, unknown>) => void;
  request: CoworkPermissionRequest;
};

export function CoworkScheduledTaskApproval({ busy, disableKeyboardShortcuts, onDecide, request }: ApprovalProps) {
  const input = request.input;
  const update = request.toolName.includes("update_scheduled_task");
  const name = text(input.taskId) ? taskName(text(input.taskId)!) : "Untitled";
  const description = text(input.description) ?? "";
  const prompt = text(input.prompt) ?? "";
  useStandardShortcuts(busy || disableKeyboardShortcuts === true, onDecide);
  return (
    <ContentApprovalCard
      actions={<><CoworkComposerButton disabled={busy} onClick={() => onDecide("once")} shortcut={shortcut(disableKeyboardShortcuts, "enter")}>{update ? "Update" : "Schedule"}</CoworkComposerButton><CoworkComposerButton disabled={busy} onClick={() => onDecide("deny")} shortcut={shortcut(disableKeyboardShortcuts, "escape")} variant="secondary">Cancel</CoworkComposerButton></>}
      description={description}
      icon={<CoworkScheduledTaskClockGlyph className="text-text-300" size={16} />}
      meta={<div className="font-small text-text-500 pl-[34px]">{scheduleLabel(input)}</div>}
      name={name}
      title={update ? "Update task" : "Schedule task"}
    >
      {prompt ? <ExpandableDetails label="Details"><CoworkMarkdown text={prompt} /></ExpandableDetails> : null}
    </ContentApprovalCard>
  );
}

export function CoworkSaveSkillApproval({ busy, disableKeyboardShortcuts, onDecide, request }: ApprovalProps) {
  const input = request.input;
  const update = Boolean(input.overwrite);
  const name = text(input.name) ?? "untitled";
  const description = text(input.description) ?? "";
  const content = text(input.content) ?? "";
  useStandardShortcuts(busy || disableKeyboardShortcuts === true, onDecide);
  return (
    <ContentApprovalCard
      actions={<><CoworkComposerButton disabled={busy} onClick={() => onDecide("once")} shortcut={shortcut(disableKeyboardShortcuts, "enter")}>{update ? "Update" : "Save"}</CoworkComposerButton><CoworkComposerButton disabled={busy} onClick={() => onDecide("deny")} shortcut={shortcut(disableKeyboardShortcuts, "escape")} variant="secondary">Cancel</CoworkComposerButton></>}
      description={description}
      icon={<CoworkSkillGlyph className="text-text-300" size={16} />}
      name={name}
      title={update ? "Update skill" : "Save skill"}
    >
      {content ? <ExpandableDetails announceExpanded label="Content"><CoworkMarkdown text={content} /></ExpandableDetails> : null}
    </ContentApprovalCard>
  );
}

export function CoworkArtifactApproval({ busy, disableKeyboardShortcuts, isScheduledTask, onDecide, request }: ApprovalProps) {
  const input = request.input;
  const update = request.toolName.includes("update_artifact");
  const name = text(input.id) ?? "Untitled";
  const description = update ? text(input.update_summary) : text(input.description);
  const tools = strings(input.mcp_tools);
  useStandardShortcuts(busy || disableKeyboardShortcuts === true, onDecide);
  return (
    <ContentApprovalCard
      actionClassName="mt-4"
      actions={<><CoworkComposerButton disabled={busy} onClick={() => onDecide("once")} shortcut={shortcut(disableKeyboardShortcuts, "enter")}>{update ? "Update" : "Create"}</CoworkComposerButton>{isScheduledTask ? <CoworkComposerButton disabled={busy} onClick={() => onDecide("always")} variant="secondary">Allow for all scheduled runs</CoworkComposerButton> : null}<CoworkComposerButton disabled={busy} onClick={() => onDecide("deny")} shortcut={shortcut(disableKeyboardShortcuts, "escape")} variant="secondary">Cancel</CoworkComposerButton></>}
      description={description ?? ""}
      descriptionClassName="pl-[34px] font-base text-text-200"
      icon={<Icon className="text-text-300" customSize={16} name="Artifacts" />}
      leading={!update ? <ArtifactNotice /> : null}
      name={name}
      title={update ? "Update artifact" : "Create artifact"}
    >
      {tools.length ? <ArtifactTools tools={tools} /> : null}
    </ContentApprovalCard>
  );
}

function ContentApprovalCard({ actionClassName = "mt-2", actions, children, description, descriptionClassName = "font-base text-text-300 pl-[34px]", icon, leading, meta, name, title }: {
  actionClassName?: string;
  actions: ReactNode;
  children?: ReactNode;
  description: string;
  descriptionClassName?: string;
  icon: ReactNode;
  leading?: ReactNode;
  meta?: ReactNode;
  name: string;
  title: string;
}) {
  return (
    <div className="bg-bg-000 rounded-xl border-0.5 border-border-300 shadow-sm overflow-hidden p-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-md border border-border-300 p-1">{icon}</div>
          <span className="font-base-bold text-text-100">{title}</span><span className="text-text-500/50">·</span><span className="font-base truncate">{name}</span>
        </div>
        {leading}
        {description ? <div className={descriptionClassName}>{description}</div> : null}
        {meta}{children}
      </div>
      <div className={`${actionClassName} flex ml-8 gap-2`}>{actions}</div>
    </div>
  );
}

function ArtifactNotice() {
  return (
    <div className="ml-[34px] flex items-start gap-2 rounded-lg border-0.5 border-border-300 bg-bg-100 p-2.5 text-text-300">
      <Icon className="mt-px shrink-0" customSize={16} name="Info" />
      <p className="font-small">Live artifacts are interactive pages that stay up-to-date using live data from your connectors. <span className="font-small-bold text-text-100">Cancel</span> to create a normal file instead.</p>
    </div>
  );
}

function ArtifactTools({ tools }: { tools: string[] }) {
  return (
    <div className="pl-[34px] py-1 flex flex-col gap-1.5">
      <div className="font-small text-text-500">This artifact will have access to these connectors without approvals:</div>
      {tools.map((tool) => <div className="flex items-center gap-2 min-w-0" key={tool}><span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-text-500" /><div className="w-4 h-4 rounded bg-bg-300 flex-shrink-0" /><span className="font-small text-text-400 truncate">{toolName(tool)}</span></div>)}
    </div>
  );
}

function ExpandableDetails({ announceExpanded = false, children, label }: { announceExpanded?: boolean; children: ReactNode; label: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-2 pl-[34px]">
      <button aria-expanded={announceExpanded ? expanded : undefined} className="flex items-center gap-1 font-small text-text-500 cursor-pointer bg-transparent border-none p-0 py-1" onClick={() => setExpanded((value) => !value)} type="button">{expanded ? <CoworkChevronDownGlyph size={14} /> : <CoworkChevronRightSmallGlyph size={14} />}{label}</button>
      {expanded ? <div className="mt-1 max-h-[300px] overflow-y-auto rounded-lg border-0.5 border-border-300 bg-bg-100 p-4"><div className="font-base text-text-500 break-words [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_li]:my-1 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">{children}</div></div> : null}
    </div>
  );
}

function useStandardShortcuts(busy: boolean, onDecide: ApprovalProps["onDecide"]) {
  useCoworkPermissionKeyboard({ enabled: !busy, ignoreEditableTarget: true, onDeny: () => onDecide("deny"), onEnter: () => onDecide("once") });
}

function scheduleLabel(input: Record<string, unknown>) {
  const fireAt = text(input.fireAt);
  if (fireAt) { const date = new Date(fireAt); if (!Number.isNaN(date.getTime())) return `Once — ${date.toLocaleString()}`; }
  const cron = text(input.cronExpression);
  return cron ? labelFromCron(cron) : "Manual only";
}

function shortcut(disabled: boolean | undefined, value: string) { return disabled ? undefined : value; }
function taskName(value: string) { return value.replace(/-/g, " ").replace(/^./, (letter) => letter.toUpperCase()); }
function text(value: unknown) { return typeof value === "string" ? value : undefined; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function toolName(value: string) { return value.split("__")[2] ?? value; }
