import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  officialAgentFromSearch,
  officialDirectPromptFromSearch,
  officialFolderFromSearch,
  officialPromptUrlFromSearch,
  officialSanitizePromptText,
  stripOfficialConsumedSearch,
  OFFICIAL_PROMPT_URL_FAIL_ID,
  OFFICIAL_PROMPT_URL_FAIL_MESSAGE,
} from "./officialPromptUrl";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("official prompt_url (c11959232)", () => {
  it("skips prompt_url when prompt or q is present", () => {
    expect(officialPromptUrlFromSearch("?prompt=hi&prompt_url=https://x")).toBeUndefined();
    expect(officialPromptUrlFromSearch("?q=hi&prompt_url=https://x")).toBeUndefined();
    expect(officialPromptUrlFromSearch("?prompt_url=https://example.com/p.md")).toBe(
      "https://example.com/p.md",
    );
    expect(officialPromptUrlFromSearch("")).toBeUndefined();
  });

  it("Vt/bB sanitizes ZWSP but keeps ZWNJ and ordinary prompt text", () => {
    expect(officialSanitizePromptText("Hello world")).toBe("Hello world");
    expect(officialSanitizePromptText("A​B")).toBe("AB");
    expect(officialSanitizePromptText("A‌B")).toBe("A‌B");
  });

  it("wires fetch+seed into the session tile and locks fail copy", () => {
    const tile = readFileSync(path.join(here, "../EpitaxySessionTile.tsx"), "utf8");
    const source = readFileSync(path.join(here, "officialPromptUrl.ts"), "utf8");
    expect(tile).toContain("useOfficialPromptUrlSeed");
    expect(source).toContain('credentials: "omit"');
    expect(source).toContain("epitaxy: prompt_url fetch failed");
    expect(source).toContain("officialSanitizePromptText");
    expect(source).toContain("useOfficialPromptUrlSeed");
    expect(source).toContain("sessionBound");
    expect(tile).toContain("sessionBound: Boolean(initialSessionId)");
    expect(OFFICIAL_PROMPT_URL_FAIL_ID).toBe("pSD/WD+/JJ");
    expect(OFFICIAL_PROMPT_URL_FAIL_MESSAGE).toBe("Failed to load prompt from URL");
    const home = readFileSync(path.join(here, "../EpitaxyHome.tsx"), "utf8");
    expect(home).toContain("officialDirectPromptFromSearch");
    expect(home).toContain("useOfficialPromptUrlSeed");
    expect(home).toContain("sessionBound: false");
    expect(home).not.toContain("initialRepoSlugs");
  });

  it("direct prompt/q is sanitized and wins over prompt_url", () => {
    expect(officialDirectPromptFromSearch("?prompt=Hello")).toBe("Hello");
    expect(officialDirectPromptFromSearch("?q=Hi")).toBe("Hi");
    expect(officialDirectPromptFromSearch("?prompt=A​B")).toBe("AB");
    expect(officialDirectPromptFromSearch("?prompt_url=https://x")).toBeUndefined();
  });

  it("Mo().agent is the query string as-is, not invented and not Vt-stripped", () => {
    expect(officialAgentFromSearch("?agent=reviewer")).toBe("reviewer");
    expect(officialAgentFromSearch("?agent=%20")).toBeUndefined();
    expect(officialAgentFromSearch("?prompt=hi")).toBeUndefined();
    expect(officialAgentFromSearch("")).toBeUndefined();
  });

  it("folder query seeds local cwd; src=external is skipped", () => {
    expect(officialFolderFromSearch("?folder=/Users/me/repo")).toBe("/Users/me/repo");
    expect(officialFolderFromSearch("?folder=/Users/me/repo&src=external")).toBeUndefined();
    expect(officialFolderFromSearch("?prompt=hi")).toBeUndefined();
  });

  it("strips Tb keys and keeps agent", () => {
    expect(stripOfficialConsumedSearch("?prompt=hi&agent=reviewer&foo=1")).toBe("?agent=reviewer&foo=1");
    expect(stripOfficialConsumedSearch("?q=a&prompt_url=https://x&folder=/r")).toBe("");
    expect(stripOfficialConsumedSearch("?agent=reviewer")).toBe("?agent=reviewer");
  });
});
