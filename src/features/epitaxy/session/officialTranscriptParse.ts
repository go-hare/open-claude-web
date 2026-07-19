/**
 * Official eke/ake/rke transcript parse (c11959232).
 * Pure TS — types + parseOfficialTranscriptEntries + stream snapshot merge helpers.
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import type { ChatMessage, CodeStats, ContextUsage } from "../../../adapters/desktopBridge/types";
import { parseEpitaxyUploadedFilesText, type EpitaxyUploadedFile } from "../epitaxyUploadedFiles";
import type { OfficialStreamSnapshot } from "../officialStreamSmoother";
import { mergeOfficialStreamOntoTranscript } from "./officialStreamTranscriptMerge";
import { isOfficialTaskEvent, type OfficialTaskStatus } from "./officialTasksAndPlan";


function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  if (!value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed);
  } catch {
    return null;
  }
}

export function rawMessageContent(raw: Record<string, unknown>) {
  const message = asRecord(raw.message);
  const content = raw.content ?? message.content;
  return Array.isArray(content) ? content : [];
}

export function rawUserText(raw: Record<string, unknown>) {
  const message = asRecord(raw.message);
  const content = raw.content ?? message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((item) => stringValue(asRecord(item).text) ?? "").join("\n");
  }
  return "";
}

export function toolResultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(toolResultText).filter(Boolean).join("\n");
  const record = asRecord(content);
  return stringValue(record.text) ?? stringValue(record.content) ?? (Object.keys(record).length ? JSON.stringify(record, null, 2) : "");
}

export type TranscriptEntry = {
  author: "assistant" | "user";
  id: string;
  /** Official Hb isQueued — opacity-50 + Remove X, no Vv actions. */
  isQueued?: boolean;
  items: TranscriptEntryItem[];
  timestamp?: string;
};

/** Official group-level task event placement (`at` = tool index in the group). */
export type OfficialToolGroupTaskEvent = {
  at: number;
  event: {
    description?: string;
    id: string;
    kind: "task_event";
    status: OfficialTaskStatus;
    summary?: string;
    taskId: string;
    taskType?: string;
  };
};

export type TranscriptEntryItem =
  | { id: string; kind: "bash"; command?: string; error?: string; output?: string }
  /** Official eke nke / $we mark_chapter → chapter (Lh). */
  | { id: string; kind: "chapter"; summary?: string; title: string }
  /** Official eke local_command dCe → context (Ku). */
  | { id: string; kind: "context"; usage: ContextUsage }
  | { id: string; kind: "error"; code?: string; text: string }
  | { id: string; kind: "event"; content: string; eventType?: string }
  /** Official Ike: attachment file chips (Hb `file`). */
  | { fileName: string; id: string; kind: "file" }
  /** Official Ike: image content blocks (Hb `image`). */
  | { data: string; id: string; kind: "image"; mimeType: string }
  /** Official Ike/Cke: cross-session / teammate / channel peer messages (Hb `peer`). */
  | {
    content: string;
    id: string;
    kind: "peer";
    origin: {
      from?: string;
      kind: "channel" | "coordinator" | "peer" | "teammate";
      name?: string;
      server?: string;
    };
  }
  /** Local bridge file chips kept for composer uploads (rendered via Hb file path). */
  | { file: EpitaxyUploadedFile; id: string; kind: "uploaded-file" }
  /** Official eke local_command swe → stats ($x / CodeStatsCard). */
  | { id: string; kind: "stats"; stats: CodeStats | null }
  | { description?: string; id: string; kind: "task_event"; status: OfficialTaskStatus; summary?: string; taskId: string; taskType?: string }
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "thinking"; text: string }
  | {
    id: string;
    kind: "tools";
    /** Official iv taskEvents: chips interleaved at tool indices inside a default group. */
    taskEvents?: OfficialToolGroupTaskEvent[];
    tools: TranscriptToolUse[];
  }
  /** Official eke result→turn_error (index-BELzQL5P) / rv card (c11959232). */
  | { errors: string[]; id: string; kind: "turn_error"; subtype?: string };

/** Official $we chapter tool name (index-BELzQL5P). */
const OFFICIAL_CHAPTER_TOOL_NAME = "mcp__ccd_session__mark_chapter";

/**
 * Official Vwe: tools that do not absorb task_events into their group
 * (session UI interrupts — always push task_event as its own row).
 */
const OFFICIAL_NON_ABSORB_TOOL_NAMES = new Set([
  "AskUserQuestion",
  "ExitPlanMode",
  "SendUserMessage",
  "SendUserFile",
]);

export type TranscriptToolUse = {
  id: string;
  input: Record<string, unknown>;
  isError?: boolean;
  name: string;
  output?: string;
  /** Official Zg outputImages — rendered inside collapse when inGroup, outside when standalone. */
  outputImages?: Array<{ data?: string; media_type?: string; mimeType?: string; url?: string }>;
  /** Official Kwe: thinking text buffered before a tool group is flushed into tools. */
  precedingThinking?: string[];
  status: "awaiting_approval" | "completed" | "error" | "running";
  subagentActivity?: {
    latestToolName?: string;
    model?: string;
    toolCallCount?: number;
  };
};

/**
 * Official Xwe cache (index-BELzQL5P): incremental eke when the durable message array only
 * grew by appending and streamingMessageId is unchanged. Full reparse every partial was the
 * stutter source when multi-emit assistants landed.
 */
type OfficialEkeCache = {
  entries: TranscriptEntry[];
  firstMsg: ChatMessage | undefined;
  inputLen: number;
  lastMsg: ChatMessage | undefined;
  streamingMessageId: string | null | undefined;
};
const officialEkeCacheBySession = new Map<string, OfficialEkeCache>();

export function clearOfficialEkeCache(sessionId?: string) {
  if (!sessionId) {
    officialEkeCacheBySession.clear();
    return;
  }
  officialEkeCacheBySession.delete(sessionId);
}

/**
 * Official Xwe(sessionId, messages, streamingMessageId) → eke with prefix cache.
 * When messages[0..inputLen) are the same object refs and streamingMessageId matches,
 * only parse the new tail. If length is unchanged, return a shallow copy of cached entries.
 */
function assistantAnthropicIdFromChat(message: ChatMessage): string | undefined {
  if (message.role !== "assistant") return undefined;
  const raw = asRecord(message.raw);
  if (stringValue(raw.type) && stringValue(raw.type) !== "assistant") return undefined;
  const nested = asRecord(raw.message);
  return stringValue(nested.id) ?? stringValue(raw.message_id);
}

