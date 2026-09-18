import { beforeEach, describe, expect, it } from "vitest";
import {
  officialSideChatStore,
  resetOfficialSideChatStoreForTests,
} from "./officialSideChatStore";

describe("officialSideChatStore (c4bf $())", () => {
  beforeEach(() => {
    resetOfficialSideChatStoreForTests();
  });

  it("toggle / close keyed by parent sessionId", () => {
    officialSideChatStore.getState().toggle("s1");
    expect(officialSideChatStore.getState().openBySession.s1).toBe(true);
    officialSideChatStore.getState().close("s1");
    expect(officialSideChatStore.getState().openBySession.s1).toBe(false);
  });

  it("openWith stores pending question", () => {
    officialSideChatStore.getState().openWith("s1", "hello");
    expect(officialSideChatStore.getState().openBySession.s1).toBe(true);
    expect(officialSideChatStore.getState().pendingQuestionBySession.s1).toBe("hello");
  });

  it("pushUserMessage replaces last user when queued", () => {
    officialSideChatStore.getState().pushUserMessage("s1", "a", false);
    officialSideChatStore.getState().pushUserMessage("s1", "b", true);
    expect(officialSideChatStore.getState().messagesBySession.s1).toEqual([
      { role: "user", text: "b" },
    ]);
  });

  it("evictSession drops all maps for that parent id", () => {
    officialSideChatStore.getState().toggle("s1");
    officialSideChatStore.getState().appendMessage("s1", { role: "assistant", text: "x" });
    officialSideChatStore.getState().evictSession("s1");
    expect(officialSideChatStore.getState().openBySession.s1).toBeUndefined();
    expect(officialSideChatStore.getState().messagesBySession.s1).toBeUndefined();
  });
});
