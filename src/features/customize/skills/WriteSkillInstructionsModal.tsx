import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { OfficialButton } from "../../shared/OfficialButton";
import { OfficialModal } from "../../shared/OfficialModal";
import { OfficialTextInput } from "../../shared/OfficialTextInput";
import { descriptionHasXmlTags, reservedWordInName, sanitizeSkillName } from "./skillMd";

/**
 * Official c0659e756 F as C — Write skill instructions (Ol onQuickCreate → yt).
 * Tm modalSize 2lg; Skill name + Description + Instructions; Cancel / Create.
 */
export function WriteSkillInstructionsModal({
  isOpen,
  onClose,
  onCreate,
  skillToEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (value: {
    description: string;
    instructions: string;
    name: string;
    skillId?: string;
  }) => void | Promise<void>;
  skillToEdit?: { description: string; instructions: string; skillId: string; skillName: string } | null;
}) {
  const nameId = useId();
  const descriptionId = useId();
  const instructionsId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [reservedError, setReservedError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const editing = Boolean(skillToEdit);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setInstructions("");
      setReservedError(null);
      setSubmitError(null);
      return;
    }
    if (skillToEdit) {
      setName(skillToEdit.skillName);
      setDescription(skillToEdit.description);
      setInstructions(skillToEdit.instructions);
      setReservedError(null);
      setSubmitError(null);
    }
  }, [isOpen, skillToEdit]);

  const descriptionLen = description.length;
  const showCount = descriptionLen >= 900;
  const overMax = descriptionLen > 1024;
  const hasXml = descriptionHasXmlTags(description);

  const onNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const caret = event.target.selectionStart ?? 0;
    const next = sanitizeSkillName(event.target.value);
    setName(next);
    const reserved = reservedWordInName(next);
    setReservedError(
      reserved ? `Name cannot contain the word “${reserved}”.` : null,
    );
    requestAnimationFrame(() => {
      if (!nameRef.current) return;
      const pos = Math.min(caret, next.length);
      nameRef.current.setSelectionRange(pos, pos);
    });
  }, []);

  const busy = false;
  const disabled =
    !name.trim() ||
    !description.trim() ||
    !instructions.trim() ||
    busy ||
    Boolean(reservedError) ||
    overMax ||
    hasXml;

  return (
    <OfficialModal
      hasCloseButton
      isOpen={isOpen}
      modalSize="2lg"
      onClose={onClose}
      title={editing ? "Edit skill instructions" : "Write skill instructions"}
    >
      <div className="flex flex-col gap-4 mt-3">
        {submitError ? (
          <div className="bg-danger-900 border-danger-200 text-danger-000 rounded-lg border px-4 py-2 text-sm" role="alert">
            {submitError}
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-200" htmlFor={nameId}>
            Skill name
          </label>
          <OfficialTextInput
            autoFocus={!editing}
            className="!text-sm focus:!outline-none"
            disabled={editing}
            error={Boolean(reservedError)}
            id={nameId}
            maxLength={64}
            onChange={onNameChange}
            placeholder="weekly-status-report"
            ref={nameRef}
            value={name}
          />
          {reservedError ? <div className="text-danger-000 text-sm">{reservedError}</div> : null}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-200" htmlFor={descriptionId}>
              Description
            </label>
            {showCount ? (
              <div className={`text-sm ${overMax ? "text-danger-000" : "text-text-500"}`}>
                {descriptionLen}/1024
              </div>
            ) : null}
          </div>
          <textarea
            className="min-w-0 break-words !text-sm max-h-[124px] overflow-y-auto bg-bg-000 border border-border-300 hover:border-border-200 rounded-lg px-3 py-2 font-large placeholder:text-text-500 can-focus"
            id={descriptionId}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Generate weekly status reports from recent work. Use when asked for updates or progress summaries."
            rows={3}
            value={description}
          />
          {overMax ? (
            <div className="text-danger-000 text-xs -mt-0.5">Description must be under 1024 characters</div>
          ) : null}
          {hasXml && !overMax ? (
            <div className="text-danger-000 text-xs -mt-0.5">Description cannot contain XML tags</div>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <label className="text-sm font-medium text-text-200" htmlFor={instructionsId}>
            Instructions
          </label>
          <textarea
            className="min-w-0 break-words !text-sm max-h-[50vh] overflow-y-auto bg-bg-000 border border-border-300 hover:border-border-200 rounded-lg px-3 py-2 font-large placeholder:text-text-500 can-focus"
            id={instructionsId}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Summarize my recent work in three sections: wins, blockers, and next steps. Keep the tone professional but not stiff..."
            rows={10}
            value={instructions}
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <OfficialButton disabled={busy} onClick={onClose} variant="secondary">
          Cancel
        </OfficialButton>
        <OfficialButton
          disabled={disabled}
          onClick={() => {
            setSubmitError(null);
            void Promise.resolve(
              onCreate({
                name: name.trim(),
                description: description.trim(),
                instructions,
                skillId: skillToEdit?.skillId,
              }),
            ).catch((error) => {
              setSubmitError(error instanceof Error ? error.message : String(error));
            });
          }}
          variant="primary"
        >
          {editing ? "Save" : "Create"}
        </OfficialButton>
      </div>
    </OfficialModal>
  );
}