export function parseOfficialTranscriptEntriesCached(
  sessionId: string | undefined,
  messages: ChatMessage[],
  streamingMessageId?: string | null,
): TranscriptEntry[] {
  if (!sessionId) return parseOfficialTranscriptEntries(messages, streamingMessageId);
  const cached = officialEkeCacheBySession.get(sessionId);
  if (
    cached
    && cached.inputLen > 0
    && messages.length >= cached.inputLen
    && messages[0] === cached.firstMsg
    && messages[cached.inputLen - 1] === cached.lastMsg
    && streamingMessageId === cached.streamingMessageId
  ) {
    if (messages.length === cached.inputLen) {
      return cached.entries.slice();
    }
    // Official eke: if (t && e === t) continue — live Anthropic message.id is not painted.
    // Multi-emit text partials only grow durable T while Va owns typewriter; Xa is unchanged.
    // Skip full reparse for pure live-suppressed tails (this was the stutter).
    if (streamingMessageId) {
      const tail = messages.slice(cached.inputLen);
      // Text-only live partials are suppressed by eke (Va paints). tool_use / user / system
      // tails still need ake/rke so pendingTools object refs stay correct.
      const onlyTextLiveSuppressed = tail.every((message) => {
        const anthropicId = assistantAnthropicIdFromChat(message);
        if (!anthropicId || anthropicId !== streamingMessageId) return false;
        const raw = asRecord(message.raw);
        const nested = asRecord(raw.message);
        const content = nested.content ?? raw.content;
        if (!Array.isArray(content)) return true;
        return !content.some((block) => stringValue(asRecord(block).type) === "tool_use");
      });
      if (onlyTextLiveSuppressed) {
        officialEkeCacheBySession.set(sessionId, {
          ...cached,
          inputLen: messages.length,
          lastMsg: messages[messages.length - 1],
        });
        return cached.entries.slice();
      }
    }
  }
  const entries = parseOfficialTranscriptEntries(messages, streamingMessageId);
  officialEkeCacheBySession.set(sessionId, {
    entries,
    firstMsg: messages[0],
    inputLen: messages.length,
    lastMsg: messages[messages.length - 1],
    streamingMessageId,
  });
  return entries.slice();
}

/**
 * Official eke (index-BELzQL5P) → durable transcript entries.
 * Critical control flow (must not invent):
 * 1. ake(content, messageId, pendingTools) ALWAYS runs for assistant — registers tool
 *    object refs into pendingTools before any streaming skip.
 * 2. if message.id === streamingMessageId: skip pushing the entry (Va owns it) but keep
 *    tools in pendingTools so later rke(user tool_result) mutates the same objects.
 * 3. user messages: rke(content, pendingTools, toolUseResult) mutates tool.status/output
 *    by reference, then optionally push user text/bash via Ike-shaped parse.
 * 4. parent_tool_use_id: uke(subagent activity) only — do not push as main transcript.
 * 5. Official f() merges consecutive assistant rows — multi-emit same Anthropic id becomes
 *    one bubble after stream ends (no first-wins permanent skip).
 */
