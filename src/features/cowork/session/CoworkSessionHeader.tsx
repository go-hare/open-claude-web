import type { ReactNode } from "react";
import { CoworkChevronDownGlyph } from "../ui/CoworkOfficialGlyphs";

export function CoworkSessionHeader({ isTitleLoading, rightAction, title }: { isTitleLoading: boolean; rightAction?: ReactNode; title: string }) {
  return (
    <div className="dframe-header absolute inset-x-0 top-0 z-10 flex h-12 items-center gap-3 pl-4 pr-3" data-testid="chat-header">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -bottom-6 z-[-1] bg-gradient-to-b from-bg-100 from-50% via-bg-100/75 via-75% to-bg-100/0" />
      <div className="flex min-w-0 items-center" id="cowork-title-slot">
        <div className="flex min-w-0 md:items-center font-base-bold">
          <div className="flex min-w-0 shrink-1 items-center group -ml-1">
            {isTitleLoading ? <div aria-hidden="true" className="animate-pulse h-5 w-32 rounded-lg bg-bg-300" /> : <CoworkSessionTitle title={title} />}
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="draggable h-full flex-1 min-w-0" />
      <div className="flex items-center gap-2 shrink-0" id="dframe-header-actions-slot" />
      {rightAction}
    </div>
  );
}

function CoworkSessionTitle({ title }: { title: string }) {
  return (
    <div className="flex min-w-0 items-center group [&:hover>button]:!bg-bg-300 [&>button:hover]:!bg-bg-500">
      <button
        aria-label={`${title}, rename session`}
        className="!text-text-300 hover:!text-text-100 !shrink !min-w-0 !px-1 !py-0 !scale-100 !h-7 !rounded-r-none active:!bg-bg-500 inline-flex items-center"
        data-testid="session-title-button"
        type="button"
      >
        <span className="min-w-0 flex-1 truncate font-base-bold">{title || "Untitled"}</span>
      </button>
      <div className="w-[1.5px] h-7" />
      <button
        aria-label={title ? `More options for ${title}` : "More options"}
        className="!h-7 !w-5 !min-w-0 !rounded-l-none !text-text-300 hover:!text-text-100 active:!bg-bg-500 inline-flex items-center justify-center"
        data-testid="session-menu-trigger"
        type="button"
      >
        <CoworkChevronDownGlyph size={16} />
      </button>
    </div>
  );
}
