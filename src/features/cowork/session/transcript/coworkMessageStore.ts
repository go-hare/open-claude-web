import type { CoworkStreamSnapshot } from "../stream/coworkStreamTypes";
import type { CoworkRawMessage } from "../types";
import { asRecord, stringValue } from "../recordUtils";
import {
  apiMessageId,
  localCommandOutput,
  messageContent,
  messageUuid,
  normalizeHumanMessage,
  normalizeResultContent,
  normalizeSubagentContent,
  parseHumanContent,
} from "./coworkMessageStoreHelpers";
import { collectAnswers, collectResultMetadata, collectToolResults, collectToolSummaries } from "./coworkMessageStoreIndexes";
import { mergeCoworkStreamedSdkMessage, toCoworkSdkMessage } from "./coworkMessageStreamMerge";
import { markCoworkMcpApp, syntheticCoworkReconnectBlocks } from "./coworkMcpMessageNormalization";
import type { CoworkChatMessage, CoworkContentBlock, CoworkMessageStoreOptions } from "./coworkMessageTypes";

const emptyResources = { attachments: [] as unknown[], files: [] as unknown[], files_v2: [], sync_sources: [] as unknown[] };
const noResponseRequested = "No response requested.";

export function buildCoworkChatMessages(
  messages: CoworkRawMessage[],
  streamSnapshot: CoworkStreamSnapshot,
  options: CoworkMessageStoreOptions = {},
) {
  const sdkMessages = messages.map(toCoworkSdkMessage);
  return normalizeSdkMessages(streamSnapshot ? mergeCoworkStreamedSdkMessage(sdkMessages, streamSnapshot) : sdkMessages, options);
}

export function normalizeSdkMessages(messages: Record<string, unknown>[], options: CoworkMessageStoreOptions = {}) {
  const chatMessages: CoworkChatMessage[] = [];
  const subagentMessageById: Record<string, CoworkChatMessage> = {};
  const toolResults = collectToolResults(messages);
  const answers = collectAnswers(messages);
  const resultMetadata = collectResultMetadata(messages);
  const toolSummaries = collectToolSummaries(messages);
  const reconnectServerUuids = new Set<string>();
  let processedCount = 0;

  for (const [index, message] of messages.entries()) {
    processedCount = index + 1;
    if (message.type === "user" && stringValue(message.parent_tool_use_id)) {
      appendSubagentUser(message, subagentMessageById);
      continue;
    }
    if (message.type === "user") {
      appendHuman(chatMessages, message, index, options.pluginsEnabled ?? true);
      continue;
    }
    if (message.type !== "assistant") continue;
    if (startsSubagent(message)) appendSubagentAssistant(chatMessages, message, index, subagentMessageById, toolResults, toolSummaries);
    else appendAssistant(chatMessages, message, index, subagentMessageById, toolResults, answers, resultMetadata, toolSummaries, options, reconnectServerUuids);
  }

  for (const [index, pending] of (options.pendingMessages ?? []).entries()) {
    const message = toCoworkSdkMessage(pending);
    const parsed = parseHumanContent(message);
    if (parsed.content.length === 0) continue;
    chatMessages.push(createChatMessage(message, index + processedCount, "human", parsed.content, {
      files_v2: parsed.files,
      pending: true,
      sync_sources: parsed.syncSources,
    }));
  }
  return chatMessages;
}

function appendHuman(output: CoworkChatMessage[], message: Record<string, unknown>, index: number, pluginsEnabled: boolean) {
  const commandOutput = localCommandOutput(message);
  if (commandOutput !== undefined) {
    output.push(createChatMessage(message, index, "assistant", [{ type: "text", text: commandOutput }]));
    return;
  }
  const normalized = normalizeHumanMessage(message, pluginsEnabled);
  if (!normalized) return;
  output.push(createChatMessage(message, index, "human", normalized.content, {
    files_v2: normalized.files,
    sync_sources: normalized.syncSources,
  }));
}

