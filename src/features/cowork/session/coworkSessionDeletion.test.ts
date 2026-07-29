import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteMock,
  archiveMock,
  streamClearMock,
  streamDropMock,
  setMessagesMock,
} = vi.hoisted(() => ({
  deleteMock: vi.fn(),
  archiveMock: vi.fn(),
  streamClearMock: vi.fn(),
  streamDropMock: vi.fn(),
  setMessagesMock: vi.fn(),
}));

// Minimal window for node test env (no jsdom dependency).
if (typeof globalThis.window === "undefined") {
  const target = new EventTarget();
  (globalThis as typeof globalThis & { window: Window }).window = target as unknown as Window;
  (globalThis as typeof globalThis & { CustomEvent: typeof CustomEvent }).CustomEvent =
    class CustomEvent<T = unknown> extends Event {
      detail: T;
      constructor(type: string, init?: CustomEventInit<T>) {
        super(type, init);
        this.detail = (init?.detail ?? undefined) as T;
      }
    } as typeof CustomEvent;
}

vi.mock("./coworkSessionBridge", () => ({
  coworkSessionsBridge: {
    delete: (...args: unknown[]) => deleteMock(...args),
    archive: (...args: unknown[]) => archiveMock(...args),
  },
}));

vi.mock("../../epitaxy/session/officialStreamSessionStore", () => ({
  officialStreamClear: (...args: unknown[]) => streamClearMock(...args),
  officialStreamDrop: (...args: unknown[]) => streamDropMock(...args),
}));

vi.mock("./transcript/coworkMessagePathStore", () => ({
  coworkMessagePathStore: {
    getState: () => ({
      setMessages: (...args: unknown[]) => setMessagesMock(...args),
    }),
  },
}));

import {
  COWORK_SESSION_ARCHIVED_EVENT,
  COWORK_SESSION_DELETED_EVENT,
  archiveCoworkSession,
  deleteCoworkSession,
  resolveDeletedCoworkSessionFallback,
} from "./coworkSessionDeletion";

describe("resolveDeletedCoworkSessionFallback", () => {
  const sessions = [
    { id: "a", kind: "epitaxy" as const, sessionKind: "cowork" as const },
    { id: "b", kind: "epitaxy" as const, sessionKind: "cowork" as const },
    { id: "c", kind: "epitaxy" as const, sessionKind: "cowork" as const },
  ];

  it("prefers next over previous", () => {
    expect(resolveDeletedCoworkSessionFallback(sessions, "b")).toBe("/local_sessions/c");
  });

  it("falls back to previous at the end", () => {
    expect(resolveDeletedCoworkSessionFallback(sessions, "c")).toBe("/local_sessions/b");
  });

  it("falls back to next at the start", () => {
    expect(resolveDeletedCoworkSessionFallback(sessions, "a")).toBe("/local_sessions/b");
  });

  it("returns /task/new for the only session", () => {
    expect(resolveDeletedCoworkSessionFallback([sessions[0]], "a")).toBe("/task/new");
  });

  it("returns /task/new when id is missing from order", () => {
    expect(resolveDeletedCoworkSessionFallback(sessions, "missing")).toBe("/task/new");
  });
});

describe("deleteCoworkSession", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    archiveMock.mockReset();
    streamClearMock.mockReset();
    streamDropMock.mockReset();
    setMessagesMock.mockReset();
  });

  it("clears caches and emits only on bridge success", async () => {
    deleteMock.mockResolvedValue(undefined);
    const events: string[] = [];
    const onDeleted = (event: Event) => {
      events.push((event as CustomEvent).detail.sessionId);
    };
    window.addEventListener(COWORK_SESSION_DELETED_EVENT, onDeleted as EventListener);
    const ok = await deleteCoworkSession("s1");
    window.removeEventListener(COWORK_SESSION_DELETED_EVENT, onDeleted as EventListener);

    expect(ok).toBe(true);
    expect(deleteMock).toHaveBeenCalledWith("s1");
    expect(streamClearMock).toHaveBeenCalledWith("s1");
    expect(streamDropMock).toHaveBeenCalledWith("s1");
    expect(setMessagesMock).toHaveBeenCalledWith("s1", []);
    expect(events).toEqual(["s1"]);
  });

  it("does not clear or emit on bridge failure", async () => {
    deleteMock.mockRejectedValue(new Error("nope"));
    const events: string[] = [];
    const onDeleted = (event: Event) => {
      events.push((event as CustomEvent).detail.sessionId);
    };
    window.addEventListener(COWORK_SESSION_DELETED_EVENT, onDeleted as EventListener);
    const ok = await deleteCoworkSession("s1");
    window.removeEventListener(COWORK_SESSION_DELETED_EVENT, onDeleted as EventListener);

    expect(ok).toBe(false);
    expect(streamDropMock).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it("dedupes concurrent deletes for the same id", async () => {
    let resolveDelete: (() => void) | undefined;
    deleteMock.mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const first = deleteCoworkSession("s2");
    const second = deleteCoworkSession("s2");
    expect(deleteMock).toHaveBeenCalledTimes(1);
    resolveDelete?.();
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(streamDropMock).toHaveBeenCalledTimes(1);
  });
});

describe("archiveCoworkSession", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    archiveMock.mockReset();
    streamClearMock.mockReset();
    streamDropMock.mockReset();
    setMessagesMock.mockReset();
  });

  it("clears caches and emits archived only on bridge success", async () => {
    archiveMock.mockResolvedValue(undefined);
    const events: string[] = [];
    const onArchived = (event: Event) => {
      events.push((event as CustomEvent).detail.sessionId);
    };
    window.addEventListener(COWORK_SESSION_ARCHIVED_EVENT, onArchived as EventListener);
    const ok = await archiveCoworkSession("s1");
    window.removeEventListener(COWORK_SESSION_ARCHIVED_EVENT, onArchived as EventListener);

    expect(ok).toBe(true);
    expect(archiveMock).toHaveBeenCalledWith("s1");
    expect(deleteMock).not.toHaveBeenCalled();
    expect(streamClearMock).toHaveBeenCalledWith("s1");
    expect(streamDropMock).toHaveBeenCalledWith("s1");
    expect(events).toEqual(["s1"]);
  });

  it("does not clear or emit on bridge failure", async () => {
    archiveMock.mockRejectedValue(new Error("nope"));
    const events: string[] = [];
    const onArchived = (event: Event) => {
      events.push((event as CustomEvent).detail.sessionId);
    };
    window.addEventListener(COWORK_SESSION_ARCHIVED_EVENT, onArchived as EventListener);
    const ok = await archiveCoworkSession("s1");
    window.removeEventListener(COWORK_SESSION_ARCHIVED_EVENT, onArchived as EventListener);

    expect(ok).toBe(false);
    expect(streamDropMock).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it("dedupes concurrent archives for the same id", async () => {
    let resolveArchive: (() => void) | undefined;
    archiveMock.mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveArchive = resolve;
      }),
    );
    const first = archiveCoworkSession("s3");
    const second = archiveCoworkSession("s3");
    expect(archiveMock).toHaveBeenCalledTimes(1);
    resolveArchive?.();
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(archiveMock).toHaveBeenCalledTimes(1);
    expect(streamDropMock).toHaveBeenCalledTimes(1);
  });
});
