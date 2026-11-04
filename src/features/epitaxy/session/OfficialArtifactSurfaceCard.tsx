/**
 * Official cd5a `kX` / `AX` (`HZe`) — Fu `artifact_surface` card (pin 2.31226.1).
 *
 * DOM: outer `flex flex-col w-full my-[6px]`; inner c425 `Sy` (`z` 318px isolate row) +
 * `Dy` (`B` group/btn) when clickable + `group/tool`; `hy` surface; `Jhe` Artifacts sm;
 * label `min-w-0 flex-1 text-body text-primary truncate`; `Fy` CaretRight `center`.
 *
 * Not Cowork `chat_artifact_pane`. No VM / Spinner. Click → `onOpenPath(file_path)`.
 */

import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import {
  extractOfficialArtifactSurface,
  officialArtifactPublishedVerb,
  type OfficialArtifactSurfaceTool,
} from "./officialArtifactSurface";

export function OfficialArtifactSurfaceCard({
  onOpenPath,
  tool,
}: {
  onOpenPath?: (path: string) => void;
  tool: OfficialArtifactSurfaceTool;
}): ReactNode | null {
  const extracted = extractOfficialArtifactSurface(tool);
  if (!extracted) return null;
  if (!extracted.isSurfaceInput) return null;
  const filePath = extracted.filePath;
  if (!filePath) return null;

  const clickable = onOpenPath !== undefined;
  const header = extracted.header;
  const verb = officialArtifactPublishedVerb(tool.status, tool.isError);
  const open = clickable
    ? () => {
        onOpenPath(filePath);
      }
    : undefined;

  const onKeyDown = open
    ? (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      }
    : undefined;

  return (
    <div className="flex flex-col w-full my-[6px]" data-official-source="cd5a31703-B4nKQMBN.js:kX">
      <div
        aria-disabled={!clickable || undefined}
        aria-label={`Open artifact ${header}`}
        className={`relative isolate flex self-start min-w-[318px] max-w-[318px] items-start gap-xs rounded-lg pl-2.5 pr-xs py-sm text-left ${clickable ? "group/btn focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus" : ""} group/tool`}
        data-intl-id="KwI0wrhHjZ"
        data-official-jhe="c26fb8b6b-EDdRebCk.js:Jhe"
        data-official-row="c425fb3cf-C8q5-d1_.js:Sy"
        onClick={open}
        onKeyDown={onKeyDown}
        role="button"
        tabIndex={clickable ? 0 : -1}
      >
        <div
          aria-hidden
          className="epitaxy-task-card-surface epitaxy-card-outline-inset absolute inset-0 -z-[1] rounded-[inherit] group-hover/btn:bg-fill-ghost-hover"
          data-official-hy="c425fb3cf-C8q5-d1_.js:hy"
        />
        {/* c26fb `Jhe`/`rr`: Icon Artifacts sm. */}
        <Icon className="shrink-0 self-center text-muted" name="Artifacts" size="sm" />
        <span
          className="min-w-0 flex-1 text-body text-primary truncate"
          data-artifact-file-path={filePath}
          data-intl-untitled={extracted.title ? undefined : "7tJmPLpUEM"}
          data-official-verb-id={verb.id}
        >
          {header}
        </span>
        <span className="shrink-0 self-center text-muted">
          <Icon name="CaretRight" size="sm" />
        </span>
      </div>
    </div>
  );
}
