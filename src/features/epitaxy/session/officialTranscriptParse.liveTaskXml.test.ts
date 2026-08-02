import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../../../adapters/desktopBridge/types";
import { parseOfficialTranscriptEntries } from "./officialTranscriptParse";

const XML = `<task-notification>
<task-id>a03df9efb7de6e571</task-id>
<tool-use-id>call-634e706e-3ff3-4c54-9fdf-e1648da38b2d-0</tool-use-id>
<output-file>/private/var/folders/x/T/claude/tasks/a03df9efb7de6e571.output</output-file>
<status>completed</status>
<summary>Agent "Sleep 90 then done" completed</summary>
</task-notification>`;

describe("live residual task-notification shapes", () => {
  it("user string content", () => {
    const messages: ChatMessage[] = [{
      id: "u1", role: "user", text: XML, createdAt: "t",
      raw: { type: "user", uuid: "u1", message: { role: "user", content: XML } },
    }];
    expect(parseOfficialTranscriptEntries(messages).filter((e) => e.author === "user")).toEqual([]);
  });

  it("queue-operation normalized as user (bridge bug shape)", () => {
    const messages: ChatMessage[] = [{
      id: "q1", role: "user", text: XML, createdAt: "t",
      raw: { type: "queue-operation", operation: "enqueue", content: XML, uuid: "q1" },
    }];
    const entries = parseOfficialTranscriptEntries(messages);
    expect(entries.filter((e) => e.author === "user")).toEqual([]);
    expect(entries.flatMap((e) => e.items.map((i) => i.kind))).not.toContain("text");
  });

  it("top-level content only", () => {
    const messages: ChatMessage[] = [{
      id: "u3", role: "user", text: XML, createdAt: "t",
      raw: { type: "user", uuid: "u3", content: XML },
    }];
    expect(parseOfficialTranscriptEntries(messages).filter((e) => e.author === "user")).toEqual([]);
  });
});
