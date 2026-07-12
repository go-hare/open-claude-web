import { memo, type ReactNode } from "react";
import { CoworkOfficialFileGlyph } from "../../ui/CoworkOfficialFileGlyph";
import { CoworkEditGlyph, CoworkMemoryGlyph, CoworkSkillGlyph } from "../../ui/CoworkOfficialGlyphs";
import { asRecord, stringValue } from "../recordUtils";
import type { CoworkChatMessage, CoworkContentBlock } from "./coworkMessageTypes";
import { CoworkAskUserQuestionWidget } from "./CoworkAskUserQuestionWidget";
import { CoworkBashToolCell } from "./CoworkBashToolCell";
import { CoworkFileEditToolRow } from "./CoworkFileEditToolRow";
import { CoworkFileToolCell } from "./CoworkFileToolCell";
import { CoworkGenericToolCell } from "./CoworkGenericToolCell";
import { CoworkToolRow } from "./CoworkToolRow";
import { CoworkConnectorSuggestion, CoworkPluginSuggestion, CoworkSkillSuggestion } from "./CoworkOfficialSuggestions";
import { hasPendingCoworkToolPermission, useCoworkMessageContext } from "./CoworkMessageContext";
import { CoworkTaskToolCell } from "./CoworkTaskToolCell";
import { CoworkSaveSkillResultCard, CoworkScheduledTaskResultCard } from "./CoworkStandaloneResultCards";
import { CoworkToolCodeBlock } from "./CoworkToolPresentation";
import { CoworkWebFetchToolCell, CoworkWebSearchToolCell } from "./CoworkWebToolCells";
import { basename, coworkCreateFileBltTarget, coworkFileAction, coworkFileDisplayName, coworkFileStatusText, isMemoryFileWithoutMarkdown, isMemoryPath } from "./coworkFileToolModel";
import { coworkToolActivityLabel } from "./coworkToolActivityLabel";
import { useCoworkTranscriptActions } from "./CoworkTranscriptActions";

