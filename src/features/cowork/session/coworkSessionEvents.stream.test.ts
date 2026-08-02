/**
 * Cowork stream residual gates (index-BELzQL5P Pke / LocalAgent message path).
 */
import { describe, expect, it } from "vitest";
import {
  coworkStreamMessage,
  coworkStreamMessageId,
  shouldClearCoworkStream,
  shouldSettleCoworkStream,
} from "./coworkSessionEvents";

describe("coworkStreamMessage residual", () => {
  it("unwraps nested {type:message, message:stream_event}", () => {
    const inner = {
      type: "stream_event",
      parent_tool_use_id: null,
      event: { type: "message_start", message: { id: "msg_1" } },
      uuid: "outer-uuid",
    };
    expect(coworkStreamMessage({ type: "message", sessionId: "s", message: inner })).toEqual(inner);
  });

  it("accepts bare stream_event (defensive)", () => {
    const bare = { type: "stream_event", event: { type: "message_stop" }, parent_tool_use_id: null };
    expect(coworkStreamMessage(bare)).toEqual(bare);
  });
});

describe("coworkStreamMessageId residual", () => {
  it("uses Anthropic event.message.id only — never outer uuid", () => {
    expect(
      coworkStreamMessageId({
        type: "stream_event",
        uuid: "outer-uuid-must-not-win",
        event: { type: "message_start", message: { id: "msg_api_1" } },
      }),
    ).toBe("msg_api_1");
  });

  it("returns null when API id missing (no outer-uuid fallback)", () => {
    expect(
      coworkStreamMessageId({
        type: "stream_event",
        uuid: "outer-only",
        event: { type: "content_block_delta", delta: { type: "text_delta", text: "x" } },
      }),
    ).toBeNull();
  });
});

describe("cowork settle residual", () => {
  it("settles on nested result message", () => {
    expect(
      shouldSettleCoworkStream({
        type: "message",
        message: { type: "result", subtype: "success" },
      }),
    ).toBe(true);
  });

  it("clears stream on result/error/close", () => {
    expect(shouldClearCoworkStream({ type: "message", message: { type: "result" } })).toBe(true);
    expect(shouldClearCoworkStream({ type: "close" })).toBe(true);
    expect(shouldClearCoworkStream({ type: "message", message: { type: "assistant" } })).toBe(false);
  });
});
