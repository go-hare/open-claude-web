import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { desktopBridge } from "../../../../adapters/desktopBridge";
import type { LocalFileReadResult } from "../../../../adapters/desktopBridge/types";
import { Icon } from "../../../../shell/icons";
import { CoworkButton } from "../../ui/CoworkButton";
import { CoworkModal } from "../../ui/CoworkModal";

type CoworkInstructionEditorModalProps = {
  folderPath: string;
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
};

const instructionsPlaceholder = `Example:
This folder contains marketing campaign briefs written for external agencies
Tone: direct and professional, not chatty
Keep deliverables and timelines in a table format`;

export function CoworkInstructionEditorModal({ folderPath, isOpen, onClose, sessionId }: CoworkInstructionEditorModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const memoryFilePath = useMemo(() => joinInstructionFilePath(folderPath), [folderPath]);
  const [content, setContent] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setError(null);
    setLoading(true);
    void (async () => {
      try {
        const result = await desktopBridge.FileSystem.readLocalFile?.(sessionId, encodeURIComponent(memoryFilePath));
        if (!cancelled) setContent(readLocalFileContent(result));
      } catch {
        if (!cancelled) setContent("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, memoryFilePath, sessionId]);

  useEffect(() => {
    if (!isOpen || isLoading) return;
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }, [isLoading, isOpen]);

  const save = useCallback(async () => {
    if (isLoading || isSaving) return;
    setError(null);
    setSaving(true);
    try {
      const result = await desktopBridge.FileSystem.writeLocalFile?.(sessionId, encodeURIComponent(memoryFilePath), content);
      if (!result) throw new Error("File system is not available");
      onClose();
    } catch {
      setError("Failed to save changes. You can try again.");
    } finally {
      setSaving(false);
    }
  }, [content, isLoading, isSaving, memoryFilePath, onClose, sessionId]);

  if (!isOpen) return null;

  return (
    <CoworkModal isOpen={isOpen} onClose={onClose} title="Folder instructions" width="w-[640px]">
      <form className="flex flex-col gap-4" onSubmit={(event) => submitInstructionForm(event, save)}>
        <p className="text-sm text-text-500">Use this to give Claude instructions for working in this folder.</p>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-text-500">
            <Icon className="animate-spin" name="Spinner" size="sm" />
            <span className="sr-only">Loading...</span>
          </div>
        ) : (
          <textarea
            aria-label="Instructions"
            className="h-96 w-full resize-y rounded-lg border border-border-300 bg-bg-100 p-3 font-mono text-sm text-text-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
            onChange={(event) => setContent(event.target.value)}
            placeholder={instructionsPlaceholder}
            ref={textareaRef}
            spellCheck={false}
            value={content}
          />
        )}
        {error ? <p className="text-sm text-extended-pink">{error}</p> : null}
        <div className="flex justify-end gap-g4">
          <CoworkButton disabled={isSaving} onClick={onClose} variant="contained">Cancel</CoworkButton>
          <CoworkButton disabled={isLoading || isSaving} onClick={() => void save()} variant="primary">{isSaving ? "Saving..." : "Save"}</CoworkButton>
        </div>
      </form>
    </CoworkModal>
  );
}

function submitInstructionForm(event: FormEvent<HTMLFormElement>, save: () => Promise<void>) {
  event.preventDefault();
  void save();
}

function readLocalFileContent(result: LocalFileReadResult | undefined) {
  if (!result) return "";
  if (typeof result === "string") return result;
  return result.content ?? "";
}

function joinInstructionFilePath(folderPath: string) {
  const trimmed = folderPath.replace(/[\\/]+$/, "");
  return `${trimmed}/CLAUDE.md`;
}
