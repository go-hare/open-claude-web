import { useEffect, useState } from "react";
import type { SessionSummary } from "../../../adapters/desktopBridge/types";
import { coworkSessionsBridge } from "../session/coworkSessionBridge";
import type { CoworkFolderTarget } from "./CoworkFolderPicker";

export function useCoworkRecentFolders() {
  const [targets, setTargets] = useState<CoworkFolderTarget[]>([]);
  useEffect(() => {
    let alive = true;
    void coworkSessionsBridge.list().then((sessions) => {
      if (alive) setTargets(buildFolderTargets(sessions));
    }).catch(() => {
      if (alive) setTargets([]);
    });
    return () => { alive = false; };
  }, []);
  return targets;
}

function buildFolderTargets(sessions: SessionSummary[]) {
  const seen = new Set<string>();
  const targets: CoworkFolderTarget[] = [];
  for (const session of [...sessions].sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0))) {
    for (const path of [session.cwd, ...(session.folders ?? [])]) {
      if (!path || seen.has(path)) continue;
      seen.add(path);
      targets.push({ displayName: basename(path), path, type: session.repo?.branch ? "git" : "folder" });
      if (targets.length >= 10) return targets;
    }
  }
  return targets;
}

function basename(value: string) {
  return value.split(/[\\/]/).filter(Boolean).at(-1);
}
