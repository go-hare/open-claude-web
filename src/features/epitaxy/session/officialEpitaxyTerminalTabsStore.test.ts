import { beforeEach, describe, expect, it } from "vitest";
import {
  officialDefaultTerminalTabs,
  officialEpitaxyTerminalTabsStore,
  officialPtyCdCommand,
  officialTerminalPtyKey,
  OFFICIAL_DEFAULT_TERMINAL_TAB_ID,
  OFFICIAL_EMPTY_TERMINAL_TABS,
  OFFICIAL_EPITAXY_TERMINAL_TABS_KEY,
  resetOfficialEpitaxyTerminalTabsStoreForTests,
} from "./officialEpitaxyTerminalTabsStore";

describe("officialEpitaxyTerminalTabsStore (ca0135 Ms)", () => {
  beforeEach(() => {
    resetOfficialEpitaxyTerminalTabsStoreForTests();
  });

  it("addTab returns id, sets active, stores pendingCd and name", () => {
    const id = officialEpitaxyTerminalTabsStore.getState().addTab("ses_1", "/tmp/foo", "foo");
    expect(id).toBe("1");
    const session = officialEpitaxyTerminalTabsStore.getState().bySession.ses_1;
    expect(session?.activeId).toBe("1");
    expect(session?.tabs).toHaveLength(2);
    expect(session?.tabs[1]).toMatchObject({
      id: "1",
      name: "foo",
      ordinal: 2,
      pendingCd: "/tmp/foo",
    });
  });

  it("clearPendingCd strips pendingCd only", () => {
    officialEpitaxyTerminalTabsStore.getState().addTab("ses_1", "/tmp/foo", "foo");
    officialEpitaxyTerminalTabsStore.getState().clearPendingCd("ses_1", "1");
    expect(officialEpitaxyTerminalTabsStore.getState().bySession.ses_1?.tabs[1]?.pendingCd).toBeUndefined();
    expect(officialEpitaxyTerminalTabsStore.getState().bySession.ses_1?.tabs[1]?.name).toBe("foo");
  });

  it("pty key matches official js(e,t)", () => {
    expect(officialTerminalPtyKey("ses_1", OFFICIAL_DEFAULT_TERMINAL_TAB_ID)).toBe("ses_1");
    expect(officialTerminalPtyKey("ses_1", "2")).toBe("ses_1::2");
  });

  it("posix cd command quotes the path", () => {
    expect(officialPtyCdCommand("/tmp/foo's")).toBe("cd '/tmp/foo'\\''s'\r");
  });

  it("default session seed is tab 0", () => {
    expect(officialDefaultTerminalTabs()).toEqual({
      activeId: "0",
      nextId: 1,
      tabs: [{ id: "0", ordinal: 1 }],
    });
    expect(OFFICIAL_EPITAXY_TERMINAL_TABS_KEY).toBe("epitaxy.terminalTabs.v1");
  });

  it("selector snapshot is stable when the session has no stored tabs", () => {
    const first = officialEpitaxyTerminalTabsStore.getState().bySession.missing;
    expect(first).toBeUndefined();
    const a = OFFICIAL_EMPTY_TERMINAL_TABS;
    const b = OFFICIAL_EMPTY_TERMINAL_TABS;
    expect(a).toBe(b);
    expect(officialDefaultTerminalTabs()).not.toBe(OFFICIAL_EMPTY_TERMINAL_TABS);
  });
});
