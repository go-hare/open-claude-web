import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  formatOfficialMarkdownLinkConfirmDescription,
  insertOfficialMarkdownLinkZwsp,
  OFFICIAL_MARKDOWN_LINK_CONFIRM_COPY,
  OFFICIAL_MARKDOWN_LINK_CONFIRM_DELAY_MS,
  OFFICIAL_MARKDOWN_LINK_CONFIRM_HOST_MAX,
  OFFICIAL_MARKDOWN_LINK_CONFIRM_PATH_MAX,
  OFFICIAL_MARKDOWN_LINK_CONFIRM_ZWSP_THRESHOLD,
  shouldConfirmHttpHref,
  truncateOfficialMarkdownLinkUrl,
} from "./officialMarkdownLinkConfirm";

const here = path.dirname(fileURLToPath(import.meta.url));
const markdownSource = readFileSync(path.join(here, "OfficialCodeMarkdown.tsx"), "utf8");
const helperSource = readFileSync(path.join(here, "officialMarkdownLinkConfirm.ts"), "utf8");

/** Pin `c11959232-CDBo_AYC.js` `Ru`/`zu` dump — lock product helpers 1:1. */
function officialRu(e: string): string {
  return e.length <= 40 ? e : e.replace(/.{16}/g, "$&\u200B");
}
function officialZu(e: string): string {
  let t: URL;
  try {
    t = new URL(e);
  } catch {
    return officialRu(e.slice(0, 160));
  }
  const n = t.hostname.length > 80 ? `…${t.hostname.slice(-80)}` : t.hostname;
  const r = t.port ? `:${t.port}` : "";
  const i = `${t.protocol}//${n}${r}`;
  const a = e.slice(t.origin.length);
  if (a.length <= 160) return officialRu(i + a);
  const o = Math.floor(160 / 2);
  return officialRu(`${i}${a.slice(0, o)}…${a.slice(a.length - o)}`);
}

describe("officialMarkdownLinkConfirm (c11959232-CDBo_AYC.js Bu/zu/Ru)", () => {
  it("locks Fu/Iu/Lu constants from the pin dump", () => {
    expect(OFFICIAL_MARKDOWN_LINK_CONFIRM_HOST_MAX).toBe(80);
    expect(OFFICIAL_MARKDOWN_LINK_CONFIRM_PATH_MAX).toBe(160);
    expect(OFFICIAL_MARKDOWN_LINK_CONFIRM_ZWSP_THRESHOLD).toBe(40);
    expect(helperSource).toMatch(/var Fu=80,Iu=160,Lu=40/);
  });

  it("locks official Bu copy ids and English catalog strings", () => {
    expect(OFFICIAL_MARKDOWN_LINK_CONFIRM_COPY.title).toEqual({
      id: "NoZlb+AuBf",
      defaultMessage: "Open this link in your browser?",
    });
    expect(OFFICIAL_MARKDOWN_LINK_CONFIRM_COPY.description).toEqual({
      id: "r9f/CaGFqO",
      defaultMessage:
        "This link is part of the previewed file. It will open in your default browser: {url}",
    });
    expect(OFFICIAL_MARKDOWN_LINK_CONFIRM_COPY.confirm).toEqual({
      id: "JfG49wNHKP",
      defaultMessage: "Open",
    });
  });

  it("Ru leaves short strings alone and inserts U+200B every 16 chars past Lu", () => {
    expect(insertOfficialMarkdownLinkZwsp("https://example.com")).toBe("https://example.com");
    const long = "abcdefghijklmnopqrstuvwxyz0123456789ABCDE";
    expect(long.length).toBeGreaterThan(40);
    expect(insertOfficialMarkdownLinkZwsp(long)).toBe(officialRu(long));
    expect(insertOfficialMarkdownLinkZwsp(long)).toContain("\u200B");
  });

  it("zu matches pin dump for short, long host, long path, and invalid url", () => {
    const short = "https://example.com/docs";
    expect(truncateOfficialMarkdownLinkUrl(short)).toBe(officialZu(short));

    const longHost = `https://${"a".repeat(90)}.example.com/x`;
    expect(truncateOfficialMarkdownLinkUrl(longHost)).toBe(officialZu(longHost));
    expect(truncateOfficialMarkdownLinkUrl(longHost)).toContain("…");

    const longPath = `https://example.com/${"p".repeat(200)}`;
    expect(truncateOfficialMarkdownLinkUrl(longPath)).toBe(officialZu(longPath));

    const invalid = `not a url ${"z".repeat(200)}`;
    expect(truncateOfficialMarkdownLinkUrl(invalid)).toBe(officialZu(invalid));
    expect(truncateOfficialMarkdownLinkUrl(invalid).length).toBeLessThanOrEqual(160 + 10);
  });

  it("locks cebf ml 500ms delay constant", () => {
    expect(OFFICIAL_MARKDOWN_LINK_CONFIRM_DELAY_MS).toBe(500);
    expect(helperSource).toMatch(/OFFICIAL_MARKDOWN_LINK_CONFIRM_DELAY_MS = 500/);
    expect(helperSource).toMatch(/useOfficialMarkdownLinkConfirmReady/);
  });

  it("formats Bu description with zu(url)", () => {
    const url = "https://example.com/readme";
    expect(formatOfficialMarkdownLinkConfirmDescription(url)).toBe(
      `This link is part of the previewed file. It will open in your default browser: ${officialZu(url)}`,
    );
  });

  it("shouldConfirmHttpHref is http(s) only (Bu intercept; not local/mailto)", () => {
    expect(shouldConfirmHttpHref("https://example.com")).toBe(true);
    expect(shouldConfirmHttpHref("http://localhost:3000")).toBe(true);
    expect(shouldConfirmHttpHref("mailto:a@b.c")).toBe(false);
    expect(shouldConfirmHttpHref("src/foo.ts")).toBe(false);
    expect(shouldConfirmHttpHref("/abs/path.md")).toBe(false);
    expect(shouldConfirmHttpHref("./rel.md")).toBe(false);
    expect(shouldConfirmHttpHref("javascript:alert(1)")).toBe(false);
    expect(shouldConfirmHttpHref("#section")).toBe(false);
    expect(shouldConfirmHttpHref("")).toBe(false);
    expect(shouldConfirmHttpHref(undefined)).toBe(false);
  });
});