export function parseOfficialTranscriptEntries(messages: ChatMessage[], streamingMessageId?: string | null): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  const pendingTools = new Map<string, TranscriptToolUse>();
  let lastTimestamp: string | undefined;

  // Official f(): merge consecutive assistant items onto the last assistant entry.
  const pushAuthorItems = (
    author: "assistant" | "user",
    items: TranscriptEntryItem[],
    entryId: string,
    synthetic?: boolean,
  ) => {
    if (items.length === 0) return;
    const previous = entries.at(-1);
    if (previous && previous.author === author && author === "assistant") {
      const nextItems = items.slice();
      const first = nextItems[0];
      if (first?.kind === "tools") {
        // Official: peel trailing thinking into precedingThinking of first tool group.
        let lastItem = previous.items[previous.items.length - 1];
        while (lastItem?.kind === "thinking") {
          previous.items.pop();
          const thinkingText = lastItem.text;
          const firstTool = first.tools[0];
          if (firstTool) {
            firstTool.precedingThinking = [thinkingText, ...(firstTool.precedingThinking ?? [])];
          }
          lastItem = previous.items[previous.items.length - 1];
        }
      }
      // Official f() merges consecutive assistants. Same Anthropic message.id multi-emit
      // after stream ends lands as consecutive rows — fold items, do not first-wins drop.
      // Deduplicate pure-text re-emits of the same full paragraph on the same entryId.
      if (previous.id === entryId && nextItems.every((item) => item.kind === "text")) {
        const existingText = previous.items
          .filter((item): item is Extract<TranscriptEntryItem, { kind: "text" }> => item.kind === "text")
          .map((item) => item.text)
          .join("");
        const incomingText = nextItems
          .filter((item): item is Extract<TranscriptEntryItem, { kind: "text" }> => item.kind === "text")
          .map((item) => item.text)
          .join("");
        if (incomingText && existingText.includes(incomingText)) {
          if (lastTimestamp) previous.timestamp = lastTimestamp;
          return;
        }
        if (existingText && incomingText.startsWith(existingText)) {
          // Growing partial of the same turn: replace text items with the longer prefix.
          previous.items = [
            ...previous.items.filter((item) => item.kind !== "text"),
            ...nextItems,
          ];
          if (lastTimestamp) previous.timestamp = lastTimestamp;
          return;
        }
      }
      const lastItem = previous.items[previous.items.length - 1];
      if (lastItem?.kind === "tools" && first?.kind === "tools") {
        lastItem.tools.push(...first.tools);
        previous.items.push(...nextItems.slice(1));
      } else {
        previous.items.push(...nextItems);
      }
      if (lastTimestamp) previous.timestamp = lastTimestamp;
      return;
    }
    entries.push({
      author,
      id: entryId,
      items: author === "assistant" ? mergeAdjacentAssistantItems(items) : items,
      ...(lastTimestamp ? { timestamp: lastTimestamp } : {}),
      ...(synthetic ? { /* synthetic user answers from lke — not stored on type */ } : {}),
    });
  };

  messages.forEach((message, index) => {
    const raw = asRecord(message.raw);
    const rawType = stringValue(raw.type);
    lastTimestamp = stringValue(raw.timestamp) ?? message.createdAt;

    // Official eke: result (no parent_tool_use_id) → interrupt pending tools; is_error → turn_error.
    const resultParentId = raw.parent_tool_use_id ?? raw.parentToolUseId;
    if (rawType === "result" && !resultParentId) {
      for (const tool of pendingTools.values()) {
        tool.status = "error";
        tool.isError = true;
        tool.output = tool.output ?? "Tool execution was interrupted.";
      }
      pendingTools.clear();
      if (raw.is_error === true || raw.isError === true) {
        const subtype = stringValue(raw.subtype);
        if (subtype === "error_during_execution" && officialResultErrorDuringExecutionSkippable(messages, index)) {
          return;
        }
        const errors = Array.isArray(raw.errors) && raw.errors.length > 0
          ? raw.errors.map(String)
          : typeof raw.result === "string" && raw.result
            ? [raw.result]
            : message.text.trim()
              ? [message.text]
              : [];
        const entryId = stringValue(raw.uuid) ?? `result-${index}`;
        pushAuthorItems("assistant", [{
          errors,
          id: entryId,
          kind: "turn_error",
          subtype,
        }], entryId);
      }
      return;
    }

    if (rawType === "stream_event") return;

    // Official eke: system local_command / local_command_output → context | stats | text.
    if (rawType === "system" && (stringValue(raw.subtype) === "local_command" || stringValue(raw.subtype) === "local_command_output")) {
      const content = typeof raw.content === "string" ? raw.content : stringValue(raw.content);
      if (content && !officialSkipLocalCommandStdout(content)) {
        const stdout = content.match(/<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/)?.[1]?.trim();
        const stderr = content.match(/<local-command-stderr>([\s\S]*?)<\/local-command-stderr>/)?.[1]?.trim();
        const body = stderr || stdout;
        if (body) {
          const entryId = stringValue(raw.uuid) ?? stringValue(raw.id) ?? `sys-${index}`;
          const contextUsage = parseOfficialContextUsageMarkdown(body);
          const codeStats = parseOfficialCodeStatsXml(body);
          const items: TranscriptEntryItem[] = contextUsage
            ? [{ id: `${entryId}-ctx`, kind: "context", usage: contextUsage }]
            : codeStats.kind === "data" || codeStats.kind === "loading"
              ? [{ id: `${entryId}-stats`, kind: "stats", stats: codeStats.kind === "data" ? codeStats.stats : null }]
              : [{ id: entryId, kind: "text", text: body }];
          pushAuthorItems("assistant", items, entryId);
        }
      }
      return;
    }

    // Official eke system task_* → absorb into trailing tools group when possible (Vwe rules).
    if (rawType === "system" && isOfficialTaskEvent(raw)) {
      officialAbsorbOrPushTaskEvent(entries, raw, index, pushAuthorItems);
      return;
    }

    if (rawType !== "user" && rawType !== "assistant") {
      // Fall through for ChatMessage.role when raw.type missing (optimistic local user).
      if (message.role !== "user" && message.role !== "assistant") return;
    }

    // Official uke: parent_tool_use_id messages only update subagent activity on the parent tool.
    const parentToolUseId = stringValue(raw.parent_tool_use_id) ?? stringValue(raw.parentToolUseId);
    if (parentToolUseId) {
      if (rawType === "assistant" || message.role === "assistant") {
        officialUkeSubagentActivity(raw, parentToolUseId, pendingTools);
      }
      return;
    }

    const nestedMessage = asRecord(raw.message);
    const role: "assistant" | "user" | undefined = rawType === "assistant" || rawType === "user"
      ? rawType
      : message.role === "assistant" || message.role === "user"
        ? message.role
        : (stringValue(nestedMessage.role) === "assistant" || stringValue(nestedMessage.role) === "user"
          ? stringValue(nestedMessage.role) as "assistant" | "user"
          : undefined);
    if (role !== "assistant" && role !== "user") return;

    const content = Array.isArray(nestedMessage.content) || typeof nestedMessage.content === "string"
      ? nestedMessage.content
      : Array.isArray(raw.content) || typeof raw.content === "string"
        ? raw.content
        : undefined;
    const toolUseResult = raw.tool_use_result ?? raw.toolUseResult;

    if (role === "assistant") {
      // Official Bwe: API error messages.
      if (raw.isApiErrorMessage === true || (typeof raw.error === "string" && raw.error.length > 0)) {
        const entryId = stringValue(raw.uuid) ?? `${rawType ?? "assistant"}-${index}`;
        const errText = typeof content === "string"
          ? content
          : Array.isArray(content) && asRecord(content[0]).type === "text"
            ? (stringValue(asRecord(content[0]).text) ?? "")
            : (stringValue(raw.error) ?? message.text ?? "");
        pushAuthorItems("assistant", [{
          code: stringValue(raw.error),
          id: entryId,
          kind: "error",
          text: errText,
        }], stringValue(nestedMessage.id) ?? entryId);
        return;
      }

      // Official ake FIRST — registers tool refs into pendingTools even when entry is skipped.
      // Official e = s.message?.id; entry id for ake items = e ?? uuid.
      const anthropicMessageId = stringValue(nestedMessage.id) ?? stringValue(raw.message_id);
      const entryId = anthropicMessageId
        ?? stringValue(raw.uuid)
        ?? stringValue(raw.id)
        ?? message.id;
      const items = parseAssistantTranscriptItems(content, pendingTools, entryId, message.text);

      // Official eke: if (t && e === t) { mark deferred hoist tool ids; continue }
      // Va/Pke owns typewriter for this Anthropic message.id — durable must not paint.
      // Critical: without this skip, Kwe/Gwe sees id-overlap and returns durable whole text
      // (looks like a single dump, not a typewriter).
      if (streamingMessageId && anthropicMessageId && anthropicMessageId === streamingMessageId) {
        return;
      }
      // Defense when nested message.id missing but entryId already is the live stream id.
      if (streamingMessageId && entryId === streamingMessageId) {
        return;
      }

      pushAuthorItems("assistant", items, entryId);
      return;
    }

    // Official user path: rke mutates pending tool refs, then Ike-shaped user items.
    officialRkeAttachToolResults(content, pendingTools, toolUseResult);
    // Also accept top-level / non-array tool_result envelopes from the local CLI bridge.
    if (rawMessageContentContainsToolResult(raw)) {
      attachToolResultMessages(raw, pendingTools);
    }
    const entryId = stringValue(raw.uuid) ?? stringValue(raw.id) ?? message.id;
    const userItems = parseUserTranscriptItems(content, index, message.text);
    // Pure tool_result user rows often have no visible text — rke already settled tools.
    if (userItems.length === 0) return;
    pushAuthorItems("user", userItems, entryId);
  });

  return entries;
}

