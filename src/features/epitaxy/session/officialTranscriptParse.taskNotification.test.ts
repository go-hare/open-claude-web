import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../../../adapters/desktopBridge/types";
import { parseOfficialTranscriptEntries } from "./officialTranscriptParse";

const TASK_XML = `<task-notification>
<task-id>a6286a20adb4a65e6</task-id>
<tool-use-id>call-ec705d62-8545-4ab3-9418-59149cdf1621-31</tool-use-id>
<status>completed</status>
<summary>Agent "Verify dual-spec analysis" finished</summary>
<note>A task-notification fires each time this agent stops with no live background children of its own.</note>
<result>## Verification report</result>
</task-notification>`;

describe("officialTranscriptParse The residual (task-notification)", () => {
  it("does not paint a user Hb bubble for pure <task-notification> user rows", () => {
    const messages: ChatMessage[] = [
      {
        id: "u1",
        role: "user",
        text: TASK_XML,
        createdAt: "2026-08-01T12:00:00.000Z",
        raw: {
          type: "user",
          uuid: "uuid-task-xml",
          timestamp: "2026-08-01T12:00:00.000Z",
          message: { role: "user", content: TASK_XML },
        },
      },
    ];
    const entries = parseOfficialTranscriptEntries(messages);
    expect(entries.filter((entry) => entry.author === "user")).toEqual([]);
  });

  it("keeps plain user text and strips trailing task-notification tags", () => {
    const messages: ChatMessage[] = [
      {
        id: "u2",
        role: "user",
        text: `please continue\n${TASK_XML}`,
        createdAt: "2026-08-01T12:00:01.000Z",
        raw: {
          type: "user",
          uuid: "uuid-mixed",
          timestamp: "2026-08-01T12:00:01.000Z",
          message: {
            role: "user",
            content: [{ type: "text", text: `please continue\n${TASK_XML}` }],
          },
        },
      },
    ];
    const entries = parseOfficialTranscriptEntries(messages);
    const user = entries.find((entry) => entry.author === "user");
    expect(user).toBeTruthy();
    const text = user?.items
      .filter((item): item is Extract<typeof item, { kind: "text" }> => item.kind === "text")
      .map((item) => item.text)
      .join("\n");
    expect(text).toBe("please continue");
    expect(text).not.toContain("task-notification");
  });

  it("does not paint a concatenated Background shell started/completed blob as user Hb", () => {
    const blob = [
      "Background shell started Launch 18-actuator brain MuJoCo viewer",
      "Background agent completed Running Dynamixel writes, infer dt, PWM defaults",
      "Background shell completed Verify fly web-simulator GitHub repos exist",
      "Background shell failed Verify L4/L3 architecture overlay in Chrome",
      "Background shell stopped Compare qwen3.5 and gemma3 few-shot Laya mapping",
    ].join("\n");
    const messages: ChatMessage[] = [
      {
        id: "u-blob",
        role: "user",
        text: blob,
        createdAt: "2026-08-01T12:00:03.000Z",
        raw: {
          type: "user",
          uuid: "uuid-bg-blob",
          timestamp: "2026-08-01T12:00:03.000Z",
          message: { role: "user", content: blob },
        },
      },
    ];
    const entries = parseOfficialTranscriptEntries(messages);
    expect(entries.filter((entry) => entry.author === "user")).toEqual([]);
  });

  it("does not paint host local_bash task_started chips as assistant Hb", () => {
    const messages: ChatMessage[] = [
      {
        id: "t1",
        role: "system",
        text: "",
        createdAt: "2026-08-01T12:00:04.000Z",
        raw: {
          type: "system",
          subtype: "task_started",
          task_id: "b813akh6a",
          task_type: "local_bash",
          description: "Launch neural claw viewer with mjpython",
          uuid: "uuid-task-start",
          timestamp: "2026-08-01T12:00:04.000Z",
        },
      },
      {
        id: "t2",
        role: "system",
        text: "",
        createdAt: "2026-08-01T12:00:05.000Z",
        raw: {
          type: "system",
          subtype: "task_notification",
          task_id: "b813akh6a",
          status: "failed",
          summary: "Background command failed",
          uuid: "uuid-task-fail",
          timestamp: "2026-08-01T12:00:05.000Z",
        },
      },
    ];
    const entries = parseOfficialTranscriptEntries(messages);
    expect(entries.filter((entry) => entry.items.some((item) => item.kind === "task_event"))).toEqual([]);
  });

  it("does not paint isMeta Background shell summaries as user Hb", () => {
    const messages: ChatMessage[] = [
      {
        id: "u3",
        role: "user",
        text: "Background shell failed Open the walking simulation window",
        createdAt: "2026-08-01T12:00:02.000Z",
        raw: {
          type: "user",
          isMeta: true,
          uuid: "uuid-bg-shell",
          timestamp: "2026-08-01T12:00:02.000Z",
          message: {
            role: "user",
            content: "Background shell failed Open the walking simulation window",
          },
        },
      },
    ];
    const entries = parseOfficialTranscriptEntries(messages);
    expect(entries.filter((entry) => entry.author === "user")).toEqual([]);
  });
});
