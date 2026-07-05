import { useEffect, useState } from "react";
import type { RouteViewProps } from "../../app/routes";
import { primaryButtonClass, secondaryButtonClass } from "../shared/buttonClasses";

type WindowWithClaude = Window & {
  electronWindowControl?: {
    openQuickEntryWindow?: () => void;
    openSettingsWindow?: () => void;
    resize?: (width: number, height: number) => void;
  };
};

const ghostButtonClass = "text-text-200 hover:text-text-100 border-border-300 hover:border-border-200 rounded-lg border px-4 py-2 text-sm transition-colors";
const linkClass = "inline underline underline-offset-[3px] [&:not(:is(:hover,:focus))]:decoration-[color-mix(in_srgb,currentColor,transparent_60%)]";
const installButtonClass = "relative group w-full text-left bg-bg-000 rounded-xl border-0.5 border-border-300 p-4 pr-12 font-mono text-sm transition-all cursor-pointer";
const largeButtonClass = `${primaryButtonClass} h-11 rounded-[0.6rem] px-5 min-w-[6rem] whitespace-nowrap !text-base`;

function CenteredAccess({ button, description, headline, href }: { button?: string; description?: string; headline: string; href?: string }) {
  return (
    <div className="flex-1 min-h-0 relative flex flex-col overflow-x-clip overflow-y-auto">
      <div className="grid place-content-center min-h-min text-center gap-2 pt-24 pb-32 px-4 mx-auto h-screen w-fit">
        <div className="mb-10 h-[26px] text-center" aria-hidden="true" />
        <h2 className="font-ui-serif text-4xl text-text-200">{headline}</h2>
        {description ? <h3 className="font-large text-text-500">{description}</h3> : null}
        {button && href ? <div className="mx-0 mt-4 min-w-[16rem]"><a className={primaryButtonClass} href={href}>{button}</a></div> : null}
      </div>
    </div>
  );
}

function ClaudeWordmark({ small = false }: { small?: boolean }) {
  return <div className={small ? "mb-11 mr-px h-7" : "h-7"} aria-hidden="true" />;
}

export function NoOrganizationPage() {
  return <CenteredAccess button="Log out" description="Contact your organization administrator for assistance." headline="Your account isn't associated with an organization" href="/logout" />;
}

export function UnauthorizedPage() {
  return <CenteredAccess button="Back to safety" description="You don’t have permission to view this page." headline="Unauthorized" href="/" />;
}

export function ReportedPage() {
  return <CenteredAccess button="Go back home" headline="Thanks for your report." href="/new" />;
}

export function RedirectPage({ route }: RouteViewProps) {
  const target = route.path === "/claude-code-install" ? "/claude-code/install" : route.path === "/org-discovery" ? "/no-organization" : route.path === "/claude-code-desktop" ? "/epitaxy" : "/task/new";
  useEffect(() => {
    window.history.replaceState({}, "", target);
    window.dispatchEvent(new Event("app:navigation"));
  }, [target]);
  return null;
}

export function ServiceStatusPage({ route }: RouteViewProps) {
  const submit = route.path.includes("submit");
  const maintenance = route.path.includes("maintenance");
  const message = maintenance ? "Claude is currently down for maintenance. We’re" : "Claude is currently experiencing a temporary service disruption. We're";
  return (
    <div className="draggable flex h-screen flex-col items-center justify-center px-4 py-10 text-center" style={{ transform: "translateY(-6px)" }}>
      <div className="flex flex-1 select-text flex-col items-center justify-center gap-2 pb-14">
        <ClaudeWordmark small />
        <h1 className="font-ui-serif text-2xl font-medium sm:text-[2rem]">Claude will return soon</h1>
        <p className="text-text-200 max-w-xl sm:text-lg">{message} <a className={linkClass} href="https://status.anthropic.com/">working on it</a>, please check back soon.</p>
        {!maintenance ? <div className="mt-4 flex gap-2"><button className={ghostButtonClass} onClick={() => window.location.reload()} type="button">Try again</button><button className={ghostButtonClass} onClick={() => { window.location.pathname = "/"; }} type="button">Go to home</button></div> : null}
        {submit ? <div className="mt-8 flex flex-col items-center gap-2"><p className="text-text-300 text-sm">Still not working? You can reach out to <a className={linkClass} href="https://support.anthropic.com/">support</a> with this error code:</p><code className="bg-bg-200 text-text-200 draggable-none inline-block rounded px-3 py-1.5 text-sm">0YBRBYB</code></div> : null}
      </div>
      <a className="text-text-300 hover:text-text-100" href="https://anthropic.com" title="Learn more about Anthropic" />
    </div>
  );
}

export function OAuthDevicePage() {
  const [code, setCode] = useState("");
  const normalized = code.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return (
    <div className="min-h-screen flex flex-col justify-between bg-bg-200">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-bg-100/20 w-full max-w-xl rounded-2xl border border-border-300 shadow-sm gap-8 flex flex-col pt-12 p-8" style={{ transform: "translateY(32px)" }}>
          <div className="flex items-center justify-center"><ClaudeWordmark /></div>
          <div className="text-center"><h1 className="text-xl text-text-100 font-medium">Confirm sign-in</h1></div>
          <p id="device-code-input-label" className="text-text-300 text-center">Enter the code shown in the app.</p>
          <input aria-labelledby="device-code-input-label" autoCapitalize="characters" autoComplete="off" className="w-full rounded-lg border bg-bg-100 p-4 text-center font-mono text-2xl tracking-widest text-text-100 can-focus border-border-300 hover:border-border-200" onChange={(event) => setCode(event.currentTarget.value)} placeholder="XXXX-XXXX" spellCheck={false} value={normalized} />
          <p className="text-text-400 text-sm text-center">Didn't just start this from a Claude add-in? Close this tab.</p>
          <div className="flex flex-col items-center gap-2"><button className={`${largeButtonClass} w-full`} disabled={normalized.replace(/-/g, "").length < 8} style={{ height: 44 }} type="button">Connect</button></div>
        </div>
      </div>
    </div>
  );
}

