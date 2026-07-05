import type { RouteViewProps } from "../../app/routes";

const paneHeader = "dframe-header h-12 shrink-0 relative isolate z-10";
const iconButtonClass = "inline-flex items-center justify-center relative isolate shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none h-8 w-8 rounded-lg";
const navButtonClass = "flex items-center rounded-lg text-sm transition-all gap-3 px-4 py-1.5 bg-bg-300 text-text-100 font-semibold";

function PaneHeader() {
  return <header className={paneHeader}><div className="dframe-pane-header flex h-full items-center gap-2 pl-6 pr-3" /></header>;
}

function DirectoryShell({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  return (
    <div className="fixed inset-0 z-50 bg-bg-100 draggable-none">
      <div className="mx-auto flex h-full w-[calc(100%-210px)] max-w-[990px] flex-col pt-16">
        <div className="flex items-center gap-2 px-2">
          <h2 className="font-xl-bold text-text-100 flex w-full min-w-0 items-center leading-6 break-words">Directory</h2>
          <button aria-label="Close" className={iconButtonClass} onClick={() => onNavigate("/task/new")} type="button">×</button>
        </div>
        <div className="flex min-h-0 flex-1 px-2">
          <aside className="w-[200px] shrink-0 pt-3"><nav aria-label="Directory sections" className="flex flex-col gap-1"><button aria-current="true" className={navButtonClass} type="button">Plugins</button></nav></aside>
          <main className="flex min-w-0 flex-1 flex-col pt-3 pl-[69px]">
            <div className="cds-reset group/cbx inline-flex min-w-0 items-center gap-1.5 h-[34px] rounded-lg text-body text-primary bg-bg-000 border border-border-300 px-3 w-full">
              <span aria-hidden="true" className="relative inline-flex size-4 text-text-500" />
              <input aria-label="Search directory" className="w-full placeholder:text-text-500 m-0 bg-transparent p-0 hide-focus-ring disabled:cursor-not-allowed disabled:opacity-50" />
            </div>
            <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center"><p className="text-text-300 text-sm max-w-md">Your organization hasn't provided plugins. Contact your organization administrator to add them.</p></div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function DirectoryPage({ onNavigate }: RouteViewProps) {
  return <><PaneHeader /><DirectoryShell onNavigate={onNavigate} /></>;
}
