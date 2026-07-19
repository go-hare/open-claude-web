/**
 * Official Kwe / lo(Xa, Va) + Gwe (index-BELzQL5P) — stream merge onto durable transcript.
 * Extracted for unit tests; EpitaxySessionTile re-exports behavior via this module.
 */

export type OfficialMergeTranscriptItem =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "thinking"; text: string }
  | { id: string; kind: "tools"; tools: Array<{ id: string; name?: string; status?: string }> }
  | { id: string; kind: string; [key: string]: unknown };

export type OfficialMergeTranscriptEntry = {
  author: "assistant" | "user" | string;
  id: string;
  items: OfficialMergeTranscriptItem[];
  timestamp?: string;
};

export type OfficialMergeStreamSnapshot = {
  messageId: string;
  blocks: Array<
    | { kind: "text"; text: string }
    | { kind: "thinking"; text: string }
    | { id: string; kind: "tool"; name: string; partialJson: string }
  >;
} | null;

/**
 * Official Kwe(Xa, Va):
 * - !Va → Xa
 * - last.author === assistant && last.id === Va.messageId → Va replaces last (our port of
 *   eke-must-suppress; if durable leaked same id, never Gwe-return the dump)
 * - last.author === assistant → Gwe overlap → Xa else append/merge tools
 * - else append assistant entry id=Va.messageId
 */
export function mergeOfficialStreamOntoTranscript(
  entries: OfficialMergeTranscriptEntry[],
  snapshot: OfficialMergeStreamSnapshot,
  streamItems: OfficialMergeTranscriptItem[],
): OfficialMergeTranscriptEntry[] {
  if (!snapshot) return entries;
  if (streamItems.length === 0) return entries;

  const last = entries[entries.length - 1];
  if (last?.author === "assistant" && last.id === snapshot.messageId) {
    return [
      ...entries.slice(0, -1),
      {
        author: "assistant",
        id: snapshot.messageId,
        items: streamItems,
        ...(last.timestamp ? { timestamp: last.timestamp } : {}),
      },
    ];
  }
  if (last?.author === "assistant") {
    const streamIds = new Set<string>();
    collectItemIds(streamItems, streamIds);
    const lastIds = new Set<string>();
    collectItemIds(last.items, lastIds);
    for (const id of streamIds) {
      if (lastIds.has(id)) return entries;
    }
    const lastItem = last.items[last.items.length - 1];
    const firstStream = streamItems[0];
    const nextItems =
      lastItem?.kind === "tools" && firstStream?.kind === "tools"
        ? [
            ...last.items.slice(0, -1),
            {
              ...lastItem,
              tools: [
                ...(lastItem as { tools: Array<{ id: string }> }).tools,
                ...(firstStream as { tools: Array<{ id: string }> }).tools,
              ],
            },
            ...streamItems.slice(1),
          ]
        : [...last.items, ...streamItems];
    return [...entries.slice(0, -1), { ...last, items: nextItems }];
  }
  return [...entries, { author: "assistant", id: snapshot.messageId, items: streamItems }];
}

function collectItemIds(items: OfficialMergeTranscriptItem[], into: Set<string>) {
  for (const item of items) {
    into.add(item.id);
    if (item.kind === "tools" && Array.isArray(item.tools)) {
      for (const tool of item.tools) into.add(tool.id);
    }
  }
}
