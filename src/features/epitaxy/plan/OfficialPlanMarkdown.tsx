/**
 * Official JN plan markdown body (c11959232):
 * - eb plugins (gfm + optional math/katex)
 * - ON(comments) rehype when Uk(session) has comments
 * - YN components: mb + mark:BN + pre wrapped with data-plan-comment-skip
 */
import {
  memo,
  useContext,
  useMemo,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import {
  OfficialCodeMarkdown,
  officialMarkdownComponentsBase,
  officialMarkdownUrlTransform,
} from "../OfficialCodeMarkdown";
import { useOfficialPlanComments } from "../session/officialPlanCommentsStore";
import { OfficialPlanMarkContext } from "./officialPlanMarkContext";
import { officialPlanCommentRehype } from "./officialPlanCommentRehype";

const PLAN_COMMENT_SKIP_ATTR = "data-plan-comment-skip";

export type { OfficialPlanMarkContextValue } from "./officialPlanMarkContext";
export { OfficialPlanMarkContext } from "./officialPlanMarkContext";

/** Official BN: interactive mark for plan comments. */
function OfficialPlanCommentMark({
  children,
  ...rest
}: ComponentPropsWithoutRef<"mark"> & { "data-plan-comment-id"?: string }) {
  const ctx = useContext(OfficialPlanMarkContext);
  const id = rest["data-plan-comment-id"];
  if (!ctx || !id) {
    return <mark {...rest}>{children}</mark>;
  }
  const active = ctx.hoveredId === id;
  return (
    <mark
      className={
        "cursor-pointer rounded-[2px] text-inherit underline decoration-[var(--accent)] decoration-2 underline-offset-2 " +
        (active ? "bg-[var(--accent-20)]" : "bg-[var(--accent-10)]")
      }
      data-plan-comment-id={id}
      onClick={(event) => {
        event.stopPropagation();
        ctx.onMarkClick(id, event.currentTarget);
      }}
      onMouseEnter={() => ctx.onMarkHover(id)}
      onMouseLeave={() => ctx.onMarkHover(null)}
    >
      {children}
    </mark>
  );
}

/** Official YN.pre: wrap mb.pre with data-plan-comment-skip so KN flat offsets skip fences. */
function OfficialPlanMarkdownPre(props: { children?: ReactNode }) {
  const BasePre = officialMarkdownComponentsBase.pre;
  return (
    <div {...{ [PLAN_COMMENT_SKIP_ATTR]: "" }}>
      <BasePre {...props} />
    </div>
  );
}

const planMarkdownComponents = {
  ...officialMarkdownComponentsBase,
  mark: OfficialPlanCommentMark,
  pre: OfficialPlanMarkdownPre,
};

/**
 * Official JN markdown root (non-streaming single pl).
 * Falls back to OfficialCodeMarkdown when no sessionId (should not happen in ZN).
 */
export const OfficialPlanMarkdown = memo(function OfficialPlanMarkdown({
  content,
  sessionId,
}: {
  content: string;
  sessionId: string;
}) {
  const comments = useOfficialPlanComments(sessionId);
  const hasMath = content.includes("$");
  const remarkPlugins = useMemo(
    () => (hasMath ? [remarkMath, remarkGfm] : [remarkGfm]),
    [hasMath],
  );
  const rehypePlugins = useMemo(() => {
    const base = hasMath
      ? [[rehypeKatex, { errorColor: "inherit", output: "htmlAndMathml", strict: false }] as const]
      : [];
    if (comments.length === 0) return base;
    return [...base, officialPlanCommentRehype(comments)];
  }, [comments, hasMath]);

  return (
    <ReactMarkdown
      components={planMarkdownComponents as never}
      rehypePlugins={rehypePlugins as never}
      remarkPlugins={remarkPlugins}
      urlTransform={officialMarkdownUrlTransform}
    >
      {content}
    </ReactMarkdown>
  );
});

/** Compatibility export when plan path needs streaming-less fallback. */
export function OfficialPlanMarkdownOrFallback({
  content,
  sessionId,
}: {
  content: string;
  sessionId?: string | null;
}) {
  if (!sessionId) return <OfficialCodeMarkdown text={content} />;
  return <OfficialPlanMarkdown content={content} sessionId={sessionId} />;
}
