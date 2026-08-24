import { describe, expect, it, beforeEach } from "vitest";
import {
  confirmOfficialWorktreeDisposal,
  officialWorktreeDisposalStore,
} from "./officialWorktreeDisposalStore";

describe("officialWorktreeDisposalStore ($Yt / UYt)", () => {
  beforeEach(() => {
    const pending = officialWorktreeDisposalStore.getState().pending;
    if (pending) {
      pending.resolve(false);
      officialWorktreeDisposalStore.getState().close();
    }
  });

  it("proceeds when getUncommittedChanges missing", async () => {
    await expect(confirmOfficialWorktreeDisposal("s1", "archive")).resolves.toBe(true);
  });

  it("proceeds when changes empty", async () => {
    await expect(
      confirmOfficialWorktreeDisposal("s1", "delete", async () => []),
    ).resolves.toBe(true);
  });

  it("proceeds when getUncommittedChanges returns null (no managed worktree)", async () => {
    await expect(
      confirmOfficialWorktreeDisposal("s1", "archive", async () => null),
    ).resolves.toBe(true);
  });

  it("proceeds when getUncommittedChanges throws", async () => {
    await expect(
      confirmOfficialWorktreeDisposal("s1", "archive", async () => {
        throw new Error("git fail");
      }),
    ).resolves.toBe(true);
  });

  it("opens pending and resolves from dialog confirm/cancel", async () => {
    const promise = confirmOfficialWorktreeDisposal("s1", "archive", async () => [
      " M src/a.ts",
      "?? new.txt",
    ]);
    // $Yt awaits getUncommittedChanges before UYt.open
    await Promise.resolve();
    await Promise.resolve();
    const pending = officialWorktreeDisposalStore.getState().pending;
    expect(pending?.action).toBe("archive");
    expect(pending?.changes).toHaveLength(2);
    pending?.resolve(true);
    officialWorktreeDisposalStore.getState().close();
    await expect(promise).resolves.toBe(true);
  });
});
