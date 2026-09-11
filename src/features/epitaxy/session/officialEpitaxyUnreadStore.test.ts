import { beforeEach, describe, expect, it } from "vitest";
import {
  officialEpitaxyUnreadStore,
  officialGetFocusedUnreadSession,
  officialMarkSessionUnread,
  officialSetFocusedUnreadSession,
  resetOfficialEpitaxyUnreadStoreForTests,
} from "./officialEpitaxyUnreadStore";

describe("officialEpitaxyUnreadStore (D_e / z_e / U_e)", () => {
  beforeEach(() => {
    resetOfficialEpitaxyUnreadStoreForTests();
  });

  it("markUnread is a no-op when id already in unreadIds", () => {
    officialEpitaxyUnreadStore.getState().markUnread("a");
    const first = officialEpitaxyUnreadStore.getState().unreadIds;
    officialEpitaxyUnreadStore.getState().markUnread("a");
    expect(officialEpitaxyUnreadStore.getState().unreadIds).toBe(first);
  });

  it("z_e skips the focused session (O_e)", () => {
    officialSetFocusedUnreadSession("open");
    officialMarkSessionUnread("open");
    expect(officialEpitaxyUnreadStore.getState().unreadIds).toEqual([]);
    officialMarkSessionUnread("other");
    expect(officialEpitaxyUnreadStore.getState().unreadIds).toEqual(["other"]);
  });

  it("U_e stamps O_e and markRead", () => {
    officialEpitaxyUnreadStore.getState().markUnread("open");
    officialEpitaxyUnreadStore.getState().markUnread("other");
    officialSetFocusedUnreadSession("open");
    expect(officialGetFocusedUnreadSession()).toBe("open");
    expect(officialEpitaxyUnreadStore.getState().unreadIds).toEqual(["other"]);
  });

  it("clearAll is a no-op on empty", () => {
    const first = officialEpitaxyUnreadStore.getState().unreadIds;
    officialEpitaxyUnreadStore.getState().clearAll();
    expect(officialEpitaxyUnreadStore.getState().unreadIds).toBe(first);
    officialEpitaxyUnreadStore.getState().markUnread("a");
    officialEpitaxyUnreadStore.getState().clearAll();
    expect(officialEpitaxyUnreadStore.getState().unreadIds).toEqual([]);
  });
});
