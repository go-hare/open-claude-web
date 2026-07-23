import type { CoworkDetectedFile, CoworkMessageEnvelope, CoworkSessionSnapshot } from "../../../adapters/desktopBridge/types";
import type { CoworkUploadedFile } from "../newTask/coworkUploadedFiles";
import type { CoworkPermissionRequest } from "./coworkPermissionTypes";
import type { CoworkStreamSnapshot } from "./stream/coworkStreamTypes";

export type CoworkStreamActivity = "idle" | "requesting" | "thinking" | "responding" | "tool-use";
export type CoworkConnectionState = "connected" | "connecting" | "disconnected";
export type CoworkAgentActivity = {
  activity: "thinking" | "tool_use" | "writing";
  contentLength?: number;
  filePath?: string;
  lastActivityTime?: number;
  toolName?: string;
};
export type CoworkPendingTurn = { endTurnSeen: boolean; startTime: number };
export type CoworkInitializationStatus = {
  isComplete?: boolean;
  message?: string;
  startTime?: number;
  step?: string;
};

export type CoworkRawMessage = CoworkMessageEnvelope;

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

/** Official D1e sdk_mcp_status entry (status list stored as Le / sessionContext.sdkMcpStatuses). */
export type CoworkSdkMcpStatus = {
  configType?: string;
  displayName?: string;
  name: string;
  status: string;
  toolCount?: number;
};

export type CoworkSessionDataState = {
  agentActivity: CoworkAgentActivity | null;
  connectionState: CoworkConnectionState;
  error: Error | null;
  errorCategory: string | null;
  /** Official D1e Me: Map hostPath → detected file for activity fs_detected merge. */
  fsDetectedFiles: Map<string, CoworkDetectedFile>;
  initializationStatus: CoworkInitializationStatus | null;
  isLoading: boolean;
  isSessionNotFound: boolean;
  messages: CoworkRawMessage[];
  pendingMessages: CoworkRawMessage[];
  pendingTurn: CoworkPendingTurn | null;
  promptSuggestion: string | null;
  /**
   * Official D1e sdk_mcp_status → Re(statuses) exposed on sessionContext.
   * Residual: no q1(local_mcp_servers) / a1 remote store invent.
   */
  sdkMcpStatuses?: CoworkSdkMcpStatus[];
  session: CoworkSessionSnapshot | null;
  sessionId: string;
  streamActivity: CoworkStreamActivity;
  streamingMessageId: string | null;
  streamSnapshot: CoworkStreamSnapshot;
  toolPermissionRequests: CoworkPermissionRequest[];
};
