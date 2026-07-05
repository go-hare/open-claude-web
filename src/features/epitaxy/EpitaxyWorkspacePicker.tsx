import type { WorkspaceContext } from "../../adapters/desktopBridge";

type EpitaxyWorkspacePickerProps = {
  workspace: WorkspaceContext;
};

export function EpitaxyWorkspacePicker({ workspace }: EpitaxyWorkspacePickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-g2" aria-label="工作区上下文">
      <span className="inline-flex h-h5 items-center gap-g2 rounded-r5 bg-fill-contained-default px-p4 text-body text-t8 effect-contained-default">
        ▣ {workspace.mode === "local" ? "本地" : "远程"}
      </span>
      <span className="inline-flex h-h5 items-center gap-g2 rounded-r5 bg-fill-contained-default px-p4 text-body text-t8 effect-contained-default">
        ▱ {workspace.projectName}
      </span>
      <span className="inline-flex h-h5 items-center gap-g2 rounded-r5 bg-fill-contained-default px-p4 text-body text-t8 effect-contained-default">
        ⑂ {workspace.branchName}
      </span>
      {workspace.hasWorktree ? (
        <span className="inline-flex h-h5 items-center gap-g2 rounded-r5 bg-fill-contained-default px-p4 text-body text-t6 effect-contained-default">
          ◼ worktree
        </span>
      ) : null}
      <button
        className="inline-flex h-h5 w-h5 items-center justify-center rounded-r5 border-0 bg-fill-contained-default text-t7 effect-contained-default hover:bg-fill-contained-hover"
        type="button"
        aria-label="添加工作区"
      >
        ⊞
      </button>
    </div>
  );
}
