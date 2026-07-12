import { useEffect, useState, type ReactNode } from "react";

export function CoworkToolBadge({ children, color = "flat", className }: {
  children: ReactNode;
  className?: string;
  color?: "danger" | "flat";
}) {
  return (
    <span className={classes(
      "inline-flex items-center align-middle leading-tight flex-shrink-0 h-5 px-1.5 rounded-md text-[0.625rem]",
      color === "danger" ? "bg-danger-900 text-danger-200" : "bg-bg-500/40 text-text-200",
      className,
    )}>
      {children}
    </span>
  );
}

export function CoworkToolCodeBlock({ className, code, error, language, title }: {
  className?: string;
  code: string;
  error?: boolean;
  language?: string;
  title?: string;
}) {
  return (
    <div className={classes("flex flex-col gap-3 p-3 bg-bg-100 rounded-md", error && "!bg-danger-900", className)}>
      <div className="flex justify-between items-center h-3">
        <p className={classes("text-text-300 text-[0.6875rem]", title ? "font-ui font-medium" : "font-mono font-[450]")}>{title || language}</p>
      </div>
      <div className="code-block__code !my-0 !p-0 !rounded-none !text-sm !leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
        <code className={error ? "text-danger-000" : undefined}>{code}</code>
      </div>
    </div>
  );
}

export function CoworkIntegrationLetterIcon({ letter, size = 16 }: { letter: string; size?: number }) {
  const initial = letter.trim().at(0)?.toUpperCase() ?? "";
  return (
    <div
      className={classes("shrink-0 flex items-center justify-center bg-bg-000 text-text-300", size <= 24 ? "font-medium" : "font-bold")}
      style={{ borderRadius: 0.3 * size, fontSize: size > 20 ? 0.85 * size : 0.65 * size, height: size, width: size }}
    >
      <p className="font-ui shrink-0 leading-tight">{initial}</p>
    </div>
  );
}

export function CoworkFavicon({ fallback, size = 16, url }: { fallback: ReactNode; size?: number; url?: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [url]);
  if (!url) return fallback;
  if (failed) return fallback;
  return (
    <img
      alt=""
      className={classes("object-contain transition duration-500", loaded ? "opacity-1" : "opacity-0 blur-sm")}
      height={size}
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      src={faviconUrl(url, size)}
      style={{ maxHeight: size, maxWidth: size }}
      width={size}
    />
  );
}

function faviconUrl(value: string, size: number) {
  if (value.startsWith("data:image/")) return value;
  if (value.startsWith("https://www.google.com/s2/favicons") || value.startsWith("https://www.gstatic.com") || value.startsWith("https://t0.gstatic.com")) return value;
  try {
    const domain = new URL(value).hostname;
    const targetSize = [16, 32, 48, 64, 96, 128].find((candidate) => candidate >= 2 * size) ?? 128;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${targetSize}`;
  } catch {
    return value;
  }
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
