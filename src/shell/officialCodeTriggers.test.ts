import { describe, expect, it } from "vitest";
import {
  OFFICIAL_COWORK_SCHEDULED_TRIGGER_TAG,
  fetchOfficialCodeTriggersList,
  officialCodeTriggersHeaders,
  officialCodeTriggersPath,
  officialW2CodeTriggersPath,
  parseOfficialCodeTriggersPage,
} from "./officialCodeTriggers";
import { officialHasEnabledCloudTriggers, officialW2LiveHasCodeRoutines } from "./sidebarData";

describe("official shared-1 yM / vM / LN residual", () => {
  it("yM default excludes session-bound one-shots and cowork-scheduled for w2", () => {
    expect(OFFICIAL_COWORK_SCHEDULED_TRIGGER_TAG).toBe("cowork-scheduled");
    const path = officialW2CodeTriggersPath("org-1");
    expect(path.startsWith("/v1/code/triggers?")).toBe(true);
    expect(path).toContain("limit=100");
    expect(path).toContain("exclude_session_bound_one_shots=true");
    expect(path).toContain("exclude_tags=cowork-scheduled");
    expect(path).not.toContain("persistent_session_id");
  });

  it("yM persistentSessionId skips exclude_session_bound_one_shots", () => {
    const path = officialCodeTriggersPath({ persistentSessionId: "sess-1" });
    expect(path).toContain("persistent_session_id=sess-1");
    expect(path).not.toContain("exclude_session_bound_one_shots");
  });

  it("vM headers match anthropic-beta ccr-triggers-2026-01-30", () => {
    expect(officialCodeTriggersHeaders(null)).toEqual({
      Accept: "application/json",
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "ccr-triggers-2026-01-30",
    });
    expect(officialCodeTriggersHeaders("org-uuid")["x-organization-uuid"]).toBe("org-uuid");
  });

  it("parses LN page shape data / next_cursor / has_more", () => {
    expect(parseOfficialCodeTriggersPage({
      data: [{ enabled: true }],
      next_cursor: "abc",
      has_more: true,
    })).toEqual({
      data: [{ enabled: true }],
      next_cursor: "abc",
      has_more: true,
    });
    expect(parseOfficialCodeTriggersPage(null).data).toBeUndefined();
  });

  it("IN enabled: missing orgUuid returns empty without GET", async () => {
    const result = await fetchOfficialCodeTriggersList({});
    expect(result).toEqual({ data: [], has_more: false });
  });

  it("w2 cloud half still skips aN session-bound one-shots", () => {
    expect(officialHasEnabledCloudTriggers([
      { enabled: true, run_once_at: "t", persistent_session_id: "s" },
    ])).toBe(false);
    expect(officialW2LiveHasCodeRoutines([], [{ enabled: true }])).toBe(true);
    expect(officialW2LiveHasCodeRoutines([], [])).toBe(false);
  });
});