/** Official uke: fold child-agent tool_use activity onto the parent tool in pendingTools. */
function officialUkeSubagentActivity(
  raw: Record<string, unknown>,
  parentToolUseId: string,
  pendingTools: Map<string, TranscriptToolUse>,
) {
  const parent = pendingTools.get(parentToolUseId);
  if (!parent) return;
  const nested = asRecord(raw.message);
  const model = typeof nested.model === "string" ? nested.model : undefined;
  const content = nested.content;
  if (!Array.isArray(content)) return;
  for (const block of content) {
    const record = asRecord(block);
    if (stringValue(record.type) !== "tool_use" || !stringValue(record.name)) continue;
    const previous = parent.subagentActivity;
    parent.subagentActivity = {
      latestToolName: stringValue(record.name),
      model: model ?? previous?.model,
      toolCallCount: (previous?.toolCallCount ?? 0) + 1,
    };
  }
}

/**
 * Official rke: walk user content for tool_result blocks; mutate pendingTools by tool_use_id.
 * Object identity is the settle mechanism — same refs live inside already-pushed assistant entries.
 */
function officialRkeAttachToolResults(
  content: unknown,
  pendingTools: Map<string, TranscriptToolUse>,
  toolUseResult?: unknown,
) {
  if (!Array.isArray(content)) return;
  for (const block of content) {
    const record = asRecord(block);
    if (stringValue(record.type) !== "tool_result") continue;
    const toolUseId = stringValue(record.tool_use_id) ?? stringValue(record.toolUseId);
    if (!toolUseId) continue;
    const tool = pendingTools.get(toolUseId);
    if (!tool) continue;
    const isError = record.is_error === true || record.isError === true;
    tool.isError = isError;
    tool.status = isError ? "error" : "completed";
    const { text, images } = officialDkeToolResultContent(record.content);
    tool.output = text;
    if (images.length > 0) tool.outputImages = images;
    // toolUseResult kept on the raw envelope for specialized tools (AskUserQuestion etc.).
    void toolUseResult;
    pendingTools.delete(toolUseId);
  }
}

/** Official dke: tool_result content → text + images. */
function officialDkeToolResultContent(content: unknown): {
  text: string;
  images: Array<{ data?: string; media_type?: string; mimeType?: string }>;
} {
  if (typeof content === "string") {
    return { text: content, images: [] };
  }
  if (!Array.isArray(content)) {
    return { text: toolResultText(content), images: [] };
  }
  const texts: string[] = [];
  const images: Array<{ data?: string; media_type?: string; mimeType?: string }> = [];
  for (const part of content) {
    const record = asRecord(part);
    if (stringValue(record.type) === "text" && stringValue(record.text)) {
      texts.push(stringValue(record.text)!);
    } else if (stringValue(record.type) === "image") {
      const source = asRecord(record.source);
      const data = stringValue(source.data) ?? stringValue(record.data);
      const mimeType = stringValue(source.media_type) ?? stringValue(record.mimeType) ?? "image/png";
      if (data) images.push({ data, mimeType, media_type: mimeType });
    }
  }
  return { text: texts.join("\n"), images };
}

/** Official jke: walk back; if prior assistant exists return false; if prior user, return whether user has image blocks. */
function officialResultErrorDuringExecutionSkippable(messages: ChatMessage[], resultIndex: number) {
  for (let index = resultIndex - 1; index >= 0; index -= 1) {
    const raw = asRecord(messages[index]?.raw);
    const type = stringValue(raw.type);
    if (type === "assistant") return false;
    if (type === "user") return rawMessageContentContainsImage(raw);
  }
  return false;
}

function rawMessageContentContainsImage(raw: Record<string, unknown>) {
  return rawMessageContent(raw).some((item) => {
    const record = asRecord(item);
    return (stringValue(record.type) ?? stringValue(record.kind)) === "image";
  });
}

function officialTaskEventItemFromSystemRaw(raw: Record<string, unknown>, index: number): Extract<TranscriptEntryItem, { kind: "task_event" }> | null {
  const subtype = stringValue(raw.subtype);
  const taskId = stringValue(raw.task_id) ?? stringValue(raw.taskId);
  if (!taskId) return null;
  // Official eke: skip_transcript task_started never enters the transcript.
  if (raw.skip_transcript === true || raw.skipTranscript === true) return null;
  let status: OfficialTaskStatus = "running";
  if (subtype === "task_notification") {
    const rawStatus = stringValue(raw.status);
    status = rawStatus === "completed" || rawStatus === "failed" || rawStatus === "stopped" || rawStatus === "running"
      ? rawStatus
      : "failed";
  } else if (subtype === "task_progress") {
    status = "running";
  }
  return {
    description: stringValue(raw.description),
    id: stringValue(raw.uuid) ?? stringValue(raw.id) ?? `task-event-${index}`,
    kind: "task_event",
    status,
    summary: stringValue(raw.summary),
    taskId,
    taskType: stringValue(raw.task_type) ?? stringValue(raw.taskType),
  };
}

/**
 * Official eke task absorb (index-BELzQL5P):
 * tryAbsorb(ev, toolUseId):
 *   last entry must be assistant; last item tools; not all Vwe tools;
 *   if toolUseId already in group tools → drop; else push {at: tools.length, ev}.
 * Returns "absorbed" | "pushed" | "dropped" | "updated".
 */
function officialAbsorbOrPushTaskEvent(
  entries: TranscriptEntry[],
  raw: Record<string, unknown>,
  index: number,
  pushAuthorItems: (
    author: "assistant" | "user",
    items: TranscriptEntryItem[],
    entryId: string,
    synthetic?: boolean,
  ) => void,
) {
  const taskEvent = officialTaskEventItemFromSystemRaw(raw, index);
  if (!taskEvent) return;

  // Official: if this taskId already exists, mutate status/description/summary in place.
  const existing = findOfficialTaskEventRef(entries, taskEvent.taskId);
  if (existing) {
    if (taskEvent.description) existing.description = taskEvent.description;
    if (taskEvent.summary !== undefined) existing.summary = taskEvent.summary;
    if (taskEvent.taskType) existing.taskType = taskEvent.taskType;
    existing.status = taskEvent.status;
    return;
  }

  const toolUseId = stringValue(raw.tool_use_id) ?? stringValue(raw.toolUseId);
  const last = entries.at(-1);
  if (last?.author === "assistant") {
    const lastItem = last.items.at(-1);
    if (lastItem?.kind === "tools" && !lastItem.tools.every((tool) => OFFICIAL_NON_ABSORB_TOOL_NAMES.has(tool.name))) {
      // Official: if the group already contains the spawning tool id, drop the chip.
      if (toolUseId && lastItem.tools.some((tool) => tool.id === toolUseId)) {
        return;
      }
      (lastItem.taskEvents ??= []).push({ at: lastItem.tools.length, event: taskEvent });
      return;
    }
  }
  pushAuthorItems("assistant", [taskEvent], taskEvent.id);
}

