import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { InstalledExtensionState } from "../settingsDesktopBridge";

/**
 * Official ExtensionIcon residual (index-BELzQL5P):
 * - LJ({ extension, size }) → AJ({ icon: manifest.icon, name, path, size })
 * - OJ resolve: data: passthrough; https→claude-image://; other schemes empty;
 *   relative + path → file://${path}/${icon}
 * - YG container: borderRadius .27*size, bg-bg-000 border-border-300 border-0.5 shadow-sm
 * - TJ type external + imageSize default .5*size → object-contain img, letter eE (Nu) fallback
 *   with hideBorder when imageSize provided (c5f4e1303 eE).
 */

const CLAUDE_IMAGE_SCHEME = "claude-image";

export function resolveExtensionIconSrc(icon: string | undefined | null, path?: string | null): string {
  if (!icon) return "";
  if (icon.startsWith("data:")) return icon;
  if (icon.startsWith("https://")) return icon.replace("https://", `${CLAUDE_IMAGE_SCHEME}://`);
  if (icon.includes("://")) return "";
  if (!path) return "";
  const base = path.replace(/\\/g, "/");
  const rel = icon.replace(/\\/g, "/");
  return `file://${base}/${rel}`;
}

function extensionDisplayName(extension: InstalledExtensionState): string {
  const manifest = extension.manifest;
  if (typeof manifest?.display_name === "string" && manifest.display_name.trim()) {
    return manifest.display_name;
  }
  if (typeof manifest?.name === "string" && manifest.name.trim()) return manifest.name;
  if (typeof extension.displayName === "string" && extension.displayName.trim()) {
    return extension.displayName;
  }
  return extension.id || "?";
}

/** Official eE / Nu letter avatar (hideBorder path used inside YG when imageSize set). */
function LetterAvatar({
  letter,
  size,
  hideBorder,
}: {
  letter: string;
  size: number;
  hideBorder?: boolean;
}) {
  const ch = letter.trim().at(0)?.toUpperCase() ?? "";
  const style: CSSProperties = {
    width: size,
    height: size,
    fontSize: size > 20 ? 0.85 * size : 0.65 * size,
    borderRadius: 0.3 * size,
  };
  return (
    <div
      style={style}
      className={[
        "shrink-0 flex items-center justify-center bg-bg-000 text-text-300",
        size <= 24 ? "font-medium" : "font-bold",
        !hideBorder ? "border-0.5 border-border-300" : "",
        !hideBorder ? "shadow-[0_0.8px_1.6px_0_hsl(var(--always-black)/5%)]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <p className="font-ui shrink-0 leading-tight">{ch}</p>
    </div>
  );
}

/** Official YG icon shell. */
function IconShell({
  size,
  className,
  children,
}: {
  size: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{ width: size, height: size, borderRadius: 0.27 * size }}
      className={[
        "shrink-0 bg-bg-000 border-border-300 border-0.5 shadow-sm flex items-center justify-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export function ExtensionIcon({
  extension,
  size = 60,
  imageSize,
  className,
}: {
  extension: InstalledExtensionState;
  size?: number;
  /** Official AJ default .5 * size when omitted. */
  imageSize?: number;
  className?: string;
}) {
  const name = extensionDisplayName(extension);
  const icon =
    typeof extension.manifest?.icon === "string" ? extension.manifest.icon : undefined;
  const path = typeof extension.path === "string" ? extension.path : undefined;
  const src = useMemo(() => resolveExtensionIconSrc(icon, path), [icon, path]);
  const imgSize = imageSize ?? 0.5 * size;
  const [failed, setFailed] = useState(false);

  const letter = (
    <LetterAvatar letter={name || "?"} size={imgSize} hideBorder />
  );

  if (!src || failed) {
    return (
      <IconShell size={size} className={className}>
        {letter}
      </IconShell>
    );
  }

  return (
    <IconShell size={size} className={className}>
      <img
        src={src}
        alt={`${name} icon`}
        width={imgSize}
        height={imgSize}
        className="object-contain"
        style={{ maxWidth: imgSize, maxHeight: imgSize }}
        onError={() => setFailed(true)}
      />
    </IconShell>
  );
}