describe("OfficialMarkdownAnchor Bu wiring (Files/preview markdown)", () => {
  it("http(s) preventDefault + ConfirmDialog danger Open; local path uses OfficialEuFileRef", () => {
    expect(markdownSource).toMatch(/from "\.\/officialMarkdownLinkConfirm"/);
    expect(markdownSource).toMatch(/shouldConfirmHttpHref/);
    expect(markdownSource).toMatch(/event\.preventDefault\(\)/);
    expect(markdownSource).toMatch(/<ConfirmDialog/);
    expect(markdownSource).toMatch(/variant="danger"/);
    expect(markdownSource).toMatch(/data-intl-id=\{OFFICIAL_MARKDOWN_LINK_CONFIRM_COPY\.title\.id\}/);
    expect(markdownSource).toMatch(/data-intl-id=\{OFFICIAL_MARKDOWN_LINK_CONFIRM_COPY\.description\.id\}/);
    expect(markdownSource).toMatch(/data-intl-id=\{OFFICIAL_MARKDOWN_LINK_CONFIRM_COPY\.confirm\.id\}/);
    expect(markdownSource).toMatch(/window\.open\(url, "_blank", "noopener,noreferrer"\)/);
    expect(markdownSource).toMatch(/handleCoworkTranscriptLinkClick/);
    expect(markdownSource).toMatch(/OfficialEuFileRef/);
    expect(markdownSource).toMatch(/looksLikeOfficialLocalPathHref/);
    expect(markdownSource).toMatch(/useOfficialMarkdownLinkConfirmReady/);
    expect(markdownSource).toMatch(/confirmDisabled=\{!confirmReady\}/);
    expect(markdownSource).toMatch(/OfficialMarkdownConfirmContext/);
    expect(markdownSource).toMatch(/OfficialFileMarkdownContent/);
    expect(markdownSource).not.toMatch(/onRoutedLinkConfirmRequested/);
    expect(markdownSource).not.toMatch(/Guest OAuth|guest oauth|invent.*oauth/i);
  });
});