/** Walk entries for an existing task_event (standalone or absorbed in tools.taskEvents). */
function findOfficialTaskEventRef(
  entries: TranscriptEntry[],
  taskId: string,
): Extract<TranscriptEntryItem, { kind: "task_event" }> | null {
  for (const entry of entries) {
    for (const item of entry.items) {
      if (item.kind === "task_event" && item.taskId === taskId) return item;
      if (item.kind === "tools") {
        for (const placed of item.taskEvents ?? []) {
          if (placed.event.taskId === taskId) return placed.event;
        }
      }
    }
  }
  return null;
}

/** Official Nke: skip model-set local_command noise. */
function officialSkipLocalCommandStdout(content: string) {
  if (content.includes("<command-name>/model</command-name>")) return true;
  const stdout = content.match(/<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/)?.[1];
  return stdout?.trimStart().startsWith("Set model to ") ?? false;
}

/** Official iCe: parse "1.2k" / "3.4m" token counts. */
function officialParseTokenCountLabel(value: string | undefined) {
  if (!value) return 0;
  const match = /^([\d.]+)\s*([km])?$/i.exec(value.trim());
  if (!match) return 0;
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return 0;
  const unit = match[2]?.toLowerCase();
  const scale = unit === "m" ? 1_000_000 : unit ? 1_000 : 1;
  return Math.round(amount * scale);
}

const officialContextModelRe = /\*\*Model:\*\*\s*(.+?)\s*$/m;
const officialContextTokensRe = /\*\*Tokens:\*\*\s*(\S+)\s*\/\s*(\S+)\s*\((\d+)%\)/;

function officialParseMarkdownTableSection(text: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`### ${escaped}\\n\\n([\\s\\S]*?)(?=\\n###|\\n##|$)`).exec(text);
  if (!match) return [] as string[][];
  return match[1]
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|[-\s|:]+\|$/.test(line))
    .slice(1)
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

/** Official dCe: parse `## Context Usage` local_command stdout into ContextUsage. */
export function parseOfficialContextUsageMarkdown(text: string): ContextUsage | null {
  if (!text.startsWith("## Context Usage")) return null;
  const model = officialContextModelRe.exec(text)?.[1];
  const tokens = officialContextTokensRe.exec(text);
  if (!model || !tokens) return null;
  const rawMaxTokens = officialParseTokenCountLabel(tokens[2]);
  if (rawMaxTokens === 0) return null;
  const categories = officialParseMarkdownTableSection(text, "Estimated usage by category").map(([name, count]) => ({
    name: name ?? "",
    tokens: officialParseTokenCountLabel(count),
  }));
  const mcpTools = officialParseMarkdownTableSection(text, "MCP Tools").map(([name, serverName, count]) => ({
    name: name ?? "",
    serverName: serverName ?? "",
    tokens: officialParseTokenCountLabel(count),
  }));
  const memoryFiles = officialParseMarkdownTableSection(text, "Memory Files").map(([_type, path, count]) => ({
    path: path ?? "",
    tokens: officialParseTokenCountLabel(count),
  }));
  const agents = officialParseMarkdownTableSection(text, "Custom Agents").map(([agentType, , count]) => ({
    agentType: agentType ?? "",
    tokens: officialParseTokenCountLabel(count),
  }));
  return {
    agents,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    categories,
    inputTokens: 0,
    mcpTools,
    memoryFiles,
    model,
    outputTokens: 0,
    percentage: Number(tokens[3]),
    rawMaxTokens,
    totalTokens: officialParseTokenCountLabel(tokens[1]),
  } as ContextUsage & { model?: string };
}

const officialCodeStatsXmlRe = /<code-stats>([\s\S]*?)<\/code-stats>/;

/** Official swe: parse `<code-stats>…</code-stats>` local_command stdout. */
export function parseOfficialCodeStatsXml(text: string): { kind: "none" } | { kind: "loading" } | { kind: "data"; stats: CodeStats } {
  const match = officialCodeStatsXmlRe.exec(text);
  if (!match) return { kind: "none" };
  const payload = match[1].trim();
  if (!payload) return { kind: "loading" };
  try {
    const parsed = JSON.parse(payload) as CodeStats;
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.dailyActivity)) {
      return { kind: "data", stats: parsed };
    }
    return { kind: "none" };
  } catch {
    return { kind: "none" };
  }
}

export function parseOfficialSubagentTranscriptEntries(messages: ChatMessage[], parentToolUseId: string): TranscriptEntry[] {
  // Same eke control flow as main transcript, filtered to parent_tool_use_id === parentToolUseId.
  const entries: TranscriptEntry[] = [];
  const pendingTools = new Map<string, TranscriptToolUse>();
  const pushEntry = (entry: TranscriptEntry) => {
    if (entry.items.length === 0) return;
    const previous = entries.at(-1);
    if (previous?.author === "assistant" && entry.author === "assistant") {
      entries[entries.length - 1] = {
        ...previous,
        items: mergeAdjacentAssistantItems([...previous.items, ...entry.items]),
        timestamp: entry.timestamp ?? previous.timestamp,
      };
      return;
    }
    entries.push({ ...entry, items: entry.author === "assistant" ? mergeAdjacentAssistantItems(entry.items) : entry.items });
  };

  messages.forEach((message, index) => {
    const raw = asRecord(message.raw);
    const rawType = stringValue(raw.type);
    if (rawType === "result" || rawType === "stream_event") return;
    const parent = stringValue(raw.parent_tool_use_id) ?? stringValue(raw.parentToolUseId);
    if (parent !== parentToolUseId) return;
    const nestedMessage = asRecord(raw.message);
    const role = rawType === "assistant" || rawType === "user"
      ? rawType
      : message.role === "assistant" || message.role === "user"
        ? message.role
        : stringValue(nestedMessage.role);
    if (role !== "assistant" && role !== "user") return;
    const content = Array.isArray(nestedMessage.content) || typeof nestedMessage.content === "string"
      ? nestedMessage.content
      : Array.isArray(raw.content) || typeof raw.content === "string"
        ? raw.content
        : undefined;
    if (role === "assistant") {
      const entryId = stringValue(nestedMessage.id)
        ?? stringValue(raw.message_id)
        ?? stringValue(raw.uuid)
        ?? stringValue(raw.id)
        ?? message.id;
      // ake first (registers pendingTools), always push in subagent view (no Va suppress).
      const items = parseAssistantTranscriptItems(content, pendingTools, entryId, message.text);
      pushEntry({
        author: "assistant",
        id: entryId,
        items,
        timestamp: stringValue(raw.timestamp) ?? message.createdAt,
      });
      return;
    }
    // rke then optional user text
    officialRkeAttachToolResults(content, pendingTools, raw.tool_use_result ?? raw.toolUseResult);
    if (rawMessageContentContainsToolResult(raw)) {
      attachToolResultMessages(raw, pendingTools);
    }
    const userItems = parseUserTranscriptItems(content, index, message.text);
    if (userItems.length === 0) return;
    pushEntry({
      author: "user",
      id: stringValue(raw.uuid) ?? stringValue(raw.id) ?? message.id,
      items: userItems,
      timestamp: stringValue(raw.timestamp) ?? message.createdAt,
    });
  });

  return entries;
}

