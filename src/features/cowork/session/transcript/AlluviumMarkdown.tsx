/**
 * Official Alluvium residual:
 * - Cowork `be`/`ye` (c93fb40ec): alluvium-markdown shell + font-claude-response-body classes
 * - Code `wb`/`bb` (c11959232): data-alluvium.contents + bare tags; typography from
 *   parent `.epitaxy-markdown` CSS (`--family-ui` / `--text-body`) — NOT Claude.ai body font
 *
 * Fence on Code path injects official `ab` via renderFence (avoids circular import with OfficialCodeMarkdown).
 */
import {
  createElement,
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
import { parseOfficialFileRef } from "../../../epitaxy/officialMarkdownMbResidual";

export type AlluviumFenceBlock = Extract<AlluviumBlock, { kind: "fence" }>;

export type AlluviumMarkdownProps = {
  className?: string;
  /**
   * Official Code `wb` residual (c119): root is `div[data-alluvium].contents`
   * with committed/frontier blocks as direct children — no extra alluvium-markdown shell.
   * Cowork `be` keeps default `alluvium-markdown` class when this is false/omitted.
   */
  dataAlluvium?: boolean;
  /**
   * `code` = c119 `bb` bare tags (epitaxy-markdown CSS fonts).
   * `cowork` = c93 `ye` classed blocks (font-claude-response-body).
   * Default: dataAlluvium ? "code" : "cowork".
   */
  variant?: "code" | "cowork";
  headingLevelOffset?: number;
  isStreaming?: boolean;
  onCodeDetected?: () => void;
  onLinkClick?: (event: MouseEvent<HTMLAnchorElement>, url: string) => void;
  onLinkDetected?: () => void;
  /**
   * Official Code bb fence → ab/Ex. Required for Code residual Pierre fence.
   * Cowork ye uses plain <pre class=language-*> when omitted.
   */
  renderFence?: (block: AlluviumFenceBlock) => ReactNode;
  text: string;
};

/** Official Cowork ye heading classes (c93 we). Not used on Code bb. */
const COWORK_HEADING_CLASS: Record<number, string> = {
  1: "text-text-100 mt-3 -mb-1 text-[1.375rem] font-bold",
  2: "text-text-100 mt-3 -mb-1 text-[1.125rem] font-bold",
  3: "text-text-100 mt-2 -mb-1 text-base font-bold",
  4: "text-text-100 mt-2 -mb-1 text-base font-bold",
  5: "text-text-100 mt-2 -mb-1 text-sm font-bold",
  6: "text-text-100 mt-2 -mb-1 text-sm font-semibold",
};

const CODE_HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

/** Official Code db residual class (c119). */
const CODE_MD_LINK_CLASS =
  "text-[var(--accent)] hover:underline underline-offset-[1px] outline-none hide-focus-ring ring-focus rounded-r2";

/** Official Code rb residual class on ob/ru wrapper (c119). */
const CODE_MD_INLINE_CODE_RING =
  "rounded-[4px] outline-none hide-focus-ring ring-focus";

/** Official Code pb residual class (c119). */
const CODE_MD_IMG_CLASS =
  "block max-w-full h-auto rounded-r4 border border-[var(--border-default)]";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function sanitizeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("computer://") || url.startsWith("tel:")) return url;
  // Official Ce/m: allowlist schemes; product residual strips javascript: etc.
  if (/^(https?:|mailto:|ircs?:|xmpp:)/i.test(url)) return url;
  if (url.startsWith("#") || url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) {
    return url;
  }
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return url;
  return undefined;
}

type InlineHandlers = {
  onLinkClick?: AlluviumMarkdownProps["onLinkClick"];
  onLinkDetected?: AlluviumMarkdownProps["onLinkDetected"];
  variant: "code" | "cowork";
};

