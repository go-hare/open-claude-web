import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { CoworkPermissionDecision, CoworkPermissionRequest } from "../session/coworkPermissionTypes";
import {
  CoworkFavicon,
  CoworkIntegrationLetterIcon,
  CoworkToolCodeBlock,
} from "../session/transcript/CoworkToolPresentation";
import { CoworkComposerButton, CoworkPermissionSplitButton } from "./CoworkComposerPrimitives";
import { useCoworkPermissionKeyboard } from "./useCoworkPermissionKeyboard";

type GenericPermissionProps = {
  busy: boolean;
  disableKeyboardShortcuts?: boolean;
  isScheduledTask?: boolean;
  onDecide: (decision: CoworkPermissionDecision, input?: Record<string, unknown>) => void;
  request: CoworkPermissionRequest;
};

type ApprovalActionProps = Pick<GenericPermissionProps, "busy" | "onDecide"> & {
  allowAlways: boolean;
  disableKeyboardShortcuts: boolean;
  isScheduledTask: boolean;
};

export function CoworkGenericPermissionApproval(props: GenericPermissionProps) {
  const presentation = useMemo(() => permissionPresentation(props.request), [props.request]);
  const allowAlways = genericAlwaysAllow(props.request);
  useGenericPermissionKeyboard(props, allowAlways);
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="ease-out transition-all flex flex-col font-ui leading-normal my-3 min-h-[2.625rem] overflow-hidden border-0.5 border-border-300 rounded-lg mt-3 mb-3 bg-bg-000 shadow-sm"
      initial={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeIn" }}
    >
      <PermissionHeader icon={presentation.icon} integrationName={presentation.integrationName} toolName={presentation.toolName} />
      <PermissionExpandedContent input={presentation.input}>
        <GenericApprovalActions
          allowAlways={allowAlways}
          busy={props.busy}
          disableKeyboardShortcuts={props.disableKeyboardShortcuts === true}
          isScheduledTask={props.isScheduledTask === true}
          onDecide={props.onDecide}
        />
      </PermissionExpandedContent>
    </motion.div>
  );
}

function PermissionHeader({ icon, integrationName, toolName }: {
  icon?: string;
  integrationName?: string;
  toolName: string;
}) {
  const title = integrationName
    ? `Claude wants to use ${toolName} from ${integrationName}`
    : `Claude wants to use ${toolName}`;
  const fallback = <CoworkIntegrationLetterIcon letter={integrationName || toolName} size={16} />;
  return (
    <div className="group/row flex flex-row items-center justify-between gap-4 rounded-lg text-text-300 h-[2.625rem] py-2 px-3 cursor-default">
      <div className="flex flex-row items-center gap-2 min-w-0">
        <div className="w-5 h-5 flex items-center justify-center text-text-100">
          <CoworkFavicon fallback={fallback} size={16} url={icon} />
        </div>
        <div className="flex gap-2 relative bottom-[0.5px] font-base text-left leading-tight overflow-hidden overflow-ellipsis whitespace-nowrap flex-grow text-text-300">{title}</div>
      </div>
    </div>
  );
}

function PermissionExpandedContent({ children, input }: { children: ReactNode; input: unknown }) {
  return (
    <>
      <AnimatePresence initial={false}>
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden shrink-0"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
          tabIndex={-1}
        >
          <CoworkPermissionScrollArea className="h-full !max-h-[238px]" style={{ scrollbarGutter: "stable" }}>
            <div className="flex flex-col gap-3 p-3 pt-1">
              <CoworkToolCodeBlock code={formatToolInput(input)} language="javascript" title="Request" />
            </div>
          </CoworkPermissionScrollArea>
        </motion.div>
      </AnimatePresence>
      {children}
    </>
  );
}

function CoworkPermissionScrollArea({ children, className, style }: {
  children: ReactNode;
  className: string;
  style: CSSProperties;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const updateEdges = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    setAtBottom(node.scrollHeight - node.scrollTop - node.clientHeight <= 1);
    setAtTop(node.scrollTop <= 0);
  }, []);
  useEffect(updateEdges, [updateEdges]);
  const maskImage = `linear-gradient(to bottom, transparent 0%, black ${atTop ? 0 : 24}px, black calc(100% - ${atBottom ? 0 : 24}px), transparent 100%)`;
  return (
    <div className="min-h-0" style={{ maskImage }}>
      <div className={`overflow-y-auto overflow-x-hidden min-h-0 ${className}`} onScroll={updateEdges} ref={scrollRef} style={style}>{children}</div>
    </div>
  );
}

