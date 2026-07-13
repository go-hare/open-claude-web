import { useMemo } from "react";
import {
  type I18nMessages,
  type MessageDescriptor,
  useCurrentLocale,
  useI18nMessages,
} from "../../../i18n/footerMenuMessages";

/**
 * Official index-BELzQL5P message descriptors for /task/new:
 * y6t header variants, v6t safety/feedback, r6t/s6t suggestion catalog, XLcM6WHfQR placeholder.
 */
export const COWORK_NEW_TASK_MESSAGES = {
  headerControl: { defaultMessage: "Let's knock something off your list", id: "CJsWpnmYD4" },
  headerV1: { defaultMessage: "What can I take off your plate?", id: "mWPGSbK6BB" },
  headerV2: { defaultMessage: "What's on your plate today?", id: "tO7KIDqgLQ" },
  headerV3: { defaultMessage: "Let's tackle something together", id: "9B9oxKzS23" },
  learnSafely: { defaultMessage: "Learn how to use Cowork safely", id: "Cxr7ieOSct" },
  giveFeedback: { defaultMessage: "give us feedback", id: "ocNaWcgW5X" },
  safetyOrFeedback: { defaultMessage: "{learnSafely} or {giveFeedback}.", id: "e90tCrG7ls" },
  hideSuggestions: { defaultMessage: "Hide suggestions", id: "8/jokSbxkH" },
  customizeWithPlugins: { defaultMessage: "Customize with plugins", id: "i2yl4bVuRw" },
  composerPlaceholder: { defaultMessage: "How can I help you today?", id: "XLcM6WHfQR" },
  initialName: { defaultMessage: "Pick a task, any task", id: "OnaQpdV9zK" },
  organizeName: { defaultMessage: "Tidy up and get organized", id: "Wi8J5SkAVq" },
  prepName: { defaultMessage: "Plan for what's ahead", id: "huISnRRpZW" },
  dataName: { defaultMessage: "Turn messy data into action", id: "CiHCdg7mGP" },
  label1: { defaultMessage: "Optimize my week", id: "ov1AuKcjep" },
  prompt1: {
    defaultMessage:
      "Help me plan and optimize my week. I have my Google Calendar open and ready for you to review and edit.\n\nFirst, review my calendar and show me a summary:\n- Total meetings\n- Busiest days\n- Where I have gaps of 2+ hours\n\nBefore proposing changes, ask me about:\n- What I'm trying to accomplish this week\n- How much focus time I need and for what\n- Any deadlines or commitments not on my calendar\n- Which types of meetings I should decline or shorten\n- Personal commitments or boundaries I want to protect\n\nThen show me your top 3-5 proposed changes with explanations:\n- Focus blocks to add\n- Meetings to decline or reschedule\n- Time conflicts to resolve\n\nStart with the highest-impact changes first. Once I approve each change, make the edits directly in my calendar one at a time.",
    id: "/Vj7RXZdgy",
  },
  label2: { defaultMessage: "Organize my screenshots", id: "R9OYtL0hxN" },
  prompt2: {
    defaultMessage:
      "Help me organize recent screenshots on my Desktop.\n\nFirst, scan my Desktop and count how many screenshots/images are there. Show me:\n- Total count\n- Date range (oldest to newest)\n\nThen, focus only on screenshots from the last 14 days. For each one:\n- Identify what it shows\n- Suggest a descriptive filename\n- Propose which folder it belongs in (or if it can be deleted)\n\nGroup similar screenshots together. Show me the plan before making any changes.\n\nAfter I approve, start by organizing just 10 files as a preview. If there are more than 10 files, check in with me before continuing with the rest.",
    id: "gf8CwL7i2S",
  },
  label3: { defaultMessage: "Find insights in files", id: "JDTaxC6dOy" },
  prompt3: {
    defaultMessage:
      "Help me find patterns and insights across [my voice memos / meeting transcripts / documents / journal entries / specify folder]. I have messy, unstructured files and want to understand what themes are emerging.\n\nFirst, scan the folder and show me a summary:\n- Total files\n- Date range (oldest to newest)\n- Types of content\n\nBefore analyzing, ask me:\n- What I'm hoping to discover (recurring themes, contradictions, evolution of thinking, action items, or something else)\n- Whether certain files or time periods should be prioritized\n- What format would be most useful for the final analysis\n\nIf there are more than 20 files, start by analyzing just the 10 most recent files.\n\nShow me the top 3-5 patterns you found with 2-3 specific examples for each pattern. Once I confirm you're on the right track, analyze the remaining files.",
    id: "ngR3ofl7vO",
  },
  downloadsLabel: { defaultMessage: "Clean up my Downloads folder", id: "+jEI/ChslN" },
  downloadsPrompt: {
    defaultMessage:
      "Help me organize my Downloads folder.\n\nFirst, scan and show me a summary:\n- Total files and total size\n- Files older than 30 days\n- Largest files taking up space\n\nBefore organizing, ask me:\n- What categories or folder structure would be most useful\n- Whether I want to delete or archive old files\n- If there are specific file types I want to prioritize (documents, images, installers, etc.)\n\nThen focus only on files older than 30 days first. Show me a proposed plan for these old files:\n- Categories to create\n- Files to delete (installers, duplicates, temp files)\n- Files to keep with where they should go\n\nAfter I approve, organize the first 15 old files as a preview. If there are more files, check in before continuing.",
    id: "rwHbOEDVZV",
  },
  photosLabel: { defaultMessage: "Organize photos by event/date", id: "MHWdx0dF9s" },
  photosPrompt: {
    defaultMessage:
      "Help me organize photos on my [Desktop/Downloads/specify location].\n\nFirst, scan the folder and show me a summary:\n- Total photos\n- Date range (oldest to newest)\n- Rough size breakdown\n\nBefore organizing, ask me:\n- How I'd like them organized (by date, by event, by person)\n- Whether there are specific events or time periods I should know about\n- What folder structure would work best\n- If any photos can be deleted (duplicates, blurry ones, screenshots)\n\nFocus only on photos from the last 3 months first. Show me a proposed plan with examples from 3-4 different groups so I can show you how I'd organize them.\n\nAfter I approve, organize just 20 photos as a preview. If there are more than 20, check in before continuing with the rest.",
    id: "rXROk0l84T",
  },
  inboxLabel: { defaultMessage: "Organize my inbox", id: "ZIlEIwm/xI" },
  inboxPrompt: {
    defaultMessage:
      "Help me organize and clean up my email inbox.\n\nFirst, scan my inbox and show me a summary:\n- Total unread emails\n- Emails older than 30 days\n- The main senders or types of emails\n\nBefore organizing, ask me:\n- What categories or folders I want to create\n- Which types of emails I want to archive or delete\n- Whether there are specific senders I want to prioritize or filter\n- Any email patterns I want to address (newsletters, promotions, etc.)\n\nFocus only on emails older than 30 days first — these are easiest to clean up. Show me a proposed plan:\n- Which emails to archive\n- Which to delete\n- Which need action\n\nIf there are more than 50 old emails, start with a batch of 20 so I can check your approach. Once I approve, process that batch.",
    id: "uSagFPkSjM",
  },
  meetingLabel: { defaultMessage: "Prep for my next meeting", id: "QHlNmNrDvS" },
  meetingPrompt: {
    defaultMessage:
      "I have a meeting with [a company] [tomorrow].\n\nBefore researching, ask me:\n- What the meeting is about\n- What I already know about them\n- What I'm trying to accomplish\n- What would be most useful to know going in\n\nThen research them and show me what you found:\n- Company overview\n- Recent news (last 3 months)\n- Key people I'll be meeting with\n- Their LinkedIn for recent updates\n\nShow me an outline of the one-pager with the 3-5 most important points before writing the full doc. Once I approve, create the final one-pager.",
    id: "HosOBTy/Wg",
  },
  vacationLabel: { defaultMessage: "Plan my next vacation", id: "25FqIz63Gl" },
  vacationPrompt: {
    defaultMessage:
      "Help me plan my next vacation.\n\nBefore researching, ask me:\n- Where I'm thinking of going (or if I'm open to suggestions)\n- When I want to travel and for how long\n- What my budget is\n- What kind of trip I'm looking for (relaxing, adventure, cultural, food-focused, etc.)\n\nThen research the top 3 destinations that fit my criteria and show me a comparison:\n- Estimated costs\n- Best time to visit\n- What makes each unique\n\nOnce I pick my top choice, research that destination in detail:\n- Check current flight prices\n- Find 3-4 accommodation options\n- Suggest a day-by-day outline\n\nShow me this proposed itinerary with estimated costs before creating the final trip plan.",
    id: "9issISabm4",
  },
  interviewLabel: { defaultMessage: "Prepare for a job interview", id: "ZZs+9RvBit" },
  interviewPrompt: {
    defaultMessage:
      "I have a job interview coming up for [role] at [company].\n\nBefore researching, ask me:\n- What the role is and what level\n- What I already know about the company\n- What I'm most nervous or uncertain about\n- If I have the job description or any interview details\n\nThen research the company and role, and show me what I found:\n- Company overview and recent news (last 6 months)\n- What this role typically involves\n- Common interview questions for this type of role\n- The interview team on LinkedIn (if you have names)\n\nShow me an outline covering these 3-5 topics before creating the full prep doc:\n- Key points about the company to mention\n- How my background connects to what they need\n- Questions I should ask them\n- 3-4 likely interview questions with suggested talking points\n\nOnce I approve, create a complete interview prep guide I can review before the interview.",
    id: "vt+a1pHvM2",
  },
  slackLabel: { defaultMessage: "Catch me up on Slack", id: "d9nxSkZHNk" },
  slackPrompt: {
    defaultMessage:
      "Help me catch up on what I've missed in Slack.\n\nBefore reading, ask me:\n- Which channels or DMs I should focus on (or check everything)\n- How far back to look (since yesterday, last week, specific date)\n- What I'm most concerned about missing (decisions, @mentions, urgent items, project updates)\n- Whether there are specific topics or people to prioritize\n\nThen scan those channels and show me a summary:\n- Total unread messages\n- Breakdown by channel\n\nFocus on messages that @mention me, contain decisions, or are marked urgent first.\n\nShow me the top 5 most important updates with context and links to the threads. If there are more than 30 unread messages total, start with these top 5 and ask if you should summarize more.",
    id: "Eh09EeUbeR",
  },
  voiceMemosLabel: { defaultMessage: "Turn voice memos into a doc", id: "a98wK30fJF" },
  voiceMemosPrompt: {
    defaultMessage:
      "Help me turn my voice memos into an organized document. I have [voice memos / audio recordings] in [specify location] that I want transcribed and organized.\n\nFirst, scan the folder and show me:\n- How many audio files\n- Total duration\n- Date range\n\nBefore transcribing, ask me:\n- What these recordings are about\n- How I'd like them organized (chronologically, by topic, by theme)\n- Whether I want verbatim transcripts or cleaned-up summaries\n- What the final document should be (meeting notes, journal entries, ideas list, etc.)\n\nIf there are more than 5 recordings, start by transcribing just the 3 most recent ones. Show me the transcribed content and proposed organization structure.\n\nOnce I approve the approach, transcribe and organize the remaining recordings.",
    id: "YScEGrvNsl",
  },
  spreadsheetLabel: { defaultMessage: "Pull data into a spreadsheet", id: "qgNJFeupXW" },
  spreadsheetPrompt: {
    defaultMessage:
      "I'm on a page with [job listings / products / directory entries] I want to extract.\n\nFirst, scan the page and show me what you see:\n- How many items total\n- What fields are available (title, price, location, description, etc.)\n\nBefore extracting, ask me:\n- Which fields I want in the spreadsheet\n- If there are any I should skip\n\nThen show me a preview with the first 3-5 items extracted so I can confirm the format looks right.\n\nIf there are more than 20 items on this page, extract them in batches of 10. If there are multiple pages, just do the first page and check with you before continuing.",
    id: "hq2LzVH7rz",
  },
} as const satisfies Record<string, MessageDescriptor>;

