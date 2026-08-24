import { useEffect, useState } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { readPersistedFrameMode } from "../../../stores/frameStoreHelpers";
import { mergeBuiltInSkills, OFFICIAL_COWORK_BUILTIN_SKILLS } from "./officialCoworkBuiltInSkills";
import type { BuiltInSkill } from "./skillTypes";

/**
 * Official Aa() / _a() are react-query: remounting $l does not flip isLoading back to true.
 * Product SkillsRoute remounts on every CustomizePage switch — keep a module cache so
 * Skills ↔ Connectors does not flash Gl (SkillsLoadingSkeleton).
 */
let cachedTaskMode: boolean | undefined;
let cachedBuiltInSkills: BuiltInSkill[] | undefined;

/**
 * Official aRe + Ua/N6:
 * - aRe: LocalAgentModeSessions.getSupportedCommands filter scope === "cowork"
 * - Ua/N6: selectedMode === "task" (desktop dframe mode === "cowork")
 *
 * Without the task/cowork mode gate, built-ins stay hidden even if host returns them.
 * Host results are merged with official RT()/K2e builtins so consolidate-memory is never dropped.
 */
export function useBuiltInSkills(): {
  builtInSkills: BuiltInSkill[];
  isLoading: boolean;
  /** Official Ua — task/cowork mode; controls whether built-ins are shown. */
  isTaskMode: boolean;
} {
  const isTaskMode = readPersistedFrameMode() === "cowork";
  const hasCache = cachedTaskMode === isTaskMode && cachedBuiltInSkills !== undefined;
  const [builtInSkills, setBuiltInSkills] = useState<BuiltInSkill[]>(() =>
    hasCache ? cachedBuiltInSkills! : [],
  );
  const [isLoading, setIsLoading] = useState(() => !hasCache && isTaskMode);

  useEffect(() => {
    let cancelled = false;
    if (!isTaskMode) {
      cachedTaskMode = false;
      cachedBuiltInSkills = [];
      setBuiltInSkills([]);
      setIsLoading(false);
      return;
    }

    const apply = (next: BuiltInSkill[]) => {
      cachedTaskMode = true;
      cachedBuiltInSkills = next;
      if (!cancelled) {
        setBuiltInSkills(next);
        setIsLoading(false);
      }
    };

    const load = async () => {
      // Official isLoading stays false on remount when query data already exists.
      if (!(cachedTaskMode === true && cachedBuiltInSkills !== undefined)) {
        setIsLoading(true);
      }
      try {
        const bridge = desktopBridge.LocalAgentModeSessions;
        if (!bridge?.getSupportedCommands) {
          // No host: still show official RT()/K2e builtins (matches desktop Skills when flag on).
          apply(mergeBuiltInSkills([]));
          return;
        }
        const commands = await bridge.getSupportedCommands();
        if (cancelled) return;
        const fromHost = (commands ?? [])
          .filter((command) => command.scope === "cowork" && command.name)
          .map((command) => ({
            name: command.name,
            description: command.description,
          }));
        apply(mergeBuiltInSkills(fromHost));
      } catch {
        apply(mergeBuiltInSkills([]));
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isTaskMode]);

  return { builtInSkills, isLoading, isTaskMode };
}

export { OFFICIAL_COWORK_BUILTIN_SKILLS };
