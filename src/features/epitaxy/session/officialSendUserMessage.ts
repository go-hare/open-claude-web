/**
 * Official SendUserMessage as-words residual (ion-dist pin 2.31226.1).
 *
 * Parser residual `cd5a31703-B4nKQMBN.js`:
 * - `IBe.SendUserMessage = IBe.SendUserFile = "send_to_user"`
 * - `vH.user_message.rollUp = "as-words"`
 * - `vH.send_to_user.rollUp = "stands-alone"`
 * - `TH(e,t)`: when `userMessagesAsWords===true` and `wH(e)==="send_to_user"`
 *   and status is running|completed and not error/interrupted/rejected/policyDenied,
 *   body is input `message` ?? `caption` (string) with trim, else completed `pp(toolUseResult)`.
 *
 * Product local Code treats a completed/running SendUserMessage with non-empty
 * `input.message` / `input.caption` (or completed tool_result text) as as-words.
 * SendUserFile tiles live in `officialSendUserFile.ts` — this module is message only.
 */

export const OFFICIAL_SEND_TO_USER_KIND = "send_to_user";
export const OFFICIAL_SEND_USER_MESSAGE_TOOL = "SendUserMessage";
export const OFFICIAL_SEND_USER_MESSAGE_SOURCE = "cd5a31703-B4nKQMBN.js";

export type OfficialSendUserMessageToolLike = {
  input: Record<string, unknown>;
  interrupted?: boolean;
  isError?: boolean;
  name: string;
  output?: string;
  policyDenied?: boolean;
  rejected?: boolean;
  status: "awaiting_approval" | "completed" | "error" | "running" | string;
  toolUseResult?: unknown;
};

export function isOfficialSendUserMessageTool(name: string | undefined | null): boolean {
  if (!name) return false;
  const base = name.split("__").pop() ?? name;
  return base === OFFICIAL_SEND_USER_MESSAGE_TOOL;
}

/**
 * Official TH text pick: string `message` ?? string `caption`, then completed `pp(toolUseResult)`.
 * Empty-string `message` does not fall through to `caption` (`??`), matching
 * `typeof n=="string"?n:void 0`. Whitespace-only `i` still yields `pp` for paint.
 */
export function officialSendUserMessageText(
  input: Record<string, unknown> | undefined | null,
  output?: unknown,
): string | undefined {
  const record = input && typeof input === "object" ? input : {};
  const fromInput = officialSendUserMessageInputText(record);
  if (fromInput !== undefined && fromInput.trim().length > 0) return fromInput;
  const fromResult = officialSendUserMessageResultText(output);
  return fromResult.length > 0 ? fromResult : undefined;
}

/** Official `TH` with product `userMessagesAsWords:true`. */
export function isOfficialSendUserMessageAsWords(
  tool: OfficialSendUserMessageToolLike | undefined | null,
): boolean {
  if (!tool || !isOfficialSendUserMessageTool(tool.name)) return false;
  if (tool.status !== "running" && tool.status !== "completed") return false;
  if (tool.isError || tool.interrupted || tool.rejected || tool.policyDenied) return false;
  const fromInput = officialSendUserMessageInputText(tool.input);
  if (fromInput !== undefined && fromInput.trim().length > 0) return true;
  if (tool.status !== "completed") return false;
  return officialSendUserMessageResultText(tool.toolUseResult ?? tool.output).length > 0;
}

function officialSendUserMessageInputText(input: Record<string, unknown>): string | undefined {
  const message = input.message;
  const caption = input.caption;
  const fromMessage = typeof message === "string" ? message : undefined;
  const fromCaption = typeof caption === "string" ? caption : undefined;
  return fromMessage ?? fromCaption;
}

/** Official `pp(toolUseResult)` — displayable text only, not a Zg `ix` key dump. */
function officialSendUserMessageResultText(output: unknown): string {
  const value = decodeToolUseResult(output);
  return ppDisplayText(value).trim();
}

function decodeToolUseResult(output: unknown): unknown {
  if (output === undefined || output === null || output === "") return undefined;
  if (typeof output === "object") return output;
  if (typeof output !== "string") return undefined;
  const trimmed = output.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function ppDisplayText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(ppDisplayText).filter((part) => part.length > 0).join("\n");
  }
  if (typeof value !== "object") return "";
  const row = value as Record<string, unknown>;
  if (typeof row.text === "string") return row.text;
  if (typeof row.message === "string") return row.message;
  if (typeof row.caption === "string") return row.caption;
  if (typeof row.content === "string") return row.content;
  if (Array.isArray(row.content)) return ppDisplayText(row.content);
  return "";
}
