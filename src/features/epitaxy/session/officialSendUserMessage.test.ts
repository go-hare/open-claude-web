import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  isOfficialSendUserMessageAsWords,
  isOfficialSendUserMessageTool,
  OFFICIAL_SEND_TO_USER_KIND,
  officialSendUserMessageText,
  type OfficialSendUserMessageToolLike,
} from "./officialSendUserMessage";

const here = path.dirname(fileURLToPath(import.meta.url));
const parserSource = readFileSync(path.join(here, "officialSendUserMessage.ts"), "utf8");
const wordsSource = readFileSync(path.join(here, "OfficialSendUserMessageWords.tsx"), "utf8");

function tool(partial: Partial<OfficialSendUserMessageToolLike> & { input?: Record<string, unknown> }): OfficialSendUserMessageToolLike {
  return {
    name: "SendUserMessage",
    status: "completed",
    input: {},
    ...partial,
  };
}

describe("official SendUserMessage as-words residual (cd5a TH / J0e send_to_user)", () => {
  it("maps SendUserMessage to send_to_user (IBe.SendUserMessage)", () => {
    expect(isOfficialSendUserMessageTool("SendUserMessage")).toBe(true);
    expect(isOfficialSendUserMessageTool("mcp__x__SendUserMessage")).toBe(true);
    expect(isOfficialSendUserMessageTool("SendUserFile")).toBe(false);
    expect(isOfficialSendUserMessageTool("Bash")).toBe(false);
    expect(OFFICIAL_SEND_TO_USER_KIND).toBe("send_to_user");
  });

  it("TH true: running/completed + non-empty input.message", () => {
    expect(isOfficialSendUserMessageAsWords(tool({
      status: "completed",
      input: { message: "Hello from the agent" },
    }))).toBe(true);
    expect(isOfficialSendUserMessageAsWords(tool({
      status: "running",
      input: { message: "Streaming words" },
    }))).toBe(true);
    expect(officialSendUserMessageText({ message: "Hello from the agent" })).toBe("Hello from the agent");
  });

  it("caption fallback when message is absent", () => {
    expect(officialSendUserMessageText({ caption: "Caption words" })).toBe("Caption words");
    expect(isOfficialSendUserMessageAsWords(tool({
      status: "completed",
      input: { caption: "Caption words" },
    }))).toBe(true);
  });

  it("empty / whitespace message is not as-words (running)", () => {
    expect(isOfficialSendUserMessageAsWords(tool({
      status: "running",
      input: { message: "" },
    }))).toBe(false);
    expect(isOfficialSendUserMessageAsWords(tool({
      status: "running",
      input: { message: "   " },
    }))).toBe(false);
    expect(isOfficialSendUserMessageAsWords(tool({
      status: "running",
      input: {},
    }))).toBe(false);
  });

  it("error / interrupted / rejected / policyDenied → TH false", () => {
    const input = { message: "Would have been words" };
    expect(isOfficialSendUserMessageAsWords(tool({ status: "error", input, isError: true }))).toBe(false);
    expect(isOfficialSendUserMessageAsWords(tool({ status: "completed", input, isError: true }))).toBe(false);
    expect(isOfficialSendUserMessageAsWords(tool({ status: "completed", input, interrupted: true }))).toBe(false);
    expect(isOfficialSendUserMessageAsWords(tool({ status: "completed", input, rejected: true }))).toBe(false);
    expect(isOfficialSendUserMessageAsWords(tool({ status: "completed", input, policyDenied: true }))).toBe(false);
    expect(isOfficialSendUserMessageAsWords(tool({ status: "awaiting_approval", input }))).toBe(false);
  });

  it("completed with empty input uses parsed tool_result text (pp)", () => {
    expect(isOfficialSendUserMessageAsWords(tool({
      status: "completed",
      input: {},
      output: JSON.stringify({ text: "Delivered in result" }),
    }))).toBe(true);
    expect(officialSendUserMessageText({}, JSON.stringify({ text: "Delivered in result" }))).toBe("Delivered in result");
    expect(officialSendUserMessageText({ message: "" }, JSON.stringify({ text: "Delivered in result" }))).toBe("Delivered in result");
    expect(isOfficialSendUserMessageAsWords(tool({
      status: "running",
      input: {},
      output: JSON.stringify({ text: "Delivered in result" }),
    }))).toBe(false);
  });

  it("empty-string message does not fall through to caption", () => {
    expect(officialSendUserMessageText({ message: "", caption: "Caption words" })).toBeUndefined();
  });

  it("empty completed result is not as-words", () => {
    expect(isOfficialSendUserMessageAsWords(tool({
      status: "completed",
      input: { message: "  " },
      output: "",
    }))).toBe(false);
    expect(isOfficialSendUserMessageAsWords(tool({
      status: "completed",
      input: {},
    }))).toBe(false);
  });

  it("source lock: TH/J0e as-words user bubble, no CLI '1 file delivered' invent", () => {
    expect(parserSource).toMatch(/cd5a31703-B4nKQMBN\.js/);
    expect(parserSource).toMatch(/userMessagesAsWords/);
    expect(parserSource).toMatch(/send_to_user/);
    expect(wordsSource).toMatch(/cd5a31703-B4nKQMBN\.js:TH\/J0e send_to_user as-words/);
    expect(wordsSource).toMatch(/officialUserMessageClass/);
    expect(wordsSource).toMatch(/officialUserBubbleProseClass/);
    expect(parserSource).not.toMatch(/1 file delivered/);
    expect(wordsSource).not.toMatch(/1 file delivered/);
  });
});
