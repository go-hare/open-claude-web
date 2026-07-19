/**
 * Official [bs,ys] ultrareview launch chrome (c11959232):
 * spawnLabel:bs → "Launching Ultrareview…" while fe.launchUltrareview is in flight.
 * Module-level so ExistingSessionComposer can set and useEpitaxySessionData can read.
 */

const launchingBySessionId = new Map<string, boolean>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function setOfficialUltrareviewLaunching(sessionId: string | undefined | null, launching: boolean) {
  if (!sessionId) return;
  if (launching) launchingBySessionId.set(sessionId, true);
  else launchingBySessionId.delete(sessionId);
  notify();
}

export function isOfficialUltrareviewLaunching(sessionId: string | undefined | null): boolean {
  return Boolean(sessionId && launchingBySessionId.get(sessionId));
}

export function subscribeOfficialUltrareviewLaunching(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot for useSyncExternalStore. */
export function getOfficialUltrareviewLaunchingVersion(): number {
  return launchingBySessionId.size;
}