/**
 * Official ake(content, messageId, pendingTools):
 * - text / connector_text → text items with stable `${messageId}-tN` ids
 * - thinking buffered then flushed as `${messageId}-thN`
 * - tool_use → status always "running", registered into pendingTools by id
 * - consecutive tool_use share one tools group; group id = first tool id
 */
function parseAssistantTranscriptItems(
  content: unknown,
  pendingTools: Map<string, TranscriptToolUse>,
  messageId: string,
  fallbackText: string,
): TranscriptEntryItem[] {
  if (typeof content === "string") {
    const text = content.trim();
    return text ? [{ id: messageId, kind: "text", text }] : [];
  }
  const source = Array.isArray(content)
    ? content
    : fallbackText.trim()
      ? [{ type: "text", text: fallbackText }]
      : [];
  const items: TranscriptEntryItem[] = [];
  let textIndex = 0;
  let thinkingIndex = 0;
  let toolGroup: TranscriptToolUse[] | null = null;
  let thinkingBuffer: string[] = [];
  const flushThinking = () => {
    for (const text of thinkingBuffer) {
      items.push({ id: `${messageId}-th${thinkingIndex++}`, kind: "thinking", text });
    }
    thinkingBuffer = [];
  };

  for (const item of source) {
    const record = asRecord(item);
    const kind = stringValue(record.type) ?? stringValue(record.kind);
    if (kind === "thinking") {
      const text = (stringValue(record.thinking) ?? stringValue(record.text) ?? "").trim();
      if (text) thinkingBuffer.push(text);
      continue;
    }
    const textBody = kind === "text"
      ? (stringValue(record.text) ?? stringValue(record.content))
      : kind === "connector_text"
        ? stringValue(record.connector_text) ?? stringValue(record.connectorText)
        : undefined;
    if (textBody) {
      const text = textBody.trim();
      if (!text) continue;
      toolGroup = null;
      flushThinking();
      // context / stats from local_command-shaped assistant text (official dCe/swe on ake path).
      const contextUsage = parseOfficialContextUsageMarkdown(text);
      const codeStats = parseOfficialCodeStatsXml(text);
      const idBase = `${messageId}-t${textIndex++}`;
      if (contextUsage) {
        items.push({ id: `${idBase}-ctx`, kind: "context", usage: contextUsage });
      } else if (codeStats.kind === "data" || codeStats.kind === "loading") {
        items.push({ id: `${idBase}-stats`, kind: "stats", stats: codeStats.kind === "data" ? codeStats.stats : null });
      } else {
        items.push({ id: idBase, kind: "text", text });
      }
      continue;
    }
    if (kind === "tool_use") {
      const toolId = stringValue(record.id);
      const toolName = stringValue(record.name) ?? stringValue(record.tool_name);
      if (!toolId || !toolName) continue;
      // Official ake/nke: $we mark_chapter → { kind:"chapter", id, title, summary }.
      if (toolName === OFFICIAL_CHAPTER_TOOL_NAME) {
        toolGroup = null;
        flushThinking();
        const input = asRecord(record.input);
        const title = stringValue(input.title)?.trim() ?? "";
        const summary = stringValue(input.summary)?.trim();
        items.push({
          id: toolId,
          kind: "chapter",
          title,
          ...(summary ? { summary } : {}),
        });
        continue;
      }
      const tool: TranscriptToolUse = {
        id: toolId,
        input: asRecord(record.input),
        name: toolName,
        // Official ake always starts tools as running; rke settles via object ref.
        status: "running",
        ...(thinkingBuffer.length > 0 ? { precedingThinking: thinkingBuffer.slice() } : {}),
      };
      thinkingBuffer = [];
      pendingTools.set(tool.id, tool);
      if (toolGroup) {
        toolGroup.push(tool);
      } else {
        toolGroup = [tool];
        items.push({ id: tool.id, kind: "tools", tools: toolGroup });
      }
      continue;
    }
    if (kind === "error") {
      toolGroup = null;
      flushThinking();
      items.push({
        code: stringValue(record.code),
        id: stringValue(record.id) ?? `${messageId}-err${textIndex++}`,
        kind: "error",
        text: stringValue(record.text) ?? stringValue(record.error) ?? "Error",
      });
    }
  }
  flushThinking();
  return items;
}

/**
 * Official Ike (index-BELzQL5P): user content → file | image | peer | event | bash | text.
 * Also accepts local bridge shapes used by the desktop CLI runner.
 */
