/**
 * Official c280f9bbb `B` / `Ac` file-type icon (`data-file-type-icon`).
 * Set: ion-dist `cc84ca73d-UCsEI3Mz.json` (@pierre/trees complete).
 * Size map residual `I`: xs 12 / sm 16 / md 20 / xl 28. Tree `ce9ca o()` and tabs `cfe7 P()` are xs.
 */
import { createElement, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { THEME_MODE_CHANGE_EVENT } from "../../settings/appearanceSettings";

type IconNode = [tag: string, attrs: Record<string, string>, children?: IconNode[]];

type FileIconSet = {
  defaultIcon: string;
  fileExtensions: Record<string, string>;
  fileNames: Record<string, string>;
  icons: Record<string, string>;
  palette: Record<string, [string, string] | string[]>;
};

const FILE_ICON_SET_URL = "/assets/v1/cc84ca73d-UCsEI3Mz.json";
const SVG_TAGS = new Set(["g", "path", "circle", "ellipse", "rect"]);
const ATTR_MAP: Record<string, string> = {
  d: "d",
  fill: "fill",
  opacity: "opacity",
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
  stroke: "stroke",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-miterlimit": "strokeMiterlimit",
  "stroke-dasharray": "strokeDasharray",
  transform: "transform",
  x: "x",
  y: "y",
  width: "width",
  height: "height",
  cx: "cx",
  cy: "cy",
  r: "r",
  rx: "rx",
  ry: "ry",
};

const SIZE_PX = { xs: 12, sm: 16, md: 20, xl: 28 } as const;

type FileTypeIconSize = keyof typeof SIZE_PX | "auto";

type CachedSet = {
  icons: { dark: Record<string, IconNode[]>; light: Record<string, IconNode[]> };
  set: FileIconSet;
};

let cached: CachedSet | null | undefined;
let cacheGeneration = 0;
let loadPromise: Promise<void> | null = null;
const waiters = new Set<() => void>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIconTree(value: unknown): value is IconNode[] {
  return Array.isArray(value) && value.every((entry) => {
    if (!Array.isArray(entry)) return false;
    const [tag, attrs, children] = entry;
    return (
      typeof tag === "string"
      && SVG_TAGS.has(tag)
      && isRecord(attrs)
      && Object.values(attrs).every((item) => typeof item === "string")
      && (children === undefined || isIconTree(children))
    );
  });
}

function isFileIconSet(value: unknown): value is FileIconSet {
  return (
    isRecord(value)
    && typeof value.defaultIcon === "string"
    && isRecord(value.palette)
    && isRecord(value.fileNames)
    && isRecord(value.fileExtensions)
    && isRecord(value.icons)
    && Object.values(value.icons).every((item) => typeof item === "string")
  );
}

function paintNodes(set: FileIconSet, mode: "dark" | "light", raw: IconNode[]): IconNode[] {
  const dark = mode === "dark" ? 1 : 0;
  const paint = (nodes: IconNode[]): IconNode[] => nodes.map(([tag, attrs, children]) => {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (value.startsWith("$")) {
        const swatch = set.palette[value.slice(1)];
        next[key] = swatch?.[dark] ?? "currentColor";
      } else {
        next[key] = value;
      }
    }
    return children === undefined ? [tag, next] : [tag, next, paint(children)];
  });
  return paint(raw);
}

function compileSet(set: FileIconSet): CachedSet {
  const light: Record<string, IconNode[]> = {};
  const dark: Record<string, IconNode[]> = {};
  for (const [name, json] of Object.entries(set.icons)) {
    const parsed: unknown = JSON.parse(json);
    if (!isIconTree(parsed)) continue;
    light[name] = paintNodes(set, "light", parsed);
    dark[name] = paintNodes(set, "dark", parsed);
  }
  return { set, icons: { light, dark } };
}

function notifyWaiters() {
  for (const waiter of waiters) waiter();
}

async function loadFileIconSet() {
  const response = await fetch(FILE_ICON_SET_URL);
  const json: unknown = response.ok ? await response.json() : null;
  if (isFileIconSet(json)) {
    cached = compileSet(json);
    cacheGeneration += 1;
    notifyWaiters();
  }
}

function subscribeFileIconSet(onStoreChange: () => void) {
  if (cached === undefined) {
    loadPromise ??= loadFileIconSet().catch(() => undefined);
    waiters.add(onStoreChange);
    return () => {
      waiters.delete(onStoreChange);
    };
  }
  return () => undefined;
}

function basename(fileName: string): string {
  const slash = Math.max(fileName.lastIndexOf("/"), fileName.lastIndexOf("\\"));
  return slash >= 0 ? fileName.slice(slash + 1) : fileName;
}

function lookupIconName(set: FileIconSet, fileName: string): string | null {
  const name = basename(fileName).toLowerCase();
  if (Object.hasOwn(set.fileNames, name)) return set.fileNames[name] ?? null;
  for (let index = name.indexOf("."); index !== -1; index = name.indexOf(".", index + 1)) {
    const ext = name.slice(index + 1);
    if (Object.hasOwn(set.fileExtensions, ext)) return set.fileExtensions[ext] ?? null;
  }
  return null;
}

function resolvedIconKey(fileName: string): string | null {
  if (!cached) return null;
  const named = lookupIconName(cached.set, fileName);
  if (named !== null && Object.hasOwn(cached.set.icons, named)) return named;
  const fallback = cached.set.defaultIcon;
  return Object.hasOwn(cached.set.icons, fallback) ? fallback : null;
}

function subscribeTheme(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onMode = () => onStoreChange();
  window.addEventListener(THEME_MODE_CHANGE_EVENT, onMode);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onMode);
  return () => {
    window.removeEventListener(THEME_MODE_CHANGE_EVENT, onMode);
    media.removeEventListener("change", onMode);
  };
}

function currentThemeMode(): "dark" | "light" {
  if (typeof document === "undefined") return "light";
  const mode = document.documentElement.dataset.mode;
  if (mode === "dark" || mode === "light") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function IconNodes({ nodes }: { nodes: IconNode[] }): ReactNode {
  return nodes.map(([tag, attrs, children], index) => {
    const props: Record<string, string | number> = { key: index };
    for (const [attr, value] of Object.entries(attrs)) {
      const mapped = ATTR_MAP[attr];
      if (mapped !== undefined) props[mapped] = value;
    }
    return createElement(tag, props, children === undefined ? undefined : <IconNodes nodes={children} />);
  });
}

export function OfficialFileTypeIcon({
  className,
  fileName,
  size = "xs",
}: {
  className?: string;
  fileName: string;
  size?: FileTypeIconSize;
}) {
  useSyncExternalStore(subscribeFileIconSet, () => cacheGeneration, () => 0);
  const mode = useSyncExternalStore(subscribeTheme, currentThemeMode, () => "light" as const);
  const iconKey = resolvedIconKey(fileName);
  if (iconKey === null) {
    return <Icon className={className} name="File" size={size === "auto" ? "sm" : size} />;
  }
  const box = SIZE_PX[size === "auto" ? "sm" : size];
  const nodes = cached?.icons[mode][iconKey] ?? [];
  const style: CSSProperties = { width: box, height: box };
  return (
    <svg
      aria-hidden="true"
      className={`shrink-0 ${className ?? ""}`.trim()}
      data-file-type-icon=""
      fill="none"
      style={style}
      viewBox="0 0 16 16"
    >
      <IconNodes nodes={nodes} />
    </svg>
  );
}
