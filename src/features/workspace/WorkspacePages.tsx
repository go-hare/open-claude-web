import { useState, useSyncExternalStore } from "react";
import type { FormEvent, ReactNode } from "react";
import type { RouteViewProps } from "../../app/routes";
import {
  ARTIFACTS_PREF_EVENT,
  readPreviewFeatureUsesArtifacts,
} from "../settings/artifactsPreference";
import { primaryButtonClass, secondaryButtonClass } from "../shared/buttonClasses";

type Navigate = RouteViewProps["onNavigate"];

const smallPrimaryClass = `${primaryButtonClass} h-8 py-1.5`;
const smallSecondaryClass = `${secondaryButtonClass} h-8 py-1.5`;
const inputClass = `bg-bg-000
  border
  border-border-300
  hover:border-border-200
  transition-colors
  placeholder:text-text-500
  can-focus
  text-text-100
  rounded-[0.6rem]
  px-3
  w-full`;

function PaneHeader() {
  return <header className="dframe-header h-12 shrink-0 relative isolate z-10"><div className="dframe-pane-header flex h-full items-center gap-2 pl-6 pr-3" /></header>;
}

function CdsPane({ children }: { children: ReactNode }) {
  return <div className="cds-root text-primary ">{children}</div>;
}

function Surface({ children = null, root = true }: { children?: ReactNode; root?: boolean }) {
  return <><PaneHeader />{root ? <CdsPane>{children}</CdsPane> : children}</>;
}

function SearchInput({ placeholder }: { placeholder: string }) {
  return (
    <div role="search" className="w-full">
      <div className="cds-reset group/cbx inline-flex min-w-0 items-center gap-1.5 h-control-lg rounded-lg text-body text-primary bg-bg-000 border border-border-300 px-3 w-full">
        <span className="relative inline-flex size-4 text-text-500" aria-hidden="true" />
        <input aria-label={placeholder.replace("...", "")} className="cds-input cds-reset min-w-0 flex-1 h-full bg-transparent border-0 p-0 outline-none text-body text-primary placeholder:text-text-500" placeholder={placeholder} />
      </div>
    </div>
  );
}

function EmptyState({ cta, description, headline, minHeight, onClick }: { cta?: string; description?: string; headline: string; minHeight?: number; onClick?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center text-text-500" style={minHeight ? { minHeight } : undefined}>
      <div className="mb-4 size-12 text-text-400" aria-hidden="true" />
      <h3 className="text-text-200 font-medium mb-2 mt-4">{headline}</h3>
      {description ? <p className="max-w-[360px] text-sm leading-5">{description}</p> : null}
      {cta ? <button className={`${primaryButtonClass} mt-4`} onClick={onClick} type="button">{cta}</button> : null}
    </div>
  );
}

function ToolbarHeader({ children, compact = false, title }: { children?: ReactNode; compact?: boolean; title: string }) {
  return (
    <header className="flex w-full bg-bg-100 !border-0 shadow-[0px_1px_0px_0px_theme(colors.border-300)] shrink-0" style={{ height: compact ? 52 : 56 }}>
      <div className={`w-full h-full flex items-center justify-between ${compact ? "px-4" : "px-8"}`}>
        <h1 className="text-text-100 flex items-center gap-2 text-center max-md:hidden min-w-0 font-medium leading-tight">{title}</h1>
        <div className="ml-auto flex items-center gap-sm">{children}</div>
      </div>
    </header>
  );
}

export function RecentsPage({ onNavigate }: RouteViewProps) {
  return (
    <Surface>
      <ToolbarHeader compact title="Chats">
        <button className={smallSecondaryClass} style={{ height: 32, width: 106 }} type="button">Select chats</button>
        <a className={smallPrimaryClass} href="/new" onClick={(e) => { e.preventDefault(); onNavigate("/task/new"); }} style={{ height: 32, width: 87 }}>New chat</a>
      </ToolbarHeader>
      <div className="sticky top-0 z-header bg-bg-100">
        <div className="relative mx-auto w-full max-w-4xl px-4 pt-4 pb-2 md:px-8 lg:pt-6"><SearchInput placeholder="Search chats..." /></div>
      </div>
      <main className="mx-auto mt-4 w-full flex-1 px-4 md:px-8 lg:mt-6 max-w-4xl !mt-2">
        <EmptyState cta="New chat" description="Think through anything with Claude—from big ideas to quick questions. Your chats will show up here." headline="Ready for your first chat?" minHeight={452} onClick={() => onNavigate("/task/new")} />
      </main>
    </Surface>
  );
}

