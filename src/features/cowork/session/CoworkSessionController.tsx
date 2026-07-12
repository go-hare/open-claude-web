import { useEffect } from "react";
import { coworkSessionsBridge } from "./coworkSessionBridge";
import { createCoworkSessionRuntime } from "./coworkSessionRuntime";
import type { CoworkSessionStore } from "./coworkSessionStore";

export function CoworkSessionController({
  sessionId,
  store,
}: {
  sessionId: string;
  store: CoworkSessionStore;
}) {
  useEffect(() => {
    const runtime = createCoworkSessionRuntime({ bridge: coworkSessionsBridge, sessionId, store });
    runtime.start();
    return runtime.dispose;
  }, [sessionId, store]);
  return null;
}
