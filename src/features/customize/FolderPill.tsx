import { Icon } from "../../shell/icons";

/**
 * Official V6t FolderPill (index-BELzQL5P ~267238):
 * button: inline-flex items-center gap-1.5 px-2.5 py-2 rounded-md border-0.5 border-border-200
 * shadow-sm text-xs text-text-300 hover:bg-bg-300 … + folder icon size 14 + truncate basename.
 */
export function FolderPill({
  folderPath,
  onClick,
  disabled,
  className,
}: {
  folderPath: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const label = folderBasename(folderPath);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={folderPath}
      className={[
        "inline-flex items-center gap-1.5 px-2.5 py-2 rounded-md border-0.5 border-border-200 shadow-sm text-xs text-text-300 hover:bg-bg-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-0",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="shrink-0 flex items-center justify-center">
        <Icon name="Folder1" customSize={14} />
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function folderBasename(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}
