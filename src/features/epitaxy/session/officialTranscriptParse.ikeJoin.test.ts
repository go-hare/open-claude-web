import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../../../adapters/desktopBridge/types";
import { parseOfficialTranscriptEntries } from "./officialTranscriptParse";

/**
 * Residual Ike (index-BELzQL5P): array content collects plain text into `l`,
 * then one `{ kind: "text", text: l.join("\\n") }` — not N text items.
 * Product invent of per-block items stacked multi-send CLI rows into one Hb
 * pill with N gap-g4 <p> (looked "glued" when user sent digits separately).
 */
describe("officialTranscriptParse Ike multi-block join", () => {
  it("joins multi-block user content into one text item (not N items)", () => {
    const messages: ChatMessage[] = [
      {
        id: "282b9279-b49e-4090-a90f-f24345f4b4b8",
        role: "user",
        text: "3\n\n3\n\n3\n\n3\n\n2",
        createdAt: "2026-08-17T12:00:00.000Z",
        raw: {
          type: "user",
          uuid: "282b9279-b49e-4090-a90f-f24345f4b4b8",
          timestamp: "2026-08-17T12:00:00.000Z",
          message: {
            role: "user",
            content: [
              { type: "text", text: "3" },
              { type: "text", text: "3" },
              { type: "text", text: "3" },
              { type: "text", text: "3" },
              { type: "text", text: "2" },
            ],
          },
        },
      },
    ];
    const entries = parseOfficialTranscriptEntries(messages);
    const users = entries.filter((entry) => entry.author === "user");
    expect(users).toHaveLength(1);
    const textItems = users[0]!.items.filter((item) => item.kind === "text");
    expect(textItems).toHaveLength(1);
    expect(textItems[0]).toMatchObject({
      kind: "text",
      text: "3\n3\n3\n3\n2",
    });
  });

  it("keeps separate durable user rows as separate entries (eke does not merge users)", () => {
    const messages: ChatMessage[] = [
      {
        id: "u-a",
        role: "user",
        text: "3",
        createdAt: "2026-08-17T12:00:00.000Z",
        raw: {
          type: "user",
          uuid: "u-a",
          message: { role: "user", content: [{ type: "text", text: "3" }] },
        },
      },
      {
        id: "u-b",
        role: "user",
        text: "2",
        createdAt: "2026-08-17T12:00:01.000Z",
        raw: {
          type: "user",
          uuid: "u-b",
          message: { role: "user", content: [{ type: "text", text: "2" }] },
        },
      },
    ];
    const users = parseOfficialTranscriptEntries(messages).filter((entry) => entry.author === "user");
    expect(users).toHaveLength(2);
    expect(users.map((entry) => entry.items.find((item) => item.kind === "text")?.text)).toEqual(["3", "2"]);
  });
});
