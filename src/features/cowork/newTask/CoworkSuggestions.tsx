import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { Icon } from "../../../shell/icons";
import {
  clearLegacyCoworkSuggestionsHiddenKey,
  dismissCoworkSuggestions,
  isCoworkSuggestionsDismissed,
  useCoworkNewTaskText,
  type CoworkNewTaskText,
} from "./coworkNewTaskMessages";
import {
  DataSuggestionThumbnail,
  InboxSuggestionThumbnail,
  OrganizeSuggestionThumbnail,
  PrepSuggestionThumbnail,
} from "./CoworkSuggestionThumbnails";

export type CoworkPromptSuggestion = {
  id: string;
  label: string;
  prompt: string;
  thumbnail: ComponentType;
  systemFolder?: "desktop" | "downloads";
};

type SuggestionCategory = {
  id: string;
  name: string;
  prompts: CoworkPromptSuggestion[];
};

/**
 * Official s6t catalog (~265540) built from Q5t/X5t/J5t/e6t/t6t message ids.
 */
export function buildCoworkSuggestionCategories(text: CoworkNewTaskText): SuggestionCategory[] {
  return [
    {
      id: "initial",
      name: text.initialName,
      prompts: [
        { id: "initial-1", label: text.label1, prompt: text.prompt1, thumbnail: PrepSuggestionThumbnail },
        {
          id: "initial-2",
          label: text.label2,
          prompt: text.prompt2,
          thumbnail: OrganizeSuggestionThumbnail,
          systemFolder: "desktop",
        },
        { id: "initial-3", label: text.label3, prompt: text.prompt3, thumbnail: DataSuggestionThumbnail },
      ],
    },
    {
      id: "organize",
      name: text.organizeName,
      prompts: [
        {
          id: "organize-downloads",
          label: text.downloadsLabel,
          prompt: text.downloadsPrompt,
          thumbnail: OrganizeSuggestionThumbnail,
          systemFolder: "downloads",
        },
        {
          id: "organize-photos",
          label: text.photosLabel,
          prompt: text.photosPrompt,
          thumbnail: OrganizeSuggestionThumbnail,
        },
        {
          id: "organize-inbox",
          label: text.inboxLabel,
          prompt: text.inboxPrompt,
          thumbnail: InboxSuggestionThumbnail,
        },
      ],
    },
    {
      id: "prep",
      name: text.prepName,
      prompts: [
        { id: "prep-meeting", label: text.meetingLabel, prompt: text.meetingPrompt, thumbnail: PrepSuggestionThumbnail },
        { id: "prep-vacation", label: text.vacationLabel, prompt: text.vacationPrompt, thumbnail: PrepSuggestionThumbnail },
        {
          id: "prep-interview",
          label: text.interviewLabel,
          prompt: text.interviewPrompt,
          thumbnail: PrepSuggestionThumbnail,
        },
      ],
    },
    {
      id: "data",
      name: text.dataName,
      prompts: [
        { id: "data-slack", label: text.slackLabel, prompt: text.slackPrompt, thumbnail: InboxSuggestionThumbnail },
        {
          id: "data-voice-memos",
          label: text.voiceMemosLabel,
          prompt: text.voiceMemosPrompt,
          thumbnail: DataSuggestionThumbnail,
        },
        {
          id: "data-spreadsheet",
          label: text.spreadsheetLabel,
          prompt: text.spreadsheetPrompt,
          thumbnail: DataSuggestionThumbnail,
        },
      ],
    },
  ];
}

/**
 * Official r6t (~265681): shuffle categories, hide, n6t rows, Customize with plugins.
 * Plugin-skills branch (a6t) requires host plugin catalog; static s6t is the default surface.
 */
export function CoworkSuggestions({
  onSelect,
  onCustomizeWithPlugins,
}: {
  onSelect: (suggestion: CoworkPromptSuggestion) => void;
  onCustomizeWithPlugins?: () => void;
}) {
  const text = useCoworkNewTaskText();
  const categories = useMemo(() => buildCoworkSuggestionCategories(text), [text]);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    clearLegacyCoworkSuggestionsHiddenKey();
    setHidden(isCoworkSuggestionsDismissed());
  }, []);

  const category = categories[categoryIndex] ?? categories[0];

  const shuffle = useCallback(() => {
    setCategoryIndex((current) => (current + 1) % categories.length);
  }, [categories.length]);

  const hide = useCallback(() => {
    dismissCoworkSuggestions();
    setHidden(true);
  }, []);

  if (hidden || !category) return null;

  return (
    <section
      className="w-full max-w-2xl mt-8 group/suggestions"
      data-official-source="index-BELzQL5P.js:r6t/n6t suggestion list"
    >
      <div className="flex items-center justify-between mb-2 px-2">
        <button
          className="flex items-center gap-2 font-small text-text-500 hover:text-text-100 transition-colors"
          onClick={shuffle}
          type="button"
        >
          <Icon name="Shuffle" customSize={20} />
          <span>{category.name}</span>
        </button>
        <button
          aria-label={text.hideSuggestions}
          className="text-text-500 hover:text-text-200 transition-colors opacity-0 group-hover/suggestions:opacity-100 border-0 bg-transparent p-0 cursor-default"
          onClick={hide}
          type="button"
        >
          <Icon name="X" customSize={16} />
        </button>
      </div>
      <div className="flex flex-col [&>button:hover+hr]:opacity-0 [&>hr:has(+button:hover)]:opacity-0">
        {category.prompts.map((suggestion, index) => (
          <SuggestionRow
            isLast={index === category.prompts.length - 1}
            key={suggestion.id}
            onSelect={onSelect}
            suggestion={suggestion}
          />
        ))}
      </div>
      <button
        className="font-small text-text-500 hover:text-text-300 transition-colors mt-1 ml-2 border-0 bg-transparent p-0 !text-text-500"
        onClick={onCustomizeWithPlugins}
        type="button"
      >
        {text.customizeWithPlugins}
      </button>
    </section>
  );
}

/** Official n6t (~265629): hover:bg-bg-300 + font-base label + caret. */
function SuggestionRow({
  isLast,
  onSelect,
  suggestion,
}: {
  isLast: boolean;
  onSelect: (suggestion: CoworkPromptSuggestion) => void;
  suggestion: CoworkPromptSuggestion;
}) {
  const Thumbnail = suggestion.thumbnail;
  return (
    <>
      <button
        className="w-full flex items-center gap-3 px-2 py-3 transition-colors hover:bg-bg-300 hover:rounded-lg group text-left"
        onClick={() => onSelect(suggestion)}
        type="button"
      >
        <span className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
          <Thumbnail />
        </span>
        <span className="flex-1 min-w-0">
          <span className="font-base text-text-200">{suggestion.label}</span>
        </span>
        <Icon name="CaretRight" customSize={16} className="hidden group-hover:block flex-shrink-0 text-text-500" />
      </button>
      {!isLast ? <hr className="border-t-0.5 border-border-300 mx-2 transition-opacity" /> : null}
    </>
  );
}

