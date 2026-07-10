import type { ChatMessage, SessionSummary } from "../../../adapters/desktopBridge/types";
import type { CoworkUploadedFile } from "../newTask/coworkUploadedFiles";
import type { CoworkStreamSnapshot } from "./stream/coworkStreamTypes";

export type CoworkStreamActivity = "idle" | "requesting" | "thinking" | "responding" | "tool-use";

export type CoworkTranscriptEntry = {
  author: "assistant" | "user";
  id: string;
  items: CoworkTranscriptItem[];
  timestamp?: string;
};

export type CoworkTranscriptItem =
  | { id: string; kind: "bash"; command?: string; error?: string; output?: string }
  | { id: string; kind: "error"; code?: string; text: string }
  | { id: string; kind: "event"; content: string; eventType?: string }
  | { file: CoworkUploadedFile; id: string; kind: "uploaded-file" }
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "thinking"; text: string }
  | { id: string; kind: "tools"; tools: CoworkToolUse[] };

export type CoworkToolUse = {
  id: string;
  input: Record<string, unknown>;
  isError?: boolean;
  name: string;
  output?: string;
  status: "awaiting_approval" | "completed" | "error" | "running";
  subagentActivity?: {
    latestToolName?: string;
    model?: string;
    toolCallCount?: number;
  };
};

export type CoworkSessionDataState = {
  error: Error | null;
  isLoading: boolean;
  isSessionNotFound: boolean;
  messages: ChatMessage[];
  pendingTurnStartedAt: number | null;
  session: SessionSummary | null;
  streamActivity: CoworkStreamActivity;
  streamingMessageId: string | null;
  streamSnapshot: CoworkStreamSnapshot;
};
