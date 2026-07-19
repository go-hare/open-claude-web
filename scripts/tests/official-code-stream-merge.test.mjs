/**
 * Code path Kwe/Gwe: Va typewriter must own Anthropic message.id.
 * If durable assistant with same id leaked into Xa (eke race / cache),
 * Gwe must NOT freeze full dump — replace with stream partial.
 */
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});

const { mergeOfficialStreamOntoTranscript } = await vite.ssrLoadModule(
  "/src/features/epitaxy/session/officialStreamTranscriptMerge.ts",
);

after(async () => {
  await vite.close();
});

test("same messageId durable dump is replaced by stream partial (typewriter ownership)", () => {
  const durable = [
    {
      author: "assistant",
      id: "api-msg-1",
      items: [{ id: "api-msg-1-t0", kind: "text", text: "Hello whole world dump" }],
    },
  ];
  const streamItems = [{ id: "api-msg-1-t0", kind: "text", text: "Hel" }];
  const merged = mergeOfficialStreamOntoTranscript(
    durable,
    { messageId: "api-msg-1", blocks: [{ kind: "text", text: "Hel" }] },
    streamItems,
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, "api-msg-1");
  assert.equal(merged[0].items[0].text, "Hel");
});

test("prior assistant with different id still appends stream (official Kwe)", () => {
  const durable = [
    {
      author: "assistant",
      id: "prior",
      items: [{ id: "prior-t0", kind: "text", text: "Earlier" }],
    },
  ];
  const streamItems = [{ id: "api-msg-2-t0", kind: "text", text: "Next" }];
  const merged = mergeOfficialStreamOntoTranscript(
    durable,
    { messageId: "api-msg-2", blocks: [{ kind: "text", text: "Next" }] },
    streamItems,
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, "prior");
  assert.equal(merged[0].items.length, 2);
  assert.equal(merged[0].items[1].text, "Next");
});

test("Gwe overlap on prior assistant returns durable unchanged", () => {
  const durable = [
    {
      author: "assistant",
      id: "prior",
      items: [{ id: "shared-id", kind: "text", text: "A" }],
    },
  ];
  const streamItems = [{ id: "shared-id", kind: "text", text: "B" }];
  const merged = mergeOfficialStreamOntoTranscript(
    durable,
    { messageId: "api-other", blocks: [{ kind: "text", text: "B" }] },
    streamItems,
  );
  assert.equal(merged, durable);
  assert.equal(merged[0].items[0].text, "A");
});
