import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  commitComposerDraftOnPersistKeyChange,
  freezeComposerDraft,
  getComposerDraftGeneration,
  persistComposerDraft,
  readComposerDraft,
  readComposerDraftAgent,
  resetOfficialComposerDraftStateForTests,
  writeComposerDraft,
} from "./officialComposerDraftStore";

const mem = new Map<string, string>();

beforeEach(() => {
  mem.clear();
  resetOfficialComposerDraftStateForTests();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  });
});

describe("officialComposerDraftStore (index-BELz OYt/PYt/DYt)", () => {
  it("writes composer-draft: JSON {text,files,agent} and reads it back", () => {
    writeComposerDraft("epitaxy-draft", {
      agent: "reviewer",
      files: [{ fileName: "a.ts", id: "1", isDirectory: false, relativePath: "src/a.ts" }],
      text: "hello",
    });
    expect(mem.get("composer-draft:epitaxy-draft")).toBe(
      JSON.stringify({
        text: "hello",
        files: [{ fileName: "a.ts", id: "1", isDirectory: false, relativePath: "src/a.ts" }],
        agent: "reviewer",
      }),
    );
    expect(readComposerDraft("epitaxy-draft")).toEqual({
      agent: "reviewer",
      files: [{ fileName: "a.ts", id: "1", isDirectory: false, relativePath: "src/a.ts" }],
      text: "hello",
    });
    expect(readComposerDraftAgent("epitaxy-draft")).toBe("reviewer");
  });

  it("removes the key when text/files/agent are all empty", () => {
    writeComposerDraft("epitaxy-1", { text: "x" });
    expect(mem.has("composer-draft:epitaxy-1")).toBe(true);
    writeComposerDraft("epitaxy-1", { files: [], text: "" });
    expect(mem.has("composer-draft:epitaxy-1")).toBe(false);
    expect(readComposerDraft("epitaxy-1")).toBeUndefined();
    expect(readComposerDraftAgent("epitaxy-1")).toBeUndefined();
  });

  it("does not invent an agent when the stored draft has none", () => {
    writeComposerDraft("epitaxy-2", { text: "only text" });
    expect(readComposerDraftAgent("epitaxy-2")).toBeUndefined();
    expect(JSON.parse(mem.get("composer-draft:epitaxy-2") ?? "{}")).not.toHaveProperty("agent");
  });

  it("DYt bumps generation so a stale flush can no-op", () => {
    expect(getComposerDraftGeneration("epitaxy-draft")).toBe(0);
    persistComposerDraft("epitaxy-draft", {});
    expect(getComposerDraftGeneration("epitaxy-draft")).toBe(1);
    expect(mem.has("composer-draft:epitaxy-draft")).toBe(false);
  });

  it("zYt freeze skips later OYt writes", () => {
    freezeComposerDraft("epitaxy-draft");
    writeComposerDraft("epitaxy-draft", { agent: "nope", text: "should not persist" });
    expect(mem.has("composer-draft:epitaxy-draft")).toBe(false);
    expect(readComposerDraftAgent("epitaxy-draft")).toBeUndefined();
  });

  it("start copies a real landing agent onto epitaxy-${id} then zo(uE)", () => {
    writeComposerDraft("epitaxy-draft", { agent: "reviewer", text: "go" });
    persistComposerDraft("epitaxy-abc", { agent: readComposerDraft("epitaxy-draft")?.agent });
    persistComposerDraft("epitaxy-draft", {});
    expect(readComposerDraftAgent("epitaxy-abc")).toBe("reviewer");
    expect(readComposerDraft("epitaxy-draft")).toBeUndefined();
  });

  it("same-panel A→B flushes the previous session key instead of wiping it", () => {
    writeComposerDraft("epitaxy-A", { agent: "reviewer", text: "draft-a" });
    commitComposerDraftOnPersistKeyChange(
      "epitaxy-A",
      "epitaxy-B",
      { agent: "reviewer", text: "draft-a" },
      getComposerDraftGeneration("epitaxy-A"),
    );
    expect(readComposerDraft("epitaxy-A")).toEqual({ agent: "reviewer", text: "draft-a" });
    expect(readComposerDraft("epitaxy-B")).toBeUndefined();
  });

  it("landing persistKey change wipes uE (official Mr(old,{stagedImages:[]}))", () => {
    writeComposerDraft("epitaxy-draft", { agent: "reviewer", text: "go" });
    commitComposerDraftOnPersistKeyChange(
      "epitaxy-draft",
      "epitaxy-abc",
      { agent: "reviewer", text: "go" },
      getComposerDraftGeneration("epitaxy-draft"),
    );
    expect(readComposerDraft("epitaxy-draft")).toBeUndefined();
  });

  it("RAM cap 20 evicts the oldest key from localStorage", () => {
    for (let i = 0; i < 21; i += 1) {
      writeComposerDraft(`k${i}`, { text: `t${i}` });
    }
    expect(mem.has("composer-draft:k0")).toBe(false);
    expect(mem.has("composer-draft:k20")).toBe(true);
    expect(readComposerDraft("k20")?.text).toBe("t20");
  });
});
