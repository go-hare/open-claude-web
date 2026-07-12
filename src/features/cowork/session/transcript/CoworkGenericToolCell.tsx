import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import {
  CoworkEditGlyph,
  CoworkMemoryGlyph,
  CoworkSearchGlyph,
  CoworkTaskGlyph,
  CoworkTerminalGlyph,
  CoworkTodoGlyph,
  CoworkToolboxGlyph,
  CoworkWebGlyph,
} from "../../ui/CoworkOfficialGlyphs";
import type { CoworkContentBlock } from "./coworkMessageTypes";
import { CoworkFavicon, CoworkIntegrationLetterIcon, CoworkToolBadge } from "./CoworkToolPresentation";
import { CoworkToolRow, type CoworkToolRenderMode } from "./CoworkToolRow";

type CoworkGenericToolCellProps = {
  children?: ReactNode;
  icon?: ReactNode;
  iconName?: string;
  iconSize?: number;
  integrationIconUrl?: string;
  integrationName?: string;
  isError?: boolean;
  isFirstBlockOfMessage?: boolean;
  isFirstItemInGroup?: boolean;
  isLastBlockOfMessage?: boolean;
  isLastItemInGroup?: boolean;
  isStreaming: boolean;
  renderMode?: CoworkToolRenderMode;
  renderRequest?: () => ReactNode;
  renderResult?: () => ReactNode;
  secondaryText?: ReactNode;
  toolDisplayName?: ReactNode;
  toolName: string;
  toolResult?: CoworkContentBlock;
};

export const CoworkGenericToolCell = memo(function CoworkGenericToolCell({
  children,
  icon,
  iconName,
  iconSize = 16,
  integrationIconUrl,
  integrationName,
  isError,
  isFirstBlockOfMessage,
  isFirstItemInGroup,
  isLastBlockOfMessage,
  isLastItemInGroup,
  isStreaming,
  renderMode = "standard",
  renderRequest,
  renderResult,
  secondaryText,
  toolDisplayName,
  toolName,
  toolResult,
}: CoworkGenericToolCellProps) {
  const [resultExpanded, setResultExpanded] = useState(false);
  const [requestExpanded, setRequestExpanded] = useState(false);
  const displayName = toolDisplayName || formatToolDisplayName(toolName);
  const complete = Boolean(toolResult) || !isStreaming;
  const resolvedIcon = useMemo(() => icon ?? toolIcon({ displayName, iconName, iconSize, integrationIconUrl, integrationName, toolName }), [displayName, icon, iconName, iconSize, integrationIconUrl, integrationName, toolName]);
  const toggleResult = useCallback(() => setResultExpanded((value) => !value), []);

  return (
    <CoworkToolRow
      handleClick={renderResult && complete ? toggleResult : undefined}
      hideCaret
      icon={resolvedIcon}
      isFirstBlockOfMessage={isFirstBlockOfMessage}
      isFirstItemInGroup={isFirstItemInGroup}
      isLastBlockOfMessage={isLastBlockOfMessage}
      isLastItemInGroup={isLastItemInGroup}
      isStreaming={isStreaming}
      renderMode={renderMode}
      secondaryText={secondaryText}
      text={displayName}
    >
      {children}
      {renderRequest && !complete ? <ExpandableToolDetail expanded={requestExpanded} label="Request" onExpand={setRequestExpanded} render={renderRequest} /> : null}
      {renderResult && complete ? <ExpandableToolDetail error={isError} expanded={resultExpanded} label="Result" onExpand={setResultExpanded} render={renderResult} /> : null}
    </CoworkToolRow>
  );
});