function InlineNodes({
  handlers,
  nodes,
}: {
  handlers: InlineHandlers;
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
  handlers: InlineHandlers;
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
      // Code bb → xb/ob: bare <code>; file-ref → ru open bridge (product CustomEvent).
      // Cowork ye → bare <code> (alluvium-markdown CSS).
      if (handlers.variant === "code") {
        const fileRef = parseOfficialFileRef(node.value);
        if (fileRef) {
          return (
            <button
              className={`${CODE_MD_INLINE_CODE_RING} border-0 p-0 m-0 bg-transparent cursor-pointer`}
              data-official-source="c11959232-h_zsw3wI.js:ob+ru"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("epitaxy-open-file", {
                    detail: { path: fileRef.path, line: fileRef.line },
                  }),
                );
              }}
              type="button"
            >
              <code>{node.value}</code>
            </button>
          );
        }
        return <code className={CODE_MD_INLINE_CODE_RING}>{node.value}</code>;
      }
      return <code>{node.value}</code>;
    case "image":
      if (handlers.variant === "code") {
        // Official Code xb → pb (real img), not markdown escape string.
        const src = node.url || undefined;
        if (!src) return null;
        return (
          <img
            alt={node.alt ?? ""}
            className={CODE_MD_IMG_CLASS}
            data-official-source="c11959232-h_zsw3wI.js:pb"
            src={src}
          />
        );
      }
      // Official Cowork je: image stays markdown text residual.
      return <>{`![${node.alt}](${node.url ?? ""})`}</>;
    case "link": {
      if (handlers.onLinkDetected) {
        queueMicrotask(() => handlers.onLinkDetected?.());
      }
      const href = sanitizeHref(node.url);
      // Code bb → xb/db residual classes; local path open is product bridge on mb path.
      return (
        <a
          className={
            handlers.variant === "code"
              ? CODE_MD_LINK_CLASS
              : "underline underline-offset-2 decoration-1 decoration-current/40 hover:decoration-current focus:decoration-current"
          }
          data-official-source={
            handlers.variant === "code" ? "c11959232-h_zsw3wI.js:db" : undefined
          }
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

/** Official c119 `vb`: multi-line paragraph body with <br> between lines. */
function CodeParagraphLines({
  handlers,
  lines,
}: {
  handlers: InlineHandlers;
  lines: AlluviumInlineNode[][];
}) {
  return (
    <>
      {lines.map((line, index) => (
        <span key={index}>
          {index > 0 ? <br /> : null}
          <InlineNodes handlers={handlers} nodes={line} />
        </span>
      ))}
    </>
  );
}

/**
 * Official Code `bb` (c11959232): bare tags only.
 * Font/size/color come from parent `.epitaxy-markdown` — never font-claude-response-body.
 */
function CodeAlluviumBlockView({
  block,
  handlers,
  onCodeDetected,
  renderFence,
}: {
  block: AlluviumBlock;
  handlers: InlineHandlers;
  onCodeDetected?: () => void;
  renderFence?: AlluviumMarkdownProps["renderFence"];
}) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p>
          <CodeParagraphLines handlers={handlers} lines={block.lines} />
        </p>
      );
    case "heading": {
      const level = Math.min(Math.max(block.level, 1), 6);
      const tag = CODE_HEADING_TAGS[level - 1] ?? "h6";
      return createElement(
        tag,
        null,
        <InlineNodes handlers={handlers} nodes={block.children} />,
      );
    }
    case "list": {
      const items = block.items.map((item, index) => (
        <li key={index}>
          <InlineNodes handlers={handlers} nodes={item} />
        </li>
      ));
      return block.ordered ? (
        <ol start={block.start}>{items}</ol>
      ) : (
        <ul>{items}</ul>
      );
    }
    case "blockquote":
      return (
        <blockquote>
          <p>
            <CodeParagraphLines handlers={handlers} lines={block.lines} />
          </p>
        </blockquote>
      );
    case "fence":
      // Official bb: !langSettled → <pre />; else search_tree Ex / ab Pierre fence.
      if (!block.langSettled) {
        return <pre data-official-source="c11959232-h_zsw3wI.js:bb.pre empty" />;
      }
      if (renderFence) return <>{renderFence(block)}</>;
      // Fallback if inject missing (should not happen on Code path).
      return (
        <pre className={block.lang ? `language-${block.lang}` : undefined}>
          {block.code}
        </pre>
      );
    case "hr":
      return <hr />;
  }
}

