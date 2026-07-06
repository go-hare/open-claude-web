import type { CSSProperties, ReactNode } from "react";
import { primaryButtonClass } from "../shared/buttonClasses";

const tileVars = {
  "--tile-container-border": "transparent",
  "--tile-container-bg": "transparent",
  "--tile-indicator-color": "var(--accent)",
  "--tile-indicator-thickness": "3px",
  "--tile-resize-color": "var(--t4)",
  "--tile-resize-color-active": "var(--t9)",
  "--tile-resize-color-focus": "var(--accent)",
  "--tile-resize-color-disabled": "var(--t2)",
  "--tile-resize-thickness": "3px",
  "--tile-resize-length": "56px",
  "--tile-drag-color": "var(--t4)",
  "--tile-drag-color-active": "var(--t9)",
  "--tile-drag-color-focus": "var(--accent)",
} as CSSProperties;

const viewportStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  overflow: "clip",
};

const tileContainerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  border: "1px solid var(--tile-container-border)",
  background: "var(--tile-container-bg)",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  alignItems: "stretch",
  padding: "8px 0px 8px 8px",
  transformStyle: "preserve-3d",
};

const rowStyle: CSSProperties = {
  display: "flex",
  position: "relative",
  transformStyle: "preserve-3d",
  minWidth: 0,
  minHeight: 0,
  overflow: "visible",
  flexDirection: "row",
  flex: "1 1 0px",
};

const tileWrapStyle: CSSProperties = {
  position: "relative",
  transformStyle: "preserve-3d",
  minWidth: 100,
  minHeight: 100,
  overflow: "visible",
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 0,
};

const tileShellStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  transformStyle: "preserve-3d",
  transform: "translateZ(1px)",
  zIndex: 1,
};

const dropdownButtonClass = "group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)] h-small rounded-small text-footnote justify-between pl-p5 pr-p2 ";

const iconButtonClass = "group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy pressed:text-uncontained-selected pressed:hover:text-uncontained-selected ring-focus h-base text-body rounded-base justify-center aspect-square px-p3";

const dropdownIconButtonClass = "group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)] h-small rounded-small text-footnote justify-between pl-p3 pr-p2 shrink-0";

export function EpitaxyTileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full w-full" style={tileVars}>
      <div style={viewportStyle}>
        <div style={tileContainerStyle}>
          <div style={rowStyle}>
            <div style={tileWrapStyle}>
              <div className="tiles-shell" style={tileShellStyle}>
                {children}
              </div>
            </div>
          </div>
          <span className="sr-only">Arrow keys move the tile. Perpendicular arrows preview a split; press Enter to commit or Escape to cancel.</span>
          <span role="status" className="sr-only" />
        </div>
      </div>
    </div>
  );
}

export function EpitaxyRouteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 min-h-0 relative flex flex-col overflow-x-clip overflow-y-auto">
      <div className="epitaxy-root select-none h-full w-full flex flex-col">
        <div className="flex-1 min-h-0">
          <EpitaxyTileLayout>{children}</EpitaxyTileLayout>
        </div>
      </div>
    </div>
  );
}

function TileBackdrop() {
  return <div className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-primary-elevated effect-primary-elevated opacity-0 transition-opacity duration-200 [.tiles-dragging_&]:opacity-100" />;
}

export function EpitaxyLandingError({ onBack }: { onBack: () => void }) {
  return (
    <EpitaxyRouteFrame>
      <div className="h-full w-full min-w-0 relative isolate rounded-r6">
        <TileBackdrop />
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-danger-000 mb-6 text-lg font-medium">Something went wrong loading this session.</div>
            <button className={primaryButtonClass} type="button" onClick={onBack}>
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center" aria-hidden="true" />
              Back to landing page
            </button>
          </div>
        </div>
      </div>
    </EpitaxyRouteFrame>
  );
}

function HeaderSkeleton() {
  return (
    <div className="relative flex items-center h-[32px] pl-[16px] pr-[16px]">
      <div className="draggable absolute inset-0 -z-[1]" aria-hidden="true" />
      <div className="relative z-[1] flex items-center min-w-0 draggable-none">
        <span className="-ml-[4px] flex min-w-0">
          <span className="inline-flex items-center gap-g4 h-base px-p3 rounded-base border-0 cursor-default select-none outline-none hide-focus-ring ring-focus min-w-0 bg-fill-uncontained-default text-t9 text-body hover:bg-fill-uncontained-hover">
            <span className="grid" aria-hidden="true"><span className="block size-[16px] rounded-r3 bg-t2 animate-pulse" /></span>
            <span className="h-[10px] w-[64px] rounded-r3 bg-t2 animate-pulse" />
          </span>
        </span>
        <span className="text-body text-t7 select-none shrink-0 pr-[4px]">/</span>
        <span className="h-[10px] w-[128px] rounded-r3 bg-t2 animate-pulse" />
      </div>
      <div className="relative z-[1] ml-auto flex items-center gap-g3 shrink-0 draggable-none">
        <button className="group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)] h-base rounded-base text-body justify-between pl-p3 pr-p2 " aria-label="Transcript view mode" type="button"><span className="relative inline-flex size-[16px]" /></button>
        <button className="group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)] h-base rounded-base text-body justify-between pl-p3 pr-p2 " aria-label="Views" type="button"><span className="relative inline-flex size-[16px]" /></button>
      </div>
    </div>
  );
}

