import { describe, expect, it, vi } from "vitest";
import {
  handleDesktopQuickEntrySubmit,
  isDesktopQuickEntryHost,
  normalizeQuickEntrySubmitPayload,
} from "./useDesktopQuickEntrySubmit";

describe("useDesktopQuickEntrySubmit residual helpers", () => {
  it("isDesktopQuickEntryHost matches Electron / Claude UA residual", () => {
    expect(isDesktopQuickEntryHost("Mozilla/5.0 Electron/41.5.0", false)).toBe(true);
    expect(isDesktopQuickEntryHost("Mozilla/5.0 Claude/1.0", false)).toBe(true);
    expect(isDesktopQuickEntryHost("Mozilla/5.0 Chrome/120", false)).toBe(false);
    expect(isDesktopQuickEntryHost("Mozilla/5.0 Chrome/120", true)).toBe(true);
  });

  it("normalizeQuickEntrySubmitPayload accepts official text/images/chatId", () => {
    expect(
      normalizeQuickEntrySubmitPayload({
        text: "hello",
        images: [{ base64: "abc", mimeType: "image/png", filename: "a.png" }],
        chatId: "c1",
      }),
    ).toEqual({
      text: "hello",
      images: [{ base64: "abc", mimeType: "image/png", filename: "a.png" }],
      chatId: "c1",
    });
    expect(normalizeQuickEntrySubmitPayload({ text: "   ", images: [] })).toBeNull();
    expect(
      normalizeQuickEntrySubmitPayload({
        text: "",
        imageBase64: "xx",
        imageMimeType: "image/jpeg",
      }),
    ).toEqual({
      text: "",
      images: [{ base64: "xx", mimeType: "image/jpeg" }],
      chatId: undefined,
    });
  });

  it("handleDesktopQuickEntrySubmit starts new session when no chatId", async () => {
    const navigate = vi.fn();
    const startSession = vi.fn(async () => ({ id: "local_abc" }));
    const result = await handleDesktopQuickEntrySubmit(
      { text: "hi from quick entry", images: [] },
      {
        isDesktop: true,
        getWorkspace: async () => ({ cwd: "/tmp" }),
        startSession,
        navigate,
      },
    );
    expect(result).toBe("ok-new-session");
    expect(startSession).toHaveBeenCalledOnce();
    expect(startSession.mock.calls[0][0].message).toBe("hi from quick entry");
    expect(navigate).toHaveBeenCalledWith("/local_sessions/local_abc");
  });

  it("handleDesktopQuickEntrySubmit forwards images into startSession", async () => {
    const navigate = vi.fn();
    const startSession = vi.fn(async () => ({ id: "local_img" }));
    const images = [{ base64: "abc123", mimeType: "image/png", filename: "shot.png" }];
    const result = await handleDesktopQuickEntrySubmit(
      { text: "see screenshot", images },
      {
        isDesktop: true,
        getWorkspace: async () => ({ cwd: "/tmp" }),
        startSession,
        navigate,
      },
    );
    expect(result).toBe("ok-new-session");
    expect(startSession.mock.calls[0][0].images).toEqual(images);
    expect(startSession.mock.calls[0][0].message).toBe("see screenshot");
  });

  it("handleDesktopQuickEntrySubmit supports images-only new session", async () => {
    const startSession = vi.fn(async () => ({ id: "local_img_only" }));
    const result = await handleDesktopQuickEntrySubmit(
      { text: "", images: [{ base64: "xx", mimeType: "image/jpeg" }] },
      {
        isDesktop: true,
        getWorkspace: async () => ({ cwd: "/tmp" }),
        startSession,
        navigate: vi.fn(),
      },
    );
    expect(result).toBe("ok-new-session");
    expect(startSession.mock.calls[0][0].message).toBe("");
    expect(startSession.mock.calls[0][0].images).toHaveLength(1);
  });

  it("handleDesktopQuickEntrySubmit sends into local chatId with images", async () => {
    const navigate = vi.fn();
    const startSession = vi.fn();
    const sendMessage = vi.fn(async () => null);
    const images = [{ base64: "abc", mimeType: "image/png" }];
    const result = await handleDesktopQuickEntrySubmit(
      { text: "continue", chatId: "local_deadbeef", images },
      { isDesktop: true, startSession, sendMessage, navigate },
    );
    expect(result).toBe("ok-existing-local");
    expect(startSession).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledOnce();
    expect(sendMessage.mock.calls[0][0]).toBe("local_deadbeef");
    expect(sendMessage.mock.calls[0][1]).toBe("continue");
    expect(sendMessage.mock.calls[0][2].images).toEqual(images);
    expect(navigate.mock.calls[0][0]).toContain("/local_sessions/local_deadbeef");
    expect(navigate.mock.calls[0][0]).toContain("desktop_quick_entry=1");
    expect(navigate.mock.calls[0][0]).not.toContain("q=");
  });

  it("bails when not desktop", async () => {
    const result = await handleDesktopQuickEntrySubmit(
      { text: "x" },
      { isDesktop: false, navigate: vi.fn(), startSession: vi.fn() },
    );
    expect(result).toBe("ignored-not-desktop");
  });
});
