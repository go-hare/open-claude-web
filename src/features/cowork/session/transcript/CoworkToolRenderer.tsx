import { useState, type ReactNode } from "react";
import { Icon } from "../../../../shell/icons";
import { asRecord, stringValue, toolResultText } from "../recordUtils";
import type { CoworkChatMessage, CoworkContentBlock } from "./coworkMessageModel";
import { CoworkOfficialToolBody, CoworkOfficialToolCell, CoworkToolFallbackIcon } from "./CoworkOfficialToolCell";
import { CoworkConnectorSuggestion, CoworkPluginSuggestion, CoworkSkillSuggestion } from "./CoworkOfficialSuggestions";
import { hasPendingCoworkToolPermission, useCoworkMessageContext } from "./CoworkMessageContext";
import { CoworkToolRow } from "./CoworkToolRow";
import { useCoworkTranscriptActions } from "./CoworkTranscriptActions";

type ToolProps = {
  block: CoworkContentBlock;
  isFirstBlockOfMessage?: boolean;
  isFirstItem: boolean;
  isLastBlockOfMessage?: boolean;
  isLastItem: boolean;
  isStreaming: boolean;
  message: CoworkChatMessage;
  standalone?: boolean;
  toolResult?: CoworkContentBlock;
};

export function CoworkToolRenderer(props: ToolProps) {
  const { toolPermissionRequests } = useCoworkMessageContext();
  const name = normalizeToolName(props.block.name ?? "");
  if (props.standalone && hasPendingCoworkToolPermission(toolPermissionRequests, props.block.id)) return null;
  if (props.standalone) return <CoworkStandaloneTool {...props} normalizedName={name} />;
  if (name === "bash" || name === "bash_tool") return <CoworkBashTool {...props} />;
  if (["read", "open_file", "view", "write", "create_file", "edit", "str_replace", "str_replace_editor", "grep", "glob", "present_files"].includes(name)) return <CoworkFileTool {...props} normalizedName={name} />;
  if (name === "web_search" || name === "web_fetch") return <CoworkWebTool {...props} normalizedName={name} />;
  if (name === "task" || name === "agent") return <CoworkTaskTool {...props} />;
  return <CoworkGenericTool {...props} normalizedName={name} />;
}

function CoworkBashTool(props: ToolProps) {
  const [expanded, setExpanded] = useState(false);
  const input = asRecord(props.block.input);
  const command = stringValue(input.command) ?? "";
  const description = stringValue(input.description);
  const result = resultText(props.toolResult);
  const isError = props.toolResult?.is_error === true;
  const complete = Boolean(props.toolResult) || !props.isStreaming;
  return (
    <CoworkToolRow
      handleClick={command ? () => setExpanded((value) => !value) : undefined}
      hideCaret
      icon={<Icon className="text-text-500" customSize={16} name="ConsoleTerminal" />}
      isExpanded={expanded}
      isFirstBlockOfMessage={props.isFirstBlockOfMessage}
      isFirstItemInGroup={props.isFirstItem}
      isLastBlockOfMessage={props.isLastBlockOfMessage}
      isLastItemInGroup={props.isLastItem}
      isStreaming={!complete}
      renderMode={props.standalone ? "standard" : "timeline"}
      text={description ?? "Running command"}
    >
      {command ? <ToolDetailSection error={isError} expanded={expanded} label="Script" onExpand={() => setExpanded(true)}><ToolCode code={command} />{result ? <ToolCode code={result} error={isError} title="Output" /> : null}</ToolDetailSection> : null}
    </CoworkToolRow>
  );
}