function appendSubagentUser(message: Record<string, unknown>, parents: Record<string, CoworkChatMessage>) {
  const parentId = stringValue(message.parent_tool_use_id);
  const parent = parentId ? parents[parentId] : undefined;
  if (!parent || !parentId) return;
  for (const block of normalizeSubagentContent(message)) parent.content.push(markSubagentBlock(block, parentId));
}

function appendSubagentAssistant(
  output: CoworkChatMessage[],
  message: Record<string, unknown>,
  index: number,
  parents: Record<string, CoworkChatMessage>,
  results: Map<string, CoworkContentBlock>,
  summaries: Map<string, CoworkContentBlock>,
) {
  const blocks = interleaveResults(messageContent(message), results, summaries);
  const parentId = stringValue(message.parent_tool_use_id);
  const parent = parentId ? parents[parentId] : undefined;
  if (parent && parentId) {
    appendApiMessageId(parent, message);
    blocks.forEach((block) => parent.content.push(markSubagentBlock(block, parentId)));
    registerSubagentParent(message, parent, parents);
    return;
  }
  const previous = output.at(-1);
  const target = previous?.sender === "assistant"
    ? previous
    : createChatMessage(message, index, "assistant", []);
  if (target !== previous) output.push(target);
  target.content.push(...blocks);
  appendApiMessageId(target, message);
  registerSubagentParent(message, target, parents);
}

function appendAssistant(
  output: CoworkChatMessage[],
  message: Record<string, unknown>,
  index: number,
  parents: Record<string, CoworkChatMessage>,
  results: Map<string, CoworkContentBlock>,
  answers: Map<string, unknown>,
  resultMetadata: Map<string, Record<string, unknown>>,
  summaries: Map<string, CoworkContentBlock>,
  options: CoworkMessageStoreOptions,
  reconnectServerUuids: Set<string>,
) {
  const parentId = stringValue(message.parent_tool_use_id);
  const parent = parentId ? parents[parentId] : undefined;
  if (parent && parentId) {
    appendApiMessageId(parent, message);
    messageContent(message).forEach((block) => parent.content.push(markSubagentBlock(block, parentId)));
    return;
  }
  const resultByToolId = assistantResults(message, results, resultMetadata);
  const blocks = normalizeAssistantBlocks(
    messageContent(message),
    resultByToolId,
    answers,
    summaries,
    options,
    reconnectServerUuids,
    message.receivedStreamAt !== undefined,
  );
  if (blocks.length === 0) return;
  const previous = output.at(-1);
  const previousHasSubagent = previous?.content.some(isTaskOrAgentTool) ?? false;
  if (previous?.sender === "assistant" && !previousHasSubagent) {
    previous.content.push(...blocks);
    appendApiMessageId(previous, message);
    return;
  }
  const next = createChatMessage(message, index, "assistant", blocks);
  appendApiMessageId(next, message);
  output.push(next);
}

function normalizeAssistantBlocks(
  blocks: CoworkContentBlock[],
  results: Map<string, CoworkContentBlock>,
  answers: Map<string, unknown>,
  summaries: Map<string, CoworkContentBlock>,
  options: CoworkMessageStoreOptions,
  reconnectServerUuids: Set<string>,
  isLive: boolean,
) {
  const output: CoworkContentBlock[] = [];
  for (const block of blocks) {
    if (block.type !== "tool_use") {
      if (block.type !== "text" || block.text !== noResponseRequested) output.push(block);
      continue;
    }
    if (block.name === "mcp__cowork__mark_task_complete") continue;
    if (block.name === "ToolSearch" && asRecord(block.input).query === "select:mcp__cowork__mark_task_complete") continue;
    const tool = normalizeToolUse(block, answers, options.lookupMcpTool);
    output.push(tool);
    if (!block.id) continue;
    const result = normalizeSpecialResult(results.get(block.id), block.name);
    if (result) output.push(result);
    output.push(...syntheticCoworkReconnectBlocks(block, result, options, reconnectServerUuids, isLive));
    const summary = summaries.get(block.id);
    if (summary) output.push(summary);
  }
  return output;
}

