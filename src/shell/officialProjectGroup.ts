/**
 * Official ca0135 fl / BELz R9t + O9t Code Recents project buckets.
 *
 *   R9t (imported as `fe`) — grouping key from session.repoInfo
 *   O9t (imported as `_t`) — detected-projects list (name + disambiguation)
 *   Y8  — last path segment (`/` or `\`)
 *   ikt — home-path tilde (Windows drive/`\` paths pass through)
 *
 * Product SessionSummary is densable (repo.name, cwd) not official source.data.
 * Reconstruct the local-mapper repoInfo shape so R9t/O9t run unchanged.
 */
import type { SessionSummary } from "../adapters/desktopBridge";
import type { ShellText } from "../i18n/shellMessages";

export const NO_PROJECT_KEY = "__no_project__";

export type OfficialCodeSessionData = {
  type: "local" | "remote" | "bridge";
  cwd?: string;
  homePath?: string;
  timestamp: string;
  sessionStatus?: string;
  repoInfo?: {
    owner: string;
    name: string;
    branch?: string;
  };
};

export type OfficialDetectedProject = {
  key: string;
  name: string;
  isRepo: boolean;
  hasActiveSessions: boolean;
  disambiguationText: string | null;
  latestTimestamp: number;
};

export type OfficialProjectDisplayGroup = {
  key: string;
  label: string;
  sessions: SessionSummary[];
};

/** Official Y8. */
export function officialPathBasename(path: string): string {
  const trimmed = path.replace(/[\\/]$/, "");
  const sep = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  if (sep === -1) return trimmed;
  return trimmed.slice(sep + 1);
}

/** Official ikt. Windows drive / `\` paths are not rewritten to `~`. */
export function officialHomeRelativePath(path: string, homePath?: string): string {
  if (!homePath) return path;
  if (path.includes("\\") || /^[A-Za-z]:/.test(path)) return path;
  const home = homePath.endsWith("/") ? homePath.slice(0, -1) : homePath;
  if (path === home || path === `${home}/`) return "~";
  const prefix = `${home}/`;
  if (path.startsWith(prefix)) return `~/${path.slice(prefix.length)}`;
  return path;
}

/**
 * Inverse of product `repoInfo()` densable: `owner && name → owner/name`.
 * Official R9t reads owner and name as separate fields.
 */
function officialRepoInfoFromSession(session: SessionSummary): OfficialCodeSessionData["repoInfo"] {
  const rawName = session.repo?.name?.trim();
  if (rawName) {
    if (!rawName.includes("\\") && !/^[A-Za-z]:/.test(rawName)) {
      const slash = rawName.indexOf("/");
      if (slash > 0 && slash === rawName.lastIndexOf("/")) {
        return {
          owner: rawName.slice(0, slash),
          name: rawName.slice(slash + 1),
          branch: session.repo?.branch,
        };
      }
    }
    return { owner: "", name: rawName, branch: session.repo?.branch };
  }
  const cwd = session.cwd?.trim();
  if (cwd) {
    return { owner: "", name: officialPathBasename(cwd), branch: session.repo?.branch };
  }
  return undefined;
}

/** Official session.type local/remote/bridge (mapper M / remote mapper). */
export function officialSessionType(session: SessionSummary): OfficialCodeSessionData["type"] {
  if (session.sessionType === "local" || session.sessionType === "remote" || session.sessionType === "bridge") {
    return session.sessionType;
  }
  const cwd = session.cwd?.trim() ?? "";
  if (cwd.startsWith("remote-control:")) return "bridge";
  return "local";
}

export function toOfficialCodeSessionData(session: SessionSummary): OfficialCodeSessionData {
  const cwd = session.cwd?.trim() || undefined;
  const pending = session.pendingToolPermissions?.length ? true : false;
  return {
    type: officialSessionType(session),
    cwd,
    homePath: session.homePath,
    timestamp: new Date(session.updatedAtMs).toISOString(),
    sessionStatus: pending ? "requires_action" : session.isRunning ? "running" : "idle",
    repoInfo: officialRepoInfoFromSession(session),
  };
}

/** Official R9t (`fe`). Undefined → fl buckets as `__no_project__`. */
export function officialProjectGroupKey(data: OfficialCodeSessionData): string | undefined {
  const repo = data.repoInfo;
  if (!repo) return undefined;
  if (repo.owner) return `${repo.owner}/${repo.name}`;
  if (data.type === "local" && data.cwd) return data.cwd;
  return repo.name;
}

