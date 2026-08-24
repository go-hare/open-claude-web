import { beforeEach, describe, expect, it } from "vitest";
import type { ChatMessage } from "../../../adapters/desktopBridge/types";
import { officialCodeSessionStore } from "./officialCodeSessionStore";
import { parseOfficialTranscriptEntries } from "./officialTranscriptParse";

function queuedUser(id: string, text: string): ChatMessage {
  return {
    id,
    role: "user",
    text,
    createdAt: "2026-08-13T00:00:00.000Z",
    raw: {
      type: "user",
      uuid: id,
      isLocalOptimistic: true,
      message: { role: "user", content: [{ type: "text", text }] },
    },
  };
}

function interruptUser(): ChatMessage {
  return {
    id: "interrupt",
    role: "user",
    text: "[Request interrupted by user]",
    createdAt: "2026-08-13T00:00:01.000Z",
    raw: {
      type: "user",
      uuid: "interrupt",
      message: {
        role: "user",
        content: [{ type: "text", text: "[Request interrupted by user]" }],
      },
    },
  };
}

function resultErrorDuringExecution(id: string): ChatMessage {
  return {
    id,
    role: "assistant",
    text: "error",
    createdAt: "2026-08-13T00:00:03.000Z",
    raw: {
      type: "result",
      uuid: id,
      is_error: true,
      subtype: "error_during_execution",
      errors: ["error"],
    },
  };
}