function assistantResults(message: Record<string, unknown>, results: Map<string, CoworkContentBlock>, metadata: Map<string, Record<string, unknown>>) {
  const output = new Map<string, CoworkContentBlock>();
  for (const block of messageContent(message)) {
    if (block.type !== "tool_use" || !block.id) continue;
    const result = results.get(block.id);
    if (!result) continue;
    output.set(block.id, { ...result, content: normalizeResultContent(result.content), name: block.name, ...metadata.get(block.id) });
  }
  return output;
}

function createChatMessage(message: Record<string, unknown>, index: number, sender: "assistant" | "human", content: CoworkContentBlock[], extra: Partial<CoworkChatMessage> = {}): CoworkChatMessage {
  const payload = asRecord(message.message);
  const metadata = asRecord(payload.metadata ?? message.metadata);
  return {
    index,
    content,
    sender,
    uuid: messageUuid(message, `message-${index}`),
    created_at: "",
    metadata: Object.keys(metadata).length ? metadata : undefined,
    parent_message_uuid: stringValue(payload.parent_message_uuid) ?? stringValue(message.parent_message_uuid),
    stop_details: payload.stop_details ?? message.stop_details,
    stop_reason: stringValue(payload.stop_reason) ?? stringValue(message.stop_reason),
    updated_at: stringValue(payload.updated_at) ?? stringValue(message.updated_at),
    ...emptyResources,
    ...extra,
  };
}

function markSubagentBlock(block: CoworkContentBlock, parentId: string) {
  return { ...block, _isSubagentBlock: true, _parentToolUseId: parentId };
}

function appendApiMessageId(target: CoworkChatMessage, message: Record<string, unknown>) {
  const id = apiMessageId(message);
  if (id) (target.apiMessageIds ??= []).push(id);
}

function registerSubagentParent(message: Record<string, unknown>, parent: CoworkChatMessage, parents: Record<string, CoworkChatMessage>) {
  const first = messageContent(message)[0];
  if (first?.type === "tool_use" && first.id && !(first.id in parents)) parents[first.id] = parent;
}

function startsSubagent(message: Record<string, unknown>) {
  return isTaskOrAgentTool(messageContent(message)[0]);
}

function isTaskOrAgentTool(block?: CoworkContentBlock) {
  return block?.type === "tool_use" && (block.name === "Task" || block.name === "Agent");
}

function interleaveResults(blocks: CoworkContentBlock[], results: Map<string, CoworkContentBlock>, summaries: Map<string, CoworkContentBlock>) {
  return blocks.flatMap((block) => block.type === "tool_use" && block.id
    ? [block, results.get(block.id), summaries.get(block.id)].filter((item): item is CoworkContentBlock => Boolean(item))
    : [block]);
}

function normalizeToolUse(
  block: CoworkContentBlock,
  answers: Map<string, unknown>,
  lookupMcpTool?: CoworkMessageStoreOptions["lookupMcpTool"],
) {
  if (block.name === "mcp__cowork__present_files") return { ...block, name: "present_files" };
  if (block.name === "mcp__cowork__launch_code_session") return { ...block, name: "launch_code_session" };
  if (block.name === "AskUserQuestion" && block.id && answers.has(block.id)) {
    return { ...block, input: { ...asRecord(block.input), answers: answers.get(block.id) } };
  }
  return markCoworkMcpApp(block, lookupMcpTool);
}

function normalizeSpecialResult(result: CoworkContentBlock | undefined, toolName?: string) {
  if (!result) return undefined;
  if (toolName === "mcp__cowork__present_files") {
    if (result.is_error) return { ...result, name: "present_files" };
    const resources = normalizeResultContent(result.content)
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => ({ type: "local_resource", file_path: block.text, name: block.text?.split(/[\\/]/).at(-1) }));
    return { ...result, name: "present_files", content: resources };
  }
  return toolName === "mcp__cowork__launch_code_session" ? { ...result, name: "launch_code_session" } : result;
}
