import { AnimatePresence, motion } from "motion/react";
import { Icon } from "../../../shell/icons";
import { COWORK_SUPPORT_URL } from "../newTask/coworkNewTaskMessages";

/**
 * Official V4t / cKt (index-BELzQL5P ~308136 / ~285454):
 * Draft risk banner above new-task composer when unsupervised mode is on.
 * Class: rounded-t-[20px] bg-warning-900 text-warning-000, pb-8 underlaps chin.
 */
export function CoworkDraftRiskBanner({ visible }: { visible: boolean }) {
  return (
    <div aria-live="polite" data-official-source="index-BELzQL5P.js:V4t/cKt CoworkDraftRiskBanner" role="status">
      <AnimatePresence initial={false}>
        {visible ? (
          <motion.div
            animate={{ height: "auto", marginBottom: -20, opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, marginBottom: 0, opacity: 0 }}
            initial={{ height: 0, marginBottom: 0, opacity: 0 }}
            key="risk"
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="relative z-0 !box-content mx-2 rounded-t-[20px] bg-warning-900 text-warning-000 md:mx-0 md:w-full">
              <div className="flex items-start gap-3 px-4 pb-8 pt-3">
                <div aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-warning-200">
                  <Icon customSize={16} name="Warning" />
                </div>
                <p className="min-w-0 flex-1 text-xs">
                  <span className="font-bold">High risk:</span> Claude can use connectors, browse the web, and control apps without asking. This could put your data at risk.{" "}
                  <a className="underline-offset-2 hover:underline" href={COWORK_SUPPORT_URL} rel="noopener noreferrer" target="_blank">
                    See safe use tips
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
