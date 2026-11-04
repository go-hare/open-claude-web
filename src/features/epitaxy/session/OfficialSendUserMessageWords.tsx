/**
 * Official SendUserMessage as-words body (ion-dist pin 2.31226.1).
 *
 * When `TH` is true (`cd5a31703-B4nKQMBN.js`), the SendUserMessage body is
 * user bubble words (`vH.user_message.rollUp = "as-words"`), not a Zg `ix` dump.
 * Coordinator paints this instead of generic dump when `isOfficialSendUserMessageAsWords`.
 *
 * Chrome copies live Code user-bubble exports (`oIe` / `Mz` / `UR`), not new CSS.
 */
import { type ReactNode } from "react";
import {
  officialUserBubbleProseClass,
  officialUserBubbleTextClass,
  officialUserMessageClass,
} from "../OfficialEpitaxyComponents";
import {
  isOfficialSendUserMessageAsWords,
  officialSendUserMessageText,
  type OfficialSendUserMessageToolLike,
} from "./officialSendUserMessage";

export function OfficialSendUserMessageWords({
  tool,
}: {
  tool: OfficialSendUserMessageToolLike;
}): ReactNode | null {
  if (!isOfficialSendUserMessageAsWords(tool)) return null;
  const text = officialSendUserMessageText(tool.input, tool.toolUseResult ?? tool.output);
  if (!text || text.trim().length === 0) return null;

  return (
    <div
      className="flex w-full flex-col min-w-0 ms-auto items-end"
      data-official-kind="send_to_user"
      data-official-source="cd5a31703-B4nKQMBN.js:TH/J0e send_to_user as-words"
    >
      <div className={`${officialUserMessageClass} max-w-[75%]`}>
        <div className={officialUserBubbleProseClass}>
          <p className={officialUserBubbleTextClass}>{text}</p>
        </div>
      </div>
    </div>
  );
}
