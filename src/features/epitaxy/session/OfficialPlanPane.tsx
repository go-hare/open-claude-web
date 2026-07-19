/**
 * Official ZN + XN + JN (c11959232-h_zsw3wI.js):
 * - XN(sessionRef) reads oe(sessionId) full transcript
 * - empty → CheckList + "No plan yet." / "Claude writes the plan here…"
 * - content → markdown pipeline in epitaxy-markdown max-w-[68ch]
 *
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import { useMemo } from "react";
import type { SessionSummary } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import {
  OfficialPlanCommentHint,
  OfficialPlanCommentSelection,
} from "../plan/OfficialPlanComments";
import { OfficialPlanMarkdown } from "../plan/OfficialPlanMarkdown";
import { useOfficialCodeSessionBucket } from "./officialCodeSessionStore";
import { parseOfficialPlan } from "./officialTasksAndPlan";

type EpitaxySessionRef = {
  id: string;
  type: "local" | "remote" | "bridge";
};

export function OfficialPlanPane({ session, sessionRef }: { session: SessionSummary | null; sessionRef: EpitaxySessionRef }) {
  const bucket = useOfficialCodeSessionBucket(sessionRef.id);
  const messages = bucket?.messages ?? session?.messages ?? [];
  const plan = useMemo(() => parseOfficialPlan(messages), [messages]);
  if (!plan.content) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-g3 px-[32px] text-center text-t6">
        <Icon name="CheckList" size="lg" />
        <div className="text-body">No plan yet.</div>
        <div className="text-caption">Claude writes the plan here as it explores. Keep chatting.</div>
      </div>
    );
  }
  // Official JN: VN hint + KN selection wrapper around pl (YN + ON when comments).
  return (
    <div className="h-full select-text overflow-y-auto p-p8" style={{ scrollbarGutter: "stable" }}>
      <div className="epitaxy-markdown mx-auto max-w-[68ch]">
        <OfficialPlanCommentHint />
        <OfficialPlanCommentSelection sessionId={sessionRef.id}>
          <OfficialPlanMarkdown content={plan.content} sessionId={sessionRef.id} />
        </OfficialPlanCommentSelection>
      </div>
    </div>
  );
}
