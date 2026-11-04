/**
 * Official cd5a31703 e2 leftover presentational cards.
 * Q0 nK xK wK TX dX fX zX VZe MX LX/PX NX. SKIP channel cards, Computer Pn.
 */
import { useContext, useState, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import { OfficialCodeMarkdown } from "../OfficialCodeMarkdown";
import { OfficialTurnStatusStep } from "./OfficialTurnStatusStep";
import { EpitaxyTranscriptActionContext } from "./epitaxyTranscriptActionContext";
import {
  OFFICIAL_KB_NOTICE_MESSAGES as M,
  officialPeerHoldCauseDefaultMessage,
  officialPeerHoldCauseMessageId,
  officialPeerHoldStateDefaultMessage,
  officialPeerHoldStateMessageId,
  officialRemoteControlNoticeSentence,
  type OfficialKbNoticeItem,
} from "./officialKbNoticeKinds";

/** Official `c8ba53634` `n` / Wf — assistant text inset. */
const Wf = "ps-[var(--cds-assistant-message-text-inset,0px)]";

export function OfficialKbNoticeCard({
  isLastEntry,
  item,
  sessionId,
}: {
  isLastEntry?: boolean;
  item: OfficialKbNoticeItem;
  sessionId?: string;
}) {
  switch (item.kind) {
    case "narration_summary":
      return <OfficialQ0NarrationSummary item={item} />;
    case "usage":
      return <OfficialNkUsageCard />;
    case "status":
      return <OfficialXkStatusCard />;
    case "remote_control_notice":
      return <OfficialWkRemoteControl item={item} />;
    case "computer_disconnected":
      return <OfficialTxComputerDisconnected item={item} />;
    case "auto_mode_notice":
      return <OfficialDxAutoModeNotice item={item} />;
    case "auto_mode_setup_applied":
      return <OfficialFxAutoModeSetupApplied item={item} />;
    case "stop_warning":
      return <OfficialZxStopWarning item={item} />;
    case "context_cleared":
      return <OfficialVzeContextCleared />;
    case "gap_fill_failed":
      return <OfficialMxGapFillFailed sessionId={sessionId} />;
    case "prompt_blocked":
      return <OfficialPromptBlocked isLastEntry={isLastEntry} item={item} />;
    case "peerHold":
      return <OfficialNxPeerHold item={item} />;
  }
}

/** Official Q0 — Ig prose / diagram, no commandRun. */
function OfficialQ0NarrationSummary({ item }: { item: Extract<OfficialKbNoticeItem, { kind: "narration_summary" }> }) {
  return (
    <div data-official-source="cd5a31703-B4nKQMBN.js:Q0">
      <OfficialCodeMarkdown text={item.text} />
    </div>
  );
}

/** Official nK / WWe empty branch (`OIASpphXDW`). Session windows live in BFF — presentational empty card. */
function OfficialNkUsageCard() {
  return (
    <div
      aria-label={M.usageAria.defaultMessage}
      className="flex flex-col gap-[24px] p-[16px] pt-lg rounded-lg w-[360px] max-w-full epitaxy-card-outline outline-none"
      data-official-source="cd5a31703-B4nKQMBN.js:nK WWe OIASpphXDW"
      role="group"
      tabIndex={-1}
    >
      <span className="text-footnote text-muted">{M.usageEmpty.defaultMessage}</span>
    </div>
  );
}

/** Official xK / SGe empty groups → `DXufX1Giis`. */
function OfficialXkStatusCard() {
  return (
    <div
      className="flex flex-col gap-md p-lg rounded-lg w-[360px] max-w-full epitaxy-card-outline"
      data-official-source="cd5a31703-B4nKQMBN.js:xK SGe El20cfeNaL"
      data-testid="epitaxy-status-card"
    >
      <span className="flex items-center justify-between text-footnote text-primary pb-xs min-h-[24px]">
        {M.statusTitle.defaultMessage}
      </span>
      <span className="text-footnote text-muted">{M.statusLoading.defaultMessage}</span>
    </div>
  );
}

/** Official wK / TK history path (SK history:!0). Live toggle is sessionRef — presentational sentence. */
function OfficialWkRemoteControl({ item }: { item: Extract<OfficialKbNoticeItem, { kind: "remote_control_notice" }> }) {
  const sentence = officialRemoteControlNoticeSentence(item.notice);
  return (
    <OfficialSkHistoryNotice sentence={sentence} source="cd5a31703-B4nKQMBN.js:wK TK DK" />
  );
}

/** Official TX → SK history:!0. */
function OfficialTxComputerDisconnected({ item }: { item: Extract<OfficialKbNoticeItem, { kind: "computer_disconnected" }> }) {
  return <OfficialSkHistoryNotice sentence={item.sentence} source="cd5a31703-B4nKQMBN.js:TX SK" />;
}

/** Official SK `history:!0` — text-body / min-w-0 text-secondary, no fade-in / live region. */
function OfficialSkHistoryNotice({ sentence, source }: { sentence: string; source: string }) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-body" data-official-source={source}>
      <span className="min-w-0 text-secondary">{sentence}</span>
    </div>
  );
}

