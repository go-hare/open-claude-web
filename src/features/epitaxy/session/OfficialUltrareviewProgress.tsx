/**
 * Residual ultrareview progress body (c11959232 TM / IM / PM / RM).
 *
 * Mounted inside residual oi init chrome:
 *   we ? TM({ progress: we, isSessionWorking: ui, isStopped: pi }) : null
 *
 * Stages SM = setup | find | verify | dedupe (NM maps finding→find, …).
 */

import { memo, useState, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialCodeMarkdown } from "../OfficialCodeMarkdown";
import { OfficialSpinner } from "./OfficialWorkingStatus";
import {
  OFFICIAL_ULTRAREVIEW_STAGES,
  residualUltrareviewDisplayStage,
  residualUltrareviewStepStatus,
  type OfficialReviewBug,
  type OfficialReviewProgress,
  type OfficialUltrareviewDisplayStage,
  type OfficialUltrareviewStepStatus,
} from "./residualUltrareviewProgress";

function stageLabel(stage: OfficialUltrareviewDisplayStage): string {
  switch (stage) {
    case "setup":
      return "Setup";
    case "find":
      return "Find";
    case "verify":
      return "Verify";
    case "dedupe":
      return "Dedupe";
  }
}

function stageMeta(
  stage: OfficialUltrareviewDisplayStage,
  progress: OfficialReviewProgress,
): string | undefined {
  switch (stage) {
    case "find": {
      if (progress.bugs_found === 0) return undefined;
      const n = progress.bugs_found;
      return n === 1 ? "1 candidate" : `${n} candidates`;
    }
    case "verify": {
      if (progress.bugs_verified + progress.bugs_refuted === 0) return undefined;
      return `${progress.bugs_verified} confirmed · ${progress.bugs_refuted} refuted`;
    }
    case "dedupe": {
      if (progress.bugs_verified === 0) return undefined;
      const n = progress.bugs_verified;
      return n === 1 ? "1 issue" : `${n} issues`;
    }
    default:
      return undefined;
  }
}

function bugClassName(status: OfficialReviewBug["status"]): string {
  switch (status) {
    case "confirmed":
      return "text-extended-pink";
    case "refuted":
      return "text-t5 line-through";
    case "verifying":
      return "text-assistant-primary";
    default:
      return "text-assistant-secondary";
  }
}

/** Residual IM — step status glyph. */
function StepStatusIcon({ status }: { status: OfficialUltrareviewStepStatus }) {
  switch (status) {
    case "done":
      return (
        <span className="flex size-[14px] shrink-0 items-center justify-center">
          <Icon name="CheckCircle" size="s" className="text-extended-green" />
        </span>
      );
    case "error":
      return (
        <span className="relative flex size-[14px] shrink-0 items-center justify-center text-extended-pink">
          <span className="size-[10px] rounded-full border border-current" />
          <span className="absolute h-px w-[6px] rotate-45 bg-current" />
          <span className="absolute h-px w-[6px] -rotate-45 bg-current" />
        </span>
      );
    case "active":
      return (
        <span className="flex size-[14px] shrink-0 items-center justify-center">
          <OfficialSpinner size="s" />
        </span>
      );
    case "stopped":
      return (
        <span className="relative flex size-[14px] shrink-0 items-center justify-center text-t6">
          <span className="size-[10px] rounded-full border border-current" />
          <span className="absolute h-px w-[6px] bg-current" />
        </span>
      );
    case "pending":
      return (
        <span className="flex size-[14px] shrink-0 items-center justify-center">
          <span className="size-[10px] rounded-full border border-t4" />
        </span>
      );
  }
}

