/**
 * Residual Qw chapter list builder (c11959232) — pure unit coverage.
 */
import { describe, expect, it } from "vitest";
import type { TranscriptEntry } from "./officialTranscriptParse";

// Mirror buildOfficialTocChapters logic for pure test without React.
// Keep in sync with OfficialChapterToc.tsx list builder.

type Bag = {
  hidden: string[];
  renames: Record<string, string>;
  userChapters: Array<{ afterId: string; id: string; title: string }>;
};

function buildOfficialTocChapters(
  entries: TranscriptEntry[],
  bag: Bag,
) {
  const renames = bag.renames;
  const hidden = bag.hidden;
  const byAfterId = new Map<string, Bag["userChapters"]>();
  for (const chapter of bag.userChapters) {
    const existing = byAfterId.get(chapter.afterId);
    if (existing) existing.push(chapter);
    else byAfterId.set(chapter.afterId, [chapter]);
  }
  const list: Array<{
    entryId: string;
    id: string;
    source: "claude" | "user";
    summary?: string;
    title: string;
  }> = [];

  for (const entry of entries) {
    if (entry.author !== "assistant") continue;
    for (const item of entry.items) {
      const pinned = byAfterId.get(item.id);
      if (pinned) {
        for (const chapter of pinned) {
          list.push({
            id: chapter.id,
            title: chapter.title,
            source: "user",
            entryId: entry.id,
          });
        }
      }
      if (item.kind !== "chapter") continue;
      if (hidden.includes(item.id)) continue;
      list.push({
        id: item.id,
        title: renames[item.id] ?? item.title,
        summary: item.summary,
        source: "claude",
        entryId: entry.id,
      });
    }
  }
  return list;
}

describe("buildOfficialTocChapters (Qw residual)", () => {
  const entries: TranscriptEntry[] = [
    {
      id: "u1",
      author: "user",
      items: [{ id: "ut1", kind: "text", text: "hi" }],
    },
    {
      id: "a1",
      author: "assistant",
      items: [
        { id: "t1", kind: "text", text: "hello" },
        { id: "ch1", kind: "chapter", title: "Setup", summary: "first" },
        { id: "t2", kind: "text", text: "more" },
      ],
    },
  ];

  it("includes claude chapter items with renames and skips hidden", () => {
    const list = buildOfficialTocChapters(entries, {
      hidden: [],
      renames: { ch1: "Setup renamed" },
      userChapters: [],
    });
    expect(list).toEqual([
      {
        id: "ch1",
        title: "Setup renamed",
        summary: "first",
        source: "claude",
        entryId: "a1",
      },
    ]);

    const hidden = buildOfficialTocChapters(entries, {
      hidden: ["ch1"],
      renames: {},
      userChapters: [],
    });
    expect(hidden).toEqual([]);
  });

  it("includes user chapters keyed by afterId item id", () => {
    const list = buildOfficialTocChapters(entries, {
      hidden: [],
      renames: {},
      userChapters: [
        { afterId: "t1", id: "uch-1", title: "Pinned hello" },
        { afterId: "missing", id: "uch-2", title: "orphan" },
      ],
    });
    expect(list).toEqual([
      {
        id: "uch-1",
        title: "Pinned hello",
        source: "user",
        entryId: "a1",
      },
      {
        id: "ch1",
        title: "Setup",
        summary: "first",
        source: "claude",
        entryId: "a1",
      },
    ]);
  });
});
