import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../../shared/OfficialButton";
import { OfficialModal } from "../../shared/OfficialModal";
import { isSkillUploadName, parseSkillUploadFile } from "./skillMd";

/**
 * Official c4101dbe9 J as ht — Upload skill (Ol onUpload → q("upload")).
 * Tm modalSize lg, accept .zip,.skill,.md, drop zone + file requirements.
 */
export function UploadSkillModal({
  existingNames,
  isOpen,
  onClose,
  onUploaded,
}: {
  existingNames: string[];
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (value: {
    description: string;
    instructions: string;
    name: string;
    replace?: boolean;
  }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [conflictName, setConflictName] = useState<string | null>(null);
  const pendingParse = useRef<{ description: string; instructions: string; name: string } | null>(
    null,
  );

  const reset = useCallback(() => {
    setPending(false);
    setErrors([]);
    setDragOver(false);
    setConflictName(null);
    pendingParse.current = null;
  }, []);

  const handleClose = useCallback(() => {
    if (pending) return;
    reset();
    onClose();
  }, [onClose, pending, reset]);

  const ingest = useCallback(
    async (files: File[], replaceName?: string) => {
      if (files.length === 0) return;
      const file = files[0];
      if (!file || !isSkillUploadName(file.name)) {
        setErrors(["Skill files must have a .skill, .zip, or .md file extension."]);
        return;
      }
      setErrors([]);
      setPending(true);
      try {
        const parsed = await parseSkillUploadFile(file);
        if ("error" in parsed) {
          setErrors([parsed.error]);
          return;
        }
        const clash = existingNames.includes(parsed.name) && replaceName !== parsed.name;
        if (clash) {
          pendingParse.current = parsed;
          setConflictName(parsed.name);
          return;
        }
        onUploaded({ ...parsed, replace: Boolean(replaceName) });
        reset();
      } catch (error) {
        setErrors([error instanceof Error ? error.message : "Skill upload failed. You can try again."]);
      } finally {
        setPending(false);
      }
    },
    [existingNames, onUploaded, reset],
  );

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;
    void ingest(list ? Array.from(list) : []);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    void ingest(Array.from(event.dataTransfer.files));
  };

  const replacing = Boolean(conflictName);

  return (
    <OfficialModal
      autoCloseOnFocusOut={!pending}
      hasCloseButton
      isOpen={isOpen}
      modalSize="lg"
      onClose={handleClose}
      title={
        replacing
          ? `Replace “${conflictName}” skill?`
          : "Upload skill"
      }
    >
      {replacing ? (
        <>
          <div className="mt-1 mb-2">
            <div className="text-text-300 whitespace-pre-line">
              There’s an existing skill with the same name. Uploading this skill will replace the
              existing one, which can’t be restored.
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <OfficialButton
              disabled={pending}
              onClick={() => {
                setConflictName(null);
                pendingParse.current = null;
              }}
              variant="secondary"
            >
              Cancel
            </OfficialButton>
            <OfficialButton
              disabled={pending}
              loading={pending}
              onClick={() => {
                const parsed = pendingParse.current;
                if (!parsed) return;
                onUploaded({ ...parsed, replace: true });
                reset();
              }}
              variant="danger"
            >
              Upload and replace
            </OfficialButton>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-6 mt-6">
          {errors.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-md border-[0.5px] border-danger-000 px-3 py-4 bg-danger-900">
              {errors.map((error) => (
                <div className="flex font-base items-center !text-danger-000 gap-2" key={error}>
                  <Icon name="Warning" />
                  {error}
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-3">
            <button
              className={[
                "w-full relative border-[1px] border-dashed border-border-200 rounded-lg h-[120px]",
                "flex flex-col items-center justify-center transition-colors text-sm text-text-500 gap-2",
                pending ? "!cursor-not-allowed" : "hover:bg-bg-200 cursor-pointer",
              ].join(" ")}
              disabled={pending}
              onClick={() => inputRef.current?.click()}
              onDragLeave={() => setDragOver(false)}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDrop={onDrop}
              type="button"
            >
              {pending ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent opacity-80" />
              ) : (
                <Icon customSize={32} name="FileUpload" />
              )}
              {pending ? "Uploading..." : "Drag and drop or click to upload"}
              {dragOver ? (
                <div className="absolute h-[120px] inset-[-1px] text-accent-000 z-50 pointer-events-none rounded-lg border-[1px] border-dashed border-accent-100 bg-accent-900">
                  <div className="flex flex-col gap-2 items-center justify-center h-full">
                    <Icon customSize={32} name="FileUpload" />
                    <div className="font-normal text-sm">Drag and drop to upload</div>
                  </div>
                </div>
              ) : null}
            </button>
            <div className="[font-feature-settings:'salt'_on] text-xs text-text-400 flex flex-col gap-5">
              <div>
                <p>File requirements</p>
                <ul className="list-disc list-inside mt-1">
                  <li>.md file must contain skill name and description formatted in YAML</li>
                  <li>.zip or .skill file must include a SKILL.md file</li>
                </ul>
              </div>
              <p>
                <a
                  className="underline"
                  href="https://support.claude.com/en/articles/12512198-how-to-create-custom-skills"
                  rel="noreferrer"
                  target="_blank"
                >
                  Read more about creating skills
                </a>{" "}
                or{" "}
                <a
                  className="underline"
                  href="https://github.com/anthropics/skills/tree/main/skills/algorithmic-art"
                  rel="noreferrer"
                  target="_blank"
                >
                  see an example
                </a>
              </p>
            </div>
          </div>
          <input
            accept=".zip,.skill,.md"
            className="hidden"
            onChange={onFileChange}
            ref={inputRef}
            type="file"
          />
        </div>
      )}
    </OfficialModal>
  );
}
