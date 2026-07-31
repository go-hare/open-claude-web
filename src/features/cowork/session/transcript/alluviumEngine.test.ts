import { describe, expect, it } from "vitest";
import {
  AlluviumIncrementalEngine,
  parseAlluviumInline,
} from "./alluviumEngine";

describe("parseAlluviumInline", () => {
  it("parses strong/em/code", () => {
    const nodes = parseAlluviumInline("**bold** and *em* and `code`", true);
    expect(nodes.some((n) => n.kind === "strong")).toBe(true);
    expect(nodes.some((n) => n.kind === "em")).toBe(true);
    expect(nodes.some((n) => n.kind === "code")).toBe(true);
  });

  it("holds open markers when not finalized", () => {
    const nodes = parseAlluviumInline("**open", false);
    expect(nodes.some((n) => n.kind === "strong" && n.open === true)).toBe(true);
  });
});

describe("AlluviumIncrementalEngine", () => {
  it("commits completed paragraphs and keeps frontier while streaming", () => {
    const engine = new AlluviumIncrementalEngine();
    engine.feed("# Title\n\nHello ");
    const mid = engine.snapshot(false);
    expect(mid.committed.some((b) => b.kind === "heading")).toBe(true);
    expect(
      mid.frontier.some((b) => b.kind === "paragraph") ||
        mid.committed.some((b) => b.kind === "paragraph"),
    ).toBe(true);

    engine.feed("world\n\n");
    const done = engine.snapshot(true);
    expect(done.committed.length).toBeGreaterThan(0);
    const para = done.committed.find((b) => b.kind === "paragraph");
    expect(para).toBeTruthy();
  });

  it("resets on non-prefix rewrite", () => {
    const engine = new AlluviumIncrementalEngine();
    engine.feed("alpha\n\n");
    engine.reset();
    engine.feed("beta\n\n");
    const snap = engine.snapshot(true);
    const text = JSON.stringify(snap);
    expect(text).toContain("beta");
    expect(text).not.toContain("alpha");
  });

  it("handles fenced code blocks", () => {
    const engine = new AlluviumIncrementalEngine();
    engine.feed("```ts\nconst x = 1\n```\n");
    const snap = engine.snapshot(true);
    expect(snap.committed.some((b) => b.kind === "fence")).toBe(true);
    const fence = snap.committed.find((b) => b.kind === "fence");
    if (fence?.kind === "fence") {
      expect(fence.lang).toBe("ts");
      expect(fence.code).toContain("const x = 1");
    }
  });
});
