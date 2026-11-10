import { Dialog } from "@base-ui-components/react/dialog";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { type MessageDescriptors, useI18nText } from "../../../i18n/footerMenuMessages";
import { Icon } from "../../../shell/icons";

const UPLOAD_SKILL_MESSAGES = {
  uploadSkill: { defaultMessage: "Upload skill", id: "jzGUNdu5Zs" },
  review: {
    defaultMessage: "Review the skill contents before adding to your library.",
    id: "jE0ewcVoC8",
  },
  addToLibrary: { defaultMessage: "Add to library", id: "X561tiaU8d" },
  dropOrClick: { defaultMessage: "Drag and drop or click to upload", id: "e/swXmKhH3" },
  uploading: { defaultMessage: "Uploading...", id: "JEsxDwhXPG" },
  readFailed: { defaultMessage: "Failed to read skill file.", id: "xPAePF1bRO" },
  cancel: { defaultMessage: "Cancel", id: "47FYwba+bI" },
  dropToUpload: { defaultMessage: "Drag and drop to upload", id: "u+lVETQ8t0" },
  uploadAndReplace: { defaultMessage: "Upload and replace", id: "TtbWBGHNcO" },
  replaceWarning: {
    defaultMessage: "There’s an existing skill with the same name. Uploading this skill will replace the existing one, which can’t be restored.",
    id: "dRMF/vTgCW",
  },
} as const satisfies MessageDescriptors;
import { OfficialButton } from "../../shared/OfficialButton";
import {
  readResolvedColorMode,
  THEME_MODE_CHANGE_EVENT,
} from "../../settings/appearanceSettings";
import {
  extractSkillArchiveFiles,
  parseSkillMarkdown,
  skillMdFromArchive,
  type ParsedSkillMd,
  type SkillArchiveFile,
} from "./skillMd";

const DIALOG_SIZE = {
  md: "max-w-[520px]",
  lg: "max-w-[720px]",
  "2xl": "max-w-[1024px]",
} as const;

const POPUP_CLASS =
  "draggable-none fixed left-1/2 top-1/2 z-modal -translate-x-1/2 -translate-y-1/2 flex flex-col w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] rounded-card bg-surface-3 shadow-panel shadow-panel-lg cds-reset text-body font-normal text-primary outline-none transition-[opacity,scale,filter] duration-base ease-out data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.98]";

const BACKDROP_CLASS =
  "draggable-none fixed inset-0 z-modal bg-backdrop transition-opacity duration-base ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0";

const BODY_CLASS = "isolate flex min-h-0 flex-1 flex-col overflow-y-auto scroll-fade-y rounded-[inherit] p-xl";

