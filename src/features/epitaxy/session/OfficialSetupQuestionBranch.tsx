/**
 * Official Zwe branch setup card (pin 2.31226.1 `cd5a31703-B4nKQMBN.js`).
 *
 * Jwe: role=group, default testid epitaxy-setup-card, radio options (Bs.Root/Item),
 * qs primary sm Continue. Product: OfficialButton primary small; native radios
 * with official classNames.
 */
import { memo, useCallback, useId, useState, type ReactNode } from "react";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import {
  OFFICIAL_BS_RADIO_DOT_CLASS,
  OFFICIAL_BS_RADIO_INDICATOR_CLASS,
  OFFICIAL_BS_RADIO_ITEM_CLASS,
  OFFICIAL_SETUP_BRANCH_CONTINUE_ID,
  OFFICIAL_SETUP_BRANCH_DESCRIPTION_ID,
  OFFICIAL_SETUP_BRANCH_NEW_DESCRIPTION_ID,
  OFFICIAL_SETUP_BRANCH_NEW_ID,
  OFFICIAL_SETUP_BRANCH_STAY_DESCRIPTION_ID,
  OFFICIAL_SETUP_BRANCH_STAY_ID,
  OFFICIAL_SETUP_BRANCH_TITLE_ID,
  OFFICIAL_SETUP_QUESTION_BRANCH_MESSAGES,
  OFFICIAL_SETUP_QUESTION_BRANCH_SOURCE_CD5A,
  officialResolveSuggestedBranch,
  officialSetupBranchChoice,
  officialSetupBranchOnceInput,
  type OfficialSetupBranchChoice,
} from "./officialSetupQuestionBranch";

export { isOfficialProposeBranchTool } from "./officialSetupQuestionBranch";

export type OfficialSetupQuestionBranchProps = {
  busy?: boolean;
  input: Record<string, unknown>;
  onContinue: (decision: "once", updatedInput: Record<string, unknown>) => void;
};

type OfficialJweOption = {
  description: ReactNode;
  disabled?: boolean;
  id: OfficialSetupBranchChoice;
  label: ReactNode;
};

/** cd5a `Jwe` — native radios stand in for `Bs.Root` / `Bs.Item`. */
function OfficialSetupCardJwe({
  busy,
  dataTestId = "epitaxy-setup-card",
  description,
  onContinue,
  onValueChange,
  options,
  primaryLabel,
  title,
  value,
}: {
  busy?: boolean;
  dataTestId?: string;
  description?: ReactNode;
  onContinue: () => void;
  onValueChange: (value: OfficialSetupBranchChoice) => void;
  options: OfficialJweOption[];
  primaryLabel: ReactNode;
  title: ReactNode;
  value: OfficialSetupBranchChoice;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const radioName = useId();

  return (
    <div
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className="flex w-full max-w-[420px] flex-col gap-md rounded-xl border bg-surface-1 p-md shadow-sm"
      data-official-source={`${OFFICIAL_SETUP_QUESTION_BRANCH_SOURCE_CD5A}:Jwe Zwe`}
      data-testid={dataTestId}
      role="group"
    >
      <div className="flex flex-col gap-0.5">
        <div className="text-body font-semibold text-primary" data-intl-id={OFFICIAL_SETUP_BRANCH_TITLE_ID} id={titleId}>
          {title}
        </div>
        {description ? (
          <div
            className="text-footnote text-secondary"
            data-intl-id={OFFICIAL_SETUP_BRANCH_DESCRIPTION_ID}
            id={descriptionId}
          >
            {description}
          </div>
        ) : null}
      </div>
      <div
        aria-labelledby={titleId}
        className="flex flex-col gap-2 font-sans gap-xs"
        data-cds="RadioGroup"
        role="radiogroup"
      >
        {options.map((option) => {
          const checked = value === option.id;
          const disabled = busy || option.disabled === true;
          return (
            <label
              className={`${OFFICIAL_BS_RADIO_ITEM_CLASS} w-full rounded-md px-xs py-1 hover:bg-alpha-1`}
              data-checked={checked ? "" : undefined}
              data-disabled={disabled ? "" : undefined}
              key={option.id}
            >
              <input
                checked={checked}
                className="sr-only"
                disabled={disabled}
                name={radioName}
                onChange={(event) => onValueChange(officialSetupBranchChoice(event.currentTarget.value))}
                type="radio"
                value={option.id}
              />
              <span aria-hidden="true" className={OFFICIAL_BS_RADIO_INDICATOR_CLASS}>
                <span className={OFFICIAL_BS_RADIO_DOT_CLASS} data-unchecked={checked ? undefined : ""} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span data-intl-id={option.id === "new" ? OFFICIAL_SETUP_BRANCH_NEW_ID : OFFICIAL_SETUP_BRANCH_STAY_ID}>
                  {option.label}
                </span>
                <span
                  className="text-footnote leading-snug text-muted"
                  data-intl-id={
                    option.id === "new"
                      ? OFFICIAL_SETUP_BRANCH_NEW_DESCRIPTION_ID
                      : OFFICIAL_SETUP_BRANCH_STAY_DESCRIPTION_ID
                  }
                >
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-xs">
        <OfficialButton
          disabled={busy}
          onClick={onContinue}
          size="small"
          variant="primary"
        >
          <span data-intl-id={OFFICIAL_SETUP_BRANCH_CONTINUE_ID}>{primaryLabel}</span>
        </OfficialButton>
      </div>
    </div>
  );
}

function officialBranchNewLabel(template: string, name: string): ReactNode {
  const token = "{name}";
  const index = template.indexOf(token);
  const nameNode = <span className="font-mono-ui">{name}</span>;
  if (index < 0) return <>{template} {nameNode}</>;
  return (
    <>
      {template.slice(0, index)}
      {nameNode}
      {template.slice(index + token.length)}
    </>
  );
}

/** cd5a `Zwe`. */
export const OfficialSetupQuestionBranch = memo(function OfficialSetupQuestionBranch({
  busy,
  input,
  onContinue,
}: OfficialSetupQuestionBranchProps) {
  const copy = useI18nText(OFFICIAL_SETUP_QUESTION_BRANCH_MESSAGES);
  const [choice, setChoice] = useState<OfficialSetupBranchChoice>("new");
  const suggested = officialResolveSuggestedBranch(input);

  const handleContinue = useCallback(() => {
    if (busy) return;
    onContinue("once", officialSetupBranchOnceInput(input, choice, suggested));
  }, [busy, choice, input, onContinue, suggested]);

  return (
    <OfficialSetupCardJwe
      busy={busy}
      dataTestId="epitaxy-setup-question-branch"
      description={copy.branchDescription}
      onContinue={handleContinue}
      onValueChange={setChoice}
      options={[
        {
          id: "new",
          label: officialBranchNewLabel(copy.branchNew, suggested),
          description: copy.branchNewDescription,
        },
        {
          id: "stay",
          label: copy.branchStay,
          description: copy.branchStayDescription,
        },
      ]}
      primaryLabel={copy.continue}
      title={copy.branchTitle}
      value={choice}
    />
  );
});
