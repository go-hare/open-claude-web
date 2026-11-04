import { describe, expect, it } from "vitest";
import { officialDropBadgeStyle, paneDropIntentFromPoint, paneRefFromSessionKey } from "./sessionPaneDrag";

function withPaneStyle(col: string, row: string, run: (host: HTMLElement) => void) {
  const host = {
    getBoundingClientRect: () => ({
      left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}),
    }),
  } as HTMLElement;
  const original = globalThis.getComputedStyle;
  globalThis.getComputedStyle = () => ({
    getPropertyValue: (name: string) => name === "--df-pane-col" ? col : row,
  }) as unknown as CSSStyleDeclaration;
  try {
    run(host);
  } finally {
    globalThis.getComputedStyle = original;
  }
}

describe("paneDropIntentFromPoint (shared-23 qQ / shared-19 xJ)", () => {
  it("unsplit: left half is hint Split view, right half is over tr", () => {
    withPaneStyle("0.5", "0.5", (host) => {
      expect(paneDropIntentFromPoint(host, 100, 300, false)).toEqual({ slot: "tr", over: false });
      expect(paneDropIntentFromPoint(host, 500, 300, false)).toEqual({ slot: "tr", over: true });
    });
  });

  it("split: maps 2x2 cells to tr/bl/br", () => {
    withPaneStyle("0.5", "0.5", (host) => {
      expect(paneDropIntentFromPoint(host, 600, 100, true)).toEqual({ slot: "tr", over: true });
      expect(paneDropIntentFromPoint(host, 100, 500, true)).toEqual({ slot: "bl", over: true });
      expect(paneDropIntentFromPoint(host, 600, 500, true)).toEqual({ slot: "br", over: true });
      expect(paneDropIntentFromPoint(host, 100, 100, true)).toEqual({ slot: "tr", over: false });
    });
  });
});

describe("officialDropBadgeStyle GQ (shared-23)", () => {
  it("unsplit Split view is a new 50% column, not content-sized", () => {
    const style = officialDropBadgeStyle({ col: 1, row: 0 }, [1], false);
    expect(style.left).toBe("calc(50% + 8px)");
    expect(style.width).toBe("calc(50% - 16px)");
    expect(style.height).toBe("calc(100% - 16px)");
  });
});

describe("paneRefFromSessionKey", () => {
  it("reads code and cowork pin keys", () => {
    expect(paneRefFromSessionKey("code:abc")).toEqual({ kind: "code", id: "abc" });
    expect(paneRefFromSessionKey("cowork:abc")).toEqual({ kind: "cowork", id: "abc" });
    expect(paneRefFromSessionKey("epitaxy:abc")).toEqual({ kind: "cowork", id: "abc" });
    expect(paneRefFromSessionKey("nope")).toBeNull();
  });
});
