import { Icon } from "../../../shell/icons";
import type { CoworkUploadedFile } from "./coworkUploadedFiles";

type CoworkSelectedFilesProps = {
  files: CoworkUploadedFile[];
  onRemove: (filePath: string) => void;
};

export function CoworkSelectedFiles({ files, onRemove }: CoworkSelectedFilesProps) {
  if (files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file) => (
        <div
          className="group inline-flex max-w-full items-center gap-1.5 rounded-lg bg-bg-200 px-2.5 py-1 text-sm text-text-300"
          key={`${file.path}-${file.fileUuid ?? "local"}`}
          title={file.path}
        >
          <Icon name="FileAdd" customSize={16} className="shrink-0 text-text-400" />
          <span className="max-w-[18rem] truncate">{file.fileName}</span>
          <button
            aria-label={`Remove file ${file.fileName}`}
            className="rounded p-0.5 text-text-500 opacity-70 transition hover:bg-bg-300 hover:text-text-200 group-hover:opacity-100"
            onClick={() => onRemove(file.path)}
            type="button"
          >
            <Icon name="X" customSize={12} bold />
          </button>
        </div>
      ))}
    </div>
  );
}
