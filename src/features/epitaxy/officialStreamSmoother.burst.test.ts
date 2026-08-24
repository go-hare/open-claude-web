import { afterEach, describe, expect, it, vi } from "vitest";
import { createOfficialSessionStreamSmoother } from "./officialStreamSmoother";

/**
 * Reproduces the 3p burst path that previously froze typewriter:
 * many arrivals land behind the 0.9*elapsed-0.3 deadline so minChars===maxChars
 * while the model is still not done. Official zE bisectLower(lower===upper)
 * returns that length and catches Va up; invent freeze dumped only at settle.
 */
describe("officialStreamSmoother burst catch-up", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reveals growing text mid-turn when arrivals burst behind the deadline", async () => {
    vi.useFakeTimers();
    const smoother = createOfficialSessionStreamSmoother();
    const lengths: number[] = [];
    smoother.subscribe((snap) => {
      if (!snap) return;
      const len = snap.blocks.reduce((n, b) => {
        if (b.kind === "text") return n + b.text.length;
        if (b.kind === "tool") return n + b.partialJson.length;
        return n;
      }, 0);
      if (lengths[lengths.length - 1] !== len) lengths.push(len);
    });

    const messageId = "msg_burst_test_1";
    smoother.feed({
      type: "stream_event",
      parent_tool_use_id: null,
      event: {
        type: "message_start",
        message: { id: messageId, role: "assistant", content: [] },
      },
    });

    smoother.feed({
      type: "stream_event",
      parent_tool_use_id: null,
      event: {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      },
    });

    // Burst many deltas in the same ~0ms wall clock (fake timers frozen),
    // then advance PE ticks so the reveal loop can catch up.
    const chunks = [
      "One two three four five. ",
      "Six seven eight nine ten. ",
      "Eleven twelve thirteen fourteen fifteen. ",
      "Sixteen seventeen eighteen nineteen twenty. ",
      "Twenty-one twenty-two twenty-three twenty-four twenty-five. ",
    ];
    for (const text of chunks) {
      smoother.feed({
        type: "stream_event",
        parent_tool_use_id: null,
        event: {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text },
        },
      });
    }

    // Advance ~30 PE frames (~500ms) while model still open — must grow before message_stop.
    for (let i = 0; i < 30; i += 1) {
      await vi.advanceTimersByTimeAsync(1000 / 60);
    }

    const midMax = lengths.length ? Math.max(...lengths) : 0;
    expect(midMax).toBeGreaterThan(40);
    expect(lengths.some((n, i) => i > 0 && n > lengths[0])).toBe(true);

    smoother.feed({
      type: "stream_event",
      parent_tool_use_id: null,
      event: { type: "content_block_stop", index: 0 },
    });
    smoother.feed({
      type: "stream_event",
      parent_tool_use_id: null,
      event: { type: "message_stop" },
    });

    for (let i = 0; i < 60; i += 1) {
      await vi.advanceTimersByTimeAsync(1000 / 60);
    }

    const full = chunks.join("").length;
    expect(Math.max(...lengths)).toBeGreaterThanOrEqual(full - 1);
    smoother.dispose();
  });
});
