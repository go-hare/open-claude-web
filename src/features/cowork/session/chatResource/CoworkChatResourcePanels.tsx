/**
 * Official cFt non-file branches for local_session (index-BELzQL5P.pretty.js cFt ~217165+):
 * iFt/Yzt mcp_server, oFt/aFt web_search, lFt browser_extension, sFt skill.
 * Structure/classNames copied from official; no homemade approximate chrome.
 */

import { useMemo, useState } from "react";
import { Icon } from "../../../../shell/icons";
import { CoworkBrowserExtensionDetailPanel } from "../activity/CoworkBrowserExtensionDetailPanel";
import type { CoworkResourceActivity } from "../activity/coworkResourceActivity";
import type {
  CoworkSelectedBrowserExtensionItem,
  CoworkSelectedItem,
  CoworkSelectedMcpServerItem,
  CoworkSelectedSkillItem,
  CoworkSelectedSkillProposalItem,
  CoworkSelectedWebSearchItem,
} from "./coworkChatResourceStore";

export function CoworkChatResourcePanel({
  onClose,
  resourceActivity,
  selectedItem,
}: {
  onClose: () => void;
  resourceActivity: CoworkResourceActivity[];
  selectedItem: CoworkSelectedItem;
}) {
  switch (selectedItem.type) {
    case "mcp_server":
      return (
        <CoworkMcpServerActivityDetail
          onClose={onClose}
          resourceActivity={resourceActivity}
          selectedItem={selectedItem}
        />
      );
    case "web_search":
      return <CoworkWebSearchActivityDetail onClose={onClose} resourceActivity={resourceActivity} />;
    case "browser_extension":
      return (
        <CoworkBrowserExtensionDetailPanel
          highlightId={selectedItem.highlightId}
          onClose={onClose}
          resources={resourceActivity}
        />
      );
    case "skill":
      return <CoworkSkillDetailPanel onClose={onClose} selectedItem={selectedItem} />;
    case "skill_proposal":
      return <CoworkSkillProposalDetailPanel onClose={onClose} selectedItem={selectedItem} />;
    case "cowork_artifact":
      return (
        <CoworkUnavailableResourcePanel
          onClose={onClose}
          title="Artifact"
          message="Cowork artifact detail is not available in this host build."
        />
      );
    case "attachment":
      return (
        <CoworkUnavailableResourcePanel
          onClose={onClose}
          title="Attachment"
          message="Attachment detail is not available for local sessions."
        />
      );
    default:
      return null;
  }
}

