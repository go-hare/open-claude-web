import { Icon } from "../../../shell/icons";
import { coworkResourceOperationLabel, type CoworkResourceActivity } from "./coworkResourceActivity";
import type { CoworkOpenFileTarget } from "./coworkActivityTypes";

export function CoworkResourceList({ onOpenFile, resources }: { onOpenFile: (target: CoworkOpenFileTarget) => void; resources: CoworkResourceActivity[] }) {
  if (resources.length === 0) return null;
  return <div className="flex flex-col gap-1">{resources.slice(0, 10).map((resource) => <CoworkFileResourceRow key={`${resource.latestId}-${resource.filePath}`} onOpenFile={onOpenFile} resource={resource} />)}</div>;
}

export function CoworkFileResourceRow({ onOpenFile, resource }: { onOpenFile: (target: CoworkOpenFileTarget) => void; resource: CoworkResourceActivity }) {
  return (
    <button className="flex items-center gap-2.5 py-1.5 px-1 rounded -mx-1 cursor-pointer hover:bg-bg-200 w-full text-left" onClick={() => onOpenFile({ path: resource.filePath })} type="button">
      <CoworkResourceIcon name="Document" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-text-200">{resource.displayName}</span>
        <span className="block truncate text-xs text-text-500">{coworkResourceOperationLabel(resource.operation)} · {resource.filePath}</span>
      </span>
    </button>
  );
}

export function CoworkResourceIcon({ name }: { name: "BookText" | "CommandLine" | "Document" | "Folder1" | "Globe" | "Mcp" | "Memory" | "Plugin" | "SlashShortcutCommand" }) {
  return (
    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-alpha-1 rounded-md text-text-500">
      <Icon name={name} customSize={name === "Folder1" || name === "BookText" ? 16 : undefined} size={name === "Document" ? "xs" : undefined} />
    </div>
  );
}
