/**
 * Official Zwe / Jwe / Ywe branch setup helpers (pin 2.31226.1).
 *
 * cd5a31703-B4nKQMBN.js:
 * - `Jwe` setup card (`data-testid` default `epitaxy-setup-card`)
 * - `Zwe` `data-testid="epitaxy-setup-question-branch"`
 * - `Ywe` suggested-branch validator; `Xwe="claude/changes"`
 * - `decide("once", { ...input, suggested, [ipe]: choice })`
 *
 * cd4f82e77-CBJjhVG2.js:
 * - `ze="mcp__ccd_directory__propose_branch"`
 * - `Be="_setupAnswer"` (`ipe` in cd5a)
 */

export const OFFICIAL_SETUP_QUESTION_BRANCH_SOURCE_CD5A = "cd5a31703-B4nKQMBN.js";
export const OFFICIAL_SETUP_QUESTION_BRANCH_SOURCE_CD4F = "cd4f82e77-CBJjhVG2.js";

/** cd4f `ze`. */
export const OFFICIAL_PROPOSE_BRANCH_TOOL = "mcp__ccd_directory__propose_branch";
/** cd4f `Be` / cd5a `ipe`. */
export const OFFICIAL_SETUP_ANSWER_KEY = "_setupAnswer";
/** cd5a `Xwe`. */
export const Xwe = "claude/changes";
export const OFFICIAL_DEFAULT_SUGGESTED_BRANCH = Xwe;

export const OFFICIAL_ZWE_TEST_ID = "epitaxy-setup-question-branch";
export const OFFICIAL_JWE_TEST_ID = "epitaxy-setup-card";

/** cd5a `Jwe` card. */
export const OFFICIAL_JWE_CARD_CLASS =
  "flex w-full max-w-[420px] flex-col gap-md rounded-xl border bg-surface-1 p-md shadow-sm";
export const OFFICIAL_JWE_HEADER_CLASS = "flex flex-col gap-0.5";
export const OFFICIAL_JWE_TITLE_CLASS = "text-body font-semibold text-primary";
export const OFFICIAL_JWE_DESCRIPTION_CLASS = "text-footnote text-secondary";
/** shared-frame `LN` RadioGroup.Root + Jwe `gap-xs`. */
export const OFFICIAL_JWE_RADIO_ROOT_CLASS = "flex flex-col gap-2 font-sans gap-xs";
/** Jwe `Bs.Item` extra className. */
export const OFFICIAL_JWE_RADIO_ITEM_CLASS = "w-full rounded-md px-xs py-1 hover:bg-alpha-1";
/** shared-frame `MN` / `NN` Item (description present → items-start). */
export const OFFICIAL_BS_RADIO_ITEM_CLASS =
  "cds-reset group/rd inline-flex items-start gap-2 border-0 outline-none focus-visible:outline-hidden text-start text-body font-normal text-primary data-[disabled]:opacity-disabled";
/** shared-frame `AN` + `jN` focusRing. */
export const OFFICIAL_BS_RADIO_INDICATOR_CLASS =
  "flex shrink-0 size-[var(--cds-checkbox)] items-center justify-center rounded-full border border-strong bg-transparent group-hover/rd:border-stronger group-data-[checked]/rd:bg-fill-accent group-data-[checked]/rd:border-0 group-data-[checked]/rd:group-hover/rd:bg-fill-accent-hover group-data-[disabled]/rd:group-hover/rd:border-strong group-focus-visible/rd:shadow-focus mt-[calc((1lh_-_var(--cds-checkbox,1rem))_/_2)]";
/** shared-frame `jN` inner `ft` Indicator. */
export const OFFICIAL_BS_RADIO_DOT_CLASS =
  "size-[calc(var(--cds-checkbox,1rem)-calc(0.625rem*var(--cds-rem-scale,1)))] rounded-full bg-[var(--cds-on-accent)] data-[unchecked]:hidden";
export const OFFICIAL_JWE_ACTIONS_CLASS = "flex items-center justify-end gap-xs";
export const OFFICIAL_ZWE_NAME_CLASS = "font-mono-ui";

