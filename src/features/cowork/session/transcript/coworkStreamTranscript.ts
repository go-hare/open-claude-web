import { parseJsonObject } from "../recordUtils";
import type { CoworkToolUse, CoworkTranscriptEntry, CoworkTranscriptItem } from "../types";
import type { CoworkStreamSnapshot } from "../stream/coworkStreamTypes";

export function mergeCoworkStream(entries: CoworkTranscriptEntry[], snapshot: CoworkStreamSnapshot) {
  if (!snapshot) return entries;
  const streamItems = streamSnapshotItems(snapshot);
  if (streamItems.length === 0) return entries;
  const lastEntry = entries.at(-1);
  if (lastEntry?.author !== "assistant") {
    return [...entries, { author: "assistant" as const, id: snapshot.messageId, items: streamItems }];
  }
  if (hasDuplicateTools(lastEntry.items, streamItems)) return entries;
  const previousLast = lastEntry.items.at(-1);
  const firstStream = streamItems[0];
  const nextItems = previousLast?.kind === "tools" && firstStream?.kind === "tools"
    ? [...lastEntry.items.slice(0, -1), { ...previousLast, tools: [...previousLast.tools, ...firstStream.tools] }, ...streamItems.slice(1)]
    : [...lastEntry.items, ...streamItems];
  return [...entries.slice(0, -1), { ...lastEntry, items: nextItems }];
}

export function estimateCoworkStreamTokens(snapshot: CoworkStreamSnapshot) {
  if (!snapshot) return 0;
  const charCount = snapshot.blocks.reduce((total, block) => total + (block.kind === "tool" ? block.partialJson.length : block.text.length), 0);
  return Math.round(charCount / 4);
}

function hasDuplicateTools(existing: CoworkTranscriptItem[], incoming: CoworkTranscriptItem[]) {
  const incomingIds = new Set(incoming.flatMap((item) => item.kind === "tools" ? item.tools.map((tool) => tool.id) : []));
  if (incomingIds.size === 0) return false;
  const existingIds = new Set(existing.flatMap((item) => item.kind === "tools" ? item.tools.map((tool) => tool.id) : []));
  return [...incomingIds].some((id) => existingIds.has(id));
}

function streamSnapshotItems(snapshot: NonNullable<CoworkStreamSnapshot>) {
  const items: CoworkTranscriptItem[] = [];
  let tools: CoworkToolUse[] = [];
  let thinking: string[] = [];
  const flushThinking = () => {
    thinking.forEach((text) => items.push({ id: `${snapshot.messageId}-thinking-${items.length}`, kind: "thinking", text }));
    thinking = [];
  };
  const flushTools = () => {
    if (tools.length) items.push({ id: `${snapshot.messageId}-tools-${items.length}`, kind: "tools", tools });
    tools = [];
  };
  for (const block of snapshot.blocks) {
    if (block.kind === "thinking") {
      if (block.text.trim()) thinking.push(block.text.trim());
    } else if (block.kind === "text") {
      if (!block.text) continue;
      flushTools();
      flushThinking();
      items.push({ id: `${snapshot.messageId}-text-${items.length}`, kind: "text", text: block.text });
    } else {
      flushThinking();
      tools.push({ id: block.id, input: parseJsonObject(block.partialJson) ?? {}, name: block.name, status: "running" });
    }
  }
  flushTools();
  flushThinking();
  return items;
}
