import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, type Dispatch, type SetStateAction } from "react";
import type { CoworkSessionsBridge } from "../../../adapters/desktopBridge/types";
import type { CoworkPermissionDecision, CoworkPermissionRequest } from "../session/coworkPermissionTypes";
import { CoworkComputerAccessApproval, CoworkComputerTeachApproval } from "./CoworkComputerPermissionApprovals";
import { CoworkArtifactApproval, CoworkSaveSkillApproval, CoworkScheduledTaskApproval } from "./CoworkPermissionContentApprovals";
import { CoworkGenericPermissionApproval } from "./CoworkGenericPermissionApproval";
import {
  coworkPermissionApprovalKind,
  visibleCoworkPermissions,
  type VisibleCoworkPermission,
} from "./coworkPermissionApprovalModel";
import {
  CoworkBrowserApproval,
  CoworkDirectoryApproval,
  CoworkFileDeleteApproval,
  CoworkLaunchCodeApproval,
  CoworkWebFetchApproval,
} from "./CoworkPermissionStandardApprovals";

export type CoworkPermissionController = {
  bridge: Pick<CoworkSessionsBridge, "respondToToolPermission">;
  disableKeyboardShortcuts?: boolean;
  isScheduledTask?: boolean;
  launchCodeSession?: (request: CoworkPermissionRequest) => Promise<{
    displayPath?: string;
    sessionId: string;
    target: string;
  }>;
  requests: CoworkPermissionRequest[];
  setRequests: Dispatch<SetStateAction<CoworkPermissionRequest[]>>;
};

export function CoworkPermissionApprovals({ controller }: { controller: CoworkPermissionController }) {
  const visible = useMemo(() => visibleCoworkPermissions(controller.requests), [controller.requests]);
  const decide = useCoworkPermissionDecision(controller);
  const setupCode = useLaunchCodeSession(controller, decide);
  const firstBrowserRequestId = visible.find((entry) => coworkPermissionApprovalKind(entry.request.toolName) === "browser")?.request.requestId;
  if (!controller.bridge.respondToToolPermission) return null;
  return (
    <div className={visible.length > 0 ? "mb-6" : undefined}>
      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((entry) => (
          <motion.div
            className="-mx-1 overflow-hidden px-1"
            exit={{ height: 0, opacity: 0 }}
            key={entry.request.requestId}
            layout="position"
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          >
            <CoworkPermissionApproval
              entry={entry}
              disableKeyboardShortcuts={controller.disableKeyboardShortcuts === true || (coworkPermissionApprovalKind(entry.request.toolName) === "browser" && entry.request.requestId !== firstBrowserRequestId)}
              isScheduledTask={controller.isScheduledTask === true}
              onDecide={(decision, input) => void decide(entry, decision, input)}
              onSetup={setupCode}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function CoworkPermissionApproval({ disableKeyboardShortcuts, entry, isScheduledTask, onDecide, onSetup }: {
  disableKeyboardShortcuts: boolean;
  entry: VisibleCoworkPermission;
  isScheduledTask: boolean;
  onDecide: (decision: CoworkPermissionDecision, input?: Record<string, unknown>) => void;
  onSetup?: (request: CoworkPermissionRequest) => void;
}) {
  const props = { busy: false, disableKeyboardShortcuts, onDecide, request: entry.request };
  switch (coworkPermissionApprovalKind(entry.request.toolName)) {
    case "directory": return <CoworkDirectoryApproval {...props} isScheduledTask={isScheduledTask} />;
    case "file-delete": return <CoworkFileDeleteApproval {...props} />;
    case "launch-code": return <CoworkLaunchCodeApproval {...props} onSetup={onSetup} />;
    case "scheduled-task": return <CoworkScheduledTaskApproval {...props} />;
    case "artifact": return <CoworkArtifactApproval {...props} isScheduledTask={isScheduledTask} />;
    case "save-skill": return <CoworkSaveSkillApproval {...props} />;
    case "browser": return <CoworkBrowserApproval {...props} duplicateCount={entry.duplicateRequestIds.length + 1} isScheduledTask={isScheduledTask} />;
    case "web-fetch": return <CoworkWebFetchApproval {...props} />;
    case "computer-teach": return <CoworkComputerTeachApproval {...props} />;
    case "computer-access": return <CoworkComputerAccessApproval {...props} />;
    default: return <CoworkGenericPermissionApproval {...props} isScheduledTask={isScheduledTask} />;
  }
}

function useCoworkPermissionDecision(controller: CoworkPermissionController) {
  return useCallback(async (
    entry: VisibleCoworkPermission,
    decision: CoworkPermissionDecision,
    updatedInput?: Record<string, unknown>,
  ) => {
    if (!controller.bridge.respondToToolPermission) return;
    const requestIds = [entry.request.requestId, ...entry.duplicateRequestIds];
    controller.setRequests((current) => current.filter((request) => !requestIds.includes(request.requestId)));
    const input = updatedInput ?? entry.request.input;
    await Promise.all(requestIds.map((requestId) => controller.bridge.respondToToolPermission!(requestId, decision, input)));
  }, [controller.bridge, controller.setRequests]);
}

function useLaunchCodeSession(
  controller: CoworkPermissionController,
  decide: ReturnType<typeof useCoworkPermissionDecision>,
) {
  const launch = useCallback((request: CoworkPermissionRequest) => {
    if (!controller.launchCodeSession) return;
    const entry = { duplicateRequestIds: [], request };
    void controller.launchCodeSession(request).then((launched) => decide(entry, "once", {
      ...request.input,
      launched_session: {
        display_path: launched.displayPath,
        session_id: launched.sessionId,
        target: launched.target,
      },
    }));
  }, [controller.launchCodeSession, decide]);
  return controller.launchCodeSession ? launch : undefined;
}
