import { beforeEach, describe, expect, it } from "vitest";
import {
  COWORK_MODEL_CONTEXT_TOKEN_CHECK,
  coworkModelContextStore,
  createCoworkModelContextTooLargeError,
  createCoworkUpdateModelContext,
  estimateCoworkModelContextTextTokens,
  getCoworkModelContextToolStates,
  isCoworkModelContextTooLargeError,
  mapCoworkModelContextBlocksToToolContent,
  resolveCoworkComposerToolStates,
} from "./coworkModelContextStore";

describe("coworkModelContextStore residual (Kte/Zte/Yte)", () => {
  beforeEach(() => {
    coworkModelContextStore.setState({ statesByConversation: {} });
  });

  it("estimate text tokens matches floor(utf8/4.5)", () => {
    expect(estimateCoworkModelContextTextTokens("hello")).toBe(
      Math.floor(new TextEncoder().encode("hello").length / 4.5),
    );
  });

  it("map blocks → tool content residual shapes", () => {
    expect(
      mapCoworkModelContextBlocksToToolContent([
        { type: "text", text: "hi" },
        { type: "image", data: "abc", mimeType: "image/png" },
      ]),
    ).toEqual([
      { type: "text", text: "hi" },
      { type: "image", data: "abc", media_type: "image/png" },
    ]);
  });

  it("updateModelContext stores tool_name + content under conversation", async () => {
    await coworkModelContextStore.getState().updateModelContext("conv-1", "mcp__demo__widget", [
      { type: "text", text: "selected: A" },
    ]);
    const states = getCoworkModelContextToolStates("conv-1");
    expect(states).toEqual([
      {
        tool_name: "mcp__demo__widget",
        content: [{ type: "text", text: "selected: A" }],
      },
    ]);
  });

  it("updateModelContext overwrites same tool_name", async () => {
    const update = createCoworkUpdateModelContext("conv-2", "widget_a");
    await update([{ type: "text", text: "v1" }]);
    await update([{ type: "text", text: "v2" }]);
    expect(getCoworkModelContextToolStates("conv-2")).toEqual([
      { tool_name: "widget_a", content: [{ type: "text", text: "v2" }] },
    ]);
  });

  it("Yte no-op when conversation or tool missing", async () => {
    const noop = createCoworkUpdateModelContext(undefined, "t");
    await noop([{ type: "text", text: "x" }]);
    expect(getCoworkModelContextToolStates("anything")).toEqual([]);
  });

  it("getModelContextStates empty for unknown conversation", () => {
    expect(getCoworkModelContextToolStates("missing")).toEqual([]);
    expect(getCoworkModelContextToolStates(undefined)).toEqual([]);
  });

  it("clearConversationStates drops bucket", async () => {
    await coworkModelContextStore.getState().updateModelContext("c", "t", [
      { type: "text", text: "x" },
    ]);
    coworkModelContextStore.getState().clearConversationStates("c");
    expect(getCoworkModelContextToolStates("c")).toEqual([]);
  });

  it("resolveCoworkComposerToolStates gates on a6k + non-empty", async () => {
    await coworkModelContextStore.getState().updateModelContext("s1", "w", [
      { type: "text", text: "ctx" },
    ]);
    expect(resolveCoworkComposerToolStates("s1", { a6kEnabled: false })).toBeUndefined();
    expect(resolveCoworkComposerToolStates("s1", { a6kEnabled: true })).toEqual([
      { tool_name: "w", content: [{ type: "text", text: "ctx" }] },
    ]);
    expect(resolveCoworkComposerToolStates("empty", { a6kEnabled: true })).toBeUndefined();
  });

  it("throws ModelContextTooLargeError when over residual check", async () => {
    // Force over check with oversized text estimate without inventing API.
    const huge = "x".repeat(COWORK_MODEL_CONTEXT_TOKEN_CHECK * 5);
    await expect(
      coworkModelContextStore.getState().updateModelContext("big", "tool", [
        { type: "text", text: huge },
      ]),
    ).rejects.toSatisfy((err: unknown) => isCoworkModelContextTooLargeError(err));
  });

  it("ModelContextTooLargeError shape residual", () => {
    const err = createCoworkModelContextTooLargeError("t", 20_000);
    expect(err.name).toBe("ModelContextTooLargeError");
    expect(err.toolName).toBe("t");
    expect(err.tokens).toBe(20_000);
    expect(err.maxTokens).toBe(16_000);
    expect(err.message).toContain("16");
  });
});
