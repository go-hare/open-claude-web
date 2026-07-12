/**
 * Official content-block stream reduce (index-targeted, like CompletionSmoother).
 * thinking_delta / text_delta update only event.index — never join-all + stamp every block.
 * Source: index-BELzQL5P.pretty.js content_block_delta apply by getAdjustedIndex.
 */
import type { CoworkStreamBlock, CoworkStreamSnapshot, CoworkStreamThinkingSummary } from "./coworkStreamTypes";

export function reduceCoworkStreamEvent(
  current: CoworkStreamSnapshot,
  streamMessage: Record<string, unknown>,
): CoworkStreamSnapshot {
  const event = record(streamMessage.event);
  const eventType = stringValue(event.type);
  if (eventType === "message_start") {
    const message = record(event.message);
    const messageId = stringValue(streamMessage.uuid) ?? stringValue(message.id);
    const apiMessageId = stringValue(message.id);
    return messageId ? {
      apiMessageId,
      // Official: no synthetic empty text block — blocks arrive via content_block_start.
      blocks: [],
      messageId,
      model: stringValue(message.model),
      usage: streamUsage(message.usage),
    } : current;
  }
  if (eventType === "message_stop") return null;
  if (!current) return current;
  if (eventType === "message_delta") return { ...current, usage: streamUsage(event.usage) ?? current.usage };
  if (eventType === "content_block_start") return startContentBlock(current, event);
  if (eventType === "content_block_delta") return updateContentBlock(current, event);
  if (eventType === "content_block_stop") return current;
  return current;
}

function startContentBlock(
  current: NonNullable<CoworkStreamSnapshot>,
  event: Record<string, unknown>,
): CoworkStreamSnapshot {
  const content = record(event.content_block);
  const type = stringValue(content.type);
  if (type === "thinking") {
    const summaries = parseThinkingSummaries(content.summaries);
    return appendBlock(current, {
      kind: "thinking",
      text: stringValue(content.thinking) ?? "",
      ...(content.cut_off ? { cutOff: true } : {}),
      ...(summaries ? { summaries } : {}),
    });
  }
  if (type === "text" || type === "connector_text") {
    return appendBlock(current, {
      kind: "text",
      text: stringValue(content.text) ?? stringValue(content.connector_text) ?? "",
    });
  }
  if (type !== "tool_use") return current;
  const id = stringValue(content.id);
  const name = stringValue(content.name);
  return id && name
    ? { ...appendBlock(current, { id, kind: "tool", name, partialJson: "" }), activeToolId: id }
    : current;
}

function updateContentBlock(
  current: NonNullable<CoworkStreamSnapshot>,
  event: Record<string, unknown>,
): CoworkStreamSnapshot {
  const delta = record(event.delta);
  const deltaType = stringValue(delta.type);
  const index = numberValue(event.index);
  if (index == null || index < 0 || index >= current.blocks.length) {
    // Fallback: if server index is missing, target last matching open block.
    return updateContentBlockFallback(current, delta, deltaType);
  }

  const block = current.blocks[index];
  if (!block) return current;

  if (deltaType === "thinking_delta") {
    if (block.kind !== "thinking") return current;
    return replaceBlock(current, index, {
      ...block,
      text: block.text + (stringValue(delta.thinking) ?? ""),
    });
  }
  if (deltaType === "thinking_summary_delta") {
    if (block.kind !== "thinking") return current;
    const summary = delta.summary;
    if (!summary || typeof summary !== "object") return current;
    const entry = summary as { summary?: string };
    if (typeof entry.summary !== "string" || !entry.summary) return current;
    return replaceBlock(current, index, {
      ...block,
      summaries: [...(block.summaries ?? []), { summary: entry.summary }],
    });
  }
  if (deltaType === "thinking_cut_off_delta") {
    if (block.kind !== "thinking") return current;
    return replaceBlock(current, index, {
      ...block,
      cutOff: Boolean(delta.cut_off),
    });
  }
  if (deltaType === "text_delta" || deltaType === "connector_text_delta") {
    if (block.kind !== "text") return current;
    return replaceBlock(current, index, {
      kind: "text",
      text: block.text + (stringValue(delta.text) ?? stringValue(delta.connector_text) ?? ""),
    });
  }
  if (deltaType === "input_json_delta") {
    if (block.kind !== "tool") return current;
    return {
      ...replaceBlock(current, index, {
        ...block,
        partialJson: block.partialJson + (stringValue(delta.partial_json) ?? ""),
      }),
      activeToolId: block.id,
    };
  }
  return current;
}

/** When index is absent/out of range, mutate the last block of the matching kind (defensive). */
function updateContentBlockFallback(
  current: NonNullable<CoworkStreamSnapshot>,
  delta: Record<string, unknown>,
  deltaType: string | undefined,
): CoworkStreamSnapshot {
  if (deltaType === "thinking_delta") {
    const index = lastIndexOfKind(current.blocks, "thinking");
    if (index < 0) return current;
    const block = current.blocks[index];
    if (block.kind !== "thinking") return current;
    return replaceBlock(current, index, {
      ...block,
      text: block.text + (stringValue(delta.thinking) ?? ""),
    });
  }
  if (deltaType === "text_delta" || deltaType === "connector_text_delta") {
    const index = lastIndexOfKind(current.blocks, "text");
    if (index < 0) return current;
    const block = current.blocks[index];
    if (block.kind !== "text") return current;
    return replaceBlock(current, index, {
      kind: "text",
      text: block.text + (stringValue(delta.text) ?? stringValue(delta.connector_text) ?? ""),
    });
  }
  if (deltaType === "input_json_delta" && current.activeToolId) {
    return {
      ...current,
      blocks: current.blocks.map((block) => block.kind === "tool" && block.id === current.activeToolId
        ? { ...block, partialJson: block.partialJson + (stringValue(delta.partial_json) ?? "") }
        : block),
    };
  }
  return current;
}

function lastIndexOfKind(blocks: CoworkStreamBlock[], kind: CoworkStreamBlock["kind"]) {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    if (blocks[index]?.kind === kind) return index;
  }
  return -1;
}

function replaceBlock(
  current: NonNullable<CoworkStreamSnapshot>,
  index: number,
  block: CoworkStreamBlock,
): NonNullable<CoworkStreamSnapshot> {
  const blocks = current.blocks.slice();
  blocks[index] = block;
  return { ...current, blocks };
}

function appendBlock(
  current: NonNullable<CoworkStreamSnapshot>,
  block: CoworkStreamBlock,
): NonNullable<CoworkStreamSnapshot> {
  return { ...current, blocks: [...current.blocks, block] };
}

function streamUsage(value: unknown) {
  const usage = record(value);
  if (Object.keys(usage).length === 0) return undefined;
  return {
    cache_creation_input_tokens: numberValue(usage.cache_creation_input_tokens) ?? 0,
    cache_read_input_tokens: numberValue(usage.cache_read_input_tokens) ?? 0,
    input_tokens: numberValue(usage.input_tokens) ?? 0,
    output_tokens: numberValue(usage.output_tokens) ?? 0,
  };
}

function parseThinkingSummaries(value: unknown): CoworkStreamThinkingSummary[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const summaries = value.flatMap((entry) => {
    const recordEntry = record(entry);
    const summary = stringValue(recordEntry.summary);
    return summary ? [{ summary }] : [];
  });
  return summaries.length > 0 ? summaries : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length ? value : undefined;
}
