export type CoworkStreamBlock =
  | { kind: "text"; text: string }
  | { kind: "thinking"; text: string }
  | { id: string; kind: "tool"; name: string; partialJson: string };

export type CoworkStreamSnapshot = {
  blocks: CoworkStreamBlock[];
  messageId: string;
} | null;
