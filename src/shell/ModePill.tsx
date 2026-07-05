import { useCallback, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { useShellText } from "../i18n/shellMessages";
import type { FrameMode } from "../stores/frameStore";
import { Icon } from "./icons";

type ModePillProps = {
  mode: FrameMode;
  onModeChange: (mode: FrameMode) => void;
};

const modes: Array<{ mode: FrameMode; label: string; icon: string }> = [
  { mode: "cowork", label: "协作", icon: "Checklist" },
  { mode: "code", label: "代码", icon: "Code" },
];

export function ModePill({ mode, onModeChange }: ModePillProps) {
  const text = useShellText();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const previousModeRef = useRef(mode);
  const labels = { cowork: text.cowork, code: text.code };
  const activeIndex = modes.findIndex((item) => item.mode === mode);

  const updateIndicator = useCallback(
    (animate: boolean) => {
      const indicator = indicatorRef.current;
      const activeButton = buttonRefs.current[activeIndex];
      if (!indicator || !activeButton) return;

      indicator.style.transform = `translateX(${activeButton.offsetLeft}px)`;
      indicator.style.width = `${activeButton.offsetWidth}px`;
      indicator.style.visibility = "visible";
      indicator.toggleAttribute("data-snap", !animate);
    },
    [activeIndex],
  );

  useLayoutEffect(() => {
    updateIndicator(previousModeRef.current !== mode);
    previousModeRef.current = mode;

    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;

    let firstResize = true;
    const observer = new ResizeObserver(() => {
      if (firstResize) {
        firstResize = false;
        return;
      }
      updateIndicator(false);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [mode, updateIndicator]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const buttons = buttonRefs.current.filter(Boolean) as HTMLButtonElement[];
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (currentIndex === -1) return;

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    buttons[(currentIndex + direction + buttons.length) % buttons.length]?.focus();
  };

  return (
    <div ref={rootRef} className="df-pills" data-segmented="true" role="group" aria-label="Mode" onKeyDown={handleKeyDown}>
      <div ref={indicatorRef} className="df-pill-indicator" />
      {modes.map((item, index) => {
        const active = mode === item.mode;
        return (
          <button
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            type="button"
            aria-current={active ? "page" : undefined}
            aria-label={labels[item.mode]}
            data-active={active || undefined}
            onClick={() => onModeChange(item.mode)}
            className="df-pill hide-focus-ring"
            key={item.mode}
          >
            <span className="df-pill-icon">
              <Icon name={item.icon} />
            </span>
            <span className="df-pill-label">{labels[item.mode]}</span>
          </button>
        );
      })}
    </div>
  );
}
