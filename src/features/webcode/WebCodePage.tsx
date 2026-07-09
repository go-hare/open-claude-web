import { useEffect, useState, type ReactNode } from "react";
import type { RouteViewProps } from "../../app/routes";
import { Icon } from "../../shell/icons";

const installCommand = "npm install -g @anthropic/claude-cli";

const rootClass = "flex min-h-screen w-full items-center justify-center bg-bg-100 px-4 py-12 ";
const cardClass = "flex flex-col overflow-hidden rounded-xl border-[0.5px] border-border-300 bg-bg-000 shadow-sm ";
const primaryButtonClass = "inline-flex items-center justify-center relative isolate shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none font-base-bold overflow-hidden transition-transform will-change-transform ease-[cubic-bezier(0.165,0.85,0.45,1)] duration-150 hover:scale-y-[1.015] hover:scale-x-[1.005] backface-hidden after:absolute after:inset-0 after:bg-[radial-gradient(at_bottom,hsla(var(--bg-000)/20%),hsla(var(--bg-000)/0%))] after:opacity-0 after:transition after:duration-200 after:translate-y-2 hover:after:opacity-100 hover:after:translate-y-0 h-9 px-4 py-2 rounded-lg min-w-[5rem] whitespace-nowrap _fill_10ocf_9 _primary_10ocf_44";
const iconButtonClass = "inline-flex items-center justify-center relative isolate shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none font-base-bold overflow-hidden transition-transform will-change-transform ease-[cubic-bezier(0.165,0.85,0.45,1)] duration-150 hover:scale-y-[1.015] hover:scale-x-[1.005] backface-hidden after:absolute after:inset-0 after:bg-[radial-gradient(at_bottom,hsla(var(--bg-000)/20%),hsla(var(--bg-000)/0%))] after:opacity-0 after:transition after:duration-200 after:translate-y-2 hover:after:opacity-100 hover:after:translate-y-0 h-8 w-8 rounded-md _fill_10ocf_9 _primary_10ocf_44";

type CodeCardProps = {
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  title: string;
  badge: {
    text: string;
    variant: "original" | "new" | "preview" | "disabled";
  };
  description: string;
  action?: ReactNode;
  copyCommand?: string;
};

const badgeClass = {
  original: "bg-accent-900 text-accent-100",
  new: "bg-success-900 text-success-100",
  preview: "bg-bg-300 text-text-400",
  disabled: "bg-bg-300 text-text-400",
};

export function WebCodePage({ onNavigate }: RouteViewProps) {
  useEffect(() => {
    if (window.location.pathname !== "/webcode/disabled") onNavigate("/webcode/disabled");
  }, [onNavigate]);

  return <WebCodeDisabledPage />;
}

function WebCodeDisabledPage() {
  return (
    <CodeFamilyLayout
      title="Code with Claude anywhere"
      subtitle={<span>Powerful agentic coding in your IDE, terminal, or on the go. <a href="https://code.claude.com/docs/en/overview" target="_blank" rel="noopener noreferrer" className="text-text-300 underline" aria-label="Learn more about Claude Code">了解更多</a></span>}
      cards={[<TerminalCard key="terminal" />, <IdeCard key="ide" />, <WebCard key="web" />]}
      footer={<a href="/" className="inline-flex items-center text-sm text-text-400 hover:text-text-300 outline-none"><span className="mr-2">←</span>Back to Claude</a>}
    />
  );
}

function CodeFamilyLayout({ title, subtitle, cards, footer }: { title: ReactNode; subtitle: ReactNode; cards: ReactNode[]; footer: ReactNode }) {
  return (
    <div className={rootClass}>
      <div className="w-full max-w-5xl">
        <div className="mb-12 text-center">
          <h1 className="mb-2 text-3xl font-medium text-text-100">{title}</h1>
          <p className="text-base text-text-300">{subtitle}</p>
        </div>
        <div className="mb-8 grid gap-6 md:grid-cols-3">{cards}</div>
        <div className="flex justify-center">{footer}</div>
      </div>
    </div>
  );
}

function TerminalCard() {
  return (
    <CodeCard
      image={{ src: "/images/code/CLI.png", alt: "Claude Code Terminal interface", width: 616, height: 376 }}
      title="Terminal"
      badge={{ text: "Original", variant: "original" }}
      description="Best-in-class coding agent that runs in your terminal, edits files, runs scripts, and more."
      copyCommand={installCommand}
    />
  );
}

function IdeCard() {
  const openMarketplace = () => {
    window.open("https://marketplace.visualstudio.com/items?itemName=Anthropic.claude-code", "_blank");
  };
  return (
    <CodeCard
      image={{ src: "/images/code/IDE.png", alt: "VS Code IDE with Claude Code extension", width: 616, height: 376 }}
      title="IDE extension"
      badge={{ text: "New", variant: "new" }}
      description="All the power of Claude Code, right at home in VS Code, Cursor, or Windsurf."
      action={<div className="flex justify-center"><button type="button" onClick={openMarketplace} className={primaryButtonClass}>Install in VS Code</button></div>}
    />
  );
}

function WebCard() {
  return (
    <CodeCard
      image={{ src: "/images/code/Web.png", alt: "Claude Code web interface", width: 616, height: 376 }}
      title="Web"
      badge={{ text: "预览", variant: "preview" }}
      description="Run coding tasks seamlessly across your browser and phone."
      action={<p className="flex items-center gap-2 text-sm text-text-200">Disabled by org admin</p>}
    />
  );
}

function CodeCard({ image, title, badge, description, action, copyCommand }: CodeCardProps) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    if (!copyCommand) return;
    await navigator.clipboard.writeText(copyCommand);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className={cardClass}>
      <div className="overflow-hidden bg-bg-200"><img src={image.src} alt={image.alt} width={image.width} height={image.height} className="w-full" /></div>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-medium text-text-100">{title}</h2>
          <span className={`rounded px-2 py-0.5 text-xs ${badgeClass[badge.variant]}`}>{badge.text}</span>
        </div>
        <p className="mb-12 text-sm text-text-300">{description}</p>
        <div className="mt-auto">{copyCommand ? <CopyCommand command={copyCommand} copied={copied} onCopy={onCopy} /> : action}</div>
      </div>
    </div>
  );
}

function CopyCommand({ command, copied, onCopy }: { command: string; copied: boolean; onCopy: () => void }) {
  const label = copied ? "Copied!" : "Copy installation command";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-lg border-[0.5px] border-border-300 bg-bg-100 pl-2.5 pr-1 py-1">
        <div className="relative flex-1 overflow-hidden">
          <code className="block overflow-x-auto whitespace-nowrap font-mono text-[13px] text-text-100">{command}</code>
          <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-bg-100 to-transparent" />
        </div>
        <button type="button" onClick={onCopy} aria-label={label} title={label} className={iconButtonClass}>
          <Icon name="copy" />
        </button>
      </div>
    </div>
  );
}
