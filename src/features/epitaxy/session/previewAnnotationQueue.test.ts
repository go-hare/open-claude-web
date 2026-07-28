import { describe, expect, it, beforeEach } from "vitest";
import { previewAnnotationQueue } from "./previewAnnotationQueue";

describe("previewAnnotationQueue (official qy residual)", () => {
  beforeEach(() => {
    // Reset store between tests (vanilla zustand singleton).
    previewAnnotationQueue.setState({ pending: {} });
  });

  it("push / take FIFO drains without auto-send side effects", () => {
    previewAnnotationQueue.getState().push("s1", {
      name: "preview-annotation.png",
      dataUrl: "data:image/png;base64,aaa",
      contextNote: "<preview-annotation-context>note</preview-annotation-context>",
    });
    previewAnnotationQueue.getState().push("s1", {
      name: "second.png",
      dataUrl: "data:image/png;base64,bbb",
    });
    expect(previewAnnotationQueue.getState().pending.s1).toHaveLength(2);

    const first = previewAnnotationQueue.getState().take("s1", 1);
    expect(first).toHaveLength(1);
    expect(first[0]?.name).toBe("preview-annotation.png");
    expect(first[0]?.contextNote).toContain("preview-annotation-context");
    expect(previewAnnotationQueue.getState().pending.s1).toHaveLength(1);

    const rest = previewAnnotationQueue.getState().take("s1", 5);
    expect(rest).toHaveLength(1);
    expect(rest[0]?.name).toBe("second.png");
    expect(previewAnnotationQueue.getState().pending.s1).toBeUndefined();
  });

  it("isolates sessions and clearSession only touches that id", () => {
    previewAnnotationQueue.getState().push("a", { name: "a.png", dataUrl: "data:image/png;base64,a" });
    previewAnnotationQueue.getState().push("b", { name: "b.png", dataUrl: "data:image/png;base64,b" });
    previewAnnotationQueue.getState().clearSession("a");
    expect(previewAnnotationQueue.getState().pending.a).toBeUndefined();
    expect(previewAnnotationQueue.getState().pending.b).toHaveLength(1);
  });

  it("ignores empty sessionId / dataUrl", () => {
    previewAnnotationQueue.getState().push("", { name: "x.png", dataUrl: "data:image/png;base64,x" });
    previewAnnotationQueue.getState().push("s", { name: "x.png", dataUrl: "" });
    expect(previewAnnotationQueue.getState().pending).toEqual({});
  });

  it("take with n<=0 returns empty and leaves pending", () => {
    previewAnnotationQueue.getState().push("s", { name: "x.png", dataUrl: "data:image/png;base64,x" });
    expect(previewAnnotationQueue.getState().take("s", 0)).toEqual([]);
    expect(previewAnnotationQueue.getState().pending.s).toHaveLength(1);
  });
});
