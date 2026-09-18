import { describe, expect, it } from "vitest";
import {
  buildOfficialSuggestionPatch,
  extractOfficialDiffSnippet,
  mapOfficialPrReviewComment,
  parseOfficialPrCommentBody,
  prependOfficialStagedPrComments,
} from "./officialDiffPrCommentResidual";

describe("official aN / ic / Dc / Ec parse residual", () => {
  it("aN maps id pr-${id} and url, drops missing line", () => {
    expect(mapOfficialPrReviewComment({ id: 12, path: "a.ts", body: "nits" })).toBeNull();
    expect(mapOfficialPrReviewComment({
      author: "alice",
      body: "nits",
      id: 12,
      line: 8,
      path: "src/a.ts",
      url: "https://github.com/o/r/pull/1#discussion_r12",
    })).toMatchObject({
      author: "alice",
      body: "nits",
      endLine: 8,
      filePath: "src/a.ts",
      id: "pr-12",
      resolved: false,
      side: "additions",
      source: "pr",
      startLine: 8,
      url: "https://github.com/o/r/pull/1#discussion_r12",
    });
  });

  it("ic prepends staged comments before composer text", () => {
    expect(prependOfficialStagedPrComments([], "hello")).toBe("hello");
    expect(prependOfficialStagedPrComments([
      {
        author: "bob",
        body: "please rename",
        endLine: 4,
        filePath: "src/a.ts",
        lang: "ts",
        snippet: "const x = 1",
        startLine: 4,
      },
    ], "ok")).toBe(
      "In `src/a.ts` at line 4 — review comment from @bob:\n```ts\nconst x = 1\n```\nplease rename\n\n\nok",
    );
  });

  it("Dc builds unified suggestion patch; missing original is null", () => {
    expect(buildOfficialSuggestionPatch("a.ts", 3, undefined, "b")).toBeNull();
    expect(buildOfficialSuggestionPatch("a.ts", 3, "foo", "bar")).toBe(
      "--- a/a.ts\n+++ b/a.ts\n@@ -3,1 +3,1 @@\n-foo\n+bar",
    );
  });

  it("Ec splits text / details / suggestion fences", () => {
    const body = "intro\n\n```suggestion\nnext()\n```\n\n<details><summary>More</summary>hidden</details>";
    const segments = parseOfficialPrCommentBody(body, "src/a.ts", 2, "prev()", "ts");
    expect(segments.map((item) => item.kind)).toEqual(["text", "suggestion", "details"]);
    const suggestion = segments[1];
    expect(suggestion.kind).toBe("suggestion");
    if (suggestion.kind === "suggestion") {
      expect(suggestion.file.contents).toBe("next()");
      expect(suggestion.patch).toContain("+next()");
    }
  });

  it("nc returns joined snippet for a full-file line range", () => {
    const snippet = extractOfficialDiffSnippet(
      {
        additionLines: ["one\n", "two\n", "three\n"],
        deletionLines: [],
        hunks: [],
        isPartial: false,
      },
      "additions",
      2,
      3,
    );
    expect(snippet).toBe("two\nthree");
  });
});
