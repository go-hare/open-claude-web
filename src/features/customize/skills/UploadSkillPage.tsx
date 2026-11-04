import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../../shared/OfficialButton";
import { extractSkillArchiveFiles, parseSkillMarkdown, skillMdFromArchive } from "./skillMd";

/**
 * Official overlay upload page xo (c6a2a31c4) + vo drop zone.
 * Screenshot 16: ← Skills, Upload skill, “Add a skill to your workspace.”,
 * Skill file, dashed drop, Save/Cancel, “Choose a file to continue.”
 */
export function UploadSkillPage({
  existingNames,
  onBack,
  onUploaded,
}: {
  existingNames: string[];
  onBack: () => void;
  onUploaded: (value: {
    description: string;
    instructions: string;
    name: string;
    replace?: boolean;
  }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<{
    description: string;
    fileName: string;
    instructions: string;
    name: string;
  } | null>(null);
  const [conflict, setConflict] = useState(false);

  const ingest = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    if (!file) return;
    setError(null);
    setPending(true);
    try {
      const extracted = await extractSkillArchiveFiles(file);
      if ("error" in extracted) {
        setError(extracted.error);
        setPicked(null);
        return;
      }
      const md = skillMdFromArchive(extracted);
      if (!md) {
        setError(".zip or .skill file must include a SKILL.md file");
        setPicked(null);
        return;
      }
      const parsed = parseSkillMarkdown(md, file.name.replace(/\.(zip|skill|md)$/i, ""));
      if ("error" in parsed) {
        setError(parsed.error);
        setPicked(null);
        return;
      }
      setPicked({ ...parsed, fileName: file.name });
      setConflict(existingNames.includes(parsed.name));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to read skill file.");
      setPicked(null);
    } finally {
      setPending(false);
    }
  }, [existingNames]);

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

  return (
    <div className="flex h-full min-h-0 flex-col" data-official-source="c6a2a31c4:xo" data-testid="skill-upload">
      <div className="flex min-h-control shrink-0 items-center">
        <button
          className="cds-reset group/btn relative isolate inline-flex h-control items-center gap-1.5 rounded px-md text-body text-primary"
          onClick={onBack}
          type="button"
        >
          <span aria-hidden="true" className="absolute inset-0 rounded-[inherit] group-hover/btn:bg-fill-ghost-hover" />
          <Icon className="relative" name="ArrowLeft" size="sm" />
          <span className="relative">Skills</span>
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex max-w-3xl flex-col gap-lg px-xl pb-xl pt-md">
          <div className="flex flex-col gap-xs">
            <h2 className="text-title-medium text-primary">Upload skill</h2>
            <p className="text-body text-secondary">Add a skill to your workspace.</p>
          </div>
          <div className="flex flex-col gap-xs">
            <div className="flex items-center gap-sm">
              <h3 className="text-body-medium text-primary">Skill file</h3>
            </div>
            {picked ? (
              <div className="flex items-center gap-sm rounded-card border border-border px-md py-sm" data-testid="skill-upload-file-chip">
                <Icon className="shrink-0 text-secondary" name="File" size="sm" />
                <span className="min-w-0 truncate text-body-medium text-primary">{picked.fileName}</span>
                <span className="flex-1" />
                <OfficialButton
                  aria-label="Remove file"
                  disabled={pending}
                  onClick={() => {
                    setPicked(null);
                    setConflict(false);
                    setError(null);
                  }}
                  size="icon_sm"
                  variant="ghost"
                >
                  <Icon name="X" size="sm" />
                </OfficialButton>
              </div>
            ) : (
              <button
                className={[
                  "flex w-full flex-col items-center justify-center gap-sm rounded-card border border-dashed px-xl py-8 text-body text-secondary transition-colors",
                  dragOver ? "border-accent bg-accent" : "border-strong",
                  pending ? "cursor-not-allowed opacity-50" : "hover:bg-alpha-1",
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
                <Icon name="Upload" size="md" />
                Drag and drop skill files here, or browse — you can add several at once
              </button>
            )}
            {error ? (
              <div className="flex flex-col gap-sm" data-testid="skill-upload-errors" role="alert">
                <div className="rounded-md border-[0.5px] border-danger-000 bg-danger px-3 py-4 text-danger">{error}</div>
              </div>
            ) : null}
            {conflict ? (
              <p className="text-caption text-muted">
                There’s an existing skill with the same name. Saving will replace it.
              </p>
            ) : null}
            <ul className="list-inside list-disc text-footnote text-muted">
              <li>.md file must contain skill name and description formatted in YAML</li>
              <li>.zip or .skill file must include a SKILL.md file</li>
            </ul>
          </div>
          <div className="flex flex-wrap items-center gap-sm">
            <OfficialButton
              disabled={!picked || pending}
              loading={pending}
              onClick={() => {
                if (!picked) return;
                onUploaded({
                  name: picked.name,
                  description: picked.description,
                  instructions: picked.instructions,
                  replace: conflict,
                });
              }}
              variant="primary"
            >
              Save
            </OfficialButton>
            <OfficialButton disabled={pending} onClick={onBack} variant="secondary">
              Cancel
            </OfficialButton>
            {!picked ? <span className="text-caption text-muted">Choose a file to continue.</span> : null}
          </div>
          <input
            accept=".zip,.skill,.md"
            aria-label="Skill file"
            className="hidden"
            onChange={onFileChange}
            ref={inputRef}
            type="file"
          />
        </div>
      </div>
    </div>
  );
}
