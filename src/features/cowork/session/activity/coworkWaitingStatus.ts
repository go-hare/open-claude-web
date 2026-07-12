export type CoworkWaitingStatus = {
  detail?: string;
  message?: string;
};

export function coworkWaitingStatus(
  message: string | undefined,
  elapsedSeconds: number,
  isWaitingState = false,
  contentLength?: number,
): CoworkWaitingStatus {
  const elapsed = Math.max(0, Math.floor(elapsedSeconds));
  const displayMessage = waitingMessage(message, elapsed, isWaitingState);
  return {
    message: displayMessage,
    detail: waitingDetail(elapsed, contentLength),
  };
}

function waitingMessage(message: string | undefined, elapsed: number, isWaitingState: boolean) {
  if (!isWaitingState) return message;
  if (elapsed >= 60) return "Working through a complex response...";
  if (elapsed >= 30) return "Still thinking...";
  return message;
}

function waitingDetail(elapsed: number, contentLength?: number) {
  if (contentLength !== undefined && contentLength > 0) {
    return `~${contentLength.toLocaleString()} characters`;
  }
  if (elapsed < 5) return undefined;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
