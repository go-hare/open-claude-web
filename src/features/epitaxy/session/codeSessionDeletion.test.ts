import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteMock,
  archiveMock,
  removeSessionMock,
  clearEkeMock,
  streamDropMock,
  clearTurnMock,
  planClearMock,
  previewClearMock,
} = vi.hoisted(() => ({
  deleteMock: vi.fn(),
  archiveMock: vi.fn(),
  removeSessionMock: vi.fn(),
  clearEkeMock: vi.fn(),
  streamDropMock: vi.fn(),
  clearTurnMock: vi.fn(),
  planClearMock: vi.fn(),
  previewClearMock: vi.fn(),
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

vi.mock("../../../adapters/desktopBridge", () => ({
  desktopBridge: {
    LocalSessions: {
      delete: (...args: unknown[]) => deleteMock(...args),
      archive: (...args: unknown[]) => archiveMock(...args),
    },
  },
}));

vi.mock("./officialCodeSessionStore", () => ({
  officialCodeSessionStore: {
    getState: () => ({
      removeSession: removeSessionMock,
    }),
  },
}));

vi.mock("./officialTranscriptParse", () => ({
  clearOfficialEkeCache: (...args: unknown[]) => clearEkeMock(...args),
}));

vi.mock("./officialStreamSessionStore", () => ({
  officialStreamDrop: (...args: unknown[]) => streamDropMock(...args),
  officialClearTurnStarted: (...args: unknown[]) => clearTurnMock(...args),
}));

vi.mock("./officialPlanCommentsStore", () => ({
  officialPlanCommentsApi: {
    clear: (...args: unknown[]) => planClearMock(...args),
  },
}));

vi.mock("./previewAnnotationQueue", () => ({
  previewAnnotationQueue: {
    getState: () => ({
      clearSession: (...args: unknown[]) => previewClearMock(...args),
    }),
  },
}));

import {
  CODE_SESSION_ARCHIVED_EVENT,
  CODE_SESSION_DELETED_EVENT,
  archiveCodeSession,
  deleteCodeSession,
  resolveDeletedCodeSessionFallback,
} from "./codeSessionDeletion";

describe("resolveDeletedCodeSessionFallback", () => {
  const sessions = [
    { id: "a", kind: "code" as const, sessionKind: "code" as const },
    { id: "b", kind: "code" as const, sessionKind: "code" as const },
    { id: "c", kind: "code" as const, sessionKind: "code" as const },
  ];

  it("prefers next over previous", () => {
    expect(resolveDeletedCodeSessionFallback(sessions, "b")).toBe("/code/c");
  });

  it("falls back to previous at the end", () => {
    expect(resolveDeletedCodeSessionFallback(sessions, "c")).toBe("/code/b");
  });

  it("falls back to next at the start", () => {
    expect(resolveDeletedCodeSessionFallback(sessions, "a")).toBe("/code/b");
  });

  it("returns /code for the only session", () => {
    expect(resolveDeletedCodeSessionFallback([sessions[0]], "a")).toBe("/code");
  });

  it("returns /code when id is missing from order", () => {
    expect(resolveDeletedCodeSessionFallback(sessions, "missing")).toBe("/code");
  });
});

describe("deleteCodeSession", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    archiveMock.mockReset();
    removeSessionMock.mockReset();
    clearEkeMock.mockReset();
    streamDropMock.mockReset();
    clearTurnMock.mockReset();
    planClearMock.mockReset();
    previewClearMock.mockReset();
  });

  it("clears caches and emits only on bridge success", async () => {
    deleteMock.mockResolvedValue(undefined);
    const events: string[] = [];
    const onDeleted = (event: Event) => {
      events.push((event as CustomEvent).detail.sessionId);
    };
    window.addEventListener(CODE_SESSION_DELETED_EVENT, onDeleted as EventListener);
    const ok = await deleteCodeSession("s1");
    window.removeEventListener(CODE_SESSION_DELETED_EVENT, onDeleted as EventListener);

    expect(ok).toBe(true);
    expect(deleteMock).toHaveBeenCalledWith("s1");
    expect(removeSessionMock).toHaveBeenCalledWith("s1");
    expect(clearEkeMock).toHaveBeenCalledWith("s1");
    expect(streamDropMock).toHaveBeenCalledWith("s1");
    expect(clearTurnMock).toHaveBeenCalledWith("s1");
    expect(planClearMock).toHaveBeenCalledWith("s1");
    expect(previewClearMock).toHaveBeenCalledWith("s1");
    expect(events).toEqual(["s1"]);
  });

  it("does not clear or emit on bridge failure", async () => {
    deleteMock.mockRejectedValue(new Error("nope"));
    const events: string[] = [];
    const onDeleted = (event: Event) => {
      events.push((event as CustomEvent).detail.sessionId);
    };
    window.addEventListener(CODE_SESSION_DELETED_EVENT, onDeleted as EventListener);
    const ok = await deleteCodeSession("s1");
    window.removeEventListener(CODE_SESSION_DELETED_EVENT, onDeleted as EventListener);

    expect(ok).toBe(false);
    expect(removeSessionMock).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it("dedupes concurrent deletes for the same id", async () => {
    let resolveDelete: (() => void) | undefined;
    deleteMock.mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const first = deleteCodeSession("s2");
    const second = deleteCodeSession("s2");
    expect(deleteMock).toHaveBeenCalledTimes(1);
    resolveDelete?.();
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(removeSessionMock).toHaveBeenCalledTimes(1);
  });
});

describe("archiveCodeSession", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    archiveMock.mockReset();
    removeSessionMock.mockReset();
    clearEkeMock.mockReset();
    streamDropMock.mockReset();
    clearTurnMock.mockReset();
    planClearMock.mockReset();
    previewClearMock.mockReset();
  });

  it("clears caches and emits archived only on bridge success", async () => {
    archiveMock.mockResolvedValue(undefined);
    const events: string[] = [];
    const onArchived = (event: Event) => {
      events.push((event as CustomEvent).detail.sessionId);
    };
    window.addEventListener(CODE_SESSION_ARCHIVED_EVENT, onArchived as EventListener);
    const ok = await archiveCodeSession("s1");
    window.removeEventListener(CODE_SESSION_ARCHIVED_EVENT, onArchived as EventListener);

    expect(ok).toBe(true);
    expect(archiveMock).toHaveBeenCalledWith("s1");
    expect(deleteMock).not.toHaveBeenCalled();
    expect(removeSessionMock).toHaveBeenCalledWith("s1");
    expect(clearEkeMock).toHaveBeenCalledWith("s1");
    expect(streamDropMock).toHaveBeenCalledWith("s1");
    expect(events).toEqual(["s1"]);
  });

  it("does not clear or emit on bridge failure", async () => {
    archiveMock.mockRejectedValue(new Error("nope"));
    const events: string[] = [];
    const onArchived = (event: Event) => {
      events.push((event as CustomEvent).detail.sessionId);
    };
    window.addEventListener(CODE_SESSION_ARCHIVED_EVENT, onArchived as EventListener);
    const ok = await archiveCodeSession("s1");
    window.removeEventListener(CODE_SESSION_ARCHIVED_EVENT, onArchived as EventListener);

    expect(ok).toBe(false);
    expect(removeSessionMock).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it("dedupes concurrent archives for the same id", async () => {
    let resolveArchive: (() => void) | undefined;
    archiveMock.mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveArchive = resolve;
      }),
    );
    const first = archiveCodeSession("s3");
    const second = archiveCodeSession("s3");
    expect(archiveMock).toHaveBeenCalledTimes(1);
    resolveArchive?.();
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(archiveMock).toHaveBeenCalledTimes(1);
    expect(removeSessionMock).toHaveBeenCalledTimes(1);
  });
});
