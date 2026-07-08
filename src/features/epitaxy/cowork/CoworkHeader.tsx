const supportUrl = "https://support.claude.com/en/articles/13364135-use-claude-cowork-safely";
const feedbackUrl = "https://anthropic.qualtrics.com/jfe/form/SV_a4v19ZDkO7RaVNQ";
const officialHeaderTitle = "Let's knock something off your list";

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
    void feedbackBridge.openFeedbackWindow({ source: "agent_new_page", url: feedbackUrl });
    return;
  }
  window.open(feedbackUrl, "_blank", "noopener,noreferrer");
}

export function CoworkHeader() {
  return (
    <div className="mb-6 pl-2" data-official-source="index-BELzQL5P.js:v6t/y6t Cowork page header">
      <div className="flex items-start">
        <img
          alt=""
          aria-hidden="true"
          className="!w-7 -ml-10 mr-3 mt-1 shrink-0 hidden md:block"
          src="/assets/v1/cd02a42d9-Vq_H3mgS.svg"
        />
        <h1 className="font-claude-response-title text-text-100">{officialHeaderTitle}</h1>
      </div>
      <p className="font-small text-text-500 mt-2">
        <a className="underline-offset-2 hover:underline" href={supportUrl} rel="noreferrer" target="_blank">
          Learn how to use Cowork safely
        </a>
        {" "}
        or{" "}
        <button className="underline-offset-2 hover:underline" onClick={openCoworkFeedback} type="button">
          give us feedback
        </button>
        .
      </p>
    </div>
  );
}