/** Official dX — empty when headline catalog missing (`a?…:null`). */
function OfficialDxAutoModeNotice({ item }: { item: Extract<OfficialKbNoticeItem, { kind: "auto_mode_notice" }> }) {
  const headline = M.autoModeHeadline.defaultMessage.trim();
  const docs = M.autoModeDocs.defaultMessage.trim();
  if (!headline) return null;
  return (
    <div className={`flex flex-col gap-0.5 ${Wf}`} data-official-source="cd5a31703-B4nKQMBN.js:dX">
      <span className="text-body-semibold text-primary">{headline}</span>
      <span className="text-body text-secondary">{M.autoModeBody.defaultMessage}</span>
      {docs ? (
        <a
          className="text-body text-secondary"
          href="https://code.claude.com/docs/en/permission-modes"
          rel="noreferrer"
          target="_blank"
        >
          {docs}
        </a>
      ) : null}
      {item.variant ? <span className="sr-only">{item.variant}</span> : null}
    </div>
  );
}

/** Official fX — missing catalog ids → raw pre; else applied card + hide/show. */
function OfficialFxAutoModeSetupApplied({ item }: { item: Extract<OfficialKbNoticeItem, { kind: "auto_mode_setup_applied" }> }) {
  const [open, setOpen] = useState(false);
  const catalog = Boolean(M.autoModeSetupApplied.defaultMessage && M.showDetails.defaultMessage && M.hideDetails.defaultMessage);
  if (!catalog) {
    return (
      <pre className={`text-code text-secondary whitespace-pre-wrap break-words ${Wf} m-0`} data-official-source="cd5a31703-B4nKQMBN.js:fX">
        {item.raw}
      </pre>
    );
  }
  const { result } = item;
  const missing = result.permissionsAllowNotFound;
  return (
    <div className={`flex flex-col gap-0.5 ${Wf}`} data-official-source="cd5a31703-B4nKQMBN.js:fX 1d807d8">
      <span className="text-body-semibold text-primary">{M.autoModeSetupApplied.defaultMessage}</span>
      <span className="text-body text-secondary">{M.autoModeSetupWrote.defaultMessage}</span>
      <code className="text-code text-secondary whitespace-pre-wrap break-words">{result.filePath}</code>
      {(result.warnings.length > 0 || missing.length > 0) ? (
        <div className="flex flex-col gap-0.5">
          {result.warnings.length > 0 ? <span className="text-body text-muted">{M.autoModeSetupWarnings.defaultMessage}</span> : null}
          {result.warnings.map((warning, index) => (
            <span className="text-body text-secondary break-words" key={index}>{warning}</span>
          ))}
          {missing.length > 0 ? (
            <>
              <span className="text-body text-secondary">
                {M.autoModeSetupAllowNotFound.defaultMessage.replace("{count}", String(missing.length))}
              </span>
              {missing.map((entry, index) => (
                <code className="text-code text-secondary whitespace-pre-wrap" key={index}>{entry}</code>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
      <button
        aria-expanded={open}
        className="relative group/tool flex self-start max-w-full items-center py-0 gap-1 text-left bg-transparent border-0 p-0"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="text-body text-muted">{open ? M.hideDetails.defaultMessage : M.showDetails.defaultMessage}</span>
      </button>
      {open ? <pre className="text-code text-muted whitespace-pre-wrap break-words m-0">{item.raw}</pre> : null}
    </div>
  );
}

/** Official zX — null unless prompt_injection_risk. */
function OfficialZxStopWarning({ item }: { item: Extract<OfficialKbNoticeItem, { kind: "stop_warning" }> }) {
  if (item.stopReason !== "prompt_injection_risk") return null;
  return (
    <div className={`flex flex-col gap-0.5 ${Wf}`} data-official-source="cd5a31703-B4nKQMBN.js:zX xmXPKqaNPZ">
      <span className="text-body-semibold text-primary">{M.stopWarningInjection.defaultMessage}</span>
    </div>
  );
}

/** Official VZe → ap.Step (`Nj` style). */
function OfficialVzeContextCleared() {
  return (
    <OfficialTurnStatusStep
      findOmitted
      label={M.contextCleared.defaultMessage}
      source="cd5a31703-B4nKQMBN.js:VZe 88OlIQOrZj"
      state="done"
    />
  );
}

/** Official MX. */
function OfficialMxGapFillFailed({ sessionId }: { sessionId?: string }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const copy = M.gapFillFailed.defaultMessage.split("<a>");
  const after = copy[1]?.split("</a>") ?? [];
  return (
    <div className={`flex items-center text-body text-muted select-none ${Wf}`} data-official-source="cd5a31703-B4nKQMBN.js:MX Gd19zJfyPn">
      <span>
        {copy[0]}
        <button
          className="bg-transparent border-0 p-0 m-0 text-inherit underline cursor-pointer"
          onClick={() => { if (sessionId) void actions?.reload(); }}
          type="button"
        >
          {after[0] ?? "reload"}
        </button>
        {after[1] ?? ""}
      </span>
    </div>
  );
}

/** Official LX (last entry) / PX (history step). */
function OfficialPromptBlocked({
  isLastEntry,
  item,
}: {
  isLastEntry?: boolean;
  item: Extract<OfficialKbNoticeItem, { kind: "prompt_blocked" }>;
}) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const [edited, setEdited] = useState(false);
  const reason = item.reason.trim();
  if (!isLastEntry) {
    return (
      <OfficialTurnStatusStep
        label={M.promptBlockedStep.defaultMessage}
        source="cd5a31703-B4nKQMBN.js:PX 2xRJ11ITc6"
        state="done"
      >
        {reason || undefined}
      </OfficialTurnStatusStep>
    );
  }
  const canEdit = Boolean(item.originalPrompt && actions?.setComposerText && !edited);
  return (
    <div className={`flex flex-col gap-0.5 ${Wf}`} data-official-source="cd5a31703-B4nKQMBN.js:LX VkMeXWpsli">
      <span className="text-body-semibold text-primary">{M.promptBlockedHeadline.defaultMessage}</span>
      <span className="text-body text-secondary">{reason || M.promptBlockedHint.defaultMessage}</span>
      {canEdit ? (
        <OfficialButton
          onClick={() => {
            actions?.setComposerText?.(item.originalPrompt ?? "");
            setEdited(true);
          }}
          size="base"
          variant="primary"
        >
          {M.editPrompt.defaultMessage}
        </OfficialButton>
      ) : null}
    </div>
  );
}

/** Official NX — catalog-gated (`KZe`). */
function OfficialNxPeerHold({ item }: { item: Extract<OfficialKbNoticeItem, { kind: "peerHold" }> }) {
  const causeText = item.state === "released" ? undefined : officialPeerHoldCauseDefaultMessage(item.cause);
  const origin: ReactNode = item.name ?? item.from;
  return (
    <div
      className="flex w-full flex-col gap-1 rounded-lg border border-dashed border-alpha-2 p-sm text-secondary"
      data-find-omitted=""
      data-official-source={`cd5a31703-B4nKQMBN.js:NX ${officialPeerHoldStateMessageId(item)}${officialPeerHoldCauseMessageId(item.cause) ? ` ${officialPeerHoldCauseMessageId(item.cause)}` : ""}`}
    >
      <div className="flex items-start gap-1 text-body">
        <Icon className="mt-0.5 shrink-0" name={item.state === "dropped" ? "ChatDelete" : "Clock"} size="sm" />
        <span className="min-w-0 break-words">
          {officialPeerHoldStateDefaultMessage(item)}
          <span className="text-muted">
            {" · "}
            <bdi>{origin}</bdi>
          </span>
        </span>
      </div>
      {causeText ? <p className="text-caption text-muted">{causeText}</p> : null}
    </div>
  );
}