function CoworkFileTool(props: ToolProps & { normalizedName: string }) {
  const input = asRecord(props.block.input);
  const path = stringValue(input.file_path) ?? stringValue(input.path) ?? "";
  const fileName = basename(path);
  const action = fileAction(props.normalizedName);
  const completed = Boolean(props.toolResult) || !props.isStreaming;
  const label = stringValue(input.description) ?? fileActionText(action, fileName, !completed, props.toolResult?.is_error === true);
  const content = stringValue(input.file_text) ?? stringValue(input.content) ?? stringValue(input.new_str);
  const actions = useCoworkTranscriptActions();
  const icon = action === "edit" ? "Edit" : action === "read" ? "BookText" : "NoteSquareLines";
  const showPreview = Boolean(content) && (action === "create" || action === "edit");
  return (
    <CoworkToolRow
      handleClick={path ? () => actions?.openFile({ path }) : undefined}
      hideCaret
      icon={<Icon className="text-text-500" customSize={16} name={icon} />}
      isFirstBlockOfMessage={props.isFirstBlockOfMessage}
      isFirstItemInGroup={props.isFirstItem}
      isLastBlockOfMessage={props.isLastBlockOfMessage}
      isLastItemInGroup={props.isLastItem}
      isStreaming={props.isStreaming && !completed}
      renderMode={props.standalone ? "standard" : "timeline"}
      text={<span className="truncate">{label}</span>}
    >
      {showPreview ? <div className="grid transition-[grid-template-rows,opacity] duration-100 ease-out mx-2.5 mt-1 mb-2 grid-rows-[1fr] opacity-100"><div className="overflow-hidden min-h-0"><div className="border-[0.5px] border-border-300 rounded-xl overflow-hidden bg-bg-000/30 text-xs"><pre className="p-3 text-text-300 whitespace-pre-wrap overflow-x-auto"><code>{content}</code></pre></div></div></div> : null}
    </CoworkToolRow>
  );
}

function CoworkWebTool(props: ToolProps & { normalizedName: string }) {
  const input = asRecord(props.block.input);
  const query = stringValue(input.query) ?? stringValue(input.url) ?? "";
  const results = webResultCount(props.toolResult);
  const complete = Boolean(props.toolResult) || !props.isStreaming;
  const isFetch = props.normalizedName === "web_fetch";
  const label = complete ? query : isFetch ? "Fetching page" : "Searching the web";
  return <CoworkToolRow hideCaret icon={<Icon className="text-text-500" customSize={16} name="Globe" />} isFirstBlockOfMessage={props.isFirstBlockOfMessage} isFirstItemInGroup={props.isFirstItem} isLastBlockOfMessage={props.isLastBlockOfMessage} isLastItemInGroup={props.isLastItem} isStreaming={!complete} renderMode={props.standalone ? "standard" : "timeline"} secondaryIcon={isFetch && complete && query ? <Icon className="text-text-300" customSize={16} name="ArrowOutSquare" /> : undefined} secondaryText={!isFetch && results ? `${results} ${results === 1 ? "result" : "results"}` : undefined} text={label} />;
}

function CoworkTaskTool(props: ToolProps) {
  const description = stringValue(asRecord(props.block.input).description) ?? "Running task";
  const childTools = props.message.content.filter((block) => block.type === "tool_use" && block._isSubagentBlock && block._parentToolUseId === props.block.id).length;
  return <CoworkToolRow hideCaret icon={<Icon className="text-text-500" customSize={16} name="AgentPlanPath" />} isFirstBlockOfMessage={props.isFirstBlockOfMessage} isFirstItemInGroup={props.isFirstItem} isLastBlockOfMessage={props.isLastBlockOfMessage} isLastItemInGroup={props.isLastItem} isStreaming={props.isStreaming} renderMode={props.standalone ? "standard" : "timeline"} secondaryText={!props.isStreaming && childTools ? `${childTools} ${childTools === 1 ? "step" : "steps"}` : undefined} text={description} />;
}

function CoworkGenericTool(props: ToolProps & { normalizedName: string }) {
  const [expanded, setExpanded] = useState(false);
  const displayName = toolDisplayName(props.block.name ?? props.normalizedName);
  const result = resultText(props.toolResult);
  const input = safeJson(props.block.input);
  const expandable = Boolean(input || result) && !props.isStreaming;
  return (
    <CoworkToolRow
      handleClick={expandable ? () => setExpanded((value) => !value) : undefined}
      hideCaret={!expandable}
      icon={<Icon className="text-text-500" customSize={16} name={toolIcon(props.normalizedName)} />}
      isExpanded={expanded}
      isFirstBlockOfMessage={props.isFirstBlockOfMessage}
      isFirstItemInGroup={props.isFirstItem}
      isLastBlockOfMessage={props.isLastBlockOfMessage}
      isLastItemInGroup={props.isLastItem}
      isStreaming={props.isStreaming}
      renderMode={props.standalone ? "standard" : "timeline"}
      secondaryIcon={props.toolResult?.is_error ? <Icon className="text-danger-000" customSize={16} name="Warning" /> : undefined}
      text={stringValue(props.block.message) ?? displayName}
    >
      {expanded ? <div className="mx-2.5 mt-1 mb-2"><div className="rounded-lg border-[0.5px] border-border-300 bg-bg-000"><div className="p-2 flex flex-col gap-2 max-h-[200px] overflow-y-auto [&_pre]:!text-xs [&_code]:!text-xs">{input ? <ToolCode code={input} title="Request" /> : null}{result ? <ToolCode code={result} error={props.toolResult?.is_error === true} title={props.toolResult?.is_error ? "Error" : "Response"} /> : null}</div></div></div> : null}
    </CoworkToolRow>
  );
}