/** Official iFt → Yzt McpServerActivityDetail. */
function CoworkMcpServerActivityDetail({
  onClose,
  resourceActivity,
  selectedItem,
}: {
  onClose: () => void;
  resourceActivity: CoworkResourceActivity[];
  selectedItem: CoworkSelectedMcpServerItem;
}) {
  const toolCalls = useMemo(
    () =>
      resourceActivity
        .filter(
          (item) => item.operation === "mcp_tool" && item.mcpServerUuid === selectedItem.serverUuid,
        )
        .map((item) => ({
          id: item.latestId,
          toolName: item.mcpToolName,
          displayName: item.mcpToolDisplayName ?? item.mcpToolName ?? item.displayName,
          input: item.mcpToolInput,
          toolResult: item.mcpToolResult
            ? {
                type: "tool_result" as const,
                tool_use_id: item.latestId,
                name: item.mcpToolName,
                is_error: item.mcpToolResult.isError ?? false,
                content: item.mcpToolResult.content,
              }
            : undefined,
          timestamp: item.timestamp,
        }))
        .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
    [resourceActivity, selectedItem.serverUuid],
  );
  const title = selectedItem.serverName || selectedItem.serverUuid;

  return (
    <div
      className="flex h-full flex-col pb-1 pl-5 pt-3"
      data-official-source="index-BELzQL5P.js:Yzt McpServerActivityDetail"
      data-cft-type="mcp_server"
    >
      <div className="sticky flex items-center gap-1 pr-5">
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-bg-000 rounded-md border border-border-300 text-text-400">
          {selectedItem.iconSrc ? (
            <img alt="" className="h-5 w-5 object-contain" src={selectedItem.iconSrc} />
          ) : (
            <Icon name="Mcp" customSize={16} />
          )}
        </div>
        <h2 className="font-ui flex-1 truncate text-lg font-medium">{title}</h2>
        <button
          aria-label="Close panel"
          className="-mr-2 inline-flex size-8 items-center justify-center rounded text-text-400 hover:bg-bg-200 hover:text-text-200"
          onClick={onClose}
          type="button"
        >
          <Icon name="Add" className="rotate-45" customSize={20} />
        </button>
      </div>
      <div className="mb-1 flex flex-col pb-3 pr-5 min-h-0 flex-1">
        <div className="text-xs text-text-400 uppercase tracking-wide py-2">
          {toolCalls.length === 1 ? "1 tool call" : `${toolCalls.length} tool calls`}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-2">
            {toolCalls.map((toolCall) => (
              <CoworkToolCallRow key={toolCall.id} toolCall={toolCall} />
            ))}
            {toolCalls.length === 0 ? (
              <div className="text-sm text-text-400 py-4 text-center">No tool calls yet</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Official Kzt ToolCallRow subset (expandable input/result). */
function CoworkToolCallRow({
  toolCall,
}: {
  toolCall: {
    displayName?: string;
    id: string;
    input?: Record<string, unknown>;
    toolName?: string;
    toolResult?: { content: unknown; is_error?: boolean };
    timestamp?: number;
  };
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  return (
    <div
      className="rounded-lg border border-border-300 overflow-hidden"
      data-official-source="index-BELzQL5P.js:Kzt ToolCallRow"
    >
      <button
        className="flex w-full cursor-pointer select-none items-center gap-3 px-3 py-2 text-left text-sm text-text-200"
        onClick={() => setIsExpanded((value) => !value)}
        type="button"
      >
        <Icon name="Mcp" customSize={16} className="text-text-500" />
        <span className="min-w-0 flex-1 truncate">{toolCall.displayName || toolCall.toolName || toolCall.id}</span>
        {toolCall.toolResult?.is_error ? (
          <span className="text-xs text-danger-100">Error</span>
        ) : null}
      </button>
      {isExpanded ? (
        <pre className="mx-3 mb-3 max-h-[180px] overflow-auto rounded-md bg-bg-100 p-2 text-xs text-text-300">
          {JSON.stringify(
            {
              input: toolCall.input ?? {},
              result: toolCall.toolResult?.content,
            },
            null,
            2,
          )}
        </pre>
      ) : null}
    </div>
  );
}

/** Official oFt → aFt WebSearchActivityDetail. */
function CoworkWebSearchActivityDetail({
  onClose,
  resourceActivity,
}: {
  onClose: () => void;
  resourceActivity: CoworkResourceActivity[];
  selectedItem?: CoworkSelectedWebSearchItem;
}) {
  const searches = useMemo(
    () =>
      resourceActivity
        .filter((item) => item.operation === "web_search")
        .map((item) => ({
          id: item.latestId,
          query: item.searchQuery ?? item.displayName,
          results: Array.isArray(item.searchResults) ? item.searchResults : [],
          timestamp: item.timestamp,
          isError: item.isError,
        }))
        .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
    [resourceActivity],
  );

  return (
    <div
      className="flex h-full flex-col pb-1 pl-5 pt-3"
      data-official-source="index-BELzQL5P.js:aFt WebSearchActivityDetail"
      data-cft-type="web_search"
    >
      <div className="sticky flex items-center gap-1 pr-5">
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-bg-000 rounded-md border border-border-300 text-text-400">
          <Icon name="Globe" customSize={16} />
        </div>
        <h2 className="font-ui flex-1 truncate text-lg font-medium">Web Search</h2>
        <button
          aria-label="Close panel"
          className="-mr-2 inline-flex size-8 items-center justify-center rounded text-text-400 hover:bg-bg-200 hover:text-text-200"
          onClick={onClose}
          type="button"
        >
          <Icon name="Add" className="rotate-45" customSize={20} />
        </button>
      </div>
      <div className="mb-1 flex flex-col pb-3 pr-5 min-h-0 flex-1">
        <div className="text-xs text-text-400 uppercase tracking-wide py-2">
          {searches.length === 1 ? "1 search" : `${searches.length} searches`}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-2">
            {searches.map((search) => (
              <CoworkWebSearchRow key={search.id} search={search} />
            ))}
            {searches.length === 0 ? (
              <div className="text-sm text-text-400 py-4 text-center">No web searches yet</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Official nFt WebSearchRow. */
function CoworkWebSearchRow({
  search,
}: {
  search: {
    id: string;
    isError?: boolean;
    query: string;
    results: unknown[];
    timestamp?: number;
  };
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const count = search.results.length;
  return (
    <div
      className="rounded-lg border border-border-300 overflow-hidden"
      data-official-source="index-BELzQL5P.js:nFt WebSearchRow"
    >
      <button
        className="flex w-full cursor-pointer select-none items-center gap-3 px-3 py-2 text-left text-sm text-text-200"
        onClick={() => setIsExpanded((value) => !value)}
        type="button"
      >
        <Icon name="Globe" customSize={16} className="text-text-500" />
        <span className="min-w-0 flex-1 truncate">{search.query || "Web search"}</span>
        <span className="text-xs text-text-500 flex-shrink-0">
          {count === 1 ? "1 result" : `${count} results`}
        </span>
        {search.isError ? <span className="text-xs text-danger-100">Error</span> : null}
      </button>
      {isExpanded && count > 0 ? (
        <div className="flex flex-nowrap p-2 pt-0 flex-col gap-1">
          {search.results.map((result, index) => {
            const row = result as { title?: string; url?: string; siteDomain?: string };
            const key = row.url || `${search.id}-${index}`;
            return (
              <a
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-text-200 hover:bg-bg-200"
                href={row.url}
                key={key}
                rel="noreferrer"
                target="_blank"
              >
                <span className="min-w-0 flex-1 truncate">{row.title || row.url || "Result"}</span>
                {row.siteDomain ? (
                  <span className="text-xs text-text-500 flex-shrink-0">{row.siteDomain}</span>
                ) : null}
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Official sFt skill panel shell (content load is host-dependent; show name + empty/error). */
function CoworkSkillDetailPanel({
  onClose,
  selectedItem,
}: {
  onClose: () => void;
  selectedItem: CoworkSelectedSkillItem;
}) {
  return (
    <div
      className="flex h-full flex-col pb-1 pl-5 pt-3"
      data-official-source="index-BELzQL5P.js:sFt skill detail"
      data-cft-type="skill"
    >
      <div className="sticky flex items-center gap-1 pr-5">
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-bg-000 rounded-md border border-border-300 text-text-400">
          <Icon name="Plugin" customSize={16} />
        </div>
        <h2 className="font-ui flex-1 truncate text-lg font-medium">{selectedItem.skillName}</h2>
        <button
          aria-label="Close panel"
          className="-mr-2 inline-flex size-8 items-center justify-center rounded text-text-400 hover:bg-bg-200 hover:text-text-200"
          onClick={onClose}
          type="button"
        >
          <Icon name="Add" className="rotate-45" customSize={20} />
        </button>
      </div>
      <div className="mb-1 flex min-h-0 flex-1 flex-col pb-3 pr-5">
        {selectedItem.pluginName ? (
          <div className="text-sm text-text-400 py-2">Plugin · {selectedItem.pluginName}</div>
        ) : null}
        <div className="flex h-full items-center justify-center text-sm text-text-400">
          Skill details couldn't be loaded.
        </div>
      </div>
    </div>
  );
}

function CoworkSkillProposalDetailPanel({
  onClose,
  selectedItem,
}: {
  onClose: () => void;
  selectedItem: CoworkSelectedSkillProposalItem;
}) {
  const name =
    selectedItem.proposal.kind === "improvement" && selectedItem.proposal.target
      ? selectedItem.proposal.target
      : selectedItem.proposal.name;
  const files = selectedItem.proposal.skillMd
    ? [{ path: "SKILL.md", content: selectedItem.proposal.skillMd }]
    : [];
  return (
    <div
      className="flex h-full flex-col pb-1 pl-5 pt-3"
      data-official-source="index-BELzQL5P.js:sFt skill_proposal"
      data-cft-type="skill_proposal"
    >
      <div className="sticky flex items-center gap-1 pr-5">
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-bg-000 rounded-md border border-border-300 text-text-400">
          <Icon name="Plugin" customSize={16} />
        </div>
        <h2 className="font-ui flex-1 truncate text-lg font-medium">{name}</h2>
        <button
          aria-label="Close panel"
          className="-mr-2 inline-flex size-8 items-center justify-center rounded text-text-400 hover:bg-bg-200 hover:text-text-200"
          onClick={onClose}
          type="button"
        >
          <Icon name="Add" className="rotate-45" customSize={20} />
        </button>
      </div>
      <div className="mb-1 flex min-h-0 flex-1 flex-col pb-3 pr-5 overflow-auto">
        {selectedItem.proposal.description ? (
          <p className="text-sm text-text-300 py-2">{selectedItem.proposal.description}</p>
        ) : null}
        {files.map((file) => (
          <pre
            className="m-0 overflow-auto rounded-md bg-bg-100 p-3 font-mono text-[13px] leading-[18px] text-text-100 whitespace-pre-wrap"
            key={file.path}
          >
            {file.content}
          </pre>
        ))}
      </div>
    </div>
  );
}

function CoworkUnavailableResourcePanel({
  message,
  onClose,
  title,
}: {
  message: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="flex h-full flex-col pb-1 pl-5 pt-3">
      <div className="sticky flex items-center gap-1 pr-5">
        <h2 className="font-ui flex-1 truncate text-lg font-medium">{title}</h2>
        <button
          aria-label="Close panel"
          className="-mr-2 inline-flex size-8 items-center justify-center rounded text-text-400 hover:bg-bg-200 hover:text-text-200"
          onClick={onClose}
          type="button"
        >
          <Icon name="Add" className="rotate-45" customSize={20} />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center text-sm text-text-400 pr-5">{message}</div>
    </div>
  );
}
