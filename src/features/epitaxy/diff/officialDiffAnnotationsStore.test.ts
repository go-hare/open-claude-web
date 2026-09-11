import { beforeEach, describe, expect, it } from "vitest";
import {
  officialDiffAnnotationCardKey,
  officialDiffAnnotationsApi,
  officialDiffAnnotationsStore,
  resetOfficialDiffAnnotationsStoreForTests,
} from "./officialDiffAnnotationsStore";

const draft = {
  body: "",
  endLine: 12,
  filePath: "src/a.ts",
  side: "additions" as const,
  startLine: 12,
};

describe("officialDiffAnnotationsStore (sc / $c)", () => {
  beforeEach(() => {
    resetOfficialDiffAnnotationsStoreForTests();
  });

  it("setDraft keys by rc(side,endLine) and stamps active", () => {
    officialDiffAnnotationsApi.setDraft("s1", draft);
    const key = officialDiffAnnotationCardKey("additions", 12);
    expect(officialDiffAnnotationsStore.getState().draftsBySession.s1?.["src/a.ts"]?.[key]).toMatchObject(draft);
    expect(officialDiffAnnotationsStore.getState().activeBySession.s1).toEqual({
      filePath: "src/a.ts",
      key,
    });
  });

  it("addAnnotation persist-shape gets id/createdAt and clearDraft drops RAM draft", () => {
    officialDiffAnnotationsApi.setDraft("s1", draft);
    const saved = officialDiffAnnotationsApi.addAnnotation("s1", { ...draft, body: "nits" });
    expect(saved.id.length).toBeGreaterThan(0);
    expect(saved.body).toBe("nits");
    officialDiffAnnotationsApi.clearDraft(
      "s1",
      "src/a.ts",
      officialDiffAnnotationCardKey("additions", 12),
    );
    expect(officialDiffAnnotationsStore.getState().draftsBySession.s1?.["src/a.ts"] ?? {}).toEqual({});
    expect(officialDiffAnnotationsStore.getState().annotationsBySession.s1?.["src/a.ts"]).toHaveLength(1);
  });

  it("setActive is a no-op for the same filePath+key", () => {
    officialDiffAnnotationsApi.setActive("s1", { filePath: "a", key: "additions:1" });
    const first = officialDiffAnnotationsStore.getState().activeBySession;
    officialDiffAnnotationsApi.setActive("s1", { filePath: "a", key: "additions:1" });
    expect(officialDiffAnnotationsStore.getState().activeBySession).toBe(first);
  });
});
