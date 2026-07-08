import { Icon } from "../../../shell/icons";

type CoworkSelectedFilesProps = {
  filePaths: string[];
  onRemove: (filePath: string) => void;
};

export function CoworkSelectedFiles({ filePaths, onRemove }: CoworkSelectedFilesProps) {
  if (filePaths.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {filePaths.map((filePath) => (
        <div
          className="group inline-flex max-w-full items-center gap-1.5 rounded-lg bg-bg-200 px-2.5 py-1 text-sm text-text-300"
          key={filePath}
          title={filePath}
        >
          <Icon name="FileAdd" customSize={16} className="shrink-0 text-text-400" />
          <span className="max-w-[18rem] truncate">{basename(filePath)}</span>
          <button
            aria-label={`Remove file ${basename(filePath)}`}
            className="rounded p-0.5 text-text-500 opacity-70 transition hover:bg-bg-300 hover:text-text-200 group-hover:opacity-100"
            onClick={() => onRemove(filePath)}
            type="button"
          >
            <Icon name="X" customSize={12} bold />
          </button>
        </div>
      ))}
    </div>
  );
}

function basename(filePath: string) {
  return filePath.split(/[\\/]/).filter(Boolean).at(-1) ?? filePath;
}