/** Residual PM — bug list under verify. */
function ReviewBugsList({ bugs }: { bugs: OfficialReviewBug[] }) {
  return (
    <ul className="ml-[22px] flex flex-col gap-g1 pt-[var(--g2)]">
      {bugs.map((bug) => (
        <li
          key={bug.id}
          className={`text-footnote truncate ${bugClassName(bug.status)}`}
          title={bug.desc}
        >
          {bug.name ?? bug.id}
          {bug.file ? (
            <span className="text-t5 ml-[var(--g3)]">
              {bug.file}
              {bug.line !== undefined ? `:${bug.line}` : null}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Residual Qg chevron. */
function ExpandChevron({ expanded }: { expanded: boolean }) {
  return (
    <span className="shrink-0 text-assistant-secondary" style={{ ["--class-base-icon" as string]: "14px" }}>
      <Icon name={expanded ? "ChevronDownSmall" : "ChevronRightSmall"} size="m" />
    </span>
  );
}

/** Residual Wg — expand without invent animation when reduced (always mount/unmount). */
function ExpandBody({ expanded, children }: { expanded: boolean; children: ReactNode }) {
  if (!expanded) return null;
  return <div className="overflow-hidden">{children}</div>;
}

function headerTitle(
  progress: OfficialReviewProgress,
  isSessionWorking: boolean,
  isStopped: boolean,
): string {
  const active = residualUltrareviewDisplayStage(progress);
  const isError = progress.status === "error";
  const isSettled = progress.status !== "running";
  const stoppedWhileRunning = isStopped && !isSettled;
  if (isError) return "Review failed";
  if (stoppedWhileRunning) return "Review stopped";
  if (isSettled) {
    const n = progress.bugs_verified;
    if (n === 0) return "Review complete — no issues found";
    if (n === 1) return "Review complete — 1 issue found";
    return `Review complete — ${n} issues found`;
  }
  void isSessionWorking;
  return `Reviewing changes — ${stageLabel(active).toLowerCase()}`;
}

/**
 * Residual TM.
 * isSessionWorking drives epitaxy-text-shine while running (not stopped/error/complete).
 * isStopped marks mid-run interrupt (pi residual).
 */
export const OfficialUltrareviewProgress = memo(function OfficialUltrareviewProgress({
  progress,
  isSessionWorking,
  isStopped = false,
}: {
  progress: OfficialReviewProgress;
  isSessionWorking: boolean;
  isStopped?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const active = residualUltrareviewDisplayStage(progress);
  const isError = progress.status === "error";
  const isSettled = progress.status !== "running";
  const stoppedWhileRunning = isStopped && !isSettled;
  const shining = isSessionWorking && !stoppedWhileRunning && !isSettled;
  const bugs = progress.bugs ?? [];
  const title = headerTitle(progress, isSessionWorking, isStopped);

  return (
    <div className="flex flex-col w-full">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex self-start max-w-full items-center gap-g2 text-left outline-none hide-focus-ring focus:ring-focus rounded-r3"
      >
        <span
          className={[
            "text-body shrink-0",
            isError
              ? "text-extended-pink"
              : shining
                ? "epitaxy-text-shine"
                : "text-assistant-primary",
          ].join(" ")}
        >
          {title}
        </span>
        <ExpandChevron expanded={expanded} />
      </button>
      <ExpandBody expanded={expanded}>
        <div className="flex flex-col gap-g2 pt-[var(--chat-item-gap)]">
          {OFFICIAL_ULTRAREVIEW_STAGES.map((stage) => {
            const status = residualUltrareviewStepStatus(
              stage,
              active,
              progress,
              stoppedWhileRunning,
            );
            const meta = stageMeta(stage, progress);
            const showBugs = stage === "verify" && status !== "pending" && bugs.length > 0;
            const showFindings = stage === "dedupe" && status === "done" && progress.findings;
            const showError = status === "error" && progress.errorText;
            return (
              <div key={stage} className="flex flex-col">
                <div className="flex items-center gap-g3">
                  <StepStatusIcon status={status} />
                  <span
                    className={[
                      "text-body",
                      status === "error"
                        ? "text-extended-pink"
                        : status === "active" || status === "done"
                          ? "text-assistant-primary"
                          : "text-assistant-secondary",
                    ].join(" ")}
                  >
                    {stageLabel(stage)}
                  </span>
                  {meta && status !== "pending" ? (
                    <span className="text-footnote text-t6">{meta}</span>
                  ) : null}
                </div>
                {showBugs ? <ReviewBugsList bugs={bugs} /> : null}
                {showError ? (
                  <pre className="ml-[22px] mt-[var(--g2)] max-h-[200px] overflow-auto whitespace-pre-wrap rounded-r2 bg-t1 p-p3 text-code text-assistant-secondary select-text">
                    {progress.errorText}
                  </pre>
                ) : null}
                {showFindings ? (
                  <div className="ml-[22px] pt-[var(--g2)] select-text">
                    {/* OfficialCodeMarkdown = residual kb — prop is `text`, not children. */}
                    <OfficialCodeMarkdown text={progress.findings!} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </ExpandBody>
    </div>
  );
});

OfficialUltrareviewProgress.displayName = "OfficialUltrareviewProgress";
