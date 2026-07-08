import { useEffect, useMemo, useState } from "react";
import type { ChatMessage, LocalSessionsBridge, SessionSummary } from "../../../adapters/desktopBridge/types";
import { CoworkActivityPanelShell } from "./CoworkActivityPanelShell";
import { CoworkActivitySection } from "./CoworkActivitySection";
import { CoworkContextContent, CoworkWorkingFolderContent } from "./CoworkActivityContent";
import { CoworkProgressSection } from "./CoworkProgressSection";
import { CoworkScheduledRunsSection, useCoworkScheduledRuns } from "./CoworkScheduledRunsSection";
import type { CoworkBackgroundTask, CoworkOpenFileTarget, CoworkTodoItem } from "./coworkActivityTypes";
import { coworkFolderSectionTitle, coworkSessionFolders, parseCoworkResourceActivity, splitCoworkResourceSections, type CoworkResourceSections } from "./coworkResourceActivity";
import { parseCoworkTodos } from "./coworkTodoActivity";

export type { CoworkBackgroundTask } from "./coworkActivityTypes";

export function CoworkSessionActivityPanel({ bridge, messages, onNavigate, onOpenFile, session, sessionId, tasks }: {
  bridge: LocalSessionsBridge;
  messages: ChatMessage[];
  onNavigate: (path: string) => void;
  onOpenFile: (target: CoworkOpenFileTarget) => void;
  session: SessionSummary | null;
  sessionId: string;
  tasks: CoworkBackgroundTask[];
}) {
  const todos = useMemo(() => parseCoworkTodos(messages), [messages]);
  const resources = useMemo(() => parseCoworkResourceActivity(messages), [messages]);
  const folders = useMemo(() => coworkSessionFolders(session), [session]);
  const resourceSections = useMemo(() => splitCoworkResourceSections(resources, folders), [resources, folders]);
  const scheduledRuns = useCoworkScheduledRuns(bridge, session?.scheduledTaskId);
  const [progressOpen, setProgressOpen] = useState(true);
  const [runsOpen, setRunsOpen] = useState(true);
  const [foldersOpen, setFoldersOpen] = useState(() => hasFolderActivity(folders, resourceSections));
  const [contextOpen, setContextOpen] = useState(true);
  const hasActivity = hasCoworkActivity({ folders, resources, scheduledRuns, session, tasks, todos });

  useEffect(() => {
    if (hasFolderActivity(folders, resourceSections)) setFoldersOpen(true);
  }, [folders, resourceSections]);

  if (!hasActivity) return null;

  return (
    <CoworkActivityPanelShell sessionId={sessionId}>
      <CoworkActivityPanelBody
        contextOpen={contextOpen}
        folders={folders}
        foldersOpen={foldersOpen}
        onContextToggle={() => setContextOpen((value) => !value)}
        onFoldersToggle={() => setFoldersOpen((value) => !value)}
        onNavigate={onNavigate}
        onOpenFile={onOpenFile}
        onProgressToggle={() => setProgressOpen((value) => !value)}
        onRunsToggle={() => setRunsOpen((value) => !value)}
        progressOpen={progressOpen}
        resourceSections={resourceSections}
        runsOpen={runsOpen}
        scheduledRuns={scheduledRuns}
        session={session}
        sessionId={sessionId}
        tasks={tasks}
        todos={todos}
      />
    </CoworkActivityPanelShell>
  );
}

function CoworkActivityPanelBody({ contextOpen, folders, foldersOpen, onContextToggle, onFoldersToggle, onNavigate, onOpenFile, onProgressToggle, onRunsToggle, progressOpen, resourceSections, runsOpen, scheduledRuns, session, sessionId, tasks, todos }: CoworkActivityPanelBodyProps) {
  const hasFolderRows = hasFolderActivity(folders, resourceSections);
  return (
    <>
      {scheduledRuns.length > 0 ? <CoworkScheduledRunsSection currentSessionId={sessionId} isExpanded={runsOpen} onNavigate={onNavigate} onToggle={onRunsToggle} runs={scheduledRuns} /> : null}
      <CoworkProgressSection isExpanded={progressOpen} onToggle={onProgressToggle} tasks={tasks} todos={todos} />
      <CoworkActivitySection contentClassName={hasFolderRows ? undefined : "!pb-3"} isExpanded={foldersOpen} maxContentHeight="24rem" title={coworkFolderSectionTitle(folders)} onToggle={onFoldersToggle}>
        <CoworkWorkingFolderContent folders={folders} resources={resourceSections.workingResources} scratchpadResources={resourceSections.scratchpadResources} onOpenFile={onOpenFile} />
      </CoworkActivitySection>
      <CoworkActivitySection isExpanded={contextOpen} title="Context" onToggle={onContextToggle}>
        <CoworkContextContent resources={resourceSections.contextResources} session={session} sessionId={sessionId} />
      </CoworkActivitySection>
    </>
  );
}

type CoworkActivityPanelBodyProps = {
  contextOpen: boolean;
  folders: string[];
  foldersOpen: boolean;
  onContextToggle: () => void;
  onFoldersToggle: () => void;
  onNavigate: (path: string) => void;
  onOpenFile: (target: CoworkOpenFileTarget) => void;
  onProgressToggle: () => void;
  onRunsToggle: () => void;
  progressOpen: boolean;
  resourceSections: CoworkResourceSections;
  runsOpen: boolean;
  scheduledRuns: SessionSummary[];
  session: SessionSummary | null;
  sessionId: string;
  tasks: CoworkBackgroundTask[];
  todos: CoworkTodoItem[];
};

function hasFolderActivity(folders: string[], sections: CoworkResourceSections) {
  return folders.length > 0 || sections.workingResources.length > 0 || sections.scratchpadResources.length > 0;
}

function hasCoworkActivity({ folders, resources, scheduledRuns, session, tasks, todos }: { folders: string[]; resources: unknown[]; scheduledRuns: unknown[]; session: SessionSummary | null; tasks: unknown[]; todos: unknown[] }) {
  return todos.length > 0 || tasks.length > 0 || resources.length > 0 || folders.length > 0 || scheduledRuns.length > 0 || Boolean(session?.scheduledTaskId);
}
