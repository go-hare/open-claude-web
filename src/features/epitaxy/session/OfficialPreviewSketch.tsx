/**
 * Official Preview annotate / sketch residual (c11959232):
 *   _Component136 SketchCanvas — freehand / line / rect / ellipse / text
 *   _Component137 SketchToolbar — tools + ink colors + Clear + Cancel / Add to chat
 *   _Component138 PreviewAnnotateOverlay — backdrop screenshot + canvas + HUD
 *
 * Colors wS: #E03131 #1971C2 #2F9E44 #1F1E1D
 * strokeWidth 4; text font system stack; composite = backdrop + strokes at natural size.
 */
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Icon } from "../../../shell/icons";
import {
  OfficialButton,
  OfficialDropdownButton,
  type OfficialDropdownItem,
} from "../OfficialEpitaxyComponents";

export type SketchTool = "pen" | "line" | "rect" | "ellipse" | "text";

type Point = { x: number; y: number };

type FreehandStroke = {
  kind: "freehand";
  points: Point[];
  color: string;
  width: number;
  author: string;
};

type ShapeStroke = {
  kind: "line" | "rect" | "ellipse";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  author: string;
};

type TextStroke = {
  kind: "text";
  x: number;
  y: number;
  text: string;
  size: number;
  color: string;
  author: string;
};

type Stroke = FreehandStroke | ShapeStroke | TextStroke;

export type SketchCanvasHandle = {
  clear: () => void;
  toPNG: (fill?: string) => string;
  toComposite: (backdropDataUrl: string) => Promise<string>;
  getStrokes: () => Stroke[];
};

/** Official wS residual. */
export const PREVIEW_SKETCH_COLORS = ["#E03131", "#1971C2", "#2F9E44", "#1F1E1D"] as const;

const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const TOOL_LABELS: Record<SketchTool, string> = {
  pen: "Freehand pen",
  line: "Line",
  rect: "Rectangle",
  ellipse: "Ellipse",
  text: "Text",
};

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  if (stroke.kind === "freehand") {
    const pts = stroke.points;
    if (pts.length === 0) return;
    ctx.lineWidth = stroke.width;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0]!.x, pts[0]!.y, stroke.width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i]!.x, pts[i]!.y);
    }
    ctx.stroke();
    return;
  }
  if (stroke.kind === "line") {
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    ctx.moveTo(stroke.x1, stroke.y1);
    ctx.lineTo(stroke.x2, stroke.y2);
    ctx.stroke();
    return;
  }
  if (stroke.kind === "rect") {
    ctx.lineWidth = stroke.width;
    const x = Math.min(stroke.x1, stroke.x2);
    const y = Math.min(stroke.y1, stroke.y2);
    ctx.strokeRect(x, y, Math.abs(stroke.x2 - stroke.x1), Math.abs(stroke.y2 - stroke.y1));
    return;
  }
  if (stroke.kind === "ellipse") {
    ctx.lineWidth = stroke.width;
    const cx = (stroke.x1 + stroke.x2) / 2;
    const cy = (stroke.y1 + stroke.y2) / 2;
    const rx = Math.abs(stroke.x2 - stroke.x1) / 2;
    const ry = Math.abs(stroke.y2 - stroke.y1) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  if (stroke.kind === "text") {
    ctx.font = `${stroke.size}px ${SYSTEM_FONT}`;
    ctx.textBaseline = "top";
    const lines = stroke.text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i]!, stroke.x, stroke.y + i * stroke.size * 1.2);
    }
  }
}

function ToolGlyph({ tool }: { tool: SketchTool }) {
  if (tool === "pen") return <Icon name="Pencil" size="sm" />;
  const glyph = tool === "line" ? "╱" : tool === "rect" ? "□" : tool === "ellipse" ? "○" : "T";
  return (
    <span aria-hidden className="text-body-medium leading-none">
      {glyph}
    </span>
  );
}

function ColorDot({ color, active }: { color: string; active?: boolean }) {
  return (
    <span
      aria-hidden
      className={
        active
          ? "block h-3.5 w-3.5 rounded-full shadow-[0_0_0_2px_var(--t9)]"
          : "block h-3.5 w-3.5 rounded-full shadow-[0_0_0_1px_var(--t4)]"
      }
      style={{ background: color }}
    />
  );
}