/** Official Cowork `ye` residual (c93) — classed Claude.ai body font. */
function CoworkAlluviumBlockView({
  block,
  handlers,
  headingLevelOffset,
  onCodeDetected,
  renderFence,
}: {
  block: AlluviumBlock;
  handlers: InlineHandlers;
  headingLevelOffset: number;
  onCodeDetected?: () => void;
  /**
   * Product delta (not c93 ye residual): optional inject so Cowork can share
   * Code eit MermaidIframe (OfficialMermaidDiagramCard) when caller provides it.
   * Residual ye keeps plain pre when omitted.
   */
  renderFence?: AlluviumMarkdownProps["renderFence"];
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
      const tag = `h${Math.min(level + headingLevelOffset, 6)}`;
      return createElement(
        tag,
        { className: COWORK_HEADING_CLASS[level] },
        <InlineNodes handlers={handlers} nodes={block.children} />,
      );
    }
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      const listStyle = block.ordered ? "list-decimal" : "list-disc";
      return createElement(
        Tag,
        {
          className: classes(
            "[li_&]:mb-0 [li_&]:mt-1 [li_&]:gap-1 [&:not(:last-child)_ul]:pb-1 [&:not(:last-child)_ol]:pb-1 flex flex-col gap-1 pl-8 mb-3",
            listStyle,
          ),
          start: block.ordered ? block.start : undefined,
        },
        block.items.map((item, index) => (
          <li className="whitespace-normal break-words pl-2" key={index}>
            <InlineNodes handlers={handlers} nodes={item} />
          </li>
        )),
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
      // Product: optional renderFence (mermaid eit) mirrors Code bb inject path.
      // Residual c93 ye is plain pre when inject omitted.
      if (renderFence) return <>{renderFence(block)}</>;
      return (
        <pre className={block.lang ? `language-${block.lang}` : undefined}>
          {block.code}
        </pre>
      );
    case "hr":
      return <hr className="border-border-200 border-t-0.5 my-3 mx-1.5" />;
  }
}

function AlluviumBlockView({
  block,
  handlers,
  headingLevelOffset,
  onCodeDetected,
  renderFence,
  variant,
}: {
  block: AlluviumBlock;
  handlers: InlineHandlers;
  headingLevelOffset: number;
  onCodeDetected?: () => void;
  renderFence?: AlluviumMarkdownProps["renderFence"];
  variant: "code" | "cowork";
}) {
  if (variant === "code") {
    return (
      <CodeAlluviumBlockView
        block={block}
        handlers={handlers}
        onCodeDetected={onCodeDetected}
        renderFence={renderFence}
      />
    );
  }
  return (
    <CoworkAlluviumBlockView
      block={block}
      handlers={handlers}
      headingLevelOffset={headingLevelOffset}
      onCodeDetected={onCodeDetected}
      renderFence={renderFence}
    />
  );
}

const MemoizedAlluviumBlock = memo(
  function MemoizedAlluviumBlock(props: {
    block: AlluviumBlock;
    handlers: InlineHandlers;
    headingLevelOffset: number;
    onCodeDetected?: () => void;
    renderFence?: AlluviumMarkdownProps["renderFence"];
    variant: "code" | "cowork";
  }) {
    return <AlluviumBlockView {...props} />;
  },
  (prev, next) =>
    prev.block === next.block
    && prev.variant === next.variant
    && prev.renderFence === next.renderFence,
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
 * Official AlluviumMarkDown (`be`) + Code `wb` dual residual.
 * data-official-source: c93 be / c119 wb
 */
export function AlluviumMarkdown({
  className,
  dataAlluvium = false,
  headingLevelOffset = 0,
  isStreaming = false,
  onCodeDetected,
  onLinkClick,
  onLinkDetected,
  renderFence,
  text,
  variant,
}: AlluviumMarkdownProps) {
  const resolvedVariant = variant ?? (dataAlluvium ? "code" : "cowork");
  const snapshot = useAlluviumSnapshot(text, isStreaming);
  const handlers = useMemo<InlineHandlers>(
    () => ({ onLinkClick, onLinkDetected, variant: resolvedVariant }),
    [onLinkClick, onLinkDetected, resolvedVariant],
  );

  return (
    <div
      // Code wb: data-alluvium + contents only. Cowork be: alluvium-markdown shell.
      className={classes(dataAlluvium ? undefined : "alluvium-markdown", className)}
      data-alluvium={dataAlluvium ? true : undefined}
      data-official-source={
        dataAlluvium
          ? "c11959232-h_zsw3wI.js:wb+bb"
          : "c93fb40ec-C-L_NkHO.js:AlluviumMarkDown"
      }
    >
      {snapshot.committed.map((block, index) => (
        <MemoizedAlluviumBlock
          block={block}
          handlers={handlers}
          headingLevelOffset={headingLevelOffset}
          key={`c-${index}`}
          onCodeDetected={onCodeDetected}
          renderFence={renderFence}
          variant={resolvedVariant}
        />
      ))}
      {snapshot.frontier.map((block, index) => (
        <MemoizedAlluviumBlock
          block={block}
          handlers={handlers}
          headingLevelOffset={headingLevelOffset}
          key={`f-${snapshot.committed.length + index}`}
          onCodeDetected={onCodeDetected}
          renderFence={renderFence}
          variant={resolvedVariant}
        />
      ))}
    </div>
  );
}

export type AlluviumChildren = ReactNode;
