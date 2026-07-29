import { beforeEach, describe, expect, it } from "vitest";
import { officialCodeSessionStore } from "./officialCodeSessionStore";

describe("officialCodeSessionStore.removeSession", () => {
  beforeEach(() => {
    officialCodeSessionStore.setState({ buckets: {} });
  });

  it("removes only the target bucket", () => {
    officialCodeSessionStore.getState().openSession("a", {
      id: "a",
      kind: "code",
      title: "A",
      updatedAtMs: 1,
    } as never);
    officialCodeSessionStore.getState().openSession("b", {
      id: "b",
      kind: "code",
      title: "B",
      updatedAtMs: 2,
    } as never);

    officialCodeSessionStore.getState().removeSession("a");

    expect(officialCodeSessionStore.getState().buckets.a).toBeUndefined();
    expect(officialCodeSessionStore.getState().buckets.b).toBeDefined();
  });

  it("is a no-op for missing ids", () => {
    officialCodeSessionStore.getState().openSession("b", {
      id: "b",
      kind: "code",
      title: "B",
      updatedAtMs: 2,
    } as never);
    const before = officialCodeSessionStore.getState().buckets;
    officialCodeSessionStore.getState().removeSession("missing");
    expect(officialCodeSessionStore.getState().buckets).toBe(before);
  });
});
