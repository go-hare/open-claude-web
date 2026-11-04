/**
 * Official cd5a31703 `kQe` transcript receipt for completed AskUserQuestion.
 *
 * `kQe` → `OQe({tool})` only (no epitaxy-engine): `vv(e)` pairs → `TIe({pairs})`.
 * Empty pairs → null (Zg). Overlay Ow stays a separate file.
 * Answer text: official TIe `k(_v,{text:e.answer})` — cb6930dae `Ds`/`ys` inline
 * (`officialInlineV`). Not assistant full markdown.
 */
import { type ReactNode } from "react";
import {
  officialAskUserTranscriptPairs,
  type OfficialAskUserTranscriptTool,
} from "./officialAskUserQuestionModel";
import { officialInlineV } from "./officialInlineV";

/** cd5a31703 `TIe` outer. */
/** cd5a TIe outer: `flex flex-col gap-2.5 w-fit ${Q_e}` — Q_e is c425 `L`. */
export const OFFICIAL_ASK_USER_TIE_ROOT =
  "flex flex-col gap-2.5 w-fit min-w-[min(100%,318px)] max-w-full epitaxy-card-outline-inset rounded-lg p-2.5 select-text";
/** cd5a31703 `TIe` per-pair column. */
export const OFFICIAL_ASK_USER_TIE_PAIR = "flex flex-col gap-0.75";
export const OFFICIAL_ASK_USER_TIE_QUESTION =
  "text-body text-secondary whitespace-pre-wrap [overflow-wrap:anywhere]";
export const OFFICIAL_ASK_USER_TIE_ANSWER =
  "text-body text-primary whitespace-pre-wrap [overflow-wrap:anywhere]";

export function OfficialAskUserTranscriptCard({
  tool,
}: {
  tool: OfficialAskUserTranscriptTool;
}): ReactNode | null {
  const pairs = officialAskUserTranscriptPairs(tool);
  if (!pairs) return null;

  return (
    <div
      className={OFFICIAL_ASK_USER_TIE_ROOT}
      data-official-kqe="cd5a31703-B4nKQMBN.js"
      data-official-oqe="OQe"
      data-official-tie="TIe"
      data-official-v="_v"
    >
      {pairs.map((pair, index) => (
        <div className={OFFICIAL_ASK_USER_TIE_PAIR} key={`${index}-${pair.question}`}>
          <p className={OFFICIAL_ASK_USER_TIE_QUESTION}>{pair.question}</p>
          <p className={OFFICIAL_ASK_USER_TIE_ANSWER}>{officialInlineV(pair.answer)}</p>
        </div>
      ))}
    </div>
  );
}