/** Official `_Component32` cowork branch — see `./ProjectsPage`. */
export { ProjectsPage } from "./ProjectsPage";

export function ProjectCreatePage({ onNavigate }: RouteViewProps) {
  const [name, setName] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) onNavigate(`/project/${encodeURIComponent(name.trim().toLowerCase().replace(/\s+/g, "-"))}`);
  };
  return (
    <Surface>
      <div className="mx-auto min-h-full max-w-lg px-4 pb-8 pt-24">
        <h1 className="font-ui-serif text-text-200 mb-4 text-3xl font-medium">Create a project</h1>
        <form className="grid grid-cols-1 gap-4" onSubmit={submit}>
          <FieldInput label="What are you working on?" onChange={setName} placeholder="Name your project" value={name} />
          <FieldTextArea label="What are you trying to achieve?" placeholder="Describe your project, goals, subject, etc..." />
          <fieldset>
            <div className="mb-2 text-sm font-medium">Visibility</div>
            <VisibilityOption disabled label="Workbench Org" note="Public projects are disabled by your organization" />
            <VisibilityOption checked label="Private" note="Only invited members can view and use this project" />
          </fieldset>
          <div className="mt-2 flex justify-end"><div className="flex gap-2">
            <a className={secondaryButtonClass} href="/projects" onClick={(e) => { e.preventDefault(); onNavigate("/projects"); }}>Cancel</a>
            <button className={primaryButtonClass} type="submit">Create project</button>
          </div></div>
        </form>
      </div>
    </Surface>
  );
}

function FieldInput({ label, onChange, placeholder, value }: { label: string; onChange: (value: string) => void; placeholder: string; value: string }) {
  return <div><label className="text-text-200 mb-1 block font-base">{label}</label><input autoFocus className={`${inputClass} h-11`} data-1p-ignore="true" onChange={(e) => onChange(e.currentTarget.value)} placeholder={placeholder} value={value} /></div>;
}

function FieldTextArea({ label, placeholder }: { label: string; placeholder: string }) {
  return <div><label className="text-text-200 mb-1 block font-base">{label}</label><textarea className={`${inputClass} p-3 leading-5 min-h-[86px]`} minLength={0} placeholder={placeholder} rows={3} /></div>;
}

function VisibilityOption({ checked, disabled, label, note }: { checked?: boolean; disabled?: boolean; label: string; note: string }) {
  return <label className={`${disabled ? "mb-2 flex w-full gap-2 opacity-40" : "flex w-full gap-2"}`}><input className="mt-0.5" defaultChecked={checked} disabled={disabled} name="visibility" type="radio" value={label.toLowerCase()} /><div><div className="text-sm">{label}</div><div className="text-text-300 text-xs">{note}</div></div></label>;
}


export function SpaceIndexPage({ onNavigate }: RouteViewProps) {
  const [query, setQuery] = useState("");
  const [isCreateOpen, setCreateOpen] = useState(false);
  const noResults = query.trim().length > 0;
  return (
    <Surface>
      <header className="flex w-full bg-bg-100 !border-0 shadow-[0px_1px_0px_0px_theme(colors.border-300)] shrink-0" style={{ height: 52 }}>
        <div className="w-full h-full flex items-center justify-between px-5">
          <h1 className="text-text-100 flex items-center gap-2 text-center max-md:hidden min-w-0 font-medium leading-tight">项目</h1>
          <button className={primaryButtonClass} onClick={() => setCreateOpen(true)} style={{ width: 122 }} type="button">New project</button>
        </div>
      </header>
      <main className="mx-auto mt-4 w-full flex-1 px-4 md:px-8 lg:mt-6 max-w-4xl min-h-0 flex flex-col !pb-0">
        <h1 className="font-heading text-text-200 mb-4 flex gap-1.5 md:hidden">项目</h1>
        <div className="overflow-auto pb-20 px-1">
          <div className="sticky top-0 z-[5] pt-1 pb-4 md:pb-8 from-bg-100 via-bg-100 to-bg-100/0 bg-gradient-to-b via-80%">
            <div className="cds-reset group/cbx inline-flex min-w-0 items-center gap-1.5 h-control-lg rounded-lg text-body text-primary bg-bg-000 border border-border-300 px-3 w-full">
              <span className="relative inline-flex size-4 text-text-500" aria-hidden="true" />
              <input aria-label="Search projects" className="w-full h-full pl-1.5 placeholder:text-text-500 m-0 bg-transparent p-0 hide-focus-ring disabled:cursor-not-allowed" style={{ height: 42 }} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search projects..." value={query} />
            </div>
          </div>
          <div className="mt-10 text-center text-text-300">{noResults ? `No projects matching “${query}”` : "Create your first project"}</div>
        </div>
      </main>
      {isCreateOpen ? <ProjectCreateOverlay onClose={() => setCreateOpen(false)} onNavigate={onNavigate} /> : null}
    </Surface>
  );
}

