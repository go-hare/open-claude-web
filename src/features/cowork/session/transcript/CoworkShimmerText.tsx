import type { HTMLAttributes, ReactNode } from "react";

type CoworkShimmerTextProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  children: ReactNode;
  colorOverrides?: string;
  speed?: number;
};

export function CoworkShimmerText({
  children,
  className,
  colorOverrides,
  speed = 2.25,
  style,
  ...props
}: CoworkShimmerTextProps) {
  return (
    <span
      {...props}
      className={classes(
        "text-center text-always-white/0 bg-gradient-to-r bg-[length:400%_100%] from-30% via-always-white/70 to-80% bg-clip-text bg-no-repeat",
        "animate-[shimmertext_2.25s_infinite]",
        colorOverrides ?? "bg-text-400 from-text-400 to-text-400",
        className,
      )}
      style={{
        ...style,
        animationDuration: `${speed}s`,
        animationIterationCount: "infinite",
        animationName: "shimmertext",
      }}
    >
      {children}
    </span>
  );
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
