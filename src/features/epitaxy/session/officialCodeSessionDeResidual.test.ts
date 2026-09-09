import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));

function readSrc(name: string): string {
  return readFileSync(join(dir, name), "utf8");
}

describe("official De / he residual (c4bf De, index-BELzQL5P he)", () => {
  it("store has Wke lifecycle fields and he.openSession/releaseSession", () => {
    const store = readSrc("officialCodeSessionStore.ts");
    expect(store).toContain("sub: OfficialCodeSessionSub | null");
    expect(store).toContain("pendingClose: boolean");
    expect(store).toContain("evictTimer:");
    expect(store).toContain("refCount: number");
    expect(store).toContain("openSessionTransport:");
    expect(store).toContain("releaseSession:");
    expect(store).toContain("OFFICIAL_CODE_SESSION_PENDING_CLOSE_MS = 36e4");
    expect(store).toContain("resetOnCleared:");
    expect(store).toContain('connection: "idle"');
    expect(store).toContain("promptSuggestion: null");
    expect(store).toContain("seenUuids: new Set()");
    expect(store).toContain("contextTokens: null");
    expect(store).toContain("contextUsage: null");
    expect(store).not.toContain("streamSnapshot:");
    expect(store).not.toContain("setStreamSnapshot");
  });

  it("De hook binds transport on mount and releaseSession on unmount", () => {
    const hook = readSrc("useEpitaxySessionData.tsx");
    expect(hook).toContain("openSessionTransport");
    expect(hook).toContain("releaseSession");
    expect(hook).toContain("officialCodeLocalTransport");
    expect(hook).not.toContain("createOfficialCodeLocalTransport()");
    expect(hook).toContain("existing?.sub");
    expect(hook).toContain("bucket.streamingMessageId");
    expect(hook).toContain("fetchTranscript");
    expect(hook).not.toContain("Soft meta refresh is best-effort");
    expect(hook).not.toContain("const offCode = desktopBridge.LocalSessions.onEvent");
    expect(hook).not.toContain("existing.streamSnapshot");
  });

  it("transport module is official U.subscribe + U.fetchTranscript", () => {
    const transport = readSrc("officialCodeSessionTransport.ts");
    expect(transport).toContain('import "./officialCodeSessionHostApply"');
    expect(transport).toContain("async fetchTranscript");
    expect(transport).toContain('onEvent({ type: "connection", state: "connected" })');
    expect(transport).toContain("officialCodeLocalTransport");
    expect(transport).not.toContain("fetchTail?:");
    expect(transport).not.toContain("async fetchTail");
  });

  it("host apply still handles initialization_status (official $s)", () => {
    const apply = readSrc("officialCodeSessionHostApply.ts");
    expect(apply).toContain('type === "initialization_status"');
    expect(apply).toContain('eventType === "initialization_status"');
    expect(apply).toContain('outerType === "connection"');
    expect(apply).toContain('outerType === "prompt_suggestion"');
  });

  it("cleared overlay keeps sub/connection/liveMeta/pendingClose/evictTimer/refCount", () => {
    const store = readSrc("officialCodeSessionStore.ts");
    expect(store).toContain("sub: prev.sub");
    expect(store).toContain("connection: prev.connection");
    expect(store).toContain("liveMeta: prev.liveMeta");
    expect(store).toContain("pendingClose: prev.pendingClose");
    expect(store).toContain("evictTimer: prev.evictTimer");
    expect(store).toContain("refCount: prev.refCount");
  });

  it("Qj _e residual: suppress class + absolute span + Tab/ArrowRight accept", () => {
    const editor = readSrc("../OfficialPromptEditor.tsx");
    expect(editor).toContain("[&_.is-editor-empty]:before:!content-['']");
    expect(editor).toContain("pointer-events-none absolute inset-y-0 left-0 right-[var(--h8)] truncate pl-p7 pt-[13px] text-heading text-t5");
    expect(editor).toContain('event.key === "Tab" || event.key === "ArrowRight"');
    const composer = readSrc("OfficialExistingSessionComposer.tsx");
    expect(composer).toContain("[&_.is-editor-empty]:before:!content-['']");
    expect(composer).toContain("pointer-events-none absolute inset-y-0 left-0 right-[var(--h8)] truncate pl-p7 pt-[13px] text-heading text-t5");
    expect(composer).toContain('event.key === "Tab" || event.key === "ArrowRight"');
    expect(composer).toContain("handleKeyDown:");
    expect((composer.match(/event\.key === "Tab" \|\| event\.key === "ArrowRight"/g) ?? []).length).toBe(1);
  });

  it("store live merge uses seenUuids.has (official zke)", () => {
    const store = readSrc("officialCodeSessionStore.ts");
    expect(store).toContain("prev.seenUuids.has(zke)");
    expect(store).toContain("function officialZke");
  });

  it("o_e residual: fC + tk consume Wke contextTokens", () => {
    const store = readSrc("officialCodeSessionStore.ts");
    expect(store).toContain("useOfficialCodeSessionContextTokens");
    const fC = readSrc("OfficialSummaryTranscriptBody.tsx");
    expect(fC).toContain("useOfficialCodeSessionContextTokens");
    expect(fC).not.toContain("getContextUsage");
    const tk = readSrc("../OfficialComposerUsageIndicator.tsx");
    expect(tk).toContain("useOfficialCodeSessionContextTokens");
    expect(tk).toContain("contextTokens ?? usage?.totalTokens ?? 0");
  });
});
