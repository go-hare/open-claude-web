import { desktopBridge, type CoworkMountedProject } from "../../../../adapters/desktopBridge";
import { Icon } from "../../../../shell/icons";

export function CoworkContextProjects({ projects }: { projects: CoworkMountedProject[] }) {
  if (projects.length === 0) return null;
  return (
    <div className="mb-2">
      <div className="py-1 text-xs text-text-300">项目</div>
      <ul className="space-y-0.5">
        {projects.map((project) => <CoworkContextProjectItem key={project.uuid} project={project} />)}
      </ul>
    </div>
  );
}

function CoworkContextProjectItem({ project }: { project: CoworkMountedProject }) {
  const showProject = () => {
    void desktopBridge.FileSystem.showInFolder?.(project.hostPath);
  };
  return (
    <li>
      <button className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-200 transition-colors cursor-pointer w-full text-left" onClick={showProject} title="Show in Folder" type="button">
        <Icon name="Projects" customSize={16} className="text-text-400 flex-shrink-0" />
        <span className="text-sm text-text-200 truncate">{project.name}</span>
      </button>
    </li>
  );
}
