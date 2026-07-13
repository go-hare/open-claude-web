import { useEffect, useState } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { readPersistedFrameMode } from "../../../stores/frameStoreHelpers";
import { mergeBuiltInSkills, OFFICIAL_COWORK_BUILTIN_SKILLS } from "./officialCoworkBuiltInSkills";
import type { BuiltInSkill } from "./skillTypes";

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
  const [builtInSkills, setBuiltInSkills] = useState<BuiltInSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!isTaskMode) {
      setBuiltInSkills([]);
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const bridge = desktopBridge.LocalAgentModeSessions;
        if (!bridge?.getSupportedCommands) {
          // No host: still show official RT()/K2e builtins (matches desktop Skills when flag on).
          if (!cancelled) setBuiltInSkills(mergeBuiltInSkills([]));
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
        setBuiltInSkills(mergeBuiltInSkills(fromHost));
      } catch {
        if (!cancelled) setBuiltInSkills(mergeBuiltInSkills([]));
      } finally {
        if (!cancelled) setIsLoading(false);
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
