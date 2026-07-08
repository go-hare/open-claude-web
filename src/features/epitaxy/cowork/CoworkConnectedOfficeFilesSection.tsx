import { useEffect, useMemo, useState } from "react";
import { desktopBridge, type ConnectedOfficeFile } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";

export function useCoworkConnectedOfficeFiles(sessionId: string) {
  const [files, setFiles] = useState<ConnectedOfficeFile[]>([]);
  const [isInitialized, setInitialized] = useState(false);
  const [isFeatureEnabled, setFeatureEnabled] = useState(false);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      const enabled = await desktopBridge.OfficeAddinFiles.isFeatureEnabled?.().catch(() => false);
      const connectedFiles = enabled ? await desktopBridge.OfficeAddinFiles.getConnectedFiles?.().catch(() => []) : [];
      if (disposed) return;
      setFeatureEnabled(Boolean(enabled));
      setFiles(connectedFiles ?? []);
      setInitialized(true);
    };
    void load();
    const remove = desktopBridge.OfficeAddinFiles.onConnectedFilesChange?.((nextFiles) => {
      if (!disposed) setFiles(nextFiles);
    });
    return () => {
      disposed = true;
      remove?.();
    };
  }, [sessionId]);

  const connectedFiles = useMemo(() => files.filter((file) => !isDisconnectedOfficeFile(file)), [files]);
  return { connectedFiles, isFeatureEnabled, isInitialized };
}

export function CoworkConnectedOfficeFilesSection({ files, isExpanded, onToggle }: { files: ConnectedOfficeFile[]; isExpanded: boolean; onToggle: () => void }) {
  if (files.length === 0) return null;
  return (
    <div className="mt-2">
      <button
        aria-expanded={isExpanded}
        className="flex items-center justify-between w-full py-1 px-1 -mx-1 rounded text-xs text-text-300 hover:bg-bg-200 transition-colors"
        onClick={onToggle}
        type="button"
      >
        <span>Connected files</span>
        <Icon name={isExpanded ? "CaretUp" : "CaretDown"} customSize={20} className="text-text-500" />
      </button>
      {isExpanded ? (
        <div className="overflow-hidden">
          <div className="mt-1">
            {files.map((file) => <CoworkConnectedOfficeFileItem file={file} key={file.id} />)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CoworkConnectedOfficeFileItem({ file }: { file: ConnectedOfficeFile }) {
  const selectFile = async () => {
    await desktopBridge.OfficeAddinFiles.selectFile?.(file.id);
    await desktopBridge.OfficeAddinFiles.focusFile?.(file.id);
  };
  return (
    <div className="flex items-center gap-2 w-full py-1">
      <span className="flex-1 min-w-0 truncate text-text-200 text-sm">{file.document}</span>
      {!isDisconnectedOfficeFile(file) ? (
        <button
          className="inline-flex h-7 items-center justify-center rounded-md bg-bg-300 px-2 text-xs text-text-200 transition-colors hover:bg-bg-200"
          onClick={selectFile}
          type="button"
        >
          {file.appIconBase64 ? <img alt="Open file on desktop" className="mr-1 size-5" height={20} src={file.appIconBase64} width={20} /> : null}
          Connected
        </button>
      ) : null}
    </div>
  );
}

function isDisconnectedOfficeFile(file: ConnectedOfficeFile) {
  return file.status?.toLowerCase() === "disconnected";
}
