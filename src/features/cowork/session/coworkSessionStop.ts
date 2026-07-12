import type { CoworkSessionsBridge } from "../../../adapters/desktopBridge/types";

export async function stopCoworkSession(bridge: Pick<CoworkSessionsBridge, "stop">, sessionId: string) {
  await bridge.stop?.(sessionId);
}
