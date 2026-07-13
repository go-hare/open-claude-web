import {
  COWORK_FEEDBACK_URL,
  COWORK_SUPPORT_URL,
  DEFAULT_COWORK_HEADER_VARIANT,
  resolveCoworkHeaderTitle,
  useCoworkNewTaskText,
  type CoworkHeaderVariant,
} from "./coworkNewTaskMessages";

type AgentModeFeedbackBridge = {
  openFeedbackWindow?: (payload: {
    source: "agent_new_page";
    url: string;
  }) => Promise<unknown>;
};

function openCoworkFeedback() {
  const feedbackBridge = (window["claude.web"] as { AgentModeFeedback?: AgentModeFeedbackBridge } | undefined)
    ?.AgentModeFeedback;
  if (feedbackBridge?.openFeedbackWindow) {
    void feedbackBridge.openFeedbackWindow({ source: "agent_new_page", url: COWORK_FEEDBACK_URL });
    return;
  }
  window.open(COWORK_FEEDBACK_URL, "_blank", "noopener,noreferrer");
}

/**
 * Official v6t (~266619): Ace static + y6t title + safety/feedback subtitle (e90tCrG7ls).
 * Header variant from cash-cowork_page_header defaults to "control" (h6t).
 */
export function CoworkHeader({
  variant = DEFAULT_COWORK_HEADER_VARIANT,
}: {
  variant?: CoworkHeaderVariant;
}) {
  const text = useCoworkNewTaskText();
  const title = resolveCoworkHeaderTitle(text, variant);

  return (
    <div className="mb-6 pl-2" data-official-source="index-BELzQL5P.js:v6t/y6t Cowork page header">
      <div className="flex items-start">
        <img
          alt=""
          aria-hidden="true"
          className="!w-7 -ml-10 mr-3 mt-1 shrink-0 hidden md:block"
          src="/assets/v1/cd02a42d9-Vq_H3mgS.svg"
        />
        <h1 className="font-claude-response-title text-text-100">{title}</h1>
      </div>
      <p className="font-small text-text-500 mt-2">
        <a className="underline-offset-2 hover:underline" href={COWORK_SUPPORT_URL} rel="noreferrer" target="_blank">
          {text.learnSafely}
        </a>
        {" "}
        or{" "}
        <button className="underline-offset-2 hover:underline" onClick={openCoworkFeedback} type="button">
          {text.giveFeedback}
        </button>
        .
      </p>
    </div>
  );
}
