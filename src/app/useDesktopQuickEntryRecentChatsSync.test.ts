import { describe, expect, it } from "vitest";
import {
  activeChatIdFromPathname,
  orgUuidFromBootstrap,
  recentChatsFromConversationsPayload,
  syncDesktopQuickEntryRecentChats,
} from "./useDesktopQuickEntryRecentChatsSync";

describe("useDesktopQuickEntryRecentChatsSync residual helpers", () => {
  it("activeChatIdFromPathname matches official h residual", () => {
    expect(activeChatIdFromPathname("/chat/abc-123")).toBe("abc-123");
    expect(activeChatIdFromPathname("/chat/abc-123?x=1")).toBe("abc-123");
    expect(activeChatIdFromPathname("/new")).toBeNull();
    expect(activeChatIdFromPathname("/chat/")).toBeNull();
  });

  it("maps conversation list with uuid/name → chatId/chatName", () => {
    expect(
      recentChatsFromConversationsPayload({
        data: [
          { uuid: "u1", name: "One" },
          { uuid: "u2" },
        ],
      }),
    ).toEqual([
      { chatId: "u1", chatName: "One" },
      { chatId: "u2", chatName: "Untitled" },
    ]);
  });

  it("orgUuidFromBootstrap reads common residual shapes", () => {
    expect(orgUuidFromBootstrap({ activeOrganization: { uuid: "org-1" } })).toBe("org-1");
    expect(orgUuidFromBootstrap({ organization: { uuid: "org-2" } })).toBe("org-2");
    expect(orgUuidFromBootstrap({})).toBeNull();
  });

  it("syncDesktopQuickEntryRecentChats pushes chats + active id", async () => {
    const calls: unknown[] = [];
    await syncDesktopQuickEntryRecentChats({
      pathname: "/chat/active-1",
      setRecentChats: async (chats, active) => {
        calls.push([chats, active]);
      },
      loadBootstrap: async () => ({ activeOrganization: { uuid: "org" } }),
      loadConversations: async () => [{ chatId: "c1", chatName: "Hello" }],
    });
    expect(calls).toEqual([[[{ chatId: "c1", chatName: "Hello" }], "active-1"]]);
  });
});
