import type { ReactNode } from "react";
import { Icon } from "../../../shell/icons";

export function CoworkSessionHeader({ isTitleLoading, rightAction, title }: { isTitleLoading: boolean; rightAction?: ReactNode; title: string }) {
  return (
    <div className="relative flex items-center h-[32px] pl-[16px] pr-[16px]" data-official-source="index-BELzQL5P.js:local_agent_mode Cowork session header">
      <div aria-hidden="true" className="draggable absolute inset-0 -z-[1]" />
      <div className="relative z-[1] flex min-w-0 items-center draggable-none">
        {isTitleLoading ? <span aria-hidden="true" className="h-[18px] w-[220px] rounded-r4 bg-t2 animate-pulse" /> : <button className="inline-flex h-base min-w-0 items-center gap-g3 rounded-r5 px-p3 text-left text-heading text-t9 hover:bg-fill-uncontained-hover outline-none hide-focus-ring ring-focus" type="button"><span className="truncate">{title}</span><Icon className="shrink-0 text-t7" name="ChevronDownSmall" size="sm" /></button>}
      </div>
      <div aria-hidden="true" className="draggable h-full flex-1 min-w-0" />
      {rightAction ? <div className="relative z-[1] flex shrink-0 items-center gap-2 draggable-none">{rightAction}</div> : null}
    </div>
  );
}