export function SpaceProjectNotFoundPage() {
  return (
    <>
      <div className="dframe-header absolute inset-x-0 top-0 z-10 flex h-12 items-center gap-3 pl-4 pr-3" />
      <div className="relative flex flex-col items-center justify-center h-full text-text-500">
        <div className="mb-4 size-12 text-text-400" aria-hidden="true" />
        <p className="text-lg font-medium">Project not found</p>
        <p className="text-sm mt-1">This project may have been removed or doesn't exist.</p>
      </div>
    </>
  );
}

function ProjectCreateOverlay({ onClose, onNavigate }: { onClose: () => void; onNavigate: Navigate }) {
  const [name, setName] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (slug) onNavigate(`/project/${encodeURIComponent(slug)}`);
  };
  return (
    <div className="fixed inset-0 z-popover flex items-center justify-center bg-black/30" role="dialog" aria-modal="true" aria-label="Create a project">
      <form className="cds-root text-primary bg-bg-000 rounded-2xl shadow-2xl border border-border-300 w-full max-w-lg p-6" onSubmit={submit}>
        <h2 className="font-ui-serif text-text-200 mb-4 text-2xl font-medium">Create a project</h2>
        <div className="grid grid-cols-1 gap-4">
          <FieldInput label="What are you working on?" onChange={setName} placeholder="Name your project" value={name} />
          <FieldTextArea label="What are you trying to achieve?" placeholder="Describe your project, goals, subject, etc..." />
          <div className="flex justify-end gap-2 pt-2">
            <button className={secondaryButtonClass} onClick={onClose} type="button">Cancel</button>
            <button className={primaryButtonClass} type="submit">Create project</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function DFramePageNotFoundPage({ onNavigate }: RouteViewProps) {
  return <Surface root={false}><CenteredMessage button="Go back home" description="Claude can help with many things, but finding this page isn’t one of them." headline="Page not found" onClick={() => onNavigate("/new")} /></Surface>;
}

export function ProjectsNoPermissionPage({ onNavigate }: RouteViewProps) {
  return <Surface><CenteredMessage button="Go to all projects" headline="You don’t have access to this project" onClick={() => onNavigate("/projects")} /></Surface>;
}

/**
 * Official /artifacts space residual — product still Coming soon for 3P.
 * When preview_feature_uses_artifacts is off, surface disabled residual instead
 * of inventing a full Artifacts library (settings Visuals gate).
 */
export function ArtifactsComingSoonPage({ onNavigate }: RouteViewProps) {
  const showArtifacts = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const handler = () => onStoreChange();
      window.addEventListener(ARTIFACTS_PREF_EVENT, handler);
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener(ARTIFACTS_PREF_EVENT, handler);
        window.removeEventListener("storage", handler);
      };
    },
    () => readPreviewFeatureUsesArtifacts(),
    () => true,
  );
  if (!showArtifacts) {
    return (
      <Surface root={false}>
        <CenteredMessage
          button="Open Capabilities settings"
          description="Artifacts is turned off in Settings → Capabilities → Visuals. Enable it to use the Artifacts space when available."
          headline="Artifacts disabled"
          onClick={() => onNavigate("/settings/capabilities")}
        />
      </Surface>
    );
  }
  return (
    <Surface root={false}>
      <CenteredMessage
        button="Go back home"
        description="We're working hard to bring the artifacts space to Teams and Enterprises."
        headline="Coming soon"
        onClick={() => onNavigate("/new")}
      />
    </Surface>
  );
}

export function BlankProjectPage() {
  return <Surface root={false} />;
}

function CenteredMessage({ button, description, headline, onClick }: { button: string; description?: string; headline: string; onClick: () => void }) {
  return (
    <div className="grid place-content-center min-h-min text-center gap-2 pt-24 pb-32 px-4 mx-auto h-screen w-fit">
      <div className="mb-10 h-[26px] text-center" aria-hidden="true" />
      <h2 className="font-ui-serif text-4xl text-text-200">{headline}</h2>
      {description ? <h3 className="font-large text-text-500">{description}</h3> : null}
      <div className="mx-0 mt-4 min-w-[16rem]"><button className={primaryButtonClass} onClick={onClick} type="button">{button}</button></div>
    </div>
  );
}
