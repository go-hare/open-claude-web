import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateSessionTitleFromFirstMessage,
  OFFICIAL_AUTO_TITLE_MESSAGE_MAX,
  OFFICIAL_AUTO_TITLE_MIN_LENGTH,
  shouldGenerateAutoSessionTitle,
} from "./generateSessionTitle";

describe("shouldGenerateAutoSessionTitle", () => {
  it("matches official create gate: trim length >= 10", () => {
    expect(OFFICIAL_AUTO_TITLE_MIN_LENGTH).toBe(10);
    expect(shouldGenerateAutoSessionTitle("1")).toBe(false);
    expect(shouldGenerateAutoSessionTitle("123456789")).toBe(false);
    expect(shouldGenerateAutoSessionTitle("1234567890")).toBe(true);
    expect(shouldGenerateAutoSessionTitle("  fix login bug  ")).toBe(true);
    expect(shouldGenerateAutoSessionTitle("  fix login  ")).toBe(false); // trim len 9
    expect(shouldGenerateAutoSessionTitle("")).toBe(false);
    expect(shouldGenerateAutoSessionTitle(null)).toBe(false);
    expect(shouldGenerateAutoSessionTitle(undefined)).toBe(false);
  });
});

describe("generateSessionTitleFromFirstMessage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns null when first message empty after trim", async () => {
    expect(await generateSessionTitleFromFirstMessage("   ", { orgUuid: "org-1" })).toBeNull();
  });

  it("returns null when org uuid missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    // Force no org without hitting bootstrap network.
    expect(await generateSessionTitleFromFirstMessage("long enough prompt here", { orgUuid: null })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts first_session_message and returns title (fail soft on empty)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ title: "  Fix login flow  " }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const title = await generateSessionTitleFromFirstMessage(
      "please fix the login flow for oauth users",
      { orgUuid: "org-uuid-1" },
    );
    expect(title).toBe("Fix login flow");
    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/organizations/org-uuid-1/dust/generate_session_title");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      first_session_message: "please fix the login flow for oauth users",
    });
  });

  it("truncates first_session_message to official max", async () => {
    const long = "x".repeat(OFFICIAL_AUTO_TITLE_MESSAGE_MAX + 40);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: "Long" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await generateSessionTitleFromFirstMessage(long, { orgUuid: "org-1" });
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.first_session_message).toHaveLength(OFFICIAL_AUTO_TITLE_MESSAGE_MAX);
  });

  it("fails soft when API returns empty title", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ title: "" }),
      }),
    );
    expect(
      await generateSessionTitleFromFirstMessage("please fix the login flow", { orgUuid: "org-1" }),
    ).toBeNull();
  });
});
