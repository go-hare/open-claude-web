import type { CoworkRawMessage } from "./types";

export function createPendingCoworkUserMessage(
  sessionId: string,
  uuid: string,
  text: string,
): CoworkRawMessage {
  return {
    createdAt: new Date().toISOString(),
    id: uuid,
    raw: {
      message: { content: [{ text, type: "text" }], role: "user" },
      session_id: sessionId,
      type: "user",
      uuid,
    },
    role: "user",
    text,
  };
}
