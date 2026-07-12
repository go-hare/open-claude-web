import { memo, type ReactNode } from "react";
import { CoworkToolBadge } from "./CoworkToolPresentation";
import { CoworkToolRow, type CoworkToolRenderMode } from "./CoworkToolRow";

type CoworkFileEditToolRowProps = {
  addedLines: number;
  fileName?: string;
  handleClick?: () => void;
  icon: ReactNode;
  isFirstBlockOfMessage?: boolean;
  isFirstItemInGroup?: boolean;
  isLastBlockOfMessage?: boolean;
  isLastItemInGroup?: boolean;
  isStreaming: boolean;
  removedLines: number;
  renderMode?: CoworkToolRenderMode;
  text: ReactNode;
};

export const CoworkFileEditToolRow = memo(function CoworkFileEditToolRow(props: CoworkFileEditToolRowProps) {
  const showDiff = (props.addedLines > 0 || props.removedLines > 0) && !props.isStreaming;
  return (
    <CoworkToolRow
      handleClick={props.handleClick}
      hideCaret
      icon={props.icon}
      isFirstBlockOfMessage={props.isFirstBlockOfMessage}
      isFirstItemInGroup={props.isFirstItemInGroup}
      isLastBlockOfMessage={props.isLastBlockOfMessage}
      isLastItemInGroup={props.isLastItemInGroup}
      isStreaming={props.isStreaming}
      renderMode={props.renderMode}
      text={<span className="truncate">{props.text}</span>}
    >
      {props.fileName || showDiff ? <FileEditDetails {...props} showDiff={showDiff} /> : null}
    </CoworkToolRow>
  );
});

function FileEditDetails(props: CoworkFileEditToolRowProps & { showDiff: boolean }) {
  return (
    <div className="mx-2.5 mt-1 flex items-center gap-2">
      {props.fileName ? <button className="flex items-center cursor-pointer transition-colors text-text-500 hover:text-text-200" onClick={props.handleClick}><CoworkToolBadge className="!text-inherit">{props.fileName}</CoworkToolBadge></button> : null}
      {props.showDiff ? (
        <span className="flex items-center gap-1.5 text-xs font-mono leading-none">
          {props.addedLines > 0 ? <span className="text-forest-green">+{props.addedLines}</span> : null}
          {props.removedLines > 0 ? <span className="text-danger-000">-{props.removedLines}</span> : null}
        </span>
      ) : null}
    </div>
  );
}