describe("officialCodeSessionStore interrupt-then-continue", () => {
  beforeEach(() => {
    officialCodeSessionStore.setState({ buckets: {} });
  });

  it("promotes queuedMessages on normal settle (parent result / stream end)", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
    } as never, [interruptUser()]);
    officialCodeSessionStore.getState().enqueueQueuedMessage("s1", queuedUser("q1", "222"));

    officialCodeSessionStore.getState().clearStream("s1", true);

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.queuedMessages).toEqual([]);
    expect(bucket?.pendingQueuedSends).toBe(0);
    expect(bucket?.messages.some((message) => message.id === "q1")).toBe(true);
  });

  it("markInterrupting keeps queuedMessages and isRunning (official Wr)", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, [interruptUser()]);
    officialCodeSessionStore.getState().setStreamActivity("s1", {
      pendingTurnStartedAt: Date.now(),
      streamActivityMode: "responding",
      streamingMessageId: "live",
      isRunning: true,
    });
    officialCodeSessionStore.getState().enqueueQueuedMessage("s1", queuedUser("q1", "222"));
    officialCodeSessionStore.getState().enqueueQueuedMessage("s1", queuedUser("q2", "333"));

    officialCodeSessionStore.getState().markInterrupting("s1");

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.queuedMessages.map((message) => message.id)).toEqual(["q1", "q2"]);
    expect(bucket?.pendingTurnStartedAt).not.toBeNull();
    expect(bucket?.session?.isRunning).toBe(true);
    expect(bucket?.streamActivityMode).toBe("idle");
    expect(bucket?.streamingMessageId).toBeNull();
  });

  it("interrupt user stays in messages while queued follow-ups wait (jke)", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, []);
    officialCodeSessionStore.getState().setStreamActivity("s1", {
      pendingTurnStartedAt: Date.now(),
      isRunning: true,
    });
    officialCodeSessionStore.getState().noteQueuedSend("s1");
    officialCodeSessionStore.getState().enqueueQueuedMessage("s1", queuedUser("q1", "222"));
    officialCodeSessionStore.getState().mergeMessage("s1", interruptUser());
    officialCodeSessionStore.getState().mergeMessage("s1", resultErrorDuringExecution("r1"));

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.messages.map((message) => message.id)).toEqual(["interrupt", "r1", "q1"]);
    const entries = parseOfficialTranscriptEntries(bucket!.messages);
    expect(entries.some((entry) => entry.items.some((item) => item.kind === "turn_error"))).toBe(false);
    // Official Mke: interrupt user stays in messages for jke, but Ike emits no text Hb.
    expect(entries.some((entry) => entry.items.some((item) => item.kind === "text" && item.text.includes("interrupted")))).toBe(false);
  });

  it("result + queue continues (official g): promote after result, keep running", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, [interruptUser()]);
    officialCodeSessionStore.getState().setStreamActivity("s1", {
      pendingTurnStartedAt: Date.now(),
      isRunning: true,
    });
    officialCodeSessionStore.getState().enqueueQueuedMessage("s1", queuedUser("q1", "222"));
    officialCodeSessionStore.getState().enqueueQueuedMessage("s1", queuedUser("q2", "333"));

    officialCodeSessionStore.getState().mergeMessage("s1", resultErrorDuringExecution("r1"));

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.queuedMessages).toEqual([]);
    expect(bucket?.messages.map((message) => message.id)).toEqual(["interrupt", "r1", "q1", "q2"]);
    expect(bucket?.session?.isRunning).toBe(true);
    expect(bucket?.pendingTurnStartedAt).not.toBeNull();
    // jke: queued sit AFTER the interrupt result, so skip still holds.
    const entries = parseOfficialTranscriptEntries(bucket!.messages);
    expect(entries.some((entry) => entry.items.some((item) => item.kind === "turn_error"))).toBe(false);
  });

  it("promoteQueueAndContinue promotes after success result and keeps running", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, [interruptUser()]);
    officialCodeSessionStore.getState().setStreamActivity("s1", {
      pendingTurnStartedAt: Date.now(),
      isRunning: true,
    });
    officialCodeSessionStore.getState().enqueueQueuedMessage("s1", queuedUser("q1", "222"));

    expect(officialCodeSessionStore.getState().promoteQueueAndContinue("s1")).toBe(true);

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.queuedMessages).toEqual([]);
    expect(bucket?.messages.some((message) => message.id === "q1")).toBe(true);
    expect(bucket?.session?.isRunning).toBe(true);
    expect(bucket?.pendingTurnStartedAt).not.toBeNull();
  });

  it("empty-queue interrupt result clears pendingTurn (official !g)", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, []);
    officialCodeSessionStore.getState().setStreamActivity("s1", {
      pendingTurnStartedAt: Date.now(),
      isRunning: true,
    });
    officialCodeSessionStore.getState().mergeMessage("s1", interruptUser());
    officialCodeSessionStore.getState().mergeMessage("s1", resultErrorDuringExecution("r1"));

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.messages.map((message) => message.id)).toEqual(["interrupt", "r1"]);
    expect(bucket?.queuedMessages).toEqual([]);
    expect(bucket?.pendingTurnStartedAt).toBeNull();
    expect(bucket?.pendingQueuedSends).toBe(0);
  });

  it("hard stop discardQueued does not promote (stopSession teardown)", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
    } as never, [interruptUser()]);
    officialCodeSessionStore.getState().enqueueQueuedMessage("s1", queuedUser("q1", "222"));

    officialCodeSessionStore.getState().clearStream("s1", true, true);

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.queuedMessages).toEqual([]);
    expect(bucket?.messages.map((message) => message.id)).toEqual(["interrupt"]);
    expect(bucket?.session?.isRunning).toBe(false);
  });

  it("assistant end_turn does not promote queue (official p / BELz endTurnSeen only)", () => {
    // Official: p = end_turn → pendingTurn.endTurnSeen; g promotes only on result.
    // Promoting on end_turn invents and strips Hb isQueued (opacity + Remove).
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, [interruptUser()]);
    officialCodeSessionStore.getState().setStreamActivity("s1", {
      pendingTurnStartedAt: Date.now(),
      streamingMessageId: "msg_live",
      streamActivityMode: "responding",
      isRunning: true,
    });
    officialCodeSessionStore.getState().enqueueQueuedMessage("s1", queuedUser("q1", "6"));
    officialCodeSessionStore.getState().enqueueQueuedMessage("s1", queuedUser("q2", "6b"));

    const endTurn: ChatMessage = {
      id: "a-end",
      role: "assistant",
      text: "reply for current turn",
      createdAt: "2026-08-13T00:00:04.000Z",
      raw: {
        type: "assistant",
        uuid: "a-end",
        message: {
          id: "msg_live",
          role: "assistant",
          stop_reason: "end_turn",
          content: [{ type: "text", text: "reply for current turn" }],
        },
      },
    };
    officialCodeSessionStore.getState().mergeMessage("s1", endTurn);

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.queuedMessages.map((message) => message.id)).toEqual(["q1", "q2"]);
    // Residual p: end_turn → endTurnSeen only. Keep streamingMessageId / Va until result Pke.clear.
    expect(bucket?.streamingMessageId).toBe("msg_live");
    expect(bucket?.pendingTurnEndTurnSeen).toBe(true);
    expect(bucket?.pendingTurnStartedAt).not.toBeNull();
    expect(bucket?.messages.map((message) => message.id)).toEqual(["interrupt", "a-end"]);
    expect(bucket?.session?.isRunning).toBe(true);
  });

  it("parent result promotes queue (official g / h)", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, [interruptUser()]);
    officialCodeSessionStore.getState().setStreamActivity("s1", {
      pendingTurnStartedAt: Date.now(),
      isRunning: true,
    });
    officialCodeSessionStore.getState().enqueueQueuedMessage("s1", queuedUser("q1", "6"));
    officialCodeSessionStore.getState().enqueueQueuedMessage("s1", queuedUser("q2", "6b"));

    const result: ChatMessage = {
      id: "r1",
      role: "assistant",
      text: "",
      createdAt: "2026-08-13T00:00:05.000Z",
      raw: {
        type: "result",
        uuid: "r1",
        subtype: "success",
        is_error: false,
      },
    };
    officialCodeSessionStore.getState().mergeMessage("s1", result);

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.queuedMessages).toEqual([]);
    expect(bucket?.pendingQueuedSends).toBe(0);
    expect(bucket?.messages.map((message) => message.id)).toEqual([
      "interrupt",
      "r1",
      "q1",
      "q2",
    ]);
    expect(bucket?.pendingTurnStartedAt).not.toBeNull();
    expect(bucket?.session?.isRunning).toBe(true);
  });

  it("applyLoad drops pendingTurn when host idle even if web queue remains", () => {
    // Official H=Qke follows host/pendingTurn, not optimistic queuedMessages.
    // Real drainDeferredSends keeps host isRunning true; web-only queue after markNotRunning
    // must not sticky Stop/H.
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, [interruptUser()]);
    const generation = officialCodeSessionStore.getState().markLoading("s1", true);
    officialCodeSessionStore.getState().setStreamActivity("s1", {
      pendingTurnStartedAt: Date.now(),
      isRunning: true,
    });
    officialCodeSessionStore.getState().enqueueQueuedMessage("s1", queuedUser("q1", "6"));

    officialCodeSessionStore.getState().applyLoad("s1", generation, {
      session: {
        id: "s1",
        kind: "code",
        title: "S",
        updatedAtMs: 2,
        isRunning: false,
      } as never,
      messages: [interruptUser()],
    });

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.pendingTurnStartedAt).toBeNull();
    expect(bucket?.session?.isRunning).toBe(false);
    expect(bucket?.queuedMessages.map((message) => message.id)).toEqual(["q1"]);
  });

  it("openSession seeds pendingTurn when host isRunning (re-entry Qke)", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, [interruptUser()]);

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.session?.isRunning).toBe(true);
    expect(bucket?.pendingTurnStartedAt).not.toBeNull();
    expect(bucket?.pendingTurnEndTurnSeen).toBe(false);
  });

  it("openSession does not invent pendingTurn when host is idle", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: false,
    } as never, [interruptUser()]);

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.pendingTurnStartedAt).toBeNull();
  });

  it("openSession keeps host permissionMode for Mode pill first paint (be(n.permissionMode))", () => {
    // Create path residual: openSession(start result) before navigate so composer seed
    // is bypass/accept — not invent "default" (询问权限 flash).
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      permissionMode: "bypassPermissions",
    } as never);

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.session?.permissionMode).toBe("bypassPermissions");
  });

  it("applyLoad seeds pendingTurn from host isRunning when local turn missing", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: false,
    } as never, [interruptUser()]);
    // Force-clear any seed (idle host open leaves null; assert baseline).
    expect(officialCodeSessionStore.getState().buckets.s1?.pendingTurnStartedAt).toBeNull();

    const generation = officialCodeSessionStore.getState().markLoading("s1", true);
    officialCodeSessionStore.getState().applyLoad("s1", generation, {
      session: {
        id: "s1",
        kind: "code",
        title: "S",
        updatedAtMs: 2,
        isRunning: true,
      } as never,
      messages: [interruptUser()],
    });

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.session?.isRunning).toBe(true);
    expect(bucket?.pendingTurnStartedAt).not.toBeNull();
    expect(bucket?.pendingTurnEndTurnSeen).toBe(false);
  });

  it("mid-turn host pre-echo stays in queuedMessages (official d / isQueued), not main messages", () => {
    // Composer path: noteQueuedSend + enqueue optimistic; host then emits user with new uuid.
    // Must NOT paint main-transcript stack next to isQueued tail (user: 是队列).
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, [interruptUser()]);
    officialCodeSessionStore.getState().setStreamActivity("s1", {
      pendingTurnStartedAt: Date.now(),
      isRunning: true,
    });
    for (const [index, text] of ["3", "3", "2"].entries()) {
      officialCodeSessionStore.getState().noteQueuedSend("s1");
      officialCodeSessionStore.getState().enqueueQueuedMessage(
        "s1",
        queuedUser(`opt-${index}`, text),
      );
    }
    expect(officialCodeSessionStore.getState().buckets.s1?.pendingQueuedSends).toBe(3);
    expect(officialCodeSessionStore.getState().buckets.s1?.queuedMessages).toHaveLength(3);

    for (const [index, text] of ["3", "3", "2"].entries()) {
      officialCodeSessionStore.getState().mergeMessage("s1", {
        id: `host-${index}`,
        role: "user",
        text,
        createdAt: "2026-08-17T12:00:00.000Z",
        raw: {
          type: "user",
          uuid: `host-${index}`,
          message: { role: "user", content: [{ type: "text", text }] },
        },
      });
    }

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.messages.map((message) => message.id)).toEqual(["interrupt"]);
    expect(bucket?.queuedMessages.map((message) => message.id)).toEqual([
      "host-0",
      "host-1",
      "host-2",
    ]);
    expect(bucket?.pendingQueuedSends).toBe(0);
  });

  it("keeps each outer-uuid user as its own message (no multi-text invent-split)", () => {
    // Official residual: durable shape is CLI SoT. Host/CLI must emit 1 send → 1 user uuid.
    // Desktop must not invent-expand multi-text envelopes (CLI fix owns that).
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, []);
    for (const [index, text] of ["3", "3", "2"].entries()) {
      officialCodeSessionStore.getState().mergeMessage("s1", {
        id: `host-echo-${index}`,
        role: "user",
        text,
        createdAt: `2026-08-17T12:00:0${index}.000Z`,
        raw: {
          type: "user",
          uuid: `host-echo-${index}`,
          message: { role: "user", content: [{ type: "text", text }] },
        },
      });
    }
    expect(
      officialCodeSessionStore.getState().buckets.s1?.messages.map((message) => message.id),
    ).toEqual(["host-echo-0", "host-echo-1", "host-echo-2"]);
  });

  it("openSession keeps multi-text durable envelope as one message (CLI SoT)", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: false,
    } as never, [
      {
        id: "multi",
        role: "user",
        text: "3\n\n3\n\n2",
        createdAt: "2026-08-17T12:00:05.000Z",
        raw: {
          type: "user",
          uuid: "multi",
          message: {
            role: "user",
            content: [
              { type: "text", text: "3" },
              { type: "text", text: "3" },
              { type: "text", text: "2" },
            ],
          },
        },
      },
    ]);
    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.messages.map((message) => message.id)).toEqual(["multi"]);
    const entries = parseOfficialTranscriptEntries(bucket!.messages).filter(
      (entry) => entry.author === "user",
    );
    // Ike residual: multi text blocks → one text item (join), one user entry.
    expect(entries).toHaveLength(1);
  });

  it("patchSession seeds pendingTurn when host flips isRunning true", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: false,
    } as never, [interruptUser()]);
    expect(officialCodeSessionStore.getState().buckets.s1?.pendingTurnStartedAt).toBeNull();

    officialCodeSessionStore.getState().patchSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 2,
      isRunning: true,
    } as never);

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.session?.isRunning).toBe(true);
    expect(bucket?.pendingTurnStartedAt).not.toBeNull();
  });

  it("seed keeps existing pendingTurn / endTurnSeen (no re-stamp)", () => {
    const startedAt = 1_700_000_000_000;
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, [interruptUser()]);
    officialCodeSessionStore.getState().setStreamActivity("s1", {
      pendingTurnStartedAt: startedAt,
      isRunning: true,
    });
    // Simulate residual p (end_turn) without clearing pendingTurn.
    const endTurn: ChatMessage = {
      id: "a-end",
      role: "assistant",
      text: "done",
      createdAt: "2026-08-13T00:00:04.000Z",
      raw: {
        type: "assistant",
        uuid: "a-end",
        message: {
          id: "msg_end",
          role: "assistant",
          content: [{ type: "text", text: "done" }],
          stop_reason: "end_turn",
        },
      },
    };
    officialCodeSessionStore.getState().mergeMessage("s1", endTurn);
    expect(officialCodeSessionStore.getState().buckets.s1?.pendingTurnEndTurnSeen).toBe(true);

    officialCodeSessionStore.getState().patchSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 3,
      isRunning: true,
    } as never);

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.pendingTurnStartedAt).toBe(startedAt);
    expect(bucket?.pendingTurnEndTurnSeen).toBe(true);
  });

  it("patchSession does not invent isRunning from Va (official H=Qke)", () => {
    // Official session_updated mirrors host isRunning only. Va/streamingMessageId must
    // NOT force isRunning true or keep pendingTurn — that stuck Gv after markNotRunning
    // when Pe lagged (c119 busy:H = Qke; composer busy:H).
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, [interruptUser()]);
    officialCodeSessionStore.getState().setStreamActivity("s1", {
      streamingMessageId: "msg_live",
      streamActivityMode: "responding",
      isRunning: true,
    });

    officialCodeSessionStore.getState().patchSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 2,
      isRunning: false,
    } as never);

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.session?.isRunning).toBe(false);
    expect(bucket?.pendingTurnStartedAt).toBeNull();
    // Va ownership flags may linger until result Pke.clear — not H.
    expect(bucket?.streamingMessageId).toBe("msg_live");
  });

  it("patchSession does not invent isRunning from web queue (official session_updated)", () => {
    // Official session_updated mirrors host isRunning only. Web queuedMessages alone must
    // NOT force isRunning or keep pendingTurn — that stuck H/Gv after Esc markNotRunning
    // when host deferred was empty. Real drainDeferredSends keeps host isRunning true.
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, [interruptUser()]);
    officialCodeSessionStore.getState().enqueueQueuedMessage("s1", queuedUser("q1", "6"));

    officialCodeSessionStore.getState().patchSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 2,
      isRunning: false,
    } as never);

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.session?.isRunning).toBe(false);
    expect(bucket?.pendingTurnStartedAt).toBeNull();
    // Optimistic Hb queue may still show until result g / cancel — not H.
    expect(bucket?.queuedMessages.map((message) => message.id)).toEqual(["q1"]);
  });

  it("noteQueuedSend only bumps when pendingTurn set (official Gr)", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: false,
    } as never, []);
    officialCodeSessionStore.getState().setStreamActivity("s1", {
      streamActivityMode: "responding",
      streamingMessageId: "msg_live",
      isRunning: true,
    });
    officialCodeSessionStore.getState().noteQueuedSend("s1");
    expect(officialCodeSessionStore.getState().buckets.s1?.pendingQueuedSends).toBe(0);

    officialCodeSessionStore.getState().setStreamActivity("s1", {
      pendingTurnStartedAt: Date.now(),
      isRunning: true,
    });
    officialCodeSessionStore.getState().noteQueuedSend("s1");
    expect(officialCodeSessionStore.getState().buckets.s1?.pendingQueuedSends).toBe(1);
  });

  it("clearPendingTurn drops pendingTurn + compaction only (official Yr/Gr.onError)", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, [interruptUser()]);
    officialCodeSessionStore.getState().enqueueQueuedMessage("s1", queuedUser("q1", "6"));
    officialCodeSessionStore.getState().setStreamActivity("s1", {
      pendingTurnStartedAt: Date.now(),
      streamActivityMode: "responding",
      streamingMessageId: "msg_live",
      isRunning: true,
    });
    officialCodeSessionStore.setState((state) => ({
      buckets: {
        ...state.buckets,
        s1: {
          ...state.buckets.s1!,
          compactionStatus: "compacting",
          pendingQueuedSends: 1,
        },
      },
    }));

    officialCodeSessionStore.getState().clearPendingTurn("s1");
    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.pendingTurnStartedAt).toBeNull();
    expect(bucket?.compactionStatus).toBeNull();
    // Official clearPendingTurn does not discard queue / Va / isRunning.
    expect(bucket?.queuedMessages.map((message) => message.id)).toEqual(["q1"]);
    expect(bucket?.pendingQueuedSends).toBe(1);
    expect(bucket?.streamingMessageId).toBe("msg_live");
    expect(bucket?.session?.isRunning).toBe(true);
  });

  it("Gr.onError mid-turn: dropQueued then clearPending only when queue drained", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, [interruptUser()]);
    officialCodeSessionStore.getState().noteQueuedSend("s1");
    expect(officialCodeSessionStore.getState().buckets.s1?.pendingQueuedSends).toBe(1);

    // Local mid-turn may only have pendingQueuedSends until CLI echo (`d`).
    officialCodeSessionStore.getState().dropQueuedMessage("s1", "missing-uuid");
    expect(officialCodeSessionStore.getState().buckets.s1?.pendingQueuedSends).toBe(0);
    const afterDrop = officialCodeSessionStore.getState().buckets.s1;
    if (
      afterDrop
      && afterDrop.pendingTurnStartedAt != null
      && afterDrop.queuedMessages.length === 0
      && afterDrop.pendingQueuedSends === 0
    ) {
      officialCodeSessionStore.getState().clearPendingTurn("s1");
    }
    expect(officialCodeSessionStore.getState().buckets.s1?.pendingTurnStartedAt).toBeNull();
  });

  it("patchSession drops stale pendingTurn when host idle without live stream", () => {
    // Background completed while unsubscribed: host isRunning=false, result merge missed,
    // bare pendingTurn must not sticky Stop forever.
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 1,
      isRunning: true,
    } as never, [interruptUser()]);
    expect(officialCodeSessionStore.getState().buckets.s1?.pendingTurnStartedAt).not.toBeNull();

    officialCodeSessionStore.getState().patchSession("s1", {
      id: "s1",
      kind: "code",
      title: "S",
      updatedAtMs: 2,
      isRunning: false,
    } as never);

    const bucket = officialCodeSessionStore.getState().buckets.s1;
    expect(bucket?.session?.isRunning).toBe(false);
    expect(bucket?.pendingTurnStartedAt).toBeNull();
  });
});