function CoworkStandaloneTool(props: ToolProps & { normalizedName: string }) {
  const lower = (props.block.name ?? "").toLowerCase();
  if (lower.includes("create_scheduled_task") && props.toolResult && !props.toolResult.is_error) return <CoworkScheduledTaskTool block={props.block} />;
  if (lower.includes("save_skill") && props.toolResult && !props.toolResult.is_error) return <CoworkSaveSkillTool block={props.block} />;
  if (lower.includes("list_connectors") || lower.includes("suggest_connectors")) return <CoworkConnectorSuggestion isStreaming={props.isStreaming} result={props.toolResult} source={lower.includes("list_connectors") ? "list_connectors" : "suggest_connectors"} />;
  if (lower.includes("list_plugins") || lower.includes("suggest_plugin_install")) return <CoworkPluginSuggestion result={props.toolResult} source={lower.includes("list_plugins") ? "list_plugins" : "suggest_plugin_install"} />;
  if (lower.includes("list_skills") || lower.includes("suggest_skills")) return <CoworkSkillSuggestion result={props.toolResult} source={lower.includes("suggest_skills") ? "suggest_skills" : "list_skills"} />;
  if (props.block.name === "AskUserQuestion") return <CoworkAskUserTool block={props.block} result={props.toolResult} />;
  return <CoworkGenericStandaloneTool {...props} />;
}

function CoworkScheduledTaskTool({ block }: { block: CoworkContentBlock }) {
  const input = asRecord(block.input);
  const taskId = stringValue(input.taskId) ?? stringValue(input.task_id) ?? "";
  const taskName = stringValue(input.name) ?? stringValue(input.title) ?? taskId;
  return <a className="my-3 border-0.5 border-border-300 rounded-lg overflow-hidden font-ui flex items-center gap-2 px-3 py-2.5 hover:bg-bg-200 transition-colors" href={`/scheduled/${encodeURIComponent(taskId)}`}><span className="w-5 h-5 flex items-center justify-center text-text-100 flex-shrink-0"><Icon customSize={16} name="Calendar" /></span><span className="flex-1 min-w-0 truncate text-text-300 font-base">Created scheduled task: <span className="font-base-bold text-text-200">{taskName}</span></span><Icon className="text-text-400 flex-shrink-0" customSize={16} name="ArrowRight" /></a>;
}

function CoworkSaveSkillTool({ block }: { block: CoworkContentBlock }) {
  const input = asRecord(block.input);
  const name = stringValue(input.name) ?? "";
  const overwrite = input.overwrite === true;
  return <a className="my-3 border-0.5 border-border-300 rounded-lg overflow-hidden font-ui flex items-center gap-2 px-3 py-2.5 hover:bg-bg-200 transition-colors" href="/customize/skills"><span className="w-5 h-5 flex items-center justify-center text-text-100 flex-shrink-0"><Icon customSize={16} name="Book" /></span><span className="flex-1 min-w-0 truncate text-text-300 font-base">{overwrite ? "Updated skill" : "Saved skill"}: <span className="font-base-bold text-text-200">{name}</span></span><Icon className="text-text-400 flex-shrink-0" customSize={16} name="ArrowRight" /></a>;
}

