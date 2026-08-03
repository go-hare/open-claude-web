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

  it("GFM pipe tables stay paragraph (official ae/bb has no table kind)", () => {
    // Official c93 class ae / c119 bb: no kind:"table" — pipes are paragraph lines.
    // GFM <table> only exists on kb+xd jb path (remark-gfm + mb.table).
    const engine = new AlluviumIncrementalEngine();
    engine.feed("| 项 | 值 |\n|----|-----|\n| Run | a |\n\n");
    const snap = engine.snapshot(true);
    expect(snap.committed.some((b) => (b as { kind: string }).kind === "table")).toBe(false);
    const para = snap.committed.find((b) => b.kind === "paragraph");
    expect(para?.kind).toBe("paragraph");
    if (para?.kind === "paragraph") {
      const flat = para.lines.map((line) =>
        line.map((n) => (n.kind === "text" || n.kind === "code" ? n.value : "")).join(""),
      );
      expect(flat.some((line) => line.includes("|"))).toBe(true);
    }
  });
});
