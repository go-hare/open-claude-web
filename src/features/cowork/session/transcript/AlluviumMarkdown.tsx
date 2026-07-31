/**
 * Official AlluviumMarkDown residual (`be` / `ye` / `ve` in c93fb40ec-C-L_NkHO.js).
 * className: alluvium-markdown + committed/frontier MemoizedBlock lists.
 * Block/inline classNames from official we / ye / je — no invented spacing CSS.
 */
import {
  memo,
  useMemo,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  AlluviumIncrementalEngine,
  type AlluviumBlock,
  type AlluviumInlineNode,
  type AlluviumSnapshot,
} from "./alluviumEngine";

export type AlluviumMarkdownProps = {
  className?: string;
  headingLevelOffset?: number;
  isStreaming?: boolean;
  onCodeDetected?: () => void;
  onLinkClick?: (event: MouseEvent<HTMLAnchorElement>, url: string) => void;
  onLinkDetected?: () => void;
  text: string;
};

const HEADING_CLASS: Record<number, string> = {
  1: "text-text-100 mt-3 -mb-1 text-[1.375rem] font-bold",
  2: "text-text-100 mt-3 -mb-1 text-[1.125rem] font-bold",
  3: "text-text-100 mt-2 -mb-1 text-base font-bold",
  4: "text-text-100 mt-2 -mb-1 text-base font-bold",
  5: "text-text-100 mt-2 -mb-1 text-sm font-bold",
  6: "text-text-100 mt-2 -mb-1 text-sm font-semibold",
};

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function sanitizeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("computer://") || url.startsWith("tel:")) return url;
  try {
    const parsed = new URL(url, "https://example.invalid");
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:") {
      return url;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function InlineNodes({
  handlers,
  nodes,
}: {
  handlers: {
    onLinkClick?: AlluviumMarkdownProps["onLinkClick"];
    onLinkDetected?: AlluviumMarkdownProps["onLinkDetected"];
  };
  nodes: AlluviumInlineNode[];
}) {
  return (
    <>
      {nodes.map((node, index) => (
        <InlineNode handlers={handlers} key={index} node={node} />
      ))}
    </>
  );
}

function InlineNode({
  handlers,
  node,
}: {
  handlers: {
    onLinkClick?: AlluviumMarkdownProps["onLinkClick"];
    onLinkDetected?: AlluviumMarkdownProps["onLinkDetected"];
  };
  node: AlluviumInlineNode;
}) {
  switch (node.kind) {
    case "text":
      if (!node.value.includes("\n")) return <>{node.value}</>;
      return (
        <>
          {node.value.split("\n").map((part, index) => (
            <span key={index}>
              {index > 0 ? <br /> : null}
              {part}
            </span>
          ))}
        </>
      );
    case "strong":
      return (
        <strong>
          <InlineNodes handlers={handlers} nodes={node.children} />
        </strong>
      );
    case "em":
      return (
        <em>
          <InlineNodes handlers={handlers} nodes={node.children} />
        </em>
      );
    case "del":
      return (
        <del>
          <InlineNodes handlers={handlers} nodes={node.children} />
        </del>
      );
    case "code":
      return <code>{node.value}</code>;
    case "image":
      return <>{`![${node.alt}](${node.url ?? ""})`}</>;
    case "link": {
      if (handlers.onLinkDetected) {
        queueMicrotask(() => handlers.onLinkDetected?.());
      }
      const href = sanitizeHref(node.url);
      return (
        <a
          className="underline underline-offset-2 decoration-1 decoration-current/40 hover:decoration-current focus:decoration-current"
          href={href}
          onClick={
            href && handlers.onLinkClick
              ? (event) => handlers.onLinkClick?.(event, href)
              : undefined
          }
          rel="noopener noreferrer"
          target="_blank"
        >
          <InlineNodes handlers={handlers} nodes={node.children} />
        </a>
      );
    }
  }
}

/** Official `ye` residual. */
function AlluviumBlockView({
  block,
  handlers,
  headingLevelOffset,
  onCodeDetected,
}: {
  block: AlluviumBlock;
  handlers: {
    onLinkClick?: AlluviumMarkdownProps["onLinkClick"];
    onLinkDetected?: AlluviumMarkdownProps["onLinkDetected"];
  };
  headingLevelOffset: number;
  onCodeDetected?: () => void;
}) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p className="font-claude-response-body break-words whitespace-normal leading-[1.7]">
          {block.lines.map((line, index) => (
            <span key={index}>
              {index > 0 ? <br /> : null}
              <InlineNodes handlers={handlers} nodes={line} />
            </span>
          ))}
        </p>
      );
    case "heading": {
      const level = Math.min(block.level, 6);
      const tag = `h${Math.min(level + headingLevelOffset, 6)}` as keyof JSX.IntrinsicElements;
      const Tag = tag;
      return (
        <Tag className={HEADING_CLASS[level]}>
          <InlineNodes handlers={handlers} nodes={block.children} />
        </Tag>
      );
    }
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      const listStyle = block.ordered ? "list-decimal" : "list-disc";
      return (
        <Tag
          className={classes(
            "[li_&]:mb-0 [li_&]:mt-1 [li_&]:gap-1 [&:not(:last-child)_ul]:pb-1 [&:not(:last-child)_ol]:pb-1 flex flex-col gap-1 pl-8 mb-3",
            listStyle,
          )}
          start={block.ordered ? block.start : undefined}
        >
          {block.items.map((item, index) => (
            <li className="whitespace-normal break-words pl-2" key={index}>
              <InlineNodes handlers={handlers} nodes={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case "blockquote":
      return (
        <blockquote className="ml-2 border-l-4 border-border-300/10 pl-4 text-text-300">
          {block.lines.map((line, index) => (
            <p
              className="font-claude-response-body break-words whitespace-normal leading-[1.7]"
              key={index}
            >
              <InlineNodes handlers={handlers} nodes={line} />
            </p>
          ))}
        </blockquote>
      );
    case "fence":
      if (onCodeDetected) queueMicrotask(() => onCodeDetected());
      return (
        <pre className={block.lang ? `language-${block.lang}` : undefined}>
          {block.code}
        </pre>
      );
    case "hr":
      return <hr className="border-border-200 border-t-0.5 my-3 mx-1.5" />;
  }
}

const MemoizedAlluviumBlock = memo(
  function MemoizedAlluviumBlock(props: {
    block: AlluviumBlock;
    handlers: {
      onLinkClick?: AlluviumMarkdownProps["onLinkClick"];
      onLinkDetected?: AlluviumMarkdownProps["onLinkDetected"];
    };
    headingLevelOffset: number;
    onCodeDetected?: () => void;
  }) {
    return <AlluviumBlockView {...props} />;
  },
  (prev, next) => prev.block === next.block,
);

/** Official `ve` residual: engine ref + prefix-delta feed. */
function useAlluviumSnapshot(text: string, isStreaming: boolean): AlluviumSnapshot {
  const engineRef = useRef<AlluviumIncrementalEngine | null>(null);
  const prevTextRef = useRef("");
  return useMemo(() => {
    if (!engineRef.current) engineRef.current = new AlluviumIncrementalEngine();
    const engine = engineRef.current;
    let prev = prevTextRef.current;
    if (text.length < prev.length || !text.startsWith(prev)) {
      engine.reset();
      prev = "";
    }
    const delta = text.slice(prev.length);
    if (delta.length > 0) engine.feed(delta);
    prevTextRef.current = text;
    return engine.snapshot(!isStreaming);
  }, [text, isStreaming]);
}

/**
 * Official AlluviumMarkDown (`be`).
 * data-official-source: c93fb40ec-C-L_NkHO.js:be/ae/ve/ye
 */
export function AlluviumMarkdown({
  className,
  headingLevelOffset = 0,
  isStreaming = false,
  onCodeDetected,
  onLinkClick,
  onLinkDetected,
  text,
}: AlluviumMarkdownProps) {
  const snapshot = useAlluviumSnapshot(text, isStreaming);
  const handlers = useMemo(
    () => ({ onLinkClick, onLinkDetected }),
    [onLinkClick, onLinkDetected],
  );

  return (
    <div
      className={classes("alluvium-markdown", className)}
      data-official-source="c93fb40ec-C-L_NkHO.js:AlluviumMarkDown"
    >
      {snapshot.committed.map((block, index) => (
        <MemoizedAlluviumBlock
          block={block}
          handlers={handlers}
          headingLevelOffset={headingLevelOffset}
          key={`c-${index}`}
          onCodeDetected={onCodeDetected}
        />
      ))}
      {snapshot.frontier.map((block, index) => (
        <MemoizedAlluviumBlock
          block={block}
          handlers={handlers}
          headingLevelOffset={headingLevelOffset}
          key={`f-${snapshot.committed.length + index}`}
          onCodeDetected={onCodeDetected}
        />
      ))}
    </div>
  );
}

// keep ReactNode import used for future extensions without lint churn
export type AlluviumChildren = ReactNode;
