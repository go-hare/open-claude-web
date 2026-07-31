/**
 * Official GenericToolUseCell approval residual (yue + nue + RTe).
 * Shell: xde expanded card (border-0.5, bg-bg-000 shadow-sm when expanded).
 * Footer: nue — risk notice only when coworkWriteToolWarning; CTA matrix residual-honest.
 * data-official-source: index-BELzQL5P:yue/nue/RTe/xde
 */
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import type { CoworkPermissionDecision, CoworkPermissionRequest } from "../session/coworkPermissionTypes";
import {
  CoworkFavicon,
  CoworkIntegrationLetterIcon,
  CoworkToolCodeBlock,
} from "../session/transcript/CoworkToolPresentation";
import {
  resolveCoworkGenericPermissionCtaMode,
  resolveCoworkGenericPermissionPrimaryDecision,
} from "./coworkGenericPermissionCta";
import { coworkWriteToolWarningFromRequest } from "./coworkPermissionApprovalModel";
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
  /** Official nue coworkWriteToolWarning residual. */
  coworkWriteToolWarning: boolean;
  disableKeyboardShortcuts: boolean;
  isScheduledTask: boolean;
};

export function CoworkGenericPermissionApproval(props: GenericPermissionProps) {
  const presentation = useMemo(() => permissionPresentation(props.request), [props.request]);
  const allowAlways = genericAlwaysAllow(props.request);
  // Official: mode is cowork on this surface; write warning when readOnlyHint !== true.
  const coworkWriteToolWarning = coworkWriteToolWarningFromRequest(props.request);
  useGenericPermissionKeyboard(props, allowAlways, coworkWriteToolWarning);
  return (
    <motion.div
      animate={{ opacity: 1 }}
      // Official xde expanded residual (approval force-expanded): border + bg-bg-000 shadow-sm.
      className="ease-out transition-all flex flex-col font-ui leading-normal my-3 min-h-[2.625rem] overflow-hidden border-0.5 border-border-300 rounded-lg mt-3 mb-3 bg-bg-000 shadow-sm"
      data-official-source="index-BELzQL5P:yue/xde"
      data-permission-kind="generic"
      initial={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeIn" }}
    >
      <PermissionHeader icon={presentation.icon} integrationName={presentation.integrationName} toolName={presentation.toolName} />
      <PermissionExpandedContent input={presentation.input}>
        <GenericApprovalActions
          allowAlways={allowAlways}
          busy={props.busy}
          coworkWriteToolWarning={coworkWriteToolWarning}
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

/**
 * Official nue residual (index-BELzQL5P ~54625).
 * Risk notice only when coworkWriteToolWarning.
 * Primary CTA matrix:
 *   write warning → Allow for this task (once residual) [+ Always allow in split when allowAlways]
 *                 + Allow once standalone secondary
 *   scheduled     → Allow for all scheduled runs split + Allow once in menu
 *   default always→ Always allow split + Allow once in menu
 *   else          → Allow once primary
 * Deny always secondary + esc.
 */
function GenericApprovalActions(props: ApprovalActionProps) {
  return (
    <div className="flex flex-col gap-3 p-3 pt-0" data-official-source="index-BELzQL5P:nue">
      {props.coworkWriteToolWarning ? <CoworkWriteRiskNotice /> : null}
      <div className="flex gap-2">
        <PrimaryAllowControls {...props} />
        <CoworkComposerButton disabled={props.busy} onClick={() => props.onDecide("deny")} variant="secondary">
          Deny{props.disableKeyboardShortcuts ? null : <ApprovalKey>esc</ApprovalKey>}
        </CoworkComposerButton>
      </div>
    </div>
  );
}

/** Official ps3MQ4ugIl — icon + text-sm residual (not bare <p text-xs>). */
function CoworkWriteRiskNotice() {
  return (
    <div
      className="flex gap-2 text-sm text-text-300"
      data-official-source="index-BELzQL5P:ps3MQ4ugIl"
      data-permission-risk-notice="cowork-write"
    >
      <Icon className="shrink-0 mt-0.5 text-text-300" customSize={16} name="Warning" />
      <span>
        Allowing this action comes with risks. Malicious instructions in files, emails, and web content could trick Claude into unintended actions.{" "}
        <a
          className="underline hover:text-text-100"
          href="https://support.claude.com/en/articles/13364135-use-cowork-safely#h_66ba46aa5e"
          rel="noreferrer"
          target="_blank"
        >
          Learn more
        </a>
      </span>
    </div>
  );
}

function PrimaryAllowControls(props: ApprovalActionProps) {
  // Official: onAllowForThisTask when write warning && !scheduledTask.
  const mode = resolveCoworkGenericPermissionCtaMode({
    allowAlways: props.allowAlways,
    coworkWriteToolWarning: props.coworkWriteToolWarning,
    isScheduledTask: props.isScheduledTask,
  });
  switch (mode) {
    case "write-this-task-split":
    case "write-this-task-solo":
      return <WriteToolAllowControls {...props} />;
    case "scheduled-always-split":
      return <ScheduledAllowSplitButton {...props} />;
    case "always-split":
      return <AlwaysAllowSplitButton {...props} />;
    default:
      return <AllowOnceButton {...props} />;
  }
}

/**
 * Official write path: main "Allow for this task" (perChat/once), optional Always allow
 * in dropdown when showAlwaysAllowed, plus standalone Allow once secondary.
 */
function WriteToolAllowControls(props: ApprovalActionProps) {
  const alwaysLabel = "Allow for all tasks";
  const thisTaskLabel = (
    <span className="flex items-center">
      Allow for this task
      {props.disableKeyboardShortcuts ? null : <ApprovalKey>⏎</ApprovalKey>}
    </span>
  );
  if (props.allowAlways) {
    return (
      <>
        <CoworkPermissionSplitButton
          disabled={props.busy}
          items={[{
            label: alwaysLabel,
            onSelect: () => props.onDecide("always"),
          }]}
          mainButtonText={thisTaskLabel}
          onMainClick={() => props.onDecide("once")}
        />
        <AllowOnceStandaloneButton {...props} />
      </>
    );
  }
  return (
    <>
      <CoworkComposerButton disabled={props.busy} onClick={() => props.onDecide("once")}>
        {thisTaskLabel}
      </CoworkComposerButton>
      <AllowOnceStandaloneButton {...props} />
    </>
  );
}

function AllowOnceStandaloneButton(props: ApprovalActionProps) {
  return (
    <CoworkComposerButton disabled={props.busy} onClick={() => props.onDecide("once")} variant="secondary">
      Allow once
      {props.disableKeyboardShortcuts ? null : (
        <ApprovalKey className="ml-1.5">{modifierEnter()}</ApprovalKey>
      )}
    </CoworkComposerButton>
  );
}

function ScheduledAllowSplitButton(props: ApprovalActionProps) {
  return (
    <CoworkPermissionSplitButton
      disabled={props.busy}
      items={[{
        label: (
          <span className="flex items-center justify-between w-full">
            Allow once
            {props.disableKeyboardShortcuts ? null : <ApprovalKey className="ml-2">{modifierEnter()}</ApprovalKey>}
          </span>
        ),
        onSelect: () => props.onDecide("once"),
      }]}
      mainButtonText={(
        <span className="flex items-center">
          Allow for all scheduled runs
          {props.disableKeyboardShortcuts ? null : <ApprovalKey>⏎</ApprovalKey>}
        </span>
      )}
      onMainClick={() => props.onDecide("always")}
    />
  );
}

function AlwaysAllowSplitButton(props: ApprovalActionProps) {
  const label = props.coworkWriteToolWarning ? "Allow for all tasks" : "Always allow";
  return (
    <CoworkPermissionSplitButton
      disabled={props.busy}
      items={[{
        label: (
          <span className="flex items-center justify-between w-full">
            Allow once
            {props.disableKeyboardShortcuts ? null : <ApprovalKey className="ml-2">{modifierEnter()}</ApprovalKey>}
          </span>
        ),
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

/**
 * Official nue keyboard residual:
 * Escape → deny
 * Enter (no mod) → primary CTA (this-task once on write path; always when always-allow main; else once)
 * meta/ctrl+Enter → once
 */
function useGenericPermissionKeyboard(
  props: GenericPermissionProps,
  allowAlways: boolean,
  coworkWriteToolWarning: boolean,
) {
  useCoworkPermissionKeyboard({
    enabled: !props.busy && !props.disableKeyboardShortcuts,
    onDeny: () => props.onDecide("deny"),
    onEnter: () => {
      props.onDecide(
        resolveCoworkGenericPermissionPrimaryDecision({
          allowAlways,
          coworkWriteToolWarning,
          isScheduledTask: props.isScheduledTask === true,
        }),
      );
    },
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