function GenericApprovalActions(props: ApprovalActionProps) {
  return (
    <div className="flex flex-col gap-3 p-3 pt-0">
      <div className="flex gap-2">
        {props.allowAlways ? <AlwaysAllowSplitButton {...props} /> : <AllowOnceButton {...props} />}
        <CoworkComposerButton disabled={props.busy} onClick={() => props.onDecide("deny")} variant="secondary">
          Deny{props.disableKeyboardShortcuts ? null : <ApprovalKey>esc</ApprovalKey>}
        </CoworkComposerButton>
      </div>
    </div>
  );
}

function AlwaysAllowSplitButton(props: ApprovalActionProps) {
  const label = props.isScheduledTask ? "Allow for all scheduled runs" : "Always allow";
  return (
    <CoworkPermissionSplitButton
      disabled={props.busy}
      items={[{
        label: <span className="flex items-center justify-between w-full">Allow once{props.disableKeyboardShortcuts ? null : <ApprovalKey className="ml-2">{modifierEnter()}</ApprovalKey>}</span>,
        onSelect: () => props.onDecide("once"),
      }]}
      mainButtonText={<span className="flex items-center">{label}{props.disableKeyboardShortcuts ? null : <ApprovalKey>⏎</ApprovalKey>}</span>}
      onMainClick={() => props.onDecide("always")}
    />
  );
}

function AllowOnceButton(props: ApprovalActionProps) {
  return (
    <CoworkComposerButton disabled={props.busy} onClick={() => props.onDecide("once")}>
      Allow once{props.disableKeyboardShortcuts ? null : <ApprovalKey>⏎</ApprovalKey>}
    </CoworkComposerButton>
  );
}

function ApprovalKey({ children, className = "ml-1.5" }: { children: ReactNode; className?: string }) {
  return <kbd className={`${className} font-small text-text-500`}>{children}</kbd>;
}

function useGenericPermissionKeyboard(props: GenericPermissionProps, allowAlways: boolean) {
  useCoworkPermissionKeyboard({
    enabled: !props.busy && !props.disableKeyboardShortcuts,
    onDeny: () => props.onDecide("deny"),
    onEnter: () => props.onDecide(allowAlways ? "always" : "once"),
    onModifiedEnter: () => props.onDecide("once"),
  });
}

function genericAlwaysAllow(request: CoworkPermissionRequest) {
  if (pluginShim(request.toolName)) return Array.isArray(request.suggestions) && request.suggestions.length > 0;
  return request.hasAlwaysAllow !== false;
}

function permissionPresentation(request: CoworkPermissionRequest) {
  const match = pluginShim(request.toolName);
  const connector = match ? match[2] ?? match[1] : undefined;
  const wildcard = match?.[3] === "*";
  const toolName = match
    ? wildcard ? `${connector} commands` : titleCase(match[3] ?? connector ?? request.toolName)
    : displayToolName(request.toolName);
  const command = stringValue(request.input.command);
  const message = stringValue(request.input.message);
  const input = match && command ? commandInput(connector, command, message) : request.input;
  return { icon: match ? stringValue(request.input._iconData) : undefined, input, integrationName: match ? titleCase(match[1] ?? "") : undefined, toolName };
}

function commandInput(connector: string | undefined, command: string, message: string | undefined) {
  const value = `${connector ?? ""} ${command}`.trim();
  return message ? `${message}\n\n$ ${value}` : `$ ${value}`;
}

function pluginShim(toolName: string) {
  return toolName.match(/^plugin-shim:([a-z0-9-]+):(?:([a-z0-9_-]+):)?([a-z0-9_]+|\*)$/);
}

function displayToolName(toolName: string) {
  return titleCase(toolName.split("__").at(-1) ?? toolName.split(":").at(-1) ?? toolName);
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function formatToolInput(input: unknown) {
  if (typeof input === "string") return input;
  try {
    return JSON.stringify(input, null, 2).replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/(?<!\\)"/g, "`");
  } catch {
    return String(input);
  }
}

function modifierEnter() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘⏎" : "Ctrl⏎";
}
