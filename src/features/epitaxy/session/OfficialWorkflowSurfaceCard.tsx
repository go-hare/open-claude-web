/**
 * Official cd5a31703-B4nKQMBN.js `E1` / `w1` compact `C0e` — Fu `workflow` card (pin 2.31226.1).
 *
 * Compact (T1 && !inGroup && preLaunch|running): `y1` `group/tool my-[6px]` + Ay 318px row,
 * hy surface, title via bs, footnote Starting/Workflow, Fy CaretRight when clickable.
 * Settled: Zg-like Running/Ran workflow + title + Stopped/Failed.
 *
 * Click → optional `onOpenTasks` (coordinator `actions.openTasks`). No task-id deep-link.
 */

import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import {
  extractOfficialWorkflowSurface,
  officialWorkflowCompactFootnote,
  officialWorkflowSettledVerb,
  officialWorkflowViewLabel,
  type OfficialWorkflowSurfaceTool,
} from "./officialWorkflowSurface";

/** cd5a `y1` = `group/tool my-[6px] ${Ay}`; Ay = c425 `R`/`p` (`pl-lg py-2.5`). */
const C0E_Y1 =
  "group/tool my-[6px] relative isolate flex self-start min-w-[318px] max-w-[318px] items-start gap-xs rounded-lg pl-lg py-2.5 text-left text-pretty";
const C0E_CLICKABLE = "group/btn focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus";
const C0E_SURFACE =
  "epitaxy-task-card-surface epitaxy-card-outline-inset absolute inset-0 -z-[1] rounded-[inherit] group-hover/btn:bg-fill-ghost-hover";
const E1_ROW =
  "relative flex self-start max-w-full items-center py-0 gap-0.75 text-left rounded-sm [--cds-assistant-message-text-inset:0px] [--cds-assistant-message-text-stop:0px]";

export function OfficialWorkflowSurfaceCard({
  inGroup = false,
  onOpenTasks,
  tool,
}: {
  inGroup?: boolean;
  onOpenTasks?: () => void;
  tool: OfficialWorkflowSurfaceTool;
}): ReactNode | null {
  const model = extractOfficialWorkflowSurface(tool, inGroup);
  if (!model) return null;

  if (model.compact) {
    return (
      <OfficialWorkflowC0e
        isPreLaunch={model.isPreLaunch}
        onOpen={onOpenTasks}
        title={model.title}
      />
    );
  }

  const verb = officialWorkflowSettledVerb(model.running);
  const shine = model.running && !model.failed;
  const badge = model.stopped ? (
    <span className="shrink-0 text-body text-secondary" data-intl-id="1LBny5MvRa">
      Stopped
    </span>
  ) : model.failed ? (
    <span className="shrink-0 text-body text-danger" data-intl-id="vXCeIi67rj">
      Failed
    </span>
  ) : null;

  return (
    <div className={E1_ROW} data-official-source="cd5a31703-B4nKQMBN.js:E1">
      <span
        className={`shrink-0 text-body ${model.failed ? "text-danger" : model.running ? "text-primary" : "text-secondary"}${shine ? " epitaxy-text-shine" : ""}`}
        data-intl-id={model.running ? "5ERbNHcYuQ" : "cvADfWAsqS"}
      >
        {verb.text}
      </span>
      {model.title !== "" ? (
        <span className="text-body text-secondary truncate min-w-0">{model.title}</span>
      ) : null}
      {badge}
    </div>
  );
}

function OfficialWorkflowC0e({
  isPreLaunch,
  onOpen,
  title,
}: {
  isPreLaunch: boolean;
  onOpen?: () => void;
  title: string;
}): ReactNode {
  const hasTitle = title !== "";
  const footnote = officialWorkflowCompactFootnote(isPreLaunch);
  const clickable = onOpen !== undefined;
  const view = officialWorkflowViewLabel(title);
  const onKeyDown = clickable
    ? (event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }
    : undefined;

  const content = (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      {hasTitle ? (
        <span className="min-w-0 truncate text-body text-primary">{title}</span>
      ) : null}
      <span
        className={`flex min-w-0 items-center gap-md text-footnote text-muted tabular-nums ${hasTitle ? "" : "pb-0.75"}`}
      >
        <span
          className={`shrink-0 text-secondary${!hasTitle ? " epitaxy-text-shine" : ""}`}
          data-intl-id={isPreLaunch ? "h80VjAcT3+" : "pv1lF7n7cd"}
        >
          {footnote.text}
        </span>
      </span>
    </span>
  );

  const surface = (
    <div aria-hidden className={C0E_SURFACE} data-official-hy="c425fb3cf-C8q5-d1_.js:hy" />
  );

  if (clickable) {
    return (
      <button
        aria-label={view.text}
        className={`${C0E_Y1} ${C0E_CLICKABLE} pr-[8px]`}
        data-intl-id={hasTitle ? "bbTYecAUn+" : "8vTH0UDtIN"}
        data-official-source="cd5a31703-B4nKQMBN.js:C0e"
        onClick={onOpen}
        onKeyDown={onKeyDown}
        type="button"
      >
        {surface}
        {content}
        <span className="flex shrink-0 items-center self-start text-muted">
          <Icon name="CaretRight" size="sm" />
        </span>
      </button>
    );
  }

  return (
    <div className={`${C0E_Y1} pr-[16px]`} data-official-source="cd5a31703-B4nKQMBN.js:C0e">
      {surface}
      {content}
    </div>
  );
}
