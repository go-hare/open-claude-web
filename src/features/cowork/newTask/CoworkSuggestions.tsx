import { type ReactNode } from "react";
import { Icon } from "../../../shell/icons";

export type CoworkPromptSuggestion = {
  id: string;
  label: string;
  prompt: string;
  icon: ReactNode;
};

const coworkSuggestions: CoworkPromptSuggestion[] = [
  {
    id: "initial-1",
    label: "优化我的一周",
    prompt: `帮我规划并优化这一周。我已经打开日历，准备让你查看和编辑。\n\n先查看我的日历并总结：\n- 会议总数\n- 最忙的日期\n- 哪些地方有 2 小时以上的空档\n\n在提出调整前，先问我本周目标、需要多少专注时间、是否有日历外截止日期、哪些会议可拒绝或缩短，以及要保护的个人边界。`,
    icon: <SuggestionCalendarIcon />,
  },
  {
    id: "initial-2",
    label: "整理我的截图",
    prompt: `帮我整理桌面上最近的截图。\n\n先扫描桌面并告诉我：\n- 截图或图片总数\n- 日期范围\n\n然后只处理最近 14 天的截图，识别内容、建议描述性文件名，并提出应放入的文件夹或可删除项。先给我计划，等我确认后再整理前 10 个文件作为预览。`,
    icon: <SuggestionFolderIcon />,
  },
  {
    id: "initial-3",
    label: "从文件中发现洞察",
    prompt: `帮我从一组文件里发现模式和洞察。\n\n先扫描文件夹并总结：\n- 文件总数\n- 日期范围\n- 内容类型\n\n分析前先问我希望发现什么、应优先哪些文件或时间段、最终输出什么格式。先找出 3-5 个模式，每个模式给 2-3 个具体例子。`,
    icon: <SuggestionDataIcon />,
  },
];

export function CoworkSuggestions({ onSelect }: { onSelect: (suggestion: CoworkPromptSuggestion) => void }) {
  return (
    <section className="w-full max-w-2xl mt-8 group/suggestions">
      <SuggestionHeader />
      <div className="flex flex-col [&>button:hover+hr]:opacity-0 [&>hr:has(+button:hover)]:opacity-0">
        {coworkSuggestions.map((suggestion, index) => (
          <SuggestionRow
            isLast={index === coworkSuggestions.length - 1}
            key={suggestion.id}
            onSelect={onSelect}
            suggestion={suggestion}
          />
        ))}
      </div>
      <button
        className="font-small text-text-500 hover:text-text-300 transition-colors mt-2 ml-2 border-0 bg-transparent p-0 cursor-default"
        type="button"
      >
        用插件自定义
      </button>
    </section>
  );
}

function SuggestionHeader() {
  return (
    <div className="flex items-center justify-between mb-2 px-2">
      <button className="flex items-center gap-2 font-small text-text-500 hover:text-text-100 transition-colors" type="button">
        <Icon name="Shuffle" customSize={20} />
        <span>随便挑个任务开始吧</span>
      </button>
      <button
        aria-label="隐藏建议"
        className="text-text-500 hover:text-text-200 transition-colors opacity-0 group-hover/suggestions:opacity-100 border-0 bg-transparent p-0 cursor-default"
        type="button"
      >
        <Icon name="X" customSize={16} />
      </button>
    </div>
  );
}

function SuggestionRow({
  isLast,
  onSelect,
  suggestion,
}: {
  isLast: boolean;
  onSelect: (suggestion: CoworkPromptSuggestion) => void;
  suggestion: CoworkPromptSuggestion;
}) {
  return (
    <>
      <button
        className="w-full flex items-center gap-3 px-2 py-3 transition-colors hover:bg-bg-200 hover:rounded-lg group text-left"
        onClick={() => onSelect(suggestion)}
        type="button"
      >
        <span className="flex-shrink-0 w-10 h-10 flex items-center justify-center">{suggestion.icon}</span>
        <span className="flex-1 min-w-0"><span className="text-sm text-text-200">{suggestion.label}</span></span>
        <Icon name="CaretRight" customSize={16} className="hidden group-hover:block flex-shrink-0 text-text-500" />
      </button>
      {!isLast ? <hr className="border-t-0.5 border-border-300 mx-2 transition-opacity" /> : null}
    </>
  );
}

function SuggestionCalendarIcon() {
  return (
    <span className="inline-flex size-10 items-center justify-center rounded-r4 border-0.5 border-border-300 bg-bg-000 text-t6 shadow-sm">
      <Icon name="Calendar" customSize={24} />
    </span>
  );
}

function SuggestionFolderIcon() {
  return (
    <span className="inline-flex size-10 items-center justify-center rounded-r4 border-0.5 border-border-300 bg-bg-000 text-t6 shadow-sm">
      <Icon name="Folder" customSize={26} />
    </span>
  );
}

function SuggestionDataIcon() {
  return (
    <span className="inline-flex size-10 items-center justify-center rounded-r4 border-0.5 border-border-300 bg-bg-000 text-t6 shadow-sm">
      <Icon name="Spreadsheet" customSize={24} />
    </span>
  );
}