function LoadingConversation() {
  return (
    <div className="h-full flex items-center justify-center text-t5" role="status">
      <span className="relative inline-block shrink-0 align-middle size-5" aria-hidden="true">
        <span className="absolute inset-0 rounded-full" style={{ border: "2px solid var(--t2)" }} />
        <span className="absolute inset-0 rounded-full animate-[spin_2s_linear_infinite]" style={{ background: "conic-gradient(transparent 40%, var(--spinner-arc, var(--t6)))", mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), rgb(0, 0, 0) calc(100% - 1.5px))" }} />
      </span>
      <span className="sr-only">Loading conversation</span>
    </div>
  );
}

function PromptBox() {
  return (
    <div className="epitaxy-prompt relative isolate rounded-r7 transition-shadow duration-300 ">
      <div className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-prompt-blur effect-prompt-blur" />
      <span className="sr-only" role="status" />
      <div className="grid min-w-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none" style={{ gridTemplateRows: "0fr" }}><div className="min-h-0 overflow-hidden" /></div>
      <div className="relative flex w-full">
        <div className="epitaxy-prompt-input flex-1 min-w-0 text-heading text-t9 [&_.tiptap]:min-h-[var(--h8)] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:py-[13px] [&_.tiptap]:pl-p7 [&_.tiptap]:pr-p3 [&_.tiptap_p]:m-0 ">
          <div className="tiptap ProseMirror ProseMirror-focused" aria-label="Prompt"><p className="is-empty is-editor-empty before:!text-text-500 before:whitespace-nowrap"><br className="ProseMirror-trailingBreak" /></p></div>
        </div>
        <div className="flex self-end p-p7 pl-p3"><button className={iconButtonClass} aria-label="Send" type="button"><span className="btn-squish absolute inset-0 -z-[1] rounded-[inherit] bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)]" /></button></div>
      </div>
    </div>
  );
}

function ComposerFooter() {
  return (
    <div className="epitaxy-chat-column epitaxy-chat-size relative shrink-0 flex flex-col gap-g5 [contain:layout]">
      <button type="button" aria-label="Scroll to bottom" className="inline-flex items-center h-[24px] px-p3 rounded-r5 bg-fill-contained-default text-contained-default effect-contained-default hover:bg-fill-contained-hover hover:text-contained-hover cursor-default border-0 outline-none hide-focus-ring ring-focus absolute -top-[32px] left-1/2 -translate-x-1/2 z-[1] transition-opacity duration-150 opacity-0 pointer-events-none" />
      <PromptBox />
      <div className="w-full flex items-center gap-g5 py-[4px]">
        <div className="flex items-center gap-g5 min-w-0"><button className={dropdownButtonClass} type="button"><span className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-[var(--fill-uncontained-default)]" /><span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">接受编辑</span></button><button className={dropdownIconButtonClass} aria-label="Add" type="button"><span className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-[var(--fill-uncontained-default)]" /><span className="relative inline-flex size-[12px]" /></button></div>
        <div className="ml-auto flex items-center gap-g4"><button className={dropdownButtonClass} type="button"><span className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-[var(--fill-uncontained-default)]" /><span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">Sonnet 4.5</span></button><button className={`${iconButtonClass} h-small text-footnote rounded-small shrink-0`} aria-label="Usage" type="button"><span className="btn-squish absolute inset-0 -z-[1] rounded-[inherit] bg-[var(--fill-uncontained-default)]" /></button></div>
      </div>
    </div>
  );
}

export function EpitaxySessionLoading() {
  return (
    <EpitaxyRouteFrame>
      <div className="h-full w-full min-w-0 relative isolate rounded-r6">
        <TileBackdrop />
        <div className="relative h-full min-w-0 flex flex-col">
          <HeaderSkeleton />
          <div className="epitaxy-chat-column epitaxy-chat-size shrink-0 empty:hidden py-p3" />
          <div className="contents">
            <div className="flex-1 min-h-0 relative isolate [--epitaxy-scrim-inset-end:16px]"><div className="epitaxy-top-scrim" aria-hidden="true" /><div className="epitaxy-bottom-scrim" aria-hidden="true" style={{ opacity: 0 }} /><LoadingConversation /></div>
            <ComposerFooter />
          </div>
        </div>
      </div>
    </EpitaxyRouteFrame>
  );
}