/** Official _Component136 residual. */
export const OfficialSketchCanvas = forwardRef<
  SketchCanvasHandle,
  {
    className?: string;
    style?: CSSProperties;
    tool?: SketchTool;
    color: string;
    strokeWidth?: number;
    textSize?: number;
    onStrokeEnd?: () => void;
  }
>(function OfficialSketchCanvas(
  {
    className,
    style,
    tool = "pen",
    color,
    strokeWidth = 4,
    textSize = 16,
    onStrokeEnd,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const draftRef = useRef<Stroke | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; value: string } | null>(null);
  const textDraftRef = useRef(textDraft);
  textDraftRef.current = textDraft;

  const repaint = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);
    for (const stroke of strokesRef.current) drawStroke(ctx, stroke);
    if (draftRef.current) drawStroke(ctx, draftRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      sizeRef.current = { w: rect.width, h: rect.height };
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctxRef.current = ctx;
        repaint();
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [repaint]);

  const commitStroke = useCallback(
    (stroke: Stroke) => {
      strokesRef.current = [...strokesRef.current, stroke];
      onStrokeEnd?.();
    },
    [onStrokeEnd],
  );

  const commitText = useCallback(() => {
    const draft = textDraftRef.current;
    textDraftRef.current = null;
    setTextDraft(null);
    if (!draft || !draft.value.trim()) return;
    const stroke: TextStroke = {
      kind: "text",
      x: draft.x,
      y: draft.y,
      text: draft.value,
      size: textSize,
      color,
      author: "user",
    };
    commitStroke(stroke);
    const ctx = ctxRef.current;
    if (ctx) drawStroke(ctx, stroke);
  }, [color, commitStroke, textSize]);

  useEffect(() => {
    if (tool !== "text") commitText();
  }, [tool, commitText]);

  useImperativeHandle(
    ref,
    () => ({
      getStrokes: () => strokesRef.current,
      clear: () => {
        strokesRef.current = [];
        draftRef.current = null;
        setTextDraft(null);
        repaint();
      },
      toPNG: (fill?: string) => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return "";
        const { w, h } = sizeRef.current;
        ctx.clearRect(0, 0, w, h);
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fillRect(0, 0, w, h);
        }
        for (const stroke of strokesRef.current) drawStroke(ctx, stroke);
        const url = canvas.toDataURL("image/png");
        repaint();
        return url;
      },
      toComposite: async (backdropDataUrl: string) => {
        const img = new Image();
        img.src = backdropDataUrl;
        await img.decode();
        const out = document.createElement("canvas");
        out.width = img.naturalWidth;
        out.height = img.naturalHeight;
        const ctx = out.getContext("2d");
        if (!ctx) return backdropDataUrl;
        ctx.drawImage(img, 0, 0);
        const { w, h } = sizeRef.current;
        if (w > 0 && h > 0) {
          const scale = Math.min(img.naturalWidth / w, img.naturalHeight / h);
          ctx.scale(scale, scale);
        }
        for (const stroke of strokesRef.current) drawStroke(ctx, stroke);
        return out.toDataURL("image/png");
      },
    }),
    [repaint],
  );

  const localPoint = (event: ReactPointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const endPointer = () => {
    const draft = draftRef.current;
    if (!draft) return;
    draftRef.current = null;
    if (draft.kind === "freehand") {
      commitStroke(draft);
      return;
    }
    if (draft.kind === "text") {
      return;
    }
    if (draft.x1 !== draft.x2 || draft.y1 !== draft.y2) {
      commitStroke(draft);
    } else {
      repaint();
    }
  };

  const rootStyle = useMemo<CSSProperties>(
    () => ({ position: "relative", touchAction: "none", ...style }),
    [style],
  );
  const canvasStyle = useMemo<CSSProperties>(
    () => ({ cursor: tool === "text" ? "text" : "crosshair" }),
    [tool],
  );

  return (
    <div className={className} style={rootStyle}>
      <canvas
        ref={canvasRef}
        role="application"
        aria-label="Sketch canvas"
        className="absolute inset-0 h-full w-full"
        style={canvasStyle}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const pt = localPoint(event);
          if (tool === "text") {
            event.preventDefault();
            commitText();
            setTextDraft({ x: pt.x, y: pt.y, value: "" });
            return;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
          if (tool === "pen") {
            draftRef.current = {
              kind: "freehand",
              points: [pt],
              color,
              width: strokeWidth,
              author: "user",
            };
            const ctx = ctxRef.current;
            if (ctx) drawStroke(ctx, draftRef.current);
          } else {
            draftRef.current = {
              kind: tool,
              x1: pt.x,
              y1: pt.y,
              x2: pt.x,
              y2: pt.y,
              color,
              width: strokeWidth,
              author: "user",
            };
          }
        }}
        onPointerMove={(event) => {
          const draft = draftRef.current;
          const ctx = ctxRef.current;
          if (!draft || !ctx) return;
          const pt = localPoint(event);
          if (draft.kind === "freehand") {
            const last = draft.points[draft.points.length - 1]!;
            draft.points.push(pt);
            ctx.lineCap = "round";
            ctx.strokeStyle = draft.color;
            ctx.lineWidth = draft.width;
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
          } else {
            draft.x2 = pt.x;
            draft.y2 = pt.y;
            repaint();
          }
        }}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      />
      {textDraft ? (
        <textarea
          autoFocus
          value={textDraft.value}
          rows={1}
          aria-label="Text label"
          className="absolute resize-none overflow-hidden bg-transparent outline-none p-0 border-0"
          style={{
            left: textDraft.x,
            top: textDraft.y,
            minWidth: 40,
            width: `${Math.max(4, textDraft.value.length + 2)}ch`,
            color,
            font: `${textSize}px/1.2 ${SYSTEM_FONT}`,
          }}
          onChange={(e) => setTextDraft((prev) => (prev ? { ...prev, value: e.target.value } : prev))}
          onBlur={() => commitText()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape") {
              e.preventDefault();
              setTextDraft(null);
            } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              commitText();
            }
          }}
        />
      ) : null}
    </div>
  );
});