function parseUserTranscriptItems(content: unknown, messageIndex: number, fallbackText: string): TranscriptEntryItem[] {
  const entryId = `user-${messageIndex}`;
  // Official Ike string path: peer envelope → event → bash → plain text.
  if (typeof content === "string" || (!content && fallbackText.trim())) {
    const text = typeof content === "string" ? content : fallbackText;
    const peer = parseOfficialPeerTaggedText(text);
    if (peer) {
      return [{ content: peer.content, id: entryId, kind: "peer", origin: peer.origin }];
    }
    const event = parseOfficialWebhookEventText(text);
    if (event) {
      return [{ content: event.content, eventType: event.eventType, id: entryId, kind: "event" }];
    }
    const bash = parseOfficialBashTaggedText(text);
    if (bash) {
      return [{
        command: bash.command,
        id: `${entryId}-bash`,
        kind: "bash",
        output: bash.output || undefined,
      }];
    }
  }
  const source = typeof content === "string"
    ? [{ type: "text", text: content }]
    : Array.isArray(content)
      ? content
      : fallbackText.trim()
        ? [{ type: "text", text: fallbackText }]
        : [];
  const items: TranscriptEntryItem[] = [];
  const textChunks: string[] = [];
  let imageIndex = 0;
  let peerIndex = 0;
  let eventIndex = 0;
  let bashIndex = 0;
  source.forEach((item, index) => {
    const record = asRecord(item);
    const kind = stringValue(record.type) ?? stringValue(record.kind);
    const id = stringValue(record.id) ?? `${entryId}-${index}`;
    if (kind === "text") {
      const text = stringValue(record.text) ?? stringValue(record.content);
      if (!text) return;
      const peer = parseOfficialPeerTaggedText(text);
      if (peer) {
        items.push({ content: peer.content, id: `${entryId}-peer${peerIndex++}`, kind: "peer", origin: peer.origin });
        return;
      }
      const event = parseOfficialWebhookEventText(text);
      if (event) {
        items.push({ content: event.content, eventType: event.eventType, id: `${entryId}-ev${eventIndex++}`, kind: "event" });
        return;
      }
      const bash = parseOfficialBashTaggedText(text);
      if (bash) {
        items.push({
          command: bash.command,
          id: `${entryId}-bash${bashIndex++}`,
          kind: "bash",
          output: bash.output || undefined,
        });
        return;
      }
      // Local bridge may embed uploaded-file markers inside plain text.
      // Keep uploaded-file (path-openable) only — do not also emit official `file` chips.
      const parsed = parseEpitaxyUploadedFilesText(text);
      parsed.files.forEach((file, fileIndex) => {
        items.push({ file, id: `${id}-uploaded-${fileIndex}`, kind: "uploaded-file" });
      });
      if (parsed.text) textChunks.push(parsed.text);
      return;
    }
    if (kind === "image") {
      const sourceRecord = asRecord(record.source);
      const data = stringValue(sourceRecord.data) ?? stringValue(record.data);
      const mimeType = stringValue(sourceRecord.media_type)
        ?? stringValue(record.mimeType)
        ?? stringValue(record.media_type)
        ?? "image/png";
      if (data) {
        items.push({ data, id: `${entryId}-img${imageIndex++}`, kind: "image", mimeType });
      }
      return;
    }
    if (kind === "file" || kind === "document") {
      const fileName = stringValue(record.file_name)
        ?? stringValue(record.fileName)
        ?? stringValue(record.name)
        ?? "file";
      items.push({ fileName, id: `${entryId}-file${index}`, kind: "file" });
      return;
    }
    if (kind === "bash") {
      items.push({
        command: stringValue(record.command),
        error: stringValue(record.error),
        id,
        kind: "bash",
        output: stringValue(record.output),
      });
      return;
    }
    if (kind === "event") {
      const eventText = stringValue(record.content) ?? stringValue(record.text);
      if (eventText) items.push({ content: eventText, eventType: stringValue(record.eventType), id, kind: "event" });
      return;
    }
    if (kind === "peer") {
      const originRecord = asRecord(record.origin);
      const originKind = stringValue(originRecord.kind);
      if (
        originKind === "peer"
        || originKind === "teammate"
        || originKind === "channel"
        || originKind === "coordinator"
      ) {
        items.push({
          content: stringValue(record.content) ?? "",
          id,
          kind: "peer",
          origin: {
            kind: originKind,
            ...(stringValue(originRecord.from) ? { from: stringValue(originRecord.from) } : {}),
            ...(stringValue(originRecord.name) ? { name: stringValue(originRecord.name) } : {}),
            ...(stringValue(originRecord.server) ? { server: stringValue(originRecord.server) } : {}),
          },
        });
      }
    }
  });
  if (textChunks.length > 0) {
    items.push({ id: entryId, kind: "text", text: textChunks.join("\n") });
  }
  return items;
}

/** Official Cke / yke peer envelope tags. */
function parseOfficialPeerTaggedText(text: string): {
  content: string;
  origin: Extract<TranscriptEntryItem, { kind: "peer" }>["origin"];
} | null {
  const match = text.match(
    /^\s*<(cross-session-message|teammate-message|channel-message)([^>]*)>([\s\S]*?)<\/\1>\s*$/,
  );
  if (!match) return null;
  const tag = match[1];
  const attrs = match[2] ?? "";
  const content = (match[3] ?? "").trim();
  const attr = (name: string) => attrs.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  if (tag === "cross-session-message") {
    return { content, origin: { kind: "peer", from: attr("from") ?? "unknown" } };
  }
  if (tag === "teammate-message") {
    return { content, origin: { kind: "teammate", from: attr("teammate_id") ?? "unknown" } };
  }
  return { content, origin: { kind: "channel", server: attr("server") } };
}

/** Official bke / pke webhook / CI event envelopes. */
function parseOfficialWebhookEventText(text: string): { content: string; eventType: string } | null {
  const trimmed = text.trim();
  const patterns: Array<[string, RegExp]> = [
    ["github", /^<github-webhook-activity>([\s\S]*)<\/github-webhook-activity>$/],
    ["ci", /^<ci-monitor-event>([\s\S]*)<\/ci-monitor-event>$/],
  ];
  for (const [eventType, pattern] of patterns) {
    const match = trimmed.match(pattern);
    if (match) return { content: (match[1] ?? "").trim(), eventType };
  }
  const hook = trimmed.match(/^\w+ hook feedback:\n([\s\S]+)$/);
  if (hook) return { content: hook[1].trim(), eventType: "hook" };
  return null;
}

/**
 * Official Ske (index-BELzQL5P): parse bash / local_command tags from a text blob.
 * Returns null when the blob is a bare <command-message> without bash/local-command streams.
 */
function parseOfficialBashTaggedText(text: string): { command: string; output: string } | null {
  if (
    text.includes("<command-message>")
    && !text.includes("<bash-input>")
    && !text.includes("<local-command-stdout>")
    && !text.includes("<bash-stdout>")
    && !text.includes("<local-command-stderr>")
    && !text.includes("<bash-stderr>")
  ) {
    return null;
  }
  const command = text.match(/<command-name>(.*?)<\/command-name>/)?.[1]
    ?? text.match(/<bash-input>([\s\S]*?)<\/bash-input>/)?.[1]?.trim();
  const stdout = text.match(/<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/)?.[1]?.trim()
    ?? text.match(/<bash-stdout>([\s\S]*?)<\/bash-stdout>/)?.[1]?.trim();
  const stderr = text.match(/<local-command-stderr>([\s\S]*?)<\/local-command-stderr>/)?.[1]?.trim()
    ?? text.match(/<bash-stderr>([\s\S]*?)<\/bash-stderr>/)?.[1]?.trim();
  if (command === undefined && stdout === undefined && stderr === undefined) return null;
  return {
    command: command ?? "",
    output: (stdout ?? "") + (stderr ? `\n${stderr}` : ""),
  };
}

