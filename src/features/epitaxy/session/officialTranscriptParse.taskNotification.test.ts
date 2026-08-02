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
});
