/**
 * Official v$t Et residual packaging.
 * Conversation (path owner) computes Et; t$t Ace + g$t Ace must share it.
 * Product builds composer outside Conversation — Context replaces cloneElement inject.
 * data-official-source: index-BELzQL5P:v$t Et
 */
import { createContext, useContext, type ReactNode } from "react";
import type { CoworkClaudeAvatarState } from "./CoworkClaudeAvatar";

export type CoworkConversationAvatarValue = {
  /** Official Et for Ace (g$t + t$t scroll button). */
  avatarState: CoworkClaudeAvatarState;
  /** Official v$t `l` — same streaming flag for Et/g$t/t$t. */
  isStreaming: boolean;
};

const CoworkConversationAvatarContext = createContext<CoworkConversationAvatarValue | null>(null);

export function CoworkConversationAvatarProvider({
  avatarState,
  children,
  isStreaming,
}: CoworkConversationAvatarValue & { children: ReactNode }) {
  return (
    <CoworkConversationAvatarContext.Provider value={{ avatarState, isStreaming }}>
      {children}
    </CoworkConversationAvatarContext.Provider>
  );
}

/** Prefer explicit props; fall back to Conversation-provided Et residual. */
export function useCoworkConversationAvatar(): CoworkConversationAvatarValue | null {
  return useContext(CoworkConversationAvatarContext);
}
