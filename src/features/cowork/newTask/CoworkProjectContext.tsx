import { useEffect, useState } from "react";
import type { CoworkMountedProject, SessionSummary } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { CoworkButton } from "../ui/CoworkButton";
import { CoworkModal } from "../ui/CoworkModal";
import type { CoworkAddMenuProject } from "./CoworkAddMenuItems";

export type CoworkPendingProjectWarning = {
  project: CoworkAddMenuProject;
  variant: "addMenu" | "newTask";
};

const projectWarningDismissedPrefix = "agent_mode_project_warning_dismissed:";

// Official reference:
// index-BELzQL5P.js:WCt/HCt build "Add to project" with project rows and
// "Start a new project"; gwt/xwt render the warning dialog and persist
// agent_mode_project_warning_dismissed:${uuid}.
export const coworkProjectWarningOfficialSource = "index-BELzQL5P.js:WCt/HCt/gwt/xwt";

export function sessionToCoworkAddMenuProject(session: SessionSummary): CoworkAddMenuProject | null {
  const hostPath = session.cwd ?? session.folders?.[0];
  if (!hostPath) return null;
  return {
    creatorName: session.repo?.name,
    hostPath,
    name: session.title || session.repo?.name || basename(hostPath),
    uuid: session.id || hostPath,
  };
}

export function coworkMountedProjectFromAddMenuProject(project: CoworkAddMenuProject): CoworkMountedProject | null {
  if (!project.hostPath) return null;
  return { hostPath: project.hostPath, name: project.name, uuid: project.uuid };
}

export function shouldShowCoworkProjectWarning(projectUuid: string) {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(projectWarningDismissedKey(projectUuid)) !== "true";
}

export function persistCoworkProjectWarningDismissed(projectUuid: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(projectWarningDismissedKey(projectUuid), "true");
}

export function CoworkSelectedProjectIndicators({ onRemove, projects }: { onRemove: (uuid: string) => void; projects: CoworkMountedProject[] }) {
  if (projects.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1" data-official-source="index-BELzQL5P.js:bwt agent-mode-project-indicator">
      {projects.map((project) => (
        <button
          aria-label={`Project: ${project.name}`}
          className="inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-bg-200 px-2 text-xs text-text-300 hover:bg-bg-300"
          data-testid="agent-mode-project-indicator"
          key={project.uuid}
          onClick={() => onRemove(project.uuid)}
          title={project.name}
          type="button"
        >
          <Icon name="Projects" customSize={14} className="shrink-0 text-text-400" />
          <span className="truncate">{project.name}</span>
          <Icon name="XCrossCloseMedium" customSize={12} className="shrink-0 text-text-500" />
        </button>
      ))}
    </div>
  );
}

export function CoworkProjectWarningDialog({
  onCancel,
  onConfirm,
  pending,
}: {
  onCancel: () => void;
  onConfirm: (project: CoworkAddMenuProject, dontShowAgain: boolean) => void;
  pending: CoworkPendingProjectWarning | null;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (pending) setDontShowAgain(false);
  }, [pending?.project.uuid]);

  const variant = pending?.variant ?? "addMenu";
  const projectName = pending?.project.name ?? "";
  const title = variant === "addMenu" ? `Add project context from "${projectName}"?` : `Create new task with context from "${projectName}"?`;
  const body = variant === "addMenu" ? "This will add project instructions and files to this task." : "This new task will include this project's instructions and files.";
  const confirmLabel = variant === "addMenu" ? "Add project" : "Create task";

  return (
    <CoworkModal isOpen={Boolean(pending)} onClose={onCancel} title={title} width="w-[520px]">
      <div data-official-source={coworkProjectWarningOfficialSource}>
        <p className="mt-2 text-sm text-text-300">{body}</p>
        <ul className="mt-4 flex list-disc flex-col gap-3 pl-5 text-sm text-text-300">
          <li><span className="font-medium">Files are saved to this computer.</span> Downloaded files are accessible to anyone who uses this device or signs into a different account.</li>
          <li><span className="font-medium">Limited support.</span> Project memory and synced files (like Google Drive and GitHub files) won't be included.</li>
        </ul>
        <div className="mt-5 flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-xs text-text-300">
            <input checked={dontShowAgain} onChange={(event) => setDontShowAgain(event.target.checked)} type="checkbox" />
            <span>Don't show again</span>
          </label>
          <div className="flex gap-2">
            <CoworkButton onClick={onCancel} size="small" variant="contained">Cancel</CoworkButton>
            <CoworkButton onClick={() => pending && onConfirm(pending.project, dontShowAgain)} size="small" variant="primary">{confirmLabel}</CoworkButton>
          </div>
        </div>
      </div>
    </CoworkModal>
  );
}

function projectWarningDismissedKey(projectUuid: string) {
  return `${projectWarningDismissedPrefix}${projectUuid}`;
}

function basename(value: string) {
  const trimmed = value.replace(/[\\/]+$/, "");
  const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return index < 0 ? trimmed : trimmed.slice(index + 1);
}
