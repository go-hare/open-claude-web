import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { paneStore } from "../../../stores/paneStore";
import {
  acceptOfficialSplitSuggestion,
  bindOfficialSplitSuggestion,
  isOfficialCliLocalSessionId,
  OFFICIAL_SPLIT_SUGGESTION_COOLDOWN_MS,
  OFFICIAL_SPLIT_SUGGESTION_PERSIST_KEY,
  officialNoteSplitSuggestionPath,
  officialSplitSuggestionPartnerFromVisits,
  officialSplitSuggestionPersistRawForTests,
  officialSplitSuggestionStore,
  resetOfficialSplitSuggestionForTests,
  type OfficialSplitSuggestionVisit,
} from "./officialSplitSuggestionStore";

const here = path.dirname(fileURLToPath(import.meta.url));

function closeAllCodePanes() {
  for (const pane of paneStore.getState().extraPanesByMode.code ?? []) {
    paneStore.closePaneByRef("code", pane.ref);
  }
}

function visit(id: string, at: number): OfficialSplitSuggestionVisit {
  return { at, key: `code:${id}`, ref: { kind: "code", id } };
}

describe("officialSplitSuggestionStore (yd / vd / bd / Ed)", () => {
  beforeEach(() => {
    resetOfficialSplitSuggestionForTests();
    closeAllCodePanes();
  });

  afterEach(() => {
    resetOfficialSplitSuggestionForTests();
    closeAllCodePanes();
  });

  it("locks persist key, testid, copy ids, suggestion_card via", () => {
    const store = readFileSync(path.join(here, "officialSplitSuggestionStore.ts"), "utf8");
    const toast = readFileSync(path.join(here, "OfficialSplitSuggestionToast.tsx"), "utf8");
    const messages = readFileSync(path.join(here, "../officialCodeChromeMessages.ts"), "utf8");
    const pane = readFileSync(path.join(here, "../../../stores/paneStore.ts"), "utf8");
    expect(store).toContain('name: OFFICIAL_SPLIT_SUGGESTION_PERSIST_KEY');
    expect(store).toContain('export const OFFICIAL_SPLIT_SUGGESTION_PERSIST_KEY = "epitaxy-split-suggestion"');
    expect(store).toContain("shownCount");
    expect(store).toContain("accepted");
    expect(store).toContain("dismissCount");
    expect(store).toContain("lastDismissedAt");
    expect(store).toContain('addPane("code", currentKey, partner, undefined, "suggestion_card")');
    expect(toast).toContain('data-testid="epitaxy-split-suggestion"');
    expect(toast).toContain('data-intl-id="bqh3gSHXRK"');
    expect(toast).toContain('data-intl-id="8IBKnZa76A"');
    expect(toast).toContain("SPLIT_SUGGESTION_MESSAGES");
    expect(toast).toContain("useOfficialSplitSuggestion");
    expect(messages).toContain('id: "bqh3gSHXRK"');
    expect(messages).toContain('id: "8IBKnZa76A"');
    const enUs = readFileSync(path.join(here, "../../../../public/i18n/en-US.json"), "utf8");
    expect(enUs).toContain('"bqh3gSHXRK": "See multiple sessions side by side in split view."');
    expect(enUs).toContain('"8IBKnZa76A": "Open in split view"');
    expect(pane).toContain("suggestion_card");
    expect(OFFICIAL_SPLIT_SUGGESTION_PERSIST_KEY).toBe("epitaxy-split-suggestion");
    expect(officialSplitSuggestionStore.persist.getOptions().name).toBe("epitaxy-split-suggestion");
    expect(OFFICIAL_SPLIT_SUGGESTION_COOLDOWN_MS).toEqual([0, 864e5, 7 * 864e5]);
  });

  it("vd returns partner only for A-B-A-B within 30s", () => {
    const t0 = 1_000_000;
    expect(officialSplitSuggestionPartnerFromVisits([visit("a", t0)], t0 + 1000)).toBeNull();
    const tooSlow = [
      visit("a", t0),
      visit("b", t0 + 1000),
      visit("a", t0 + 2000),
      visit("b", t0 + 31_000),
    ];
    expect(officialSplitSuggestionPartnerFromVisits(tooSlow, t0 + 31_000)).toBeNull();
    const sameKey = [
      visit("a", t0),
      visit("a", t0 + 1),
      visit("b", t0 + 2),
      visit("a", t0 + 3),
    ];
    expect(officialSplitSuggestionPartnerFromVisits(sameKey, t0 + 3)).toBeNull();
    const alt = [
      visit("a", t0),
      visit("b", t0 + 100),
      visit("a", t0 + 200),
      visit("b", t0 + 300),
    ];
    expect(officialSplitSuggestionPartnerFromVisits(alt, t0 + 300)).toEqual({ kind: "code", id: "a" });
  });

  it("bd skips extra panes, shownCount>=3, accepted, cooldown", () => {
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    expect(officialSplitSuggestionStore.getState().partner?.id).toBe("a");

    resetOfficialSplitSuggestionForTests();
    officialSplitSuggestionStore.setState({ accepted: true });
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    expect(officialSplitSuggestionStore.getState().partner).toBeNull();

    resetOfficialSplitSuggestionForTests();
    officialSplitSuggestionStore.setState({ shownCount: 3 });
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    expect(officialSplitSuggestionStore.getState().partner).toBeNull();

    resetOfficialSplitSuggestionForTests();
    paneStore.addPane("code", "code:a", { kind: "code", id: "z" }, "tr");
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    expect(officialSplitSuggestionStore.getState().partner).toBeNull();
    closeAllCodePanes();

    resetOfficialSplitSuggestionForTests();
    officialSplitSuggestionStore.setState({ dismissCount: 1, lastDismissedAt: Date.now() });
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    expect(officialSplitSuggestionStore.getState().partner).toBeNull();

    resetOfficialSplitSuggestionForTests();
    officialSplitSuggestionStore.setState({ dismissCount: 1, lastDismissedAt: Date.now() - 864e5 });
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    expect(officialSplitSuggestionStore.getState().partner?.id).toBe("a");
  });

  it("accept calls addPane with suggestion_card and persists accepted", () => {
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    expect(officialSplitSuggestionStore.getState().partner?.id).toBe("a");
    acceptOfficialSplitSuggestion("code:b");
    expect(officialSplitSuggestionStore.getState().accepted).toBe(true);
    expect(officialSplitSuggestionStore.getState().partner).toBeNull();
    const panes = paneStore.getState().extraPanesByMode.code ?? [];
    expect(panes.some((pane) => pane.ref.id === "a")).toBe(true);
    const raw = officialSplitSuggestionPersistRawForTests();
    expect(raw).toBeTruthy();
    expect(raw).toContain('"accepted":true');
  });

  it("dismiss persists lastDismissedAt under epitaxy-split-suggestion", () => {
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    officialSplitSuggestionStore.getState().dismiss();
    expect(officialSplitSuggestionStore.getState().dismissCount).toBeGreaterThan(0);
    expect(officialSplitSuggestionStore.getState().lastDismissedAt).toBeGreaterThan(0);
    const raw = officialSplitSuggestionPersistRawForTests();
    expect(raw).toContain("lastDismissedAt");
    expect(raw).toContain("dismissCount");
    expect(OFFICIAL_SPLIT_SUGGESTION_PERSIST_KEY).toBe("epitaxy-split-suggestion");
  });

  it("Td retracts when extra panes appear; ba skips local_cli_", () => {
    expect(isOfficialCliLocalSessionId("local_cli_abc")).toBe(true);
    officialNoteSplitSuggestionPath("/code/local_cli_abc");
    expect(officialSplitSuggestionStore.getState().partner).toBeNull();

    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    officialNoteSplitSuggestionPath("/code/a");
    officialNoteSplitSuggestionPath("/code/b");
    expect(officialSplitSuggestionStore.getState().partner).not.toBeNull();
    const stop = bindOfficialSplitSuggestion({ enabled: true, pathname: "/code/b" });
    paneStore.addPane("code", "code:b", { kind: "code", id: "z" }, "tr");
    expect(officialSplitSuggestionStore.getState().partner).toBeNull();
    stop();
  });
});
