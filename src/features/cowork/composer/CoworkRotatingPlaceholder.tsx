import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Official yAt RotatingPlaceholder (index-BELzQL5P ~240303):
 * Fade-rotate placeholders every 5000ms while isVisible; stop after one full cycle
 * (index wraps to 0). Reset when isVisible becomes true again.
 * Class: absolute inset-0 pointer-events-none overflow-hidden pl-1.5 pt-[5px]
 * + block text-text-500; motion duration 0.5 linear; mode wait.
 */
export function CoworkRotatingPlaceholder({
  isVisible,
  placeholders,
}: {
  isVisible: boolean;
  placeholders: string[];
}) {
  const [index, setIndex] = useState(0);
  const [hasRotated, setHasRotated] = useState(false);
  const [completedCycle, setCompletedCycle] = useState(false);

  useEffect(() => {
    if (!isVisible || placeholders.length <= 1 || completedCycle) return;
    const timer = window.setInterval(() => {
      setHasRotated(true);
      setIndex((current) => {
        const next = (current + 1) % placeholders.length;
        if (next === 0) setCompletedCycle(true);
        return next;
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [completedCycle, isVisible, placeholders.length]);

  useEffect(() => {
    if (!isVisible) return;
    setIndex(0);
    setHasRotated(false);
    setCompletedCycle(false);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden pl-1.5 pt-[5px]"
      data-official-source="index-BELzQL5P.js:yAt RotatingPlaceholder"
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          animate={{ opacity: 1 }}
          className="block text-text-500"
          exit={{ opacity: 0 }}
          initial={hasRotated ? { opacity: 0 } : false}
          key={index}
          transition={{ duration: 0.5, ease: "linear" }}
        >
          {placeholders[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
