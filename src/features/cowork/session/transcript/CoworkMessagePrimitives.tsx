import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../../../../shell/icons";

export function CoworkUserMessage({ children }: { children: ReactNode }) {
  return <div className="group/msg flex justify-end items-start gap-g3 w-full transition-opacity duration-200"><div className="flex flex-col items-end gap-g6 max-w-[75%] min-w-0"><div className="relative flex max-w-full flex-col gap-g4 rounded-r7 bg-bg-200 px-p8 py-p6 text-text-100 shadow-sm select-text">{children}</div></div></div>;
}

export function CoworkAssistantMessage({ children }: { children: ReactNode }) {
  return <article className="group/msg flex w-full flex-col items-start"><div className="flex w-full flex-col gap-g6 select-text">{children}</div></article>;
}

export function CoworkResponseMarkdown({ children }: { children: ReactNode }) {
  return <div className="font-claude-response-body text-text-100 flex max-w-[72ch] flex-col gap-4 [overflow-wrap:anywhere] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border-300 [&_blockquote]:pl-4 [&_code]:font-mono [&_code]:text-[0.9em] [&_em]:italic [&_li]:pl-1 [&_ol]:my-0 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:m-0 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-bg-200 [&_pre]:p-3 [&_strong]:font-semibold [&_ul]:my-0 [&_ul]:list-disc [&_ul]:pl-6">{children}</div>;
}

export function CoworkThinkingBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex flex-col w-full"><button aria-expanded={expanded} className="relative group/tool flex self-start max-w-full items-center py-0 gap-g1 text-left outline-none hide-focus-ring focus:ring-focus rounded-r3 text-assistant-secondary" onClick={() => setExpanded((value) => !value)} type="button"><span className="text-body truncate">Thought process</span><span className="shrink-0" style={{ "--class-base-icon": "14px" } as CSSProperties}><Icon name={expanded ? "ChevronDownSmall" : "ChevronRightSmall"} size="sm" /></span></button><ThinkingCollapse expanded={expanded}><div className="mt-[var(--p6)] rounded-r6 bg-t1 px-p7 py-p6 text-body text-assistant-secondary whitespace-pre-wrap break-words">{text}</div></ThinkingCollapse></div>
  );
}

function ThinkingCollapse({ children, expanded }: { children: ReactNode; expanded: boolean }) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return expanded ? <div>{children}</div> : null;
  return <AnimatePresence initial={false}>{expanded ? <motion.div animate={{ height: "auto", opacity: 1 }} className="overflow-hidden" exit={{ height: 0, opacity: 0 }} initial={{ height: 0, opacity: 0 }} transition={{ height: { type: "spring", duration: 0.35, bounce: 0 }, opacity: { duration: 0.2 } }}>{children}</motion.div> : null}</AnimatePresence>;
}