export type CoworkOfficialToolRendererProps = {
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

const fileTools = new Set(["create_file", "open_file", "update_file", "view", "read", "write", "edit", "str_replace", "str_replace_editor"]);

export const CoworkOfficialToolRenderer = memo(function CoworkOfficialToolRenderer(props: CoworkOfficialToolRendererProps) {
  // Local stand-in for official O5e ToolUse: permission null + renderToolUseCell dispatch.
  // Official O5e only nulls pending permission (except AskUserQuestion); cell choice is renderToolUseCell.
  const { toolPermissionRequests } = useCoworkMessageContext();
  const normalizedName = normalizeToolName(props.block.name ?? "");
  if (hasPendingCoworkToolPermission(toolPermissionRequests, props.block.id)) return null;
  // Widget / rich tools render outside the timeline group (content segment, standalone=true).
  // Keep AskUserQuestion widget even if a caller forgets standalone (official content path).
  if (props.block.name === "AskUserQuestion") {
    return <CoworkAskUserQuestionWidget input={asRecord(props.block.input)} result={props.toolResult} />;
  }
  if (props.standalone) return <CoworkStandaloneTool {...props} normalizedName={normalizedName} />;
  if (normalizedName === "web_search") return <CoworkWebSearchToolCell {...groupProps(props)} input={asRecord(props.block.input)} toolResult={props.toolResult} />;
  if (normalizedName === "web_fetch") return <CoworkWebFetchToolCell {...groupProps(props)} input={asRecord(props.block.input)} toolResult={props.toolResult} />;
  if (normalizedName === "task") return <CoworkTaskTool {...props} />;
  if (normalizedName === "bash" || normalizedName === "bash_tool") return <CoworkBashToolCell {...groupProps(props)} input={asRecord(props.block.input)} toolResult={props.toolResult} />;
  if (isFileTool(normalizedName, props.block.input)) return <CoworkFileTool {...props} normalizedName={normalizedName} />;
  if (normalizedName === "present_files" || normalizedName === "send_user_file") return <CoworkPresentFilesTool {...props} normalizedName={normalizedName} />;
  return <CoworkGenericTool {...props} normalizedName={normalizedName} />;
});

function CoworkFileTool(props: CoworkOfficialToolRendererProps & { normalizedName: string }) {
  const input = asRecord(props.block.input);
  const path = stringValue(input.file_path) ?? stringValue(input.path) ?? "";
  const action = coworkFileAction(props.normalizedName, path);
  const complete = action === "read" || action === "skill" ? Boolean(props.toolResult) || !props.isStreaming : Boolean(props.toolResult);
  const description = stringValue(input.description);
  const fileText = stringValue(input.content) ?? stringValue(input.file_text) ?? "";
  const isError = props.toolResult?.is_error === true;
  const actions = useCoworkTranscriptActions();
  // Official Wlt A: !is_error && path && message.uuid (P5e share gate N/A for local).
  // Klt/present and read still open on success; memory non-md has no click.
  const handleClick = action !== "edit" && isMemoryFileWithoutMarkdown(path)
    ? undefined
    : path && props.message.uuid && !(action === "create" && isError)
      ? () => actions?.openFile({
        content: fileText || undefined,
        messageId: props.message.uuid,
        path,
        toolType: props.normalizedName === "write" || action === "create" ? "create_file" : props.normalizedName,
      })
      : undefined;
  const displayText = coworkFileStatusText({ action, description, isError, normalizedName: props.normalizedName, path, streaming: props.isStreaming });
  if (action === "edit") return <CoworkFileEdit {...props} description={description} handleClick={handleClick} input={input} path={path} />;
  return (
    <CoworkFileToolCell
      {...groupProps(props)}
      action={action}
      description={description}
      displayFileName={
        action === "create"
          ? (coworkFileDisplayName(path) || coworkCreateFileBltTarget(path) || undefined)
          : (coworkFileDisplayName(path) || basename(path) || undefined)
      }
      displayText={displayText}
      fileText={fileText}
      handleClick={handleClick}
      icon={<div className="text-text-500">{fileGlyph(path)}</div>}
      isComplete={complete}
      isError={isError}
      path={path}
    />
  );
}

function CoworkFileEdit(props: CoworkOfficialToolRendererProps & { description?: string; handleClick?: () => void; input: Record<string, unknown>; path: string }) {
  const isError = props.toolResult?.is_error === true;
  const complete = Boolean(props.toolResult);
  const displayName = coworkFileDisplayName(props.path);
  const text = coworkFileStatusText({ action: "edit", description: props.description, isError, normalizedName: "edit", path: props.path, streaming: props.isStreaming });
  return (
    <CoworkFileEditToolRow
      {...groupProps(props)}
      addedLines={lineCount(stringValue(props.input.new_str))}
      fileName={displayName || basename(props.path) || undefined}
      handleClick={props.handleClick}
      icon={isMemoryPath(props.path) ? <CoworkMemoryGlyph className="text-text-500" size={16} /> : <CoworkEditGlyph className="text-text-500" size={16} />}
      isStreaming={props.isStreaming && !complete}
      removedLines={lineCount(stringValue(props.input.old_str))}
      text={text}
    />
  );
}

function CoworkGenericTool(props: CoworkOfficialToolRendererProps & { normalizedName: string }) {
  const input = asRecord(props.block.input);
  const request = serializeInput(props.block.input);
  const resultBlocks = Array.isArray(props.toolResult?.content) ? props.toolResult.content : [];
  const displayName = stringValue(props.block.message) && props.block.message !== props.block.name
    ? String(props.block.message)
    : coworkToolActivityLabel(props.block.name ?? props.normalizedName, input);
  return (
    <CoworkGenericToolCell
      {...groupProps(props)}
      iconName={stringValue(props.block.icon_name)}
      integrationIconUrl={stringValue(props.block.integration_icon_url)}
      integrationName={stringValue(props.block.integration_name)}
      isError={props.toolResult?.is_error === true}
      renderRequest={request ? () => <CoworkToolCodeBlock className="!bg-bg-100" code={request} language="json" title="Request" /> : undefined}
      renderResult={request || resultBlocks.length > 0 ? () => <GenericToolResult blocks={resultBlocks} isError={props.toolResult?.is_error === true} request={request} /> : undefined}
      toolDisplayName={displayName}
      toolName={props.block.name ?? props.normalizedName}
      toolResult={props.toolResult}
    />
  );
}

function GenericToolResult({ blocks, isError, request }: { blocks: CoworkContentBlock[]; isError: boolean; request: string }) {
  return (
    <>
      {request ? <CoworkToolCodeBlock className="!bg-bg-100" code={request} language="json" title="Request" /> : null}
      {blocks.map((block, index) => <GenericResultBlock block={block} index={index} isError={isError} key={index} />)}
    </>
  );
}

function GenericResultBlock({ block, index, isError }: { block: CoworkContentBlock; index: number; isError: boolean }) {
  if (block.type === "text") return <CoworkToolCodeBlock className={isError ? "!bg-danger-900" : "!bg-bg-100"} code={block.text ?? ""} error={isError} language="json" title={isError ? "Error" : "Response"} />;
  if (block.type !== "image") return null;
  const source = asRecord(block.source);
  const data = stringValue(source.data);
  const mediaType = stringValue(source.media_type) ?? "image/png";
  const src = stringValue(block.url) ?? (data ? `data:${mediaType};base64,${data}` : undefined);
  return src ? <img alt="Tool result" className="max-w-md max-h-md h-auto rounded-md" key={index} src={src} /> : null;
}

function CoworkTaskTool(props: CoworkOfficialToolRendererProps) {
  const description = stringValue(asRecord(props.block.input).description) ?? "Running subagent";
  const childBlocks = props.message.content.filter((block) => block._isSubagentBlock && block._parentToolUseId === props.block.id);
  const childTools = childBlocks.filter((block) => block.type === "tool_use");
  return (
    <CoworkTaskToolCell
      {...groupProps(props)}
      description={description}
      isComplete={Boolean(props.toolResult)}
      renderSubagentBlock={(block, _index, flags) => renderSubagentBlock(block, childBlocks, props, flags)}
      subagentBlocks={childTools}
    />
  );
}

function renderSubagentBlock(block: CoworkContentBlock, blocks: CoworkContentBlock[], parent: CoworkOfficialToolRendererProps, flags: { isFirstItem: boolean; isLastItem: boolean }) {
  const result = blocks.find((candidate) => candidate.type === "tool_result" && candidate.tool_use_id === block.id);
  return <CoworkOfficialToolRenderer block={block} isFirstItem={flags.isFirstItem} isLastItem={flags.isLastItem} isStreaming={parent.isStreaming && !result} message={parent.message} toolResult={result} />;
}

function CoworkPresentFilesTool(props: CoworkOfficialToolRendererProps & { normalizedName: string }) {
  // Official Klt (index-BELzQL5P.pretty.js): path from toolResult.content local_resource.file_path → SELECT_FILE.
  const actions = useCoworkTranscriptActions();
  const path = presentFilesPath(props.toolResult);
  const complete = Boolean(props.toolResult) || !props.isStreaming;
  const send = props.normalizedName === "send_user_file";
  const text = stringValue(props.toolResult?.message) ?? (send ? complete ? "Sent file(s)" : "Sending file…" : complete ? "Presented file(s)" : "Presenting file(s)...");
  const handleClick = path
    ? () => actions?.openFile({
      messageId: props.message.uuid,
      path,
      toolType: send ? "send_user_file" : "present_files",
    })
    : undefined;
  return (
    <CoworkToolRow
      {...groupProps(props)}
      handleClick={handleClick}
      hideCaret
      icon={<div className="text-text-500">{fileGlyph(path)}</div>}
      isStreaming={props.isStreaming}
      text={<span className="truncate">{text}</span>}
    />
  );
}

/** Official Klt: first local_resource.file_path in tool_result content. */
export function presentFilesPath(toolResult?: CoworkContentBlock) {
  const blocks = Array.isArray(toolResult?.content) ? toolResult.content : [];
  for (const block of blocks) {
    const record = asRecord(block);
    if (record.type !== "local_resource") continue;
    const path = stringValue(record.file_path);
    if (path) return path;
  }
  return "";
}

function CoworkStandaloneTool(props: CoworkOfficialToolRendererProps & { normalizedName: string }): ReactNode {
  const lower = (props.block.name ?? "").toLowerCase();
  if (lower.includes("create_scheduled_task") && props.toolResult?.is_error !== true) return <CoworkScheduledTaskResultCard block={props.block} />;
  if (lower.includes("save_skill") && props.toolResult?.is_error !== true) return <CoworkSaveSkillResultCard block={props.block} />;
  if (lower.includes("list_connectors") || lower.includes("suggest_connectors")) return <CoworkConnectorSuggestion isStreaming={props.isStreaming} result={props.toolResult} source={lower.includes("list_connectors") ? "list_connectors" : "suggest_connectors"} />;
  if (lower.includes("list_plugins") || lower.includes("suggest_plugin_install")) return <CoworkPluginSuggestion result={props.toolResult} source={lower.includes("list_plugins") ? "list_plugins" : "suggest_plugin_install"} />;
  if (lower.includes("list_skills") || lower.includes("suggest_skills")) return <CoworkSkillSuggestion result={props.toolResult} source={lower.includes("suggest_skills") ? "suggest_skills" : "list_skills"} />;
  return <CoworkGenericTool {...props} />;
}

function groupProps(props: CoworkOfficialToolRendererProps) {
  return {
    isFirstBlockOfMessage: props.isFirstBlockOfMessage,
    isFirstItemInGroup: props.isFirstItem,
    isLastBlockOfMessage: props.isLastBlockOfMessage,
    isLastItemInGroup: props.isLastItem,
    isStreaming: props.isStreaming,
    renderMode: props.standalone ? "standard" as const : "timeline" as const,
  };
}

function isFileTool(name: string, inputValue: unknown) {
  if (fileTools.has(name)) return true;
  if (name !== "grep" && name !== "glob") return false;
  return isMemoryPath(stringValue(asRecord(inputValue).path) ?? "");
}

function fileGlyph(path: string) {
  if (isMemoryPath(path)) return <CoworkMemoryGlyph size={16} />;
  if (path.includes("SKILL.md")) return <CoworkSkillGlyph size={16} />;
  return <CoworkOfficialFileGlyph path={path} size={16} />;
}

function lineCount(value?: string) {
  return value ? value.split("\n").length : 0;
}

function normalizeToolName(name: string) {
  const index = name.lastIndexOf("__");
  return (index >= 0 ? name.slice(index + 2) : name).replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function serializeInput(value: unknown) {
  if (value === undefined) return "";
  try {
    const text = JSON.stringify(value, null, 2);
    return text === "{}" ? "" : text.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  } catch {
    return String(value);
  }
}