function attachToolResultMessages(raw: Record<string, unknown>, pendingTools: Map<string, TranscriptToolUse>) {
  // Bridge-tolerant rke: same mutation semantics as officialRkeAttachToolResults.
  for (const item of rawMessageContent(raw)) {
    const record = asRecord(item);
    if ((stringValue(record.type) ?? stringValue(record.kind)) !== "tool_result") continue;
    const toolUseId = stringValue(record.tool_use_id) ?? stringValue(record.toolUseId);
    const tool = toolUseId ? pendingTools.get(toolUseId) : undefined;
    if (!tool) continue;
    const isError = record.is_error === true || record.isError === true;
    tool.isError = isError;
    tool.status = isError ? "error" : "completed";
    const { text, images } = officialDkeToolResultContent(record.content);
    tool.output = text;
    if (images.length > 0) tool.outputImages = images;
    pendingTools.delete(tool.id);
  }
}

function mergeAdjacentAssistantItems(items: TranscriptEntryItem[]) {
  const merged: TranscriptEntryItem[] = [];
  for (const item of items) {
    const previous = merged.at(-1);
    if (previous?.kind === "tools" && item.kind === "tools") {
      const shiftedEvents = (item.taskEvents ?? []).map((entry) => ({
        ...entry,
        at: entry.at + previous.tools.length,
      }));
      merged[merged.length - 1] = {
        ...previous,
        taskEvents: [...(previous.taskEvents ?? []), ...shiftedEvents],
        tools: [...previous.tools, ...item.tools],
      };
    } else if (previous?.kind === "tools" && item.kind === "task_event") {
      // Official: task events attach into the surrounding default tool group at current length.
      merged[merged.length - 1] = {
        ...previous,
        taskEvents: [...(previous.taskEvents ?? []), { at: previous.tools.length, event: item }],
      };
    } else {
      merged.push(item);
    }
  }
  return merged;
}


/**
 * Official Kwe / lo(Xa, Va) from index-BELzQL5P — pure control flow only:
 *   if (!Va) return Xa
 *   items = map(Va.blocks)  // tools always status:"running"
 *   if items empty return Xa
 *   last = Xa[Xa.length-1]
 *   if last.author === "assistant":
 *     Gwe id overlap → return Xa
 *     else merge tools groups or append items onto last
 *   else append { id: Va.messageId, author:"assistant", items }
 *
 * Tool settle is eke/rke (pendingTools object refs), not a post-merge invent.
 */
export function mergeOfficialStreamSnapshot(
  entries: TranscriptEntry[],
  snapshot: OfficialStreamSnapshot,
): TranscriptEntry[] {
  if (!snapshot) return entries;
  const streamItems = streamSnapshotToTranscriptItems(snapshot);
  // Shared pure merge (Kwe/Gwe + same-messageId replace). Types are structural.
  return mergeOfficialStreamOntoTranscript(
    entries as never,
    snapshot,
    streamItems as never,
  ) as TranscriptEntry[];
}

/** Official Gwe: add item.id and nested tool ids into a set. */
function collectOfficialTranscriptItemIds(items: TranscriptEntryItem[], into: Set<string>) {
  for (const item of items) {
    into.add(item.id);
    if (item.kind === "tools") {
      for (const tool of item.tools) into.add(tool.id);
    }
  }
}

/** Official Kwe block→item mapping: stable `${messageId}-tN` / `-thN` ids. */
export function streamSnapshotToTranscriptItems(snapshot: NonNullable<OfficialStreamSnapshot>): TranscriptEntryItem[] {
  const items: TranscriptEntryItem[] = [];
  let textIndex = 0;
  let thinkingIndex = 0;
  let toolGroup: TranscriptToolUse[] | null = null;
  let thinkingBuffer: string[] = [];
  const flushThinking = () => {
    for (const text of thinkingBuffer) {
      items.push({ id: `${snapshot.messageId}-th${thinkingIndex++}`, kind: "thinking", text });
    }
    thinkingBuffer = [];
  };
  const flushTools = () => {
    toolGroup = null;
  };

  for (const block of snapshot.blocks) {
    if (block.kind === "thinking") {
      const text = block.text.trim();
      if (text) thinkingBuffer.push(text);
      continue;
    }
    if (block.kind === "text") {
      if (!block.text) continue;
      toolGroup = null;
      flushThinking();
      items.push({ id: `${snapshot.messageId}-t${textIndex++}`, kind: "text", text: block.text });
      continue;
    }
    // Official Kwe: $we mark_chapter → nke chapter item (not tools group).
    if (block.name === OFFICIAL_CHAPTER_TOOL_NAME) {
      toolGroup = null;
      flushThinking();
      const input = parseJsonObject(block.partialJson) ?? {};
      const title = stringValue(input.title)?.trim() ?? "";
      const summary = stringValue(input.summary)?.trim();
      items.push({
        id: block.id,
        kind: "chapter",
        title,
        ...(summary ? { summary } : {}),
      });
      continue;
    }
    const tool: TranscriptToolUse = {
      id: block.id,
      input: parseJsonObject(block.partialJson) ?? {},
      name: block.name,
      status: "running",
      ...(thinkingBuffer.length > 0 ? { precedingThinking: thinkingBuffer.slice() } : {}),
    };
    thinkingBuffer = [];
    if (toolGroup) {
      toolGroup.push(tool);
    } else {
      toolGroup = [tool];
      items.push({ id: block.id, kind: "tools", tools: toolGroup });
    }
  }
  flushThinking();
  void flushTools;
  return items;
}

export function estimateOfficialStreamSnapshotTokens(snapshot: OfficialStreamSnapshot) {
  if (!snapshot) return 0;
  const charCount = snapshot.blocks.reduce((total, block) => {
    if (block.kind === "tool") return total + block.partialJson.length;
    return total + block.text.length;
  }, 0);
  return Math.round(charCount / 4);
}

export function rawMessageContentContainsToolResult(raw: Record<string, unknown>) {
  return rawMessageContent(raw).some((item) => {
    const record = asRecord(item);
    return (stringValue(record.type) ?? stringValue(record.kind)) === "tool_result";
  });
}

