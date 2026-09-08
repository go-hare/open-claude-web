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
  });

  it("De hook binds transport on mount and releaseSession on unmount", () => {
    const hook = readSrc("useEpitaxySessionData.tsx");
    expect(hook).toContain("openSessionTransport");
    expect(hook).toContain("releaseSession");
    expect(hook).toContain("createOfficialCodeLocalTransport");
    expect(hook).toContain("existing?.sub");
    expect(hook).toContain("bucket.streamingMessageId");
    expect(hook).not.toContain("Soft meta refresh is best-effort");
    expect(hook).not.toContain("const offCode = desktopBridge.LocalSessions.onEvent");
  });

  it("transport module binds hostApply so De does not depend on hook side-effect", () => {
    const transport = readSrc("officialCodeSessionTransport.ts");
    expect(transport).toContain('import "./officialCodeSessionHostApply"');
    expect(transport).not.toContain("fetchTranscript?:");
    expect(transport).not.toContain("async fetchTranscript");
    expect(transport).not.toContain("fetchTail?:");
  });

  it("host apply still handles initialization_status (official $s)", () => {
    const apply = readSrc("officialCodeSessionHostApply.ts");
    expect(apply).toContain('type === "initialization_status"');
    expect(apply).toContain('eventType === "initialization_status"');
  });

  it("cleared overlay keeps sub/liveMeta/pendingClose/evictTimer/refCount", () => {
    const store = readSrc("officialCodeSessionStore.ts");
    expect(store).toContain("sub: prev.sub");
    expect(store).toContain("liveMeta: prev.liveMeta");
    expect(store).toContain("pendingClose: prev.pendingClose");
    expect(store).toContain("evictTimer: prev.evictTimer");
    expect(store).toContain("refCount: prev.refCount");
  });
});
