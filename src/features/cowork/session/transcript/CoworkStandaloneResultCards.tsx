import { memo, useCallback, type MouseEvent, type ReactNode } from "react";
import { labelFromCron } from "../../scheduled/scheduleUtils";
import {
  CoworkChevronRightGlyph,
  CoworkChevronRightSmallGlyph,
  CoworkScheduledTaskClockGlyph,
  CoworkSkillGlyph,
} from "../../ui/CoworkOfficialGlyphs";
import { asRecord, stringValue } from "../recordUtils";
import type { CoworkContentBlock } from "./coworkMessageTypes";
import { useCoworkTranscriptActions } from "./CoworkTranscriptActions";

export const CoworkSaveSkillResultCard = memo(function CoworkSaveSkillResultCard({ block }: { block: CoworkContentBlock }) {
  const input = asRecord(block.input);
  const name = stringValue(input.name);
  if (!name) return null;
  return (
    <CoworkResultLink href="/customize/skills">
      <div className="w-5 h-5 flex items-center justify-center text-text-100 flex-shrink-0"><CoworkSkillGlyph size={16} /></div>
      <span className="flex-1 min-w-0 truncate text-text-300 font-base">
        {input.overwrite === true ? "Updated skill" : "Saved skill"}: <span className="font-base-bold text-text-200">{name}</span>
      </span>
      <CoworkChevronRightGlyph className="text-text-400 flex-shrink-0" size={16} />
    </CoworkResultLink>
  );
});

export const CoworkScheduledTaskResultCard = memo(function CoworkScheduledTaskResultCard({ block }: { block: CoworkContentBlock }) {
  const input = asRecord(block.input);
  const taskId = stringValue(input.taskId);
  const prompt = stringValue(input.prompt);
  if (!taskId || !prompt) return null;
  const schedule = scheduleText(input);
  return (
    <CoworkResultLink href={`/scheduled-task/${encodeURIComponent(taskId)}`}>
      <div className="w-5 h-5 flex items-center justify-center text-text-100 flex-shrink-0"><CoworkScheduledTaskClockGlyph size={16} /></div>
      <span className="flex-1 min-w-0 truncate text-text-300 font-base">Created scheduled task: <span className="font-base-bold text-text-200">{taskName(taskId)}</span></span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {schedule ? <span className="text-xs text-text-400">{schedule}</span> : null}
        <CoworkChevronRightSmallGlyph className="text-text-400" size={16} />
      </div>
    </CoworkResultLink>
  );
});

function CoworkResultLink({ children, href }: { children: ReactNode; href: string }) {
  const actions = useCoworkTranscriptActions();
  const navigate = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    if (!actions) return;
    event.preventDefault();
    actions.onNavigate(href);
  }, [actions, href]);
  return <a className="my-3 border-0.5 border-border-300 rounded-lg overflow-hidden font-ui flex items-center gap-2 px-3 py-2.5 hover:bg-bg-200 transition-colors" href={href} onClick={navigate}>{children}</a>;
}

function scheduleText(input: Record<string, unknown>) {
  const fireAt = stringValue(input.fireAt);
  if (fireAt) {
    const date = new Date(fireAt);
    if (!Number.isNaN(date.getTime())) return `Once — ${date.toLocaleString()}`;
  }
  const cron = stringValue(input.cronExpression);
  return cron ? labelFromCron(cron) : undefined;
}

function taskName(taskId: string) {
  return taskId.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
}
