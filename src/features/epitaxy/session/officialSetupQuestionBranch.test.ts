import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  isOfficialProposeBranchTool,
  OFFICIAL_DEFAULT_SUGGESTED_BRANCH,
  OFFICIAL_JWE_CARD_CLASS,
  OFFICIAL_JWE_DESCRIPTION_CLASS,
  OFFICIAL_JWE_RADIO_ITEM_CLASS,
  OFFICIAL_JWE_TEST_ID,
  OFFICIAL_JWE_TITLE_CLASS,
  OFFICIAL_PROPOSE_BRANCH_TOOL,
  OFFICIAL_SETUP_ANSWER_KEY,
  OFFICIAL_SETUP_BRANCH_CONTINUE_ID,
  OFFICIAL_SETUP_BRANCH_DESCRIPTION_ID,
  OFFICIAL_SETUP_BRANCH_NEW_DESCRIPTION_ID,
  OFFICIAL_SETUP_BRANCH_NEW_ID,
  OFFICIAL_SETUP_BRANCH_STAY_DESCRIPTION_ID,
  OFFICIAL_SETUP_BRANCH_STAY_ID,
  OFFICIAL_SETUP_BRANCH_TITLE_ID,
  OFFICIAL_SETUP_QUESTION_BRANCH_MESSAGES,
  OFFICIAL_SETUP_QUESTION_BRANCH_SOURCE_CD4F,
  OFFICIAL_SETUP_QUESTION_BRANCH_SOURCE_CD5A,
  OFFICIAL_ZWE_TEST_ID,
  officialResolveSuggestedBranch,
  officialSetupBranchChoice,
  officialSetupBranchOnceInput,
  Xwe,
  Ywe,
} from "./officialSetupQuestionBranch";

const here = path.dirname(fileURLToPath(import.meta.url));
const pinDir = "/Users/apple/work-py/hare-code/open-claude-desktop/resources/ion-dist/assets/v1";
const pin = readFileSync(path.join(pinDir, OFFICIAL_SETUP_QUESTION_BRANCH_SOURCE_CD5A), "utf8");
const cd4f = readFileSync(path.join(pinDir, OFFICIAL_SETUP_QUESTION_BRANCH_SOURCE_CD4F), "utf8");
const helperSource = readFileSync(path.join(here, "officialSetupQuestionBranch.ts"), "utf8");
const cardSource = readFileSync(path.join(here, "OfficialSetupQuestionBranch.tsx"), "utf8");

