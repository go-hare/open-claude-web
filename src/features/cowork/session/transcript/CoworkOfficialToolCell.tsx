import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { Icon } from "../../../../shell/icons";

type CoworkOfficialToolCellProps = {
  children?: ReactNode;
  footer?: ReactNode;
  forceExpanded?: boolean;
  icon?: ReactNode;
  isError?: boolean;
  isFirstBlockOfMessage?: boolean;
  isLastBlockOfMessage?: boolean;
  isStreaming?: boolean;
  text: ReactNode;
};

export function CoworkOfficialToolCell(props: CoworkOfficialToolCellProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = props.forceExpanded || localExpanded;
  const expandable = Boolean(props.children) && !props.isError && !props.forceExpanded;
  const row = createToolRow(expandable ? "button" : "div", props, expanded, () => setLocalExpanded((value) => !value));
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className={wrapperClassName(props, expanded)}
      initial={{ opacity: props.isStreaming ? 0 : 1 }}
      transition={{ duration: 0.5, ease: "easeIn" }}
    >
      {row}
      <CoworkOfficialToolCollapse expanded={expanded} footer={props.footer}>{props.children}</CoworkOfficialToolCollapse>
    </motion.div>
  );
}

export function CoworkOfficialToolBody({ input, result, resultIsError }: { input: unknown; result?: string; resultIsError?: boolean }) {
  return (
    <div className="flex flex-col gap-3 p-3 pt-1">
      <CoworkOfficialCodeBlock code={formatToolInput(input)} title="Request" />
      {result ? <CoworkOfficialCodeBlock code={result} error={resultIsError} title={resultIsError ? "Error" : "Response"} /> : null}
    </div>
  );
}

export function CoworkToolFallbackIcon({ name }: { name: string }) {
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="shrink-0 bg-bg-000 border-border-300 border-0.5 shadow-sm flex items-center justify-center" style={{ borderRadius: 4.32, height: 16, width: 16 }}>
      <span className="text-[9px] font-medium leading-none text-text-300">{letter}</span>
    </div>
  );
}

function createToolRow(tag: "button" | "div", props: CoworkOfficialToolCellProps, expanded: boolean, onToggle: () => void) {
  const Tag = tag;
  return (
    <Tag
      className={classes("group/row flex flex-row items-center justify-between gap-4 rounded-lg text-text-300 h-[2.625rem] py-2 px-3", tag === "button" ? "cursor-pointer transition-colors duration-200 hover:text-text-200 hover:text-text-000" : "cursor-default")}
      onClick={tag === "button" ? onToggle : undefined}
      type={tag === "button" ? "button" : undefined}
    >
      <div className="flex flex-row items-center gap-2 min-w-0">
        {props.icon ? <div className="w-5 h-5 flex items-center justify-center text-text-100">{props.icon}</div> : null}
        <div className="flex gap-2 relative bottom-[0.5px] font-base text-left leading-tight overflow-hidden overflow-ellipsis whitespace-nowrap flex-grow text-text-300">
          {props.isStreaming ? <span className="epitaxy-text-shine">{props.text}</span> : props.text}
        </div>
      </div>
      <div className="flex flex-row items-center gap-1.5 min-w-0 shrink-0">
        {props.isError ? <Icon className="text-danger-000" customSize={16} name="Warning" /> : tag === "button" ? <span className={classes("inline-flex transition-transform duration-400 ease-snappy-out", expanded && "rotate-180")}><Icon className="relative bottom-[0.5px] text-text-300" customSize={16} name="ChevronDownSmall" /></span> : null}
      </div>
    </Tag>
  );
}

function CoworkOfficialToolCollapse({ children, expanded, footer }: { children?: ReactNode; expanded: boolean; footer?: ReactNode }) {
  return (
    <>
      <AnimatePresence initial={false}>
        {expanded && children ? (
          <motion.div animate={{ height: "auto", opacity: 1 }} className="overflow-hidden shrink-0" exit={{ height: 0, opacity: 0 }} initial={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}>
            <div className="h-full !max-h-[238px] overflow-y-auto" style={{ scrollbarGutter: "stable" }}>{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {footer}
    </>
  );
}

function CoworkOfficialCodeBlock({ code, error, title }: { code: string; error?: boolean; title: string }) {
  return <div className={classes("rounded-lg p-3", error ? "bg-danger-900 text-danger-000" : "bg-bg-100 text-text-300")}><div className="mb-2 text-xs text-text-500">{title}</div><pre className="m-0 whitespace-pre-wrap break-all"><code>{code}</code></pre></div>;
}

function wrapperClassName(props: CoworkOfficialToolCellProps, expanded: boolean) {
  return classes(
    "ease-out transition-all flex flex-col font-ui leading-normal my-3 min-h-[2.625rem] overflow-hidden border-0.5 border-border-300 rounded-lg",
    !expanded && !props.isError && "hover:bg-bg-200",
    props.isFirstBlockOfMessage ? "mt-2" : "mt-3",
    props.isLastBlockOfMessage ? "mb-2" : "mb-3",
    expanded && "bg-bg-000 shadow-sm",
  );
}

function formatToolInput(value: unknown) {
  if (value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2).replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/(?<!\\)"/g, "`");
  } catch {
    return String(value);
  }
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
