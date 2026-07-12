export type CoworkStreamThinkingSummary = { summary: string };

export type CoworkStreamBlock =
  | { kind: "text"; text: string }
  | {
      cutOff?: boolean;
      kind: "thinking";
      summaries?: CoworkStreamThinkingSummary[];
      text: string;
    }
  | { id: string; kind: "tool"; name: string; partialJson: string };

export type CoworkStreamUsage = {
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  input_tokens: number;
  output_tokens: number;
};

export type CoworkStreamSnapshot = {
  activeToolId?: string;
  apiMessageId?: string;
  blocks: CoworkStreamBlock[];
  messageId: string;
  model?: string;
  usage?: CoworkStreamUsage;
} | null;
