import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";

type CoworkConversationBottomSpacerProps = {
  composerRef: RefObject<HTMLDivElement | null>;
  extrasRef: RefObject<HTMLDivElement | null>;
  lastAssistantMessageRef: RefObject<HTMLDivElement | null>;
  lastHumanMessageRef: RefObject<HTMLDivElement | null>;
  messageCount: number;
  scrollRef: RefObject<HTMLDivElement | null>;
};

export function CoworkConversationBottomSpacer(props: CoworkConversationBottomSpacerProps) {
  const extraSpaceRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCount = useRef(props.messageCount);
  const updateHeight = useCallback(() => setOfficialExtraSpaceHeight(props, extraSpaceRef.current), [props]);

  useLayoutEffect(() => {
    if (props.messageCount > previousMessageCount.current) {
      updateHeight();
      props.scrollRef.current?.scrollTo({ behavior: "smooth", top: props.scrollRef.current.scrollHeight });
    }
    previousMessageCount.current = props.messageCount;
  }, [props.messageCount, props.scrollRef, updateHeight]);

  useLayoutEffect(() => observeOfficialSpacerInputs(props, updateHeight), [props, updateHeight]);
  return <div aria-hidden="true" ref={extraSpaceRef} />;
}

function setOfficialExtraSpaceHeight(
  props: CoworkConversationBottomSpacerProps,
  target: HTMLDivElement | null,
) {
  if (!target) return;
  const assistantHeight = props.lastAssistantMessageRef.current?.clientHeight ?? 0;
  const humanHeight = props.lastHumanMessageRef.current?.clientHeight ?? 0;
  const composerHeight = props.composerRef.current?.clientHeight ?? 0;
  const extrasHeight = props.extrasRef.current?.clientHeight ?? 0;
  const containerHeight = props.scrollRef.current?.clientHeight ?? window.innerHeight;
  const height = Math.max(containerHeight - humanHeight - assistantHeight - composerHeight - extrasHeight - 98, 0);
  target.style.height = `${height}px`;
}

function observeOfficialSpacerInputs(
  props: CoworkConversationBottomSpacerProps,
  updateHeight: () => void,
) {
  const observer = new ResizeObserver(updateHeight);
  const targets = [
    props.lastAssistantMessageRef.current,
    props.lastHumanMessageRef.current,
    props.composerRef.current,
    props.extrasRef.current,
    props.scrollRef.current,
  ];
  targets.forEach((target) => { if (target) observer.observe(target); });
  window.addEventListener("resize", updateHeight);
  updateHeight();
  return () => {
    observer.disconnect();
    window.removeEventListener("resize", updateHeight);
  };
}
