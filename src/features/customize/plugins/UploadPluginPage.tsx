import { useCallback, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent } from "react";
import { Icon } from "../../../shell/icons";
import { ConfirmDialog } from "../../../shell/ConfirmDialog";
import { OfficialButton } from "../../shared/OfficialButton";
import { asRecord, getLocalPlugins } from "../directory/pluginMarketplace";

const ACCEPT = [".zip", ".plugin"];

/**
 * Official overlay plugin upload page pn (c76f00e40) on xo (c6a2a31c4).
 * Gs: if onUploadPage is set, Upload plugin calls it instead of S7t Tm.
 * Desktop overlay uploadType is local: title “Upload a plugin”.
 */
export function UploadPluginPage({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess?: (result?: { pluginId?: string }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const conflictName = useRef("");

  const acceptFile = useCallback((next: File | undefined) => {
    if (!next) return;
    const lower = next.name.toLowerCase();
    if (!ACCEPT.some((ext) => lower.endsWith(ext))) {
      setError("Only .zip or .plugin files can be uploaded.");
      return;
    }
    setError(null);
    setFile(next);
  }, []);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (pending) return;
    acceptFile(event.dataTransfer.files[0]);
  };

  const onRemove = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    if (pending) return;
    setFile(null);
    setError(null);
  };

  const upload = useCallback(
    async (replaceExisting: boolean) => {
      if (!file) return;
      const uploadPlugin = getLocalPlugins()?.uploadPlugin;
      if (!uploadPlugin) {
        setError("Custom plugins are only available in the desktop app.");
        return;
      }
      setPending(true);
      setError(null);
      try {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(new Uint8Array(buffer).reduce((acc, byte) => acc + String.fromCharCode(byte), ""));
        const raw = await uploadPlugin(file.name, base64, replaceExisting);
        const result = asRecord(raw);
        if (result.success === false || (result.success === undefined && result.error)) {
          const message = typeof result.error === "string" ? result.error : "";
          const code = typeof result.errorCode === "string" ? result.errorCode : "";
          if (code === "Conflict" || /already exists|conflict/i.test(message)) {
            const quoted = message.match(/"([^"]+)"/);
            conflictName.current = quoted?.[1] ?? file.name;
            setConflictOpen(true);
            return;
          }
          setError(message || "Upload failed. Try again.");
          return;
        }
        if (result.success === true || result.pluginId) {
          onSuccess?.({
            pluginId: typeof result.pluginId === "string" ? result.pluginId : undefined,
          });
          onBack();
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Upload failed. Try again.");
      } finally {
        setPending(false);
      }
    },
    [file, onBack, onSuccess],
  );

  return (
    <div className="flex h-full min-h-0 flex-col" data-official-source="c76f00e40:pn c6a2a31c4:xo" data-testid="plugin-upload">
      <div className="flex min-h-control shrink-0 items-center">
        <button
          className="cds-reset group/btn relative isolate inline-flex h-control items-center gap-1.5 rounded px-md text-body text-primary"
          onClick={onBack}
          type="button"
        >
          <span aria-hidden="true" className="absolute inset-0 rounded-[inherit] group-hover/btn:bg-fill-ghost-hover" />
          <Icon className="relative" name="ArrowLeft" size="sm" />
          <span className="relative">Plugins</span>
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex max-w-3xl flex-col gap-lg px-xl pb-xl pt-md">
          <div className="flex flex-col gap-xs">
            <h2 className="text-title-medium text-primary">Upload a plugin</h2>
            <p className="text-body text-secondary">
              Add a plugin to your workspace from a .zip or .plugin archive.
            </p>
          </div>
          <div className="rounded-md border-[0.5px] border-danger-000 bg-danger px-3 py-4 text-danger">
            Make sure you trust a plugin before installing or using it. Uploaded plugins are not
            controlled by Anthropic, and Anthropic cannot verify that they will work as intended. See
            each plugin’s homepage for more information.
          </div>
          <div className="flex flex-col gap-xs">
            <div className="flex items-center gap-sm">
              <h3 className="text-body-medium text-primary">Plugin file</h3>
            </div>
            {file ? (
              <div className="flex items-center gap-sm rounded-card border border-border px-md py-sm" data-testid="plugin-upload-file-chip">
                <Icon className="shrink-0 text-secondary" name="File" size="sm" />
                <span className="min-w-0 truncate text-body-medium text-primary">{file.name}</span>
                <span className="shrink-0 text-caption text-muted">{formatFileSize(file.size)}</span>
                <span className="flex-1" />
                <OfficialButton
                  aria-label="Remove file"
                  disabled={pending}
                  onClick={onRemove}
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
                Drag and drop your plugin file here, or browse
              </button>
            )}
            {error ? (
              <div className="flex flex-col gap-sm" data-testid="plugin-upload-errors" role="alert">
                <div className="rounded-md border-[0.5px] border-danger-000 bg-danger px-3 py-4 text-danger">
                  {error}
                </div>
              </div>
            ) : null}
            <ul className="list-inside list-disc text-footnote text-muted">
              <li>
                The archive must contain a .claude-plugin/plugin.json manifest, or a top-level SKILL.md
                that declares the plugin’s components
              </li>
            </ul>
          </div>
          <div className="flex flex-wrap items-center gap-sm">
            <OfficialButton
              disabled={!file || pending}
              loading={pending}
              onClick={() => void upload(false)}
              variant="primary"
            >
              Upload
            </OfficialButton>
            <OfficialButton disabled={pending} onClick={onBack} variant="secondary">
              Cancel
            </OfficialButton>
            {!file ? <span className="text-caption text-muted">Choose a file to continue.</span> : null}
          </div>
          <input
            accept={ACCEPT.join(",")}
            aria-label="Plugin file"
            className="hidden"
            onChange={onFileChange}
            ref={inputRef}
            type="file"
          />
        </div>
      </div>
      <ConfirmDialog
        confirmText="Upload"
        isOpen={conflictOpen}
        message={conflictName.current}
        onClose={() => setConflictOpen(false)}
        onConfirm={() => {
          setConflictOpen(false);
          void upload(true);
        }}
        title="Upload a plugin"
        variant="danger"
      />
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
