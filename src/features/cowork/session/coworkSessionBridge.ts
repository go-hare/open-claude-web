import { desktopBridge } from "../../../adapters/desktopBridge";
import type { ChatMessage, SendMessageInput, SessionSummary } from "../../../adapters/desktopBridge/types";
import { asRecord, stringValue } from "./recordUtils";

export const coworkSessionsBridge = desktopBridge.LocalAgentModeSessions;

export async function loadCoworkSession(sessionId: string): Promise<{ messages: ChatMessage[]; session: SessionSummary } | null> {
  const session = await coworkSessionsBridge.getSession(sessionId).catch(() => null);
  if (!session) return null;
  const transcript = await coworkSessionsBridge.getTranscript?.(sessionId).catch(() => undefined);
  const rawMessages = transcript?.length ? transcript : session.messages ?? [];
  const messages = rawMessages.filter((message) => stringValue(asRecord(message.raw).type) !== "stream_event");
  return { messages, session: { ...session, messages: rawMessages } };
}

export async function sendCoworkSessionMessage(sessionId: string, text: string, input?: SendMessageInput) {
  if (!coworkSessionsBridge.sendMessage) throw new Error("Cowork session bridge cannot send messages");
  await coworkSessionsBridge.sendMessage(sessionId, text, input);
}