export function DesktopTutorialPage({ onNavigate }: RouteViewProps) {
  const complete = () => {
    onNavigate("/");
    setTimeout(() => (window as WindowWithClaude).electronWindowControl?.resize?.(1200, 800), 100);
  };
  const openQuickEntry = () => {
    (window as WindowWithClaude).electronWindowControl?.openQuickEntryWindow?.();
    complete();
  };
  return (
    <>
      <div className="fixed inset-0 bg-bg-100 flex flex-col items-center justify-center p-8">
        <div className="text-center text-text-100 text-3xl font-medium font-ui-serif mb-8 max-w-lg" style={{ position: "absolute", top: 206 }}>使用 <em className="italic">Quick Entry</em>，可从任意应用向 Claude 发送消息和截图</div>
        <button className="text-text-400 hover:text-text-300 cursor-pointer flex flex-row items-center" onClick={() => (window as WindowWithClaude).electronWindowControl?.openSettingsWindow?.()} style={{ height: 24, left: 528, position: "absolute", top: 283, width: 145 }} type="button">Quick Entry 设置</button>
        <div className="flex flex-row gap-2" style={{ left: 348, position: "absolute", top: 327 }}><div className="rounded-xl border border-border-300 bg-bg-000" style={{ height: 129, width: 281 }} /><div className="bg-bg-000 border-border-300 border-1.5" style={{ height: 129, width: 222 }} /></div>
        <div className="flex flex-row gap-4" style={{ left: 400, position: "absolute", top: 554 }}><button className={`${secondaryButtonClass} h-11 rounded-[0.6rem] px-5 min-w-[6rem] whitespace-nowrap !text-base w-48`} onClick={complete} style={{ height: 44 }} type="button">Skip</button><button className={`${largeButtonClass} w-48`} onClick={openQuickEntry} style={{ height: 44 }} type="button">试试 Quick Entry</button></div>
      </div>
      <div className="draggable fixed top-0 inset-x-0 z-10 flex h-[36px] items-center pl-3" />
    </>
  );
}

function CopyCommand({ comment, command, id }: { comment: string; command: string; id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return <button aria-label={`Copy ${id} command`} className={installButtonClass} onClick={copy} type="button"><div><span className="text-forest-green block"># {comment}</span><span className="font-bold block">{command}</span></div><div className="absolute right-3 top-1/2 -translate-y-1/2 p-2"><span className="w-5 h-5 text-text-400">{copied ? "✓" : "⧉"}</span></div></button>;
}

export function ClaudeCodeInstallPage({ onNavigate }: RouteViewProps) {
  return (
    <div className="min-h-screen flex flex-col px-4">
      <div className="w-full space-y-8">
        <div className="flex justify-center pt-[60px]"><img alt="Claude Code CLI" className="object-contain" height={80} src="/images/code/CLI.png" style={{ height: 36, width: 320 }} width={320} /></div>
        <div className="w-full max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-1"><h1 className="text-3xl font-ui-serif font-medium">Get started with Claude Code</h1><p className="max-w-xl mx-auto text-lg">Prerequisites: <a className={linkClass} href="https://nodejs.org/en/download" rel="noopener noreferrer" target="_blank">Node.js 18 or newer</a></p></div>
          <div className="space-y-4 max-w-lg mx-auto"><CopyCommand comment="Install Claude Code" command="npm install -g @anthropic-ai/claude-code" id="npm install" /><CopyCommand comment="Navigate to your project" command="cd your-project" id="cd" /><CopyCommand comment="Start coding with Claude" command="claude" id="claude" /></div>
          <div className="text-center"><p className="text-text-400">Got specific setup needs or hit issues? See <a className={linkClass} href="https://code.claude.com/docs/en/setup" rel="noopener noreferrer" target="_blank">advanced setup</a> or <a className={linkClass} href="https://code.claude.com/docs/en/troubleshooting" rel="noopener noreferrer" target="_blank">troubleshooting</a>.</p></div>
          <div className="text-center pt-8"><button className={`${secondaryButtonClass} h-11 rounded-[0.6rem] px-5 min-w-[6rem]`} onClick={() => onNavigate("/new")} style={{ height: 44 }} type="button">Just chat instead</button></div>
        </div>
      </div>
    </div>
  );
}

export function ClaudeCodeOnboardNotFoundPage() {
  return (
    <><PublicTopNav /><div className="mx-auto flex max-w-md flex-col items-center px-4 pt-32 text-center"><h1 className="font-display text-2xl text-text-100">Link not found</h1><p className="mt-3 text-text-300">This guide doesn't exist or was removed.</p><p className="mt-2 text-text-300">You're currently in <span className="font-medium">Workbench Org</span> — you can try switching to a different organization.</p><a className={`${secondaryButtonClass} mt-8`} href="https://claude.ai/code">Go to Claude Code</a></div></>
  );
}

function PublicTopNav() {
  return <nav className="relative left-0 right-0 w-full bg-bg-100 dark:bg-bg-300 z-header"><a aria-label="Claude" className="flex items-center h-[4.5rem] min-[1104px]:h-[5.25rem]" href="/" style={{ marginLeft: 57, width: 120 }} /></nav>;
}
