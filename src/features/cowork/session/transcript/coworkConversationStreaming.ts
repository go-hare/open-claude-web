/**
 * Official v$t / g$t / t$t share one streaming boolean `l`.
 * Product: progressive settle can keep streamingMessageId after end_turn flips
 * isResponding false — both must count as streaming for Ace Et, status row
 * layout, pin, and scroll-button Ace blur (not isResponding alone).
 */
export function resolveCoworkConversationIsStreaming(input: {
  isResponding?: boolean;
  streamingMessageId?: string | null;
}): boolean {
  return Boolean(input.streamingMessageId) || Boolean(input.isResponding);
}