/** cd5a `iT` ids. */
export const OFFICIAL_SETUP_BRANCH_TITLE_ID = "o5xU+eHp2g";
export const OFFICIAL_SETUP_BRANCH_DESCRIPTION_ID = "okmrYUKDjI";
export const OFFICIAL_SETUP_BRANCH_NEW_ID = "PjgAdmGJjY";
export const OFFICIAL_SETUP_BRANCH_NEW_DESCRIPTION_ID = "cPsk2nZ48/";
export const OFFICIAL_SETUP_BRANCH_STAY_ID = "f23kX32S5X";
export const OFFICIAL_SETUP_BRANCH_STAY_DESCRIPTION_ID = "l/OBFxRPAW";
export const OFFICIAL_SETUP_BRANCH_CONTINUE_ID = "acrOozm08x";

export const OFFICIAL_SETUP_QUESTION_BRANCH_MESSAGES = {
  branchTitle: { defaultMessage: "Work on a separate branch?", id: OFFICIAL_SETUP_BRANCH_TITLE_ID },
  branchDescription: {
    defaultMessage: "Recommended: your current branch keeps its history until you merge.",
    id: OFFICIAL_SETUP_BRANCH_DESCRIPTION_ID,
  },
  branchNew: { defaultMessage: "New branch {name}", id: OFFICIAL_SETUP_BRANCH_NEW_ID },
  branchNewDescription: {
    defaultMessage:
      "Created in this folder from what’s checked out now; Claude switches to it before changing anything.",
    id: OFFICIAL_SETUP_BRANCH_NEW_DESCRIPTION_ID,
  },
  branchStay: { defaultMessage: "Stay on the current branch", id: OFFICIAL_SETUP_BRANCH_STAY_ID },
  branchStayDescription: {
    defaultMessage: "Claude commits to the branch that’s checked out now.",
    id: OFFICIAL_SETUP_BRANCH_STAY_DESCRIPTION_ID,
  },
  continue: { defaultMessage: "Continue", id: OFFICIAL_SETUP_BRANCH_CONTINUE_ID },
} as const;

export type OfficialSetupBranchChoice = "new" | "stay";

export type OfficialSetupAnswer =
  | { choice: "new"; kind: "branch"; name: string }
  | { choice: "stay"; kind: "branch" };

/** cd5a `Ywe(e)`. */
export function Ywe(name: string): boolean {
  return !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/.test(name) || name.includes("..")
    ? false
    : name.split("/").every(
      (segment) =>
        segment.length > 0
        && !segment.startsWith(".")
        && !segment.endsWith(".")
        && !segment.endsWith(".lock"),
    );
}

export function isOfficialProposeBranchTool(toolName: string | undefined | null): boolean {
  return toolName === OFFICIAL_PROPOSE_BRANCH_TOOL;
}

/** Zwe: `typeof a=="string"&&Ywe(a)?a:Xwe`. */
export function officialResolveSuggestedBranch(input: Record<string, unknown> | undefined | null): string {
  const suggested = input && typeof input === "object" ? input.suggested : undefined;
  return typeof suggested === "string" && Ywe(suggested) ? suggested : Xwe;
}

/** Zwe `e==="stay"?"stay":"new"`. */
export function officialSetupBranchChoice(value: string): OfficialSetupBranchChoice {
  return value === "stay" ? "stay" : "new";
}

/** Zwe `decide("once", { ...e.input, suggested:o, [ipe]: ... })`. */
export function officialSetupBranchOnceInput(
  input: Record<string, unknown>,
  choice: OfficialSetupBranchChoice,
  suggested = officialResolveSuggestedBranch(input),
): Record<string, unknown> {
  const answer: OfficialSetupAnswer = choice === "new"
    ? { kind: "branch", choice: "new", name: suggested }
    : { kind: "branch", choice: "stay" };
  return {
    ...input,
    suggested,
    [OFFICIAL_SETUP_ANSWER_KEY]: answer,
  };
}