export type CoworkNewTaskText = Record<keyof typeof COWORK_NEW_TASK_MESSAGES, string>;
export type CoworkHeaderVariant = "control" | "v1" | "v2" | "v3";

/** Official Nd("cash-cowork_page_header", "variant", "control", h6t) default. */
export const DEFAULT_COWORK_HEADER_VARIANT: CoworkHeaderVariant = "control";

export const COWORK_SUGGESTIONS_DISMISS_KEY = "cowork-suggestions";
export const COWORK_SUPPORT_URL = "https://support.claude.com/en/articles/13364135-use-claude-cowork-safely";
export const COWORK_FEEDBACK_URL = "https://anthropic.qualtrics.com/jfe/form/SV_a4v19ZDkO7RaVNQ";

export function useCoworkNewTaskText(): CoworkNewTaskText {
  const locale = useCurrentLocale();
  const messages = useI18nMessages(locale);
  return useMemo(() => buildCoworkNewTaskText(messages ?? {}), [messages]);
}

export function buildCoworkNewTaskText(messages: I18nMessages): CoworkNewTaskText {
  return Object.fromEntries(
    Object.entries(COWORK_NEW_TASK_MESSAGES).map(([key, descriptor]) => [
      key,
      messages[descriptor.id] ?? descriptor.defaultMessage,
    ]),
  ) as CoworkNewTaskText;
}

export function resolveCoworkHeaderTitle(
  text: CoworkNewTaskText,
  variant: CoworkHeaderVariant = DEFAULT_COWORK_HEADER_VARIANT,
): string {
  switch (variant) {
    case "v1":
      return text.headerV1;
    case "v2":
      return text.headerV2;
    case "v3":
      return text.headerV3;
    case "control":
    default:
      return text.headerControl;
  }
}

export function isCoworkSuggestionsDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(COWORK_SUGGESTIONS_DISMISS_KEY);
    if (!raw) return false;
    if (raw === "1" || raw === "true") return true;
    const parsed = JSON.parse(raw) as unknown;
    return parsed === true || (typeof parsed === "object" && parsed !== null && "dismissed" in parsed);
  } catch {
    return false;
  }
}

export function dismissCoworkSuggestions(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COWORK_SUGGESTIONS_DISMISS_KEY, "1");
  // Official r6t also clears the legacy key on mount.
  window.localStorage.removeItem("cowork-suggestions-hidden");
}

export function clearLegacyCoworkSuggestionsHiddenKey(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("cowork-suggestions-hidden");
}
