import { motion } from "motion/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CoworkMessageChain } from "./coworkMessageModel";
import { CoworkHumanAttachments, CoworkHumanImages } from "./CoworkHumanAttachments";
import { CoworkHumanMarkdown } from "./CoworkHumanMarkdown";
import { CoworkMessageActions } from "./CoworkMessageActions";
import { officialCoworkMessageText } from "./coworkMessageText";
import { summarizeCoworkText } from "./coworkMessageSummary";

export function CoworkHumanMessage({ chain, conversationIsStreaming, isLastMessage }: { chain: CoworkMessageChain; conversationIsStreaming: boolean; isLastMessage: boolean }) {
  const message = chain.displayMessage ?? chain.messages[0];
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [collapsible, setCollapsible] = useState(false);
  const textBlocks = useMemo(() => message.content.flatMap((block) => {
    if (block.type !== "text" || typeof block.text !== "string") return [];
    const text = officialCoworkMessageText(block.text);
    return text ? [{ ...block, text }] : [];
  }), [message.content]);
  const text = useMemo(() => textBlocks.map((block) => block.text).join("\n"), [textBlocks]);
  const summary = useMemo(() => summarizeCoworkText(text), [text]);

  useLayoutEffect(() => {
    if (contentRef.current) setCollapsible(contentRef.current.scrollHeight > 300);
  }, [text]);

  return (
    <div className="mb-1 mt-6 group">
      {summary ? <h2 className="sr-only">You said: {summary}</h2> : null}
      <CoworkHumanAttachments message={message} />
      <div className="flex flex-col items-end gap-1">
        <CoworkHumanImages blocks={message.content} />
        {textBlocks.length > 0 ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="group relative inline-flex gap-2 bg-bg-300 rounded-xl pl-2.5 py-2.5 break-words text-text-100 transition-all max-w-[75ch] flex-col !px-4 max-w-[85%]"
            data-user-message-bubble
            initial={conversationIsStreaming ? { opacity: 0, scale: 1.02 } : false}
            transition={conversationIsStreaming ? { duration: 0.3, ease: "easeOut" } : undefined}
          >
            <div className="flex flex-row gap-2 relative">
              <div className="flex-1">
                <div
                  className={`font-large !font-user-message grid grid-cols-1 gap-2 py-0.5 relative [&_ul]:!space-y-0 [&_ol]:!space-y-0 [&_ul]:pl-8 [&_ol]:pl-8 ${message.pending ? "text-text-500 animate-pulse" : ""}`}
                  data-testid="user-message"
                  ref={contentRef}
                  style={{ maxHeight: expanded || !collapsible ? "none" : "200px", overflow: "hidden", position: "relative" }}
                >
                  {textBlocks.map((block, index) => <CoworkHumanMarkdown key={`${message.uuid}-text-${index}`} text={block.text} />)}
                  {!expanded && collapsible ? <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-bg-300 to-transparent pointer-events-none" /> : null}
                </div>
                {collapsible ? <button className="pb-3 pt-1 text-xs text-text-500/80 hover:text-text-100 transition w-3/4 text-left rounded-lg" onClick={() => setExpanded((value) => !value)} type="button">{expanded ? "Show less" : "Show more"}</button> : null}
              </div>
            </div>
          </motion.div>
        ) : null}
        <CoworkMessageActions isLastMessage={isLastMessage} isStreaming={conversationIsStreaming} messageUuid={chain.lastMessageUuid} text={text} />
      </div>
    </div>
  );
}
