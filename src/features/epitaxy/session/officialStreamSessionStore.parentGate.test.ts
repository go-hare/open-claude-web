/**
 * Residual: official Pke.feed parent gate — only strict null feeds main Va.
 * index-BELzQL5P: if (null !== parent) return;
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  officialStreamActiveMessageId,
  officialStreamClear,
  officialStreamDrop,
  officialStreamFeed,
} from "./officialStreamSessionStore";

const SESSION = "stream-parent-gate-test";

afterEach(() => {
  officialStreamDrop(SESSION);
});

function messageStart(id = "msg_main_1") {
  return {
    type: "message_start",
    message: { id, role: "assistant", content: [], model: "test" },
  };
}

describe("officialStreamFeed parent_tool_use_id residual", () => {
  it("feeds main turn when parent is strict null (3rd arg)", () => {
    officialStreamFeed(SESSION, messageStart(), null);
    expect(officialStreamActiveMessageId(SESSION)).toBe("msg_main_1");
  });

  it("feeds when envelope carries parent_tool_use_id: null (2-arg)", () => {
    officialStreamFeed(SESSION, {
      type: "stream_event",
      event: messageStart("msg_env_1"),
      parent_tool_use_id: null,
    });
    expect(officialStreamActiveMessageId(SESSION)).toBe("msg_env_1");
  });

  it("skips subagent parent id", () => {
    officialStreamFeed(SESSION, messageStart("msg_sub"), "toolu_parent_1");
    expect(officialStreamActiveMessageId(SESSION)).toBeNull();
  });

  it("skips when parent is undefined (missing / omitted residual)", () => {
    // 2-arg inner event with no parent field → parent resolves undefined → skip
    officialStreamFeed(SESSION, messageStart("msg_undef"));
    expect(officialStreamActiveMessageId(SESSION)).toBeNull();
  });

  it("does not treat null as missing via ?? fall-through", () => {
    // Explicit null 3rd arg must win even if envelope has a subagent id
    officialStreamFeed(
      SESSION,
      {
        type: "stream_event",
        event: messageStart("msg_null_wins"),
        parent_tool_use_id: "toolu_should_not_win",
      },
      null,
    );
    expect(officialStreamActiveMessageId(SESSION)).toBe("msg_null_wins");
    officialStreamClear(SESSION);
  });
});
