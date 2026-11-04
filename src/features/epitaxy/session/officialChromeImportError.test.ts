import { describe, expect, it } from "vitest";
import { PREVIEW_EMPTY_MESSAGES } from "../officialCodeChromeMessages";
import { officialChromeImportErrorCopy, officialChromeImportIsWindows } from "./officialChromeImportError";

const chrome = Object.fromEntries(
  Object.entries(PREVIEW_EMPTY_MESSAGES).map(([key, value]) => [key, value.defaultMessage]),
) as Parameters<typeof officialChromeImportErrorCopy>[0];

describe("official c887 Ce import error copy", () => {
  it("default 8DUof/fSOX interpolates browser, does not leave {browser}", () => {
    const copy = officialChromeImportErrorCopy(chrome, "ipc_error", "Chrome", true);
    expect(copy).toBe("Couldn’t import your Chrome cookies. Try again.");
    expect(copy).not.toMatch(/\{browser\}/);
  });

  it("presence_declined and keychain_denied hide the red line", () => {
    expect(officialChromeImportErrorCopy(chrome, "presence_declined", "Chrome", true)).toBeNull();
    expect(officialChromeImportErrorCopy(chrome, "keychain_denied", "Chrome", true)).toBeNull();
  });

  it("read_failed and no_chrome interpolate browser", () => {
    expect(officialChromeImportErrorCopy(chrome, "read_failed", "Chrome", true)).toBe(
      "Couldn’t read Chrome’s data. Quit Chrome and try again.",
    );
    expect(officialChromeImportErrorCopy(chrome, "no_chrome", "Firefox", false)).toBe(
      "Couldn’t find Firefox’s saved cookies on this computer.",
    );
  });

  it("busy on Windows appends K extra sentence", () => {
    const copy = officialChromeImportErrorCopy(chrome, "busy", "Chrome", true, true);
    expect(copy).toMatch(/already in progress/);
    expect(copy).toMatch(/behind this window/);
  });

  it("all_failed interpolates browser", () => {
    expect(officialChromeImportErrorCopy(chrome, "all_failed", "Google Chrome", true)).toBe(
      "Google Chrome’s saved cookies couldn’t be read. Sign in to Google Chrome once and try again.",
    );
  });

  it("Ea Windows UA", () => {
    expect(officialChromeImportIsWindows("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(true);
    expect(officialChromeImportIsWindows("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe(false);
  });
});
