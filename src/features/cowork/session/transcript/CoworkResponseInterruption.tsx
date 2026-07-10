import { Icon } from "../../../../shell/icons";

export type CoworkInterruptionVariant = "no_stop_reason" | "user_canceled";

export function CoworkResponseInterruption({ variant }: { variant: CoworkInterruptionVariant }) {
  const message = variant === "user_canceled"
    ? "Claude's response was interrupted"
    : "Claude's response could not be fully generated";
  return (
    <div className="mt-2 pl-1">
      <div className="flex w-fit rounded-xl p-3 gap-3 items-start text-sm border-0.5 border-border-200 bg-bg-200 w-full font-base text-text-300" data-color-context="main">
        <div className="h-8 ml-1 flex items-center"><Icon customSize={20} name="Warning" /></div>
        <div className="flex flex-wrap items-start gap-y-1 gap-x-3 flex-1">
          <div className="my-[0.35rem] flex-1 min-w-[min(20ch,100%)]">{message}</div>
        </div>
      </div>
    </div>
  );
}
