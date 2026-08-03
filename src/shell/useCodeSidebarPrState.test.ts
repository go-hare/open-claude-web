import { describe, expect, it } from "vitest";
import {
  aggregateOfficialCodePrState,
  officialCodePrStateFromLocal,
} from "./codeSidebarPrState";

describe("officialCodePrStateFromLocal (Sye + L_e residual)", () => {
  it("maps merged / closed / draft / queued / open", () => {
    expect(officialCodePrStateFromLocal({ number: 1, merged: true })).toBe("merged");
    expect(officialCodePrStateFromLocal({ number: 1, state: "MERGED" })).toBe("merged");
    expect(officialCodePrStateFromLocal({ number: 1, state: "closed" })).toBe("closed");
    expect(officialCodePrStateFromLocal({ number: 1, draft: true })).toBe("draft");
    expect(officialCodePrStateFromLocal({ number: 1, state: "draft" })).toBe("draft");
    expect(officialCodePrStateFromLocal({ number: 1, state: "queued" })).toBe("queued");
    expect(officialCodePrStateFromLocal({ number: 1, state: "OPEN" })).toBe("open");
    expect(officialCodePrStateFromLocal({ number: 1, url: "https://example/pr/1" })).toBe("open");
  });

  it("applies L_e reviewDecision on open PRs", () => {
    expect(
      officialCodePrStateFromLocal({ number: 1, state: "open", reviewDecision: "APPROVED" }),
    ).toBe("approved");
    expect(
      officialCodePrStateFromLocal({
        number: 1,
        state: "open",
        reviewDecision: "CHANGES_REQUESTED",
      }),
    ).toBe("changesRequested");
    expect(
      officialCodePrStateFromLocal({ number: 1, state: "open", conflicting: true }),
    ).toBe("conflicting");
  });

  it("returns none when bag is empty", () => {
    expect(officialCodePrStateFromLocal(null)).toBe("none");
    expect(officialCodePrStateFromLocal({})).toBe("none");
  });
});

describe("aggregateOfficialCodePrState (G_e residual)", () => {
  it("prefers open over closed/draft/merged", () => {
    expect(aggregateOfficialCodePrState(["merged", "open", "closed"])).toBe("open");
    expect(aggregateOfficialCodePrState(["closed", "draft"])).toBe("closed");
    expect(aggregateOfficialCodePrState(["merged"])).toBe("merged");
    expect(aggregateOfficialCodePrState(["none", "none"])).toBe("none");
    expect(aggregateOfficialCodePrState([])).toBe("none");
  });
});