describe("official Zwe / Jwe / Ywe branch setup (cd5a / cd4f)", () => {
  it("locks pin chunks and Be / ze", () => {
    expect(OFFICIAL_SETUP_QUESTION_BRANCH_SOURCE_CD5A).toBe("cd5a31703-B4nKQMBN.js");
    expect(OFFICIAL_SETUP_QUESTION_BRANCH_SOURCE_CD4F).toBe("cd4f82e77-CBJjhVG2.js");
    expect(pin).toContain("function Jwe(");
    expect(pin).toContain('data-testid":o="epitaxy-setup-card"');
    expect(pin).toContain(`data-testid":"${OFFICIAL_ZWE_TEST_ID}"`);
    expect(pin).toContain(OFFICIAL_JWE_CARD_CLASS);
    expect(pin).toContain(OFFICIAL_JWE_TITLE_CLASS);
    expect(pin).toContain(OFFICIAL_JWE_DESCRIPTION_CLASS);
    expect(pin).toContain(OFFICIAL_JWE_RADIO_ITEM_CLASS);
    expect(pin).toContain('variant:"primary",size:"sm"');
    expect(pin).toContain('var Xwe="claude/changes"');
    expect(pin).toContain("function Ywe(e){return!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/.test(e)||e.includes(\"..\")");
    expect(cd4f).toContain('ze="mcp__ccd_directory__propose_branch"');
    expect(cd4f).toContain('Be="_setupAnswer"');
    expect(OFFICIAL_SETUP_ANSWER_KEY).toBe("_setupAnswer");
    expect(OFFICIAL_PROPOSE_BRANCH_TOOL).toBe("mcp__ccd_directory__propose_branch");
    expect(Xwe).toBe("claude/changes");
    expect(OFFICIAL_DEFAULT_SUGGESTED_BRANCH).toBe("claude/changes");
  });

  it("locks iT message ids", () => {
    expect(OFFICIAL_SETUP_BRANCH_TITLE_ID).toBe("o5xU+eHp2g");
    expect(OFFICIAL_SETUP_BRANCH_DESCRIPTION_ID).toBe("okmrYUKDjI");
    expect(OFFICIAL_SETUP_BRANCH_NEW_ID).toBe("PjgAdmGJjY");
    expect(OFFICIAL_SETUP_BRANCH_NEW_DESCRIPTION_ID).toBe("cPsk2nZ48/");
    expect(OFFICIAL_SETUP_BRANCH_STAY_ID).toBe("f23kX32S5X");
    expect(OFFICIAL_SETUP_BRANCH_STAY_DESCRIPTION_ID).toBe("l/OBFxRPAW");
    expect(OFFICIAL_SETUP_BRANCH_CONTINUE_ID).toBe("acrOozm08x");
    expect(pin).toContain(`id:"${OFFICIAL_SETUP_BRANCH_TITLE_ID}"`);
    expect(pin).toContain(`id:"${OFFICIAL_SETUP_BRANCH_DESCRIPTION_ID}"`);
    expect(pin).toContain(`id:"${OFFICIAL_SETUP_BRANCH_NEW_ID}"`);
    expect(pin).toContain(`id:"${OFFICIAL_SETUP_BRANCH_NEW_DESCRIPTION_ID}"`);
    expect(pin).toContain(`id:"${OFFICIAL_SETUP_BRANCH_STAY_ID}"`);
    expect(pin).toContain(`id:"${OFFICIAL_SETUP_BRANCH_STAY_DESCRIPTION_ID}"`);
    expect(pin).toContain(`id:"${OFFICIAL_SETUP_BRANCH_CONTINUE_ID}"`);
    expect(OFFICIAL_SETUP_QUESTION_BRANCH_MESSAGES.branchNew.defaultMessage).toBe("New branch {name}");
  });

  it("Ywe accepts git-like names and rejects traversal / empty segments / .lock", () => {
    expect(Ywe("claude/changes")).toBe(true);
    expect(Ywe("a")).toBe(true);
    expect(Ywe("Feature.1_2-3/ok")).toBe(true);
    expect(Ywe("A".repeat(100))).toBe(true);
    expect(Ywe("A".repeat(101))).toBe(false);
    expect(Ywe("")).toBe(false);
    expect(Ywe(".hidden")).toBe(false);
    expect(Ywe("-bad")).toBe(false);
    expect(Ywe("foo..bar")).toBe(false);
    expect(Ywe("foo/")).toBe(false);
    expect(Ywe("/foo")).toBe(false);
    expect(Ywe("foo/.bar")).toBe(false);
    expect(Ywe("foo/bar.")).toBe(false);
    expect(Ywe("foo.lock")).toBe(false);
    expect(Ywe("feat/foo.lock")).toBe(false);
  });

  it("resolves suggested via Ywe else Xwe", () => {
    expect(officialResolveSuggestedBranch({ suggested: "feat/ok" })).toBe("feat/ok");
    expect(officialResolveSuggestedBranch({ suggested: "../escape" })).toBe(Xwe);
    expect(officialResolveSuggestedBranch({ suggested: 1 })).toBe(Xwe);
    expect(officialResolveSuggestedBranch({})).toBe(Xwe);
    expect(officialSetupBranchChoice("stay")).toBe("stay");
    expect(officialSetupBranchChoice("new")).toBe("new");
    expect(officialSetupBranchChoice("other")).toBe("new");
  });

  it("isOfficialProposeBranchTool is exact mcp__ccd_directory__propose_branch", () => {
    expect(isOfficialProposeBranchTool("mcp__ccd_directory__propose_branch")).toBe(true);
    expect(isOfficialProposeBranchTool("propose_branch")).toBe(false);
    expect(isOfficialProposeBranchTool("mcp__x__propose_branch")).toBe(false);
    expect(isOfficialProposeBranchTool("AskUserQuestion")).toBe(false);
  });

  it("decide once payload sets suggested + _setupAnswer new|stay", () => {
    const input = { suggested: "bad..", extra: true };
    expect(officialSetupBranchOnceInput(input, "new")).toEqual({
      suggested: Xwe,
      extra: true,
      _setupAnswer: { kind: "branch", choice: "new", name: Xwe },
    });
    expect(officialSetupBranchOnceInput({ suggested: "feat/ok" }, "stay")).toEqual({
      suggested: "feat/ok",
      _setupAnswer: { kind: "branch", choice: "stay" },
    });
  });

  it("locks Jwe/Zwe class strings on the card; OfficialButton primary small; native radios", () => {
    expect(helperSource).toContain("function Ywe(");
    expect(helperSource).toContain('Xwe = "claude/changes"');
    expect(cardSource).toContain("cd5a31703-B4nKQMBN.js");
    expect(cardSource).toContain(":Jwe Zwe");
    expect(helperSource).toContain(OFFICIAL_JWE_CARD_CLASS);
    expect(cardSource).toContain(OFFICIAL_JWE_CARD_CLASS);
    expect(cardSource).toContain(OFFICIAL_ZWE_TEST_ID);
    expect(cardSource).toContain(OFFICIAL_JWE_TEST_ID);
    expect(cardSource).toContain('size="small"');
    expect(cardSource).toContain('variant="primary"');
    expect(cardSource).toContain('type="radio"');
    expect(cardSource).toContain("font-mono-ui");
    expect(cardSource).toContain("OfficialButton");
    expect(cardSource).not.toMatch(/OfficialRadioGroup/);
    expect(cardSource).not.toContain("Guest OAuth");
    expect(cardSource).not.toMatch(/from "\.\/OfficialToolPermissionApprovals"/);
  });
});