function CoworkAskUserTool({ block, result }: { block: CoworkContentBlock; result?: CoworkContentBlock }) {
  const questions = Array.isArray(asRecord(block.input).questions) ? asRecord(block.input).questions as unknown[] : [];
  return <div className="my-4 rounded-lg border-0.5 border-border-300 bg-bg-000 p-4 font-ui">{questions.map((question, index) => { const record = asRecord(question); return <div className="text-sm text-text-100" key={index}>{stringValue(record.question) ?? "Question"}</div>; })}{result ? <div className="mt-2 text-sm text-text-400">Answered</div> : null}</div>;
}

function CoworkGenericStandaloneTool(props: ToolProps) {
  const displayName = toolDisplayName(props.block.name ?? "Tool");
  return (
    <CoworkOfficialToolCell
      icon={<CoworkToolFallbackIcon name={displayName} />}
      isError={props.toolResult?.is_error === true}
      isFirstBlockOfMessage={props.isFirstBlockOfMessage}
      isLastBlockOfMessage={props.isLastBlockOfMessage}
      isStreaming={props.isStreaming}
      text={stringValue(props.block.message) ?? displayName}
    >
      <CoworkOfficialToolBody input={props.block.input} result={resultText(props.toolResult)} resultIsError={props.toolResult?.is_error === true} />
    </CoworkOfficialToolCell>
  );
}

function ToolDetailSection({ children, error, expanded, label, onExpand }: { children: ReactNode; error?: boolean; expanded: boolean; label: string; onExpand: () => void }) {
  return (
    <div className="mx-2.5 mt-1 mb-2">
      {!expanded ? <button className={`flex items-center transition-colors cursor-pointer ${error ? "text-danger-000 hover:text-danger-100" : "text-text-500 hover:text-text-200"}`} onClick={onExpand} type="button"><span className="rounded px-1.5 py-0.5 text-xs font-mono !text-inherit">{label}</span></button> : null}
      {expanded ? <div className="overflow-hidden"><div className="rounded-lg border-[0.5px] border-border-300 bg-bg-000 cursor-pointer"><div className="p-2 flex flex-col gap-2 max-h-[200px] overflow-y-auto [&_pre]:!text-xs [&_code]:!text-xs">{children}</div></div></div> : null}
    </div>
  );
}

function ToolCode({ code, error, title }: { code: string; error?: boolean; title?: string }) {
  return <div className={`rounded-lg p-3 ${error ? "bg-danger-900 text-danger-000" : "bg-bg-100 text-text-300"}`}>{title ? <div className="mb-2 text-xs text-text-500">{title}</div> : null}<pre className="m-0 whitespace-pre-wrap break-all"><code>{code}</code></pre></div>;
}

function normalizeToolName(name: string) { const index = name.lastIndexOf("__"); return (index >= 0 ? name.slice(index + 2) : name).replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase(); }
function toolDisplayName(name: string) { const raw = name.split("__").at(-1) ?? name.split(":").at(-1) ?? name; return raw.split("_").map((part, index) => index ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" "); }
function toolIcon(name: string) { if (name.includes("search")) return "Search"; if (name.includes("task")) return "Agent"; if (name.includes("edit")) return "Edit"; if (name.includes("read")) return "BookText"; return "Toolbox"; }
function resultText(result?: CoworkContentBlock) { return result ? toolResultText(result.content) : ""; }
function basename(path: string) { return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path; }
function fileAction(name: string) { if (["read", "open_file", "view", "grep", "glob"].includes(name)) return "read"; if (["write", "create_file"].includes(name)) return "create"; if (name === "present_files") return "present"; return "edit"; }
function fileActionText(action: string, file: string, streaming: boolean, error: boolean) { const verb = action === "read" ? streaming ? "Reading" : "Read" : action === "create" ? streaming ? "Creating" : "Created" : action === "present" ? streaming ? "Presenting file(s)..." : "Presented file(s)" : streaming ? "Editing" : error ? "Failed to edit" : "Edited"; return file ? `${verb} ${file}` : verb; }
function webResultCount(result?: CoworkContentBlock) { if (!result) return undefined; try { const parsed = JSON.parse(resultText(result)); return Array.isArray(parsed) ? parsed.length : undefined; } catch { return undefined; } }
function safeJson(value: unknown) { try { const text = JSON.stringify(value, null, 2); return text === "{}" ? "" : text; } catch { return String(value ?? ""); } }