/**
 * Official yS / _Component137 residual — bottom HUD tools/colors/clear/actions.
 * ResizeObserver: contentRect.width < 420 → icon dropdowns for tool + ink (Ou mode icon);
 * wide → full tool buttons + color dots.
 */
export const OfficialSketchToolbar = memo(function OfficialSketchToolbar({
  tool,
  onToolChange,
  colors,
  color,
  onColorChange,
  hasStrokes,
  onClear,
  actions,
  className,
}: {
  tool: SketchTool;
  onToolChange: (tool: SketchTool) => void;
  colors: readonly string[];
  color: string;
  onColorChange: (color: string) => void;
  hasStrokes: boolean;
  onClear: () => void;
  actions?: ReactNode;
  className?: string;
}) {
  const tools = Object.keys(TOOL_LABELS) as SketchTool[];
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      setNarrow(width < 420);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toolMenuItems = useMemo<OfficialDropdownItem[]>(
    () =>
      tools.map((item) => ({
        label: (
          <span className="flex items-center gap-g3">
            <ToolGlyph tool={item} />
            {TOOL_LABELS[item]}
          </span>
        ),
        checked: item === tool,
        onSelect: () => onToolChange(item),
      })),
    [onToolChange, tool, tools],
  );

  const colorMenuItems = useMemo<OfficialDropdownItem[]>(
    () =>
      colors.map((item, index) => ({
        label: (
          <span className="flex items-center gap-g3">
            <ColorDot color={item} active={false} />
            {`Ink color ${index + 1}`}
          </span>
        ),
        checked: item === color,
        onSelect: () => onColorChange(item),
      })),
    [color, colors, onColorChange],
  );

  return (
    <div
      ref={rootRef}
      className={["absolute inset-x-[var(--p7)] flex justify-center", className].filter(Boolean).join(" ")}
      data-official-source="c11959232-yS-sketch-toolbar"
      data-narrow={narrow ? "1" : "0"}
    >
      <div className="relative isolate w-max max-w-full rounded-r6 bg-bg-000/90 shadow-md border border-border-300">
        {/* Official Nn elevation:"hud" residual — product uses surface+shadow equivalent on shell. */}
        <div className="flex items-center gap-g4 px-p5 py-p4">
          {narrow ? (
            <>
              <OfficialDropdownButton
                mode="icon"
                size="base"
                customIcon={<ToolGlyph tool={tool} />}
                ariaLabel="Drawing tool"
                items={toolMenuItems}
                side="top"
                align="start"
                revealChevron="never"
              />
              <OfficialDropdownButton
                mode="icon"
                size="base"
                customIcon={<ColorDot color={color} active={false} />}
                ariaLabel="Ink color"
                items={colorMenuItems}
                side="top"
                align="start"
                revealChevron="never"
              />
            </>
          ) : (
            <>
              <div className="flex items-center gap-g2">
                {tools.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-label={TOOL_LABELS[item]}
                    aria-pressed={item === tool}
                    onClick={() => onToolChange(item)}
                    className={[
                      "flex h-7 w-7 items-center justify-center rounded-r4 outline-none ring-focus",
                      item === tool ? "bg-t3 text-t9" : "text-t7 hover:bg-t2",
                    ].join(" ")}
                  >
                    <ToolGlyph tool={item} />
                  </button>
                ))}
              </div>
              <div className="w-px h-5 bg-t3" />
              <div className="flex items-center gap-g4 px-p2">
                {colors.map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    aria-label={`Ink color ${index + 1}`}
                    aria-pressed={item === color}
                    onClick={() => onColorChange(item)}
                    className="outline-none ring-focus rounded-full hover:[&>span]:shadow-[0_0_0_1px_var(--t7)]"
                  >
                    <ColorDot color={item} active={item === color} />
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="w-px h-5 bg-t3" />
          <button
            type="button"
            disabled={!hasStrokes}
            onClick={onClear}
            aria-label="Clear"
            className="flex h-7 w-7 items-center justify-center rounded-r4 text-t7 outline-none ring-focus enabled:hover:bg-t2 enabled:hover:text-t9 disabled:text-t4"
          >
            <Icon name="TrashCanRound" size="sm" />
          </button>
          {actions}
        </div>
      </div>
    </div>
  );
});

/** Official preview-annotation-context residual string. */
export const PREVIEW_ANNOTATION_CONTEXT_NOTE =
  "<preview-annotation-context>The attached image is a screenshot of the running app preview with the user's freehand annotations drawn on top. Use the preview_* tools to inspect or interact with the live page.</preview-annotation-context>";

/** Official _Component138 residual. */
export const OfficialPreviewAnnotateOverlay = memo(function OfficialPreviewAnnotateOverlay({
  backdropDataUrl,
  onCancel,
  onAttach,
}: {
  backdropDataUrl: string | null;
  onCancel: () => void;
  onAttach: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<SketchCanvasHandle | null>(null);
  const [tool, setTool] = useState<SketchTool>("pen");
  const [color, setColor] = useState<string>(PREVIEW_SKETCH_COLORS[0]);
  const [hasStrokes, setHasStrokes] = useState(false);
  const attachGen = useRef(0);

  const onStrokeEnd = useCallback(() => setHasStrokes(true), []);
  const onClear = useCallback(() => {
    canvasRef.current?.clear();
    setHasStrokes(false);
  }, []);

  const onAddToChat = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gen = ++attachGen.current;
    const dataUrl = backdropDataUrl
      ? await canvas.toComposite(backdropDataUrl)
      : canvas.toPNG("#ffffff");
    if (attachGen.current === gen) onAttach(dataUrl);
  }, [backdropDataUrl, onAttach]);

  const onCancelClick = useCallback(() => {
    attachGen.current++;
    onCancel();
  }, [onCancel]);

  return (
    <div className="absolute inset-0 draggable-none z-10">
      {backdropDataUrl ? (
        <img
          src={backdropDataUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover object-left-top select-none pointer-events-none"
        />
      ) : (
        <div className="absolute inset-0 bg-surface-primary" />
      )}
      <OfficialSketchCanvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        tool={tool}
        color={color}
        strokeWidth={4}
        onStrokeEnd={onStrokeEnd}
      />
      <OfficialSketchToolbar
        className="bottom-[var(--p7)]"
        tool={tool}
        onToolChange={setTool}
        colors={PREVIEW_SKETCH_COLORS}
        color={color}
        onColorChange={setColor}
        hasStrokes={hasStrokes}
        onClear={onClear}
        actions={
          <>
            <OfficialButton variant="uncontained" onClick={onCancelClick}>
              Cancel
            </OfficialButton>
            <OfficialButton variant="contained" disabled={!hasStrokes} onClick={() => void onAddToChat()}>
              Add to chat
            </OfficialButton>
          </>
        }
      />
    </div>
  );
});
