/**
 * Official S7t PluginUploadModal (index-BELzQL5P.js) — uploadType:"local".
 * Tm modalSize md, accept .zip/.plugin, uX → kT.uploadPlugin(filename, base64, replaceExisting).
 */
import { useCallback, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent } from "react";
import { Icon } from "../../../shell/icons";
import { ConfirmDialog } from "../../../shell/ConfirmDialog";
import { OfficialButton } from "../../shared/OfficialButton";
import { OfficialInlineAlert } from "../../shared/OfficialInlineAlert";
import { OfficialModal } from "../../shared/OfficialModal";
import { useCustomizeText } from "../customizeMessages";
import { asRecord, getLocalPlugins } from "./pluginMarketplace";

/** Official y7t */
const ACCEPT = [".zip", ".plugin"];

export function PluginUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const text = useCustomizeText();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const conflictName = useRef("");

  const reset = useCallback(() => {
    setFile(null);
    setPending(false);
    setConflictOpen(false);
    setDragOver(false);
    conflictName.current = "";
  }, []);

  const handleClose = useCallback(() => {
    if (pending) return;
    reset();
    onClose();
  }, [onClose, pending, reset]);

  const acceptFile = useCallback(
    (next: File | undefined) => {
      if (!next) return;
      const lower = next.name.toLowerCase();
      if (!ACCEPT.some((ext) => lower.endsWith(ext))) {
        return;
      }
      setFile(next);
    },
    [],
  );

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      acceptFile(event.target.files?.[0]);
      event.target.value = "";
    },
    [acceptFile],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      if (pending) return;
      acceptFile(event.dataTransfer.files[0]);
    },
    [acceptFile, pending],
  );

  const upload = useCallback(
    async (replaceExisting: boolean) => {
      if (!file) return;
      const uploadPlugin = getLocalPlugins()?.uploadPlugin;
      if (!uploadPlugin) return;
      setPending(true);
      try {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(new Uint8Array(buffer).reduce((acc, byte) => acc + String.fromCharCode(byte), ""));
        const raw = await uploadPlugin(file.name, base64, replaceExisting);
        const result = asRecord(raw);
        if (result.success === false || result.success === undefined && result.error) {
          const message = typeof result.error === "string" ? result.error : "";
          const code = typeof result.errorCode === "string" ? result.errorCode : "";
          if (code === "Conflict" || /already exists|conflict/i.test(message)) {
            const quoted = message.match(/"([^"]+)"/);
            conflictName.current = quoted?.[1] ?? file.name;
            setConflictOpen(true);
            return;
          }
          throw new Error(message || text.uploadFailedTryAgain);
        }
        if (result.success === true || result.pluginId) {
          setFile(null);
          onSuccess?.();
          onClose();
        }
      } finally {
        setPending(false);
      }
    },
    [file, onClose, onSuccess, text.uploadFailedTryAgain],
  );

  const onClearFile = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setFile(null);
  }, []);

  return (
    <>
      <OfficialModal
        closeOnEscapeKeydown={!pending}
        isOpen={isOpen}
        modalSize="md"
        onClose={handleClose}
        title={text.uploadLocalPlugin}
      >
        <input
          accept={ACCEPT.join(",")}
          className="hidden"
          onChange={onInputChange}
          ref={inputRef}
          type="file"
        />
        <OfficialInlineAlert className="mt-4" message={text.uploadTrustWarning} variant="danger" />
        <div
          className={[
            "relative flex flex-col items-center justify-center gap-4 p-8 my-4",
            "border-2 border-dashed rounded-lg transition-colors",
            dragOver ? "border-accent-100 bg-accent-100/10" : "border-border-300",
            pending ? "opacity-50 cursor-not-allowed" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onDragLeave={() => setDragOver(false)}
          onDragOver={(event) => {
            event.preventDefault();
            if (!pending) setDragOver(true);
          }}
          onDrop={onDrop}
        >
          {file && !pending ? (
            <button
              aria-label="Clear selected file"
              className={[
                "absolute top-2 right-2 w-5 h-5 rounded-full",
                "border-0.5 border-border-300/25 bg-bg-000/90 backdrop-blur-sm",
                "flex items-center justify-center",
                "text-text-500 hover:text-text-200 hover:bg-bg-100",
                "transition-colors",
              ].join(" ")}
              onClick={onClearFile}
              type="button"
            >
              <Icon customSize={12} name="X" />
            </button>
          ) : null}
          <Icon className="text-text-300" customSize={32} name="FileUpload" />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <p className="font-base text-text-200">{file.name}</p>
              <p className="font-small text-text-400">{formatFileSize(file.size)}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p className="font-base text-text-300 text-center">{text.dragDropOrClickToUpload}</p>
            </div>
          )}
          {!file ? (
            <OfficialButton
              disabled={pending}
              onClick={() => inputRef.current?.click()}
              size="sm"
              variant="secondary"
            >
              {text.browseFiles}
            </OfficialButton>
          ) : null}
        </div>
        <div className="flex justify-end gap-3">
          <OfficialButton disabled={pending} onClick={handleClose} variant="secondary">
            {text.cancel}
          </OfficialButton>
          <OfficialButton
            disabled={!file || pending}
            loading={pending}
            onClick={() => void upload(false)}
            variant="primary"
          >
            {text.upload}
          </OfficialButton>
        </div>
      </OfficialModal>
      <ConfirmDialog
        confirmText={text.upload}
        isOpen={conflictOpen}
        message={conflictName.current}
        onClose={() => setConflictOpen(false)}
        onConfirm={() => {
          setConflictOpen(false);
          void upload(true);
        }}
        title={text.uploadLocalPlugin}
        variant="danger"
      />
    </>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
