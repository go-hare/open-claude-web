/**
 * Official Blt file/tool status label (index-BELzQL5P.pretty.js ~158025–158050).
 * Action word + monospaced gradient target pill.
 */

import type { ReactNode } from "react";
import { CoworkShimmerText } from "./CoworkShimmerText";

export function CoworkFileStatusLabel({
  description,
  errorAction,
  isError = false,
  isStreaming = false,
  streamingAction,
  successAction,
  target,
}: {
  description?: string;
  errorAction: string;
  isError?: boolean;
  isStreaming?: boolean;
  streamingAction: string;
  successAction: string;
  target: ReactNode;
}) {
  if (description && !isError) {
    return isStreaming
      ? <CoworkShimmerText>{description}</CoworkShimmerText>
      : <span className="text-text-200">{description}</span>;
  }
  const action = isStreaming ? streamingAction : isError ? errorAction : successAction;
  const actionNode = isStreaming ? <CoworkShimmerText>{action}</CoworkShimmerText> : action;
  return (
    <span className="flex items-center min-w-0 text-text-200" data-official-source="index-BELzQL5P.js:Blt">
      <span className="whitespace-nowrap mr-1 text-text-200">{actionNode}</span>
      <span
        className="bg-gradient-to-b from-bg-300 via-bg-300/80 to-bg-300 shadow-xs rounded px-1 py-0.5 font-mono truncate overflow-hidden text-ellipsis min-w-0 text-text-200"
        title={typeof target === "string" ? target : undefined}
      >
        {target}
      </span>
    </span>
  );
}
