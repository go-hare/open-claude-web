import { motion } from "motion/react";
import type { CoworkContentBlock, CoworkMessageChain } from "./coworkMessageModel";
import { CoworkAssistantBlocks } from "./CoworkAssistantBlocks";
import { CoworkMessageActions } from "./CoworkMessageActions";
import { coworkMessageSummary } from "./coworkMessageSummary";
import { useRegisterCoworkAskUserQuestion } from "../../composer/CoworkAskUserQuestionContext";

export function CoworkAssistantMessage({ chain, conversationIsStreaming, isLastMessage }: { chain: CoworkMessageChain; conversationIsStreaming: boolean; isLastMessage: boolean }) {
  // Official live ownership: chain.isStreaming is streamingMessageId match (api id / uuid).
  // Prefer stream tail over displayMessage merge while this chain or conversation is live.
  const livePaint = chain.isStreaming || (conversationIsStreaming && isLastMessage);
  const message = livePaint
    ? (chain.messages[chain.messages.length - 1] ?? chain.displayMessage ?? chain.messages[0])
    : (chain.displayMessage ?? chain.messages[0]);
  if (!message) return null;
  const blocks = message.content;
  useRegisterCoworkAskUserQuestion(blocks, isLastMessage);
  const isThisMessageStreaming = chain.isStreaming || (isLastMessage && conversationIsStreaming);
  if (!blocks[0]) return null;
  const copyText = blocks.flatMap(blockText).join("\n");
  const summary = isThisMessageStreaming ? "" : coworkMessageSummary(blocks);
  const bubbleMotion = conversationIsStreaming
    ? { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { damping: 10, stiffness: 100, type: "spring" as const } }
    : { initial: false as const, animate: { opacity: 1, y: 0 } };
  const groupMotion = conversationIsStreaming
    ? { initial: { height: "0px", opacity: 0 }, animate: { height: "auto", opacity: 1 }, transition: { duration: 0.1, ease: "linear" as const } }
    : { initial: false as const, animate: { opacity: 1, y: 0 } };
  return (
    <motion.div {...groupMotion} className="group" style={{ height: "auto" }}>
      <motion.div {...bubbleMotion} className="group relative pb-3" data-is-streaming={isThisMessageStreaming}>
        {summary ? <h2 className="sr-only">Claude responded: {summary}</h2> : null}
        <div className="font-claude-response relative leading-[1.65rem] [&_pre>div]:bg-bg-000/50 [&_pre>div]:border-0.5 [&_pre>div]:border-border-400 [&_.ignore-pre-bg>div]:bg-transparent [&_.standard-markdown_:is(p,blockquote,h1,h2,h3,h4,h5,h6)]:pl-2 [&_.standard-markdown_:is(p,blockquote,ul,ol,h1,h2,h3,h4,h5,h6)]:pr-8 [&_.progressive-markdown_:is(p,blockquote,h1,h2,h3,h4,h5,h6)]:pl-2 [&_.progressive-markdown_:is(p,blockquote,ul,ol,h1,h2,h3,h4,h5,h6)]:pr-8">
          <CoworkAssistantBlocks blocks={blocks} isStreaming={conversationIsStreaming} isThisMessageStreaming={isThisMessageStreaming} message={message} />
        </div>
      </motion.div>
      <CoworkMessageActions isAssistant isLastMessage={isLastMessage} isStreaming={isThisMessageStreaming} messageUuid={chain.lastMessageUuid} text={copyText} />
    </motion.div>
  );
}

function blockText(block: CoworkContentBlock) {
  if (block.type === "text") return [block.text ?? ""];
  if (block.type === "connector_text") return [block.connector_text ?? ""];
  return [];
}