/**
 * Official c4101dbe9 / c6831e394 G Popup + overlay Yn (c5e558aae):
 * CDS Dialog (shared-frame vg), not the Tm overlay used by page Ol.
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
  const text = useI18nText(UPLOAD_SKILL_MESSAGES);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [conflictName, setConflictName] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ files: SkillArchiveFile[]; parsed: ParsedSkillMd } | null>(null);
  const pendingParse = useRef<ParsedSkillMd | null>(null);
  const mode = useCdsMode();

  const reset = useCallback(() => {
    setPending(false);
    setErrors([]);
    setDragOver(false);
    setConflictName(null);
    setPreview(null);
    pendingParse.current = null;
  }, []);

  const handleClose = useCallback(() => {
    if (pending) return;
    reset();
    onClose();
  }, [onClose, pending, reset]);

  const ingest = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    if (!file) return;
    setErrors([]);
    setPending(true);
    try {
      const extracted = await extractSkillArchiveFiles(file);
      if ("error" in extracted) {
        setErrors([extracted.error]);
        return;
      }
      const md = skillMdFromArchive(extracted);
      if (!md) {
        setErrors([".zip or .skill file must include a SKILL.md file"]);
        return;
      }
      const parsed = parseSkillMarkdown(md, file.name.replace(/\.(zip|skill|md)$/i, ""));
      if ("error" in parsed) {
        setErrors([parsed.error]);
        return;
      }
      pendingParse.current = parsed;
      setPreview({ files: extracted, parsed });
    } catch (error) {
      setErrors([error instanceof Error ? error.message : text.readFailed]);
    } finally {
      setPending(false);
    }
  }, [text.readFailed]);

  const commit = useCallback(
    (replace: boolean) => {
      const parsed = pendingParse.current;
      if (!parsed) return;
      onUploaded({ ...parsed, replace });
      reset();
    },
    [onUploaded, reset],
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
  const previewing = Boolean(preview) && !replacing;
  const title = previewing
    ? `Add “${preview?.parsed.name}” to your library?`
    : replacing
      ? `Replace “${conflictName}” skill?`
      : text.uploadSkill;
  const subtitle = previewing ? text.review : undefined;
  const size = previewing ? "2xl" : "md";

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      open={isOpen}
    >
      <Dialog.Portal>
        <div className="cds-root" data-density="comfortable" data-mode={mode} data-platform="desktop">
          <Dialog.Backdrop className={BACKDROP_CLASS} />
          <Dialog.Popup
            className={`${POPUP_CLASS} ${DIALOG_SIZE[size]} ${previewing ? "h-[min(40rem,calc(100dvh-2rem))]" : ""}`}
            data-cds="Dialog"
            data-official-source="c6831e394:G vg"
          >
            <div className={BODY_CLASS}>
              <div className="mb-pad-md flex items-start gap-2">
                <div className="-mt-1 flex min-w-0 flex-1 flex-col gap-1">
                  <Dialog.Title className="text-title font-semibold font-header break-words text-primary">
                    {title}
                  </Dialog.Title>
                  {subtitle ? (
                    <p className="text-body font-normal text-secondary break-words">{subtitle}</p>
                  ) : null}
                </div>
                <Dialog.Close
                  aria-label="Close"
                  className="cds-reset group/btn relative isolate -me-pad-sm -mt-pad-sm inline-flex h-control w-control shrink-0 items-center justify-center rounded border-0 text-primary outline-none"
                  disabled={pending}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[inherit] group-hover/btn:bg-fill-ghost-hover"
                  />
                  <Icon className="relative" name="X" size="sm" />
                </Dialog.Close>
              </div>

              {previewing && preview ? (
                <>
                  <SkillArchivePreview files={preview.files} />
                  <div className="mt-pad-lg flex flex-wrap justify-end gap-sm">
                    <OfficialButton onClick={handleClose} variant="secondary">
                      {text.cancel}
                    </OfficialButton>
                    <OfficialButton
                      onClick={() => {
                        const parsed = pendingParse.current;
                        if (!parsed) return;
                        if (existingNames.includes(parsed.name)) {
                          setConflictName(parsed.name);
                          return;
                        }
                        commit(false);
                      }}
                      variant="primary"
                    >
                      {text.addToLibrary}
                    </OfficialButton>
                  </div>
                </>
              ) : replacing ? (
                <>
                  <div className="mt-1 mb-2">
                    <div className="text-secondary whitespace-pre-line">
                      {text.replaceWarning}
                    </div>
                  </div>
                  <div className="mt-pad-lg flex flex-wrap justify-end gap-sm">
                    <OfficialButton
                      disabled={pending}
                      onClick={() => setConflictName(null)}
                      variant="secondary"
                    >
                      {text.cancel}
                    </OfficialButton>
                    <OfficialButton disabled={pending} loading={pending} onClick={() => commit(true)} variant="danger">
                      {text.uploadAndReplace}
                    </OfficialButton>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-6 mt-6">
                  {errors.length > 0 ? (
                    <div
                      className="flex flex-col gap-3 rounded-md border-[0.5px] border-danger-000 px-3 py-4 bg-danger"
                      role="alert"
                    >
                      {errors.map((error) => (
                        <div className="flex font-base items-center !text-danger gap-2" key={error}>
                          <Icon name="Warning" size="md" />
                          {error}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-3">
                    <button
                      className={[
                        "w-full relative border-[1px] border-dashed border-strong rounded-lg h-[120px]",
                        "flex flex-col items-center justify-center transition-colors text-sm text-muted gap-2",
                        pending ? "!cursor-not-allowed" : "hover:bg-surface-0",
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
                        <Icon className="text-secondary" name="FolderPlus" size="xxl" />
                      )}
                      {pending ? text.uploading : text.dropOrClick}
                      {dragOver ? (
                        <div className="absolute h-[120px] inset-[-1px] text-accent z-50 pointer-events-none rounded-lg border-[1px] border-dashed border-accent-100 bg-accent">
                          <div className="flex flex-col gap-2 items-center justify-center h-full">
                            <Icon name="FolderPlus" size="xxl" />
                            <div className="font-normal text-sm">{text.dropToUpload}</div>
                          </div>
                        </div>
                      ) : null}
                    </button>
                    <div className="[font-feature-settings:'salt'_on] text-xs text-muted flex flex-col gap-5">
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
                          href="https://support.claude.com/en/articles/12512198-creating-custom-skills"
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
            </div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SkillArchivePreview({ files }: { files: SkillArchiveFile[] }) {
  const skillMd = useMemo(
    () => files.find((entry) => entry.path === "SKILL.md") ?? files.find((entry) => entry.path.endsWith("/SKILL.md")),
    [files],
  );
  const [selectedPath, setSelectedPath] = useState(skillMd?.path ?? files[0]?.path ?? "");
  const selected = files.find((entry) => entry.path === selectedPath) ?? skillMd ?? files[0];
  const showTree = files.length > 1;
  return (
    <div className="flex min-h-0 flex-1 gap-6" data-official-source="c5e558aae:Jn">
      {showTree ? (
        <div className="w-48 shrink-0 overflow-y-auto text-body">
          {files.map((entry) => (
            <button
              className={`flex w-full truncate rounded px-sm py-1 text-left ${
                entry.path === selected?.path ? "bg-fill-ghost-hover text-primary" : "text-secondary hover:bg-fill-ghost-hover"
              }`}
              key={entry.path}
              onClick={() => setSelectedPath(entry.path)}
              type="button"
            >
              {entry.path.split("/").pop()}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-surface-3">
        <pre className="min-h-0 flex-1 overflow-auto p-md text-caption whitespace-pre-wrap break-words">
          {selected?.content ?? ""}
        </pre>
      </div>
    </div>
  );
}

function useCdsMode(): "light" | "dark" {
  const [mode, setMode] = useState<"light" | "dark">(() => readResolvedColorMode());
  useEffect(() => {
    const sync = () => setMode(readResolvedColorMode());
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(THEME_MODE_CHANGE_EVENT, sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(THEME_MODE_CHANGE_EVENT, sync);
    };
  }, []);
  return mode;
}
