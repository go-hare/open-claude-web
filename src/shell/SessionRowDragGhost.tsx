/**
 * Official shared-19 `LY` when `rowGhost` is set.
 *
 * Follows pointer (`xY`). Clone of the Recents row (`SY`) sits in a pill;
 * when `paneIntent` is set the clone fades, pill shrinks to label width, and
 * the same pill shows `8IBKnZa76A`. Grabbing cursor is DY `showCursor("grabbing")`.
 */
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useShellText } from "../i18n/shellMessages";
import {
  getSessionDragSnapshot,
  subscribeSessionDragging,
} from "./sessionPaneDrag";

const ROW_FONT = "font-medium text-[length:var(--df-row-font)]";

export function SessionRowDragGhost() {
  const text = useShellText();
  const snapshot = useSyncExternalStore(subscribeSessionDragging, getSessionDragSnapshot, getSessionDragSnapshot);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cloneHostRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [labelWidth, setLabelWidth] = useState(0);
  const ghost = snapshot.ghost;
  const over = snapshot.paneOver;
  const label = over ? text.openInSplitView : null;

  useEffect(() => {
    const host = cloneHostRef.current;
    const clone = ghost?.clone ?? null;
    if (!host || !clone) return;
    host.appendChild(clone);
    return () => {
      clone.remove();
    };
  }, [ghost]);

  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node || !label) {
      setLabelWidth(0);
      return;
    }
    setLabelWidth(Math.ceil(node.offsetWidth));
  }, [label]);

  useEffect(() => {
    const node = rootRef.current;
    if (!snapshot.dragging || !node) return;
    let frame = 0;
    const tick = () => {
      const { cursor } = getSessionDragSnapshot();
      node.style.transform = `translate(${cursor.x}px, ${cursor.y}px)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [snapshot.dragging]);

  if (!snapshot.dragging || !ghost) return null;

  const portal = ghost.portal && ghost.portal.isConnected ? ghost.portal : document.body;
  const shrink = over && labelWidth > 0;
  const pillWidth = shrink ? Math.min(labelWidth, ghost.w) : ghost.w;
  const originX = shrink ? Math.round(pillWidth / 2) : ghost.dx;
  const originY = shrink ? Math.round(ghost.h / 2) : ghost.dy;

  return createPortal(
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed top-0 left-0 pointer-events-none will-change-transform"
      data-official-source="shared-19-DmuztgN-.js:LY rowGhost"
      style={{ zIndex: 40 }}
    >
      <div
        className="absolute overflow-hidden rounded-[var(--df-radius-pill)] transition-[opacity,transform,width,left,top] duration-150 ease-out motion-reduce:transition-none opacity-90"
        style={{
          left: -originX,
          top: -originY,
          width: pillWidth,
          height: ghost.h,
          transformOrigin: `${originX}px ${originY}px`,
          background: "var(--df-sidebar-bg)",
          boxShadow: "var(--df-shadow-float)",
        }}
      >
        <div
          ref={cloneHostRef}
          className={`absolute inset-0 transition-opacity duration-150 ease-out motion-reduce:transition-none ${over ? "opacity-0" : "opacity-100"}`}
        />
        <div
          className={`absolute inset-0 flex items-center justify-center px-2 ${ROW_FONT} transition-[opacity,color] duration-150 ease-out motion-reduce:transition-none ${over ? "opacity-100 text-primary" : "opacity-0"}`}
        >
          <span className="min-w-0 truncate">{label}</span>
        </div>
        {label ? (
          <span
            ref={measureRef}
            aria-hidden="true"
            className={`invisible absolute w-max px-3 whitespace-nowrap ${ROW_FONT}`}
          >
            {label}
          </span>
        ) : null}
      </div>
    </div>,
    portal,
  );
}