export function officialProjectGroupKeyFromSession(session: SessionSummary): string | undefined {
  return officialProjectGroupKey(toOfficialCodeSessionData(session));
}

/** Official O9t (`_t`), minus the React useMemo wrapper. */
type DetectedAcc = {
  hasActive: boolean;
  name: string;
  owner: string | null;
  localPath: string | null;
  latestTimestamp: number;
};

export function detectOfficialProjects(
  sessions: OfficialCodeSessionData[],
  sortBy: "name" | "recent" = "recent",
): OfficialDetectedProject[] {
  const byKey = new Map<string, DetectedAcc>();

  for (const session of sessions) {
    const key = officialProjectGroupKey(session);
    if (!key) continue;
    const active = session.sessionStatus === "running" || session.sessionStatus === "requires_action";
    const timestamp = new Date(session.timestamp).getTime();
    const existing = byKey.get(key);
    if (existing) {
      if (active) existing.hasActive = true;
      if (timestamp > existing.latestTimestamp) existing.latestTimestamp = timestamp;
      if (session.type === "local" && session.cwd && !existing.localPath) {
        existing.localPath = officialHomeRelativePath(session.cwd, session.homePath);
      }
    } else {
      const repo = session.repoInfo;
      byKey.set(key, {
        hasActive: active,
        name: repo?.name ?? key,
        owner: repo?.owner || null,
        localPath: session.type === "local" && session.cwd
          ? officialHomeRelativePath(session.cwd, session.homePath)
          : null,
        latestTimestamp: timestamp,
      });
    }
  }

  const nameCounts = new Map<string, number>();
  for (const project of byKey.values()) {
    nameCounts.set(project.name, (nameCounts.get(project.name) ?? 0) + 1);
  }

  const projects: OfficialDetectedProject[] = [];
  for (const [key, project] of byKey) {
    const collide = (nameCounts.get(project.name) ?? 0) > 1;
    let disambiguationText: string | null = null;
    if (collide) {
      if (project.owner) {
        disambiguationText = project.owner;
      } else if (project.localPath) {
        const sep = Math.max(project.localPath.lastIndexOf("/"), project.localPath.lastIndexOf("\\"));
        disambiguationText = sep > 0 ? project.localPath.slice(0, sep) : project.localPath;
      }
    }
    projects.push({
      key,
      name: project.name,
      isRepo: Boolean(project.owner),
      hasActiveSessions: project.hasActive,
      disambiguationText,
      latestTimestamp: project.latestTimestamp,
    });
  }

  if (sortBy === "name") {
    projects.sort((left, right) => (
      left.name.localeCompare(right.name)
      || (left.disambiguationText ?? "").localeCompare(right.disambiguationText ?? "")
    ));
  } else {
    projects.sort((left, right) => right.latestTimestamp - left.latestTimestamp);
  }
  return projects;
}

export function officialProjectFilterLabel(project: OfficialDetectedProject): string {
  return project.disambiguationText
    ? `${project.name} · ${project.disambiguationText}`
    : project.name;
}

/** Official ca0135 fl project buckets. */
export function groupSessionsByOfficialProject(
  sessions: SessionSummary[],
  text?: ShellText,
): OfficialProjectDisplayGroup[] {
  const rows = sessions.map((session) => ({
    session,
    data: toOfficialCodeSessionData(session),
  }));
  const detected = detectOfficialProjects(rows.map((row) => row.data), "name");
  const buckets = new Map<string, SessionSummary[]>();
  for (const row of rows) {
    const key = officialProjectGroupKey(row.data) ?? NO_PROJECT_KEY;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(row.session);
    else buckets.set(key, [row.session]);
  }

  const groups: OfficialProjectDisplayGroup[] = [];
  for (const project of detected) {
    const bucket = buckets.get(project.key);
    if (!bucket) continue;
    groups.push({
      key: `project-${project.key}`,
      label: officialProjectFilterLabel(project),
      sessions: bucket,
    });
  }
  const other = buckets.get(NO_PROJECT_KEY);
  if (other) {
    groups.push({
      key: `project-${NO_PROJECT_KEY}`,
      label: text?.other ?? "Other",
      sessions: other,
    });
  }
  return groups;
}
