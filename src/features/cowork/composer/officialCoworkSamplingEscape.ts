/**
 * Official Oyt (index-BELzQL5P ChatInput toolbar):
 *   window keydown → if key==="Escape" && !isLoading then onStop()
 * `isLoading` is Lyt `j==="stopping"` (isStoppingSampling).
 * Not Code Qj interrupt-once; local_session Stop is sessionCtx.stopSession
 * (host LocalAgentModeSessions.stop), not interruptTurn / drain-continue.
 */
export function shouldOfficialCoworkSamplingEscapeStop(
  key: string,
  isStopping: boolean,
): boolean {
  return key === "Escape" && !isStopping;
}
