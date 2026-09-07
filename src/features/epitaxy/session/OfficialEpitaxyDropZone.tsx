/**
 * Official Ek EpitaxyDropZone (c11959232):
 *   onFilesDropped / onNonImageFilesDropped / onFolderDropped
 *   overlay Pk: epitaxy-drop-overlay absolute inset-0 z-40 pointer-events-none
 *   Fy image split when onNonImageFilesDropped is provided
 *
 * Official handlers are React bubble: onDragEnter / onDragLeave / onDragOver / onDrop.
 */
import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { isOfficialComposerImageFile } from "./officialComposerFileAttachments";

export type OfficialEpitaxyDropHandlers = {
  onFilesDropped: (files: File[]) => void;
  onFolderDropped: (folders: File[]) => void;
  onNonImageFilesDropped: (files: File[]) => void;
};

type OfficialEpitaxyDropZoneProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onFilesDropped: (files: File[]) => void;
  onFolderDropped?: (folders: File[]) => void;
  onNonImageFilesDropped?: (files: File[]) => void;
  /** Product KI flex (chat vs side). Official Ek has no style — only className. */
  style?: CSSProperties;
};

/** Official Ek: `e.dataTransfer.types.includes("Files")`. */
function dataTransferHasFiles(event: DragEvent): boolean {
  return event.dataTransfer.types.includes("Files");
}

function isDirectoryItem(item: DataTransferItem): boolean {
  const entry = item.webkitGetAsEntry?.();
  return Boolean(entry && "isDirectory" in entry && entry.isDirectory);
}

export const OfficialEpitaxyDropZone = memo(function OfficialEpitaxyDropZone({
  children,
  className,
  disabled = false,
  onFilesDropped,
  onFolderDropped,
  onNonImageFilesDropped,
  style,
}: OfficialEpitaxyDropZoneProps) {
  const [active, setActive] = useState(false);
  const depthRef = useRef(0);

  const onDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (disabled || !dataTransferHasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    depthRef.current += 1;
    setActive(true);
  }, [disabled]);

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!dataTransferHasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    depthRef.current = Math.max(0, depthRef.current - 1);
    if (depthRef.current === 0) setActive(false);
  }, []);

  useEffect(() => {
    depthRef.current = 0;
    setActive(false);
  }, [disabled]);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (disabled || !dataTransferHasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }, [disabled]);

  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!dataTransferHasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    depthRef.current = 0;
    setActive(false);
    if (disabled) return;
    const folders: File[] = [];
    const files: File[] = [];
    const items = event.dataTransfer.items;
    if (items && items.length > 0) {
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (!item || item.kind !== "file") continue;
        const file = item.getAsFile();
        if (!file) continue;
        if (isDirectoryItem(item)) folders.push(file);
        else files.push(file);
      }
    } else {
      files.push(...Array.from(event.dataTransfer.files));
    }
    if (folders.length > 0) onFolderDropped?.(folders);
    if (files.length === 0) return;
    if (onNonImageFilesDropped) {
      const images = files.filter((file) => isOfficialComposerImageFile(file));
      const other = files.filter((file) => !isOfficialComposerImageFile(file));
      if (images.length > 0) onFilesDropped(images);
      if (other.length > 0) onNonImageFilesDropped(other);
      return;
    }
    onFilesDropped(files);
  }, [disabled, onFilesDropped, onFolderDropped, onNonImageFilesDropped]);

  return (
    <div
      className={className ? `relative ${className}` : "relative"}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      {...(style ? { style } : {})}
    >
      {children}
      {active ? (
        <div className="epitaxy-drop-overlay absolute inset-0 z-40 pointer-events-none" />
      ) : null}
    </div>
  );
});
