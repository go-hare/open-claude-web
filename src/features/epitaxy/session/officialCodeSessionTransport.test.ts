import { describe, expect, it } from "vitest";
import { isOfficialCodeSessionEventForId } from "./officialCodeSessionEventFilter";

describe("official U.subscribe sessionId filter", () => {
  it("matches sessionId / id / session.id", () => {
    expect(isOfficialCodeSessionEventForId({ sessionId: "a" }, "a")).toBe(true);
    expect(isOfficialCodeSessionEventForId({ id: "a" }, "a")).toBe(true);
    expect(isOfficialCodeSessionEventForId({ session: { id: "a" } }, "a")).toBe(true);
    expect(isOfficialCodeSessionEventForId({ session: { sessionId: "a" } }, "a")).toBe(true);
    expect(isOfficialCodeSessionEventForId({ sessionId: "b" }, "a")).toBe(false);
  });
});
