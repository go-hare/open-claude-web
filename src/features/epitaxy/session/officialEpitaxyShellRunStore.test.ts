import { beforeEach, describe, expect, it } from "vitest";
import {
  officialAsciinemaPlayCommand,
  officialEpitaxyShellRunStore,
  officialFlushPendingShellCommand,
  officialInlineRunSnapshot,
  officialStripInlineRunTrailingPrompt,
  resetOfficialEpitaxyShellRunStoreForTests,
} from "./officialEpitaxyShellRunStore";

describe("officialEpitaxyShellRunStore (Grt queueCommand)", () => {
  beforeEach(() => {
    resetOfficialEpitaxyShellRunStoreForTests();
  });

  it("queueCommand stores sessionId and appends CR", () => {
    officialEpitaxyShellRunStore.getState().queueCommand("ses_1", "ls -la");
    expect(officialEpitaxyShellRunStore.getState().pendingCommand).toEqual({
      sessionId: "ses_1",
      command: "ls -la\r",
    });
  });

  it("clearPendingCommand wipes the slot", () => {
    officialEpitaxyShellRunStore.getState().queueCommand("ses_1", "pwd");
    officialEpitaxyShellRunStore.getState().clearPendingCommand();
    expect(officialEpitaxyShellRunStore.getState().pendingCommand).toBeNull();
  });

  it("flush writes default-tab pty key then clears", () => {
    officialEpitaxyShellRunStore.getState().queueCommand("ses_1", "echo hi");
    const writes: Array<[string, string]> = [];
    expect(officialFlushPendingShellCommand("ses_1", (key, data) => writes.push([key, data]))).toBe(true);
    expect(writes).toEqual([["ses_1", "echo hi\r"]]);
    expect(officialEpitaxyShellRunStore.getState().pendingCommand).toBeNull();
  });

  it("runInline stores pendingCommand and fence run", () => {
    officialEpitaxyShellRunStore.getState().runInline("run-1", "ses_1", "ls");
    expect(officialEpitaxyShellRunStore.getState().pendingCommand).toEqual({
      sessionId: "ses_1",
      command: "ls\r",
    });
    expect(officialEpitaxyShellRunStore.getState().inlineRun).toMatchObject({
      id: "run-1",
      sessionId: "ses_1",
      output: "",
      settled: false,
    });
  });

  it("appendInlineOutput caps and strip helper drops trailing prompt repeats", () => {
    officialEpitaxyShellRunStore.getState().runInline("run-1", "ses_1", "ls");
    officialEpitaxyShellRunStore.getState().appendInlineOutput("ses_1", "hello\n$ \n$ ");
    const output = officialEpitaxyShellRunStore.getState().inlineRun?.output ?? "";
    expect(output).toContain("hello");
    expect(officialStripInlineRunTrailingPrompt("hello\n$\n$")).toBe("hello");
  });

  it("active inline snapshot stays referentially stable until the run changes", () => {
    officialEpitaxyShellRunStore.getState().runInline("run-1", "ses_1", "./bin/server.exe");
    const first = officialInlineRunSnapshot("run-1");
    const again = officialInlineRunSnapshot("run-1");
    expect(again).toBe(first);
    expect(first).toMatchObject({ error: null, output: "", running: true });
    expect(officialInlineRunSnapshot("other")).toBe(officialInlineRunSnapshot("other"));
    officialEpitaxyShellRunStore.getState().appendInlineOutput("ses_1", "booting\n");
    const next = officialInlineRunSnapshot("run-1");
    expect(next).not.toBe(first);
    expect(next.output).toContain("booting");
    expect(officialInlineRunSnapshot("run-1")).toBe(next);
  });

  it("asciinema command quotes the path", () => {
    expect(officialAsciinemaPlayCommand("/tmp/foo's.cast")).toBe("asciinema play -- '/tmp/foo'\\''s.cast'");
  });
});