function ExpandableToolDetail({ error, expanded, label, onExpand, render }: {
  error?: boolean;
  expanded: boolean;
  label: string;
  onExpand: (value: boolean) => void;
  render: () => ReactNode;
}) {
  return (
    <div className="mx-2.5 mt-1 mb-2">
      {!expanded ? (
        <button className={classes("flex items-center transition-colors cursor-pointer", error ? "text-danger-000 hover:text-danger-100" : "text-text-500 hover:text-text-200")} onClick={() => onExpand(true)}>
          <CoworkToolBadge className={classes("font-mono", !error && "!text-inherit")} color={error ? "danger" : "flat"}>{label}</CoworkToolBadge>
        </button>
      ) : null}
      <AnimatePresence>
        {expanded ? (
          <motion.div animate={{ height: "auto", opacity: 1 }} className="overflow-hidden" exit={{ height: 0, opacity: 0 }} initial={{ height: 0, opacity: 0 }} key={`${label.toLowerCase()}-expanded`} transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}>
            <div className="rounded-lg border-[0.5px] border-border-300 bg-bg-000 cursor-pointer" onClick={() => onExpand(false)}>
              <div className="p-2 flex flex-col gap-2 max-h-[200px] overflow-y-auto [&_pre]:!text-xs [&_code]:!text-xs">{render()}</div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function toolIcon(input: { displayName: ReactNode; iconName?: string; iconSize: number; integrationIconUrl?: string; integrationName?: string; toolName: string }) {
  const explicit = iconNameToOfficialIcon(input.iconName);
  if (explicit) return renderOfficialToolGlyph(explicit, input.iconSize);
  const inferred = toolNameToOfficialIcon(input.toolName);
  if (inferred) return renderOfficialToolGlyph(inferred, input.iconSize);
  const fallback = <CoworkIntegrationLetterIcon letter={input.integrationName || String(input.displayName)} size={input.iconSize} />;
  if (input.integrationIconUrl) return <CoworkFavicon fallback={fallback} size={input.iconSize} url={input.integrationIconUrl} />;
  return input.integrationName ? fallback : <CoworkToolboxGlyph className="text-text-500" size={input.iconSize as 16} />;
}

function iconNameToOfficialIcon(name?: string) {
  return ({ agent: "task", commandLine: "terminal", edit: "edit", globe: "web", memory: "memory", search: "search", tasks: "todo" } as Record<string, OfficialToolGlyph>)[name ?? ""];
}

function toolNameToOfficialIcon(name: string) {
  const normalized = normalizeToolName(name);
  if (["bash", "bash_tool"].includes(normalized)) return "terminal";
  if (["edit", "str_replace", "str_replace_editor"].includes(normalized)) return "edit";
  if (["glob", "grep", "tool_search"].includes(normalized)) return "search";
  if (["web_search", "web_fetch"].includes(normalized)) return "web";
  if (normalized === "todo_write") return "todo";
  if (normalized === "task") return "task";
  if (["recent_chats", "conversation_search"].includes(normalized)) return "memory";
  return undefined;
}

type OfficialToolGlyph = "edit" | "memory" | "search" | "task" | "terminal" | "todo" | "web";

function renderOfficialToolGlyph(glyph: OfficialToolGlyph, size: number) {
  const props = { className: "text-text-500", size: size as 16 };
  if (glyph === "edit") return <CoworkEditGlyph {...props} />;
  if (glyph === "memory") return <CoworkMemoryGlyph {...props} />;
  if (glyph === "search") return <CoworkSearchGlyph {...props} />;
  if (glyph === "task") return <CoworkTaskGlyph {...props} />;
  if (glyph === "terminal") return <CoworkTerminalGlyph {...props} />;
  if (glyph === "todo") return <CoworkTodoGlyph {...props} />;
  return <CoworkWebGlyph {...props} />;
}

function normalizeToolName(name: string) {
  const index = name.lastIndexOf("__");
  return (index >= 0 ? name.slice(index + 2) : name).replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function formatToolDisplayName(name: string) {
  const doubleUnderscore = name.split("__");
  const raw = doubleUnderscore.length >= 3 ? doubleUnderscore[2] : name.split(":").at(-1) ?? name;
  return raw.split("_").map((part, index) => index === 0 ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part.toLowerCase()).join(" ");
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
