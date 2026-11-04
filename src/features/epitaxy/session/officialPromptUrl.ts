/**
 * Official c11959232 `prompt_url` (CDBo_AYC).
 *
 * Parse `prompt` / `q` first; only when those are empty, fetch `prompt_url`
 * with `credentials:"omit"`, sanitize via pin `Vt` (`index-BELz` `bB` as `Eq`),
 * seed composer text. Fail toast `pSD/WD+/JJ`.
 *
 * Pin `Vt` is unicode sanitization (`bB`/`Eq`), not a markdown stripper.
 * SSH folder confirm is a host invent wall — skip.
 */
import { useEffect, useRef } from "react";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { PROMPT_URL_MESSAGES } from "../officialCodeChromeMessages";

export const OFFICIAL_PROMPT_URL_FAIL_ID = "pSD/WD+/JJ";
export const OFFICIAL_PROMPT_URL_FAIL_MESSAGE = "Failed to load prompt from URL";

export function officialPromptUrlFromSearch(search: string): string | undefined {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const direct = params.get("prompt") ?? params.get("q");
  if (direct) return undefined;
  const url = params.get("prompt_url");
  return url || undefined;
}

/**
 * Official bE `d=i.q??i.prompt` then `u=d?Vt(d):void 0`.
 * Query prompt wins over persist; empty → undefined (caller falls back to wr().text).
 */
export function officialDirectPromptFromSearch(search: string): string | undefined {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const direct = params.get("prompt") ?? params.get("q");
  if (!direct) return undefined;
  const stripped = officialSanitizePromptText(direct);
  return stripped || undefined;
}

/**
 * Official bE `l=i.agent` (Mo query). Not Vt-sanitized.
 * Empty / missing → undefined so wr()?.agent can fill. Do not invent a name.
 */
export function officialAgentFromSearch(search: string): string | undefined {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const agent = new URLSearchParams(raw).get("agent");
  const trimmed = agent?.trim();
  return trimmed || undefined;
}

/**
 * Official index-BELz `Tb` — keys bE strips after consume (`Ha as Oo`).
 * `agent` is parsed by `Lb` but is **not** in Tb (leave it on the URL).
 */
export const OFFICIAL_CONSUMED_SEARCH_KEYS = [
  "q",
  "prompt",
  "prompt_url",
  "folder",
  "src",
  "repositories",
  "repo",
  "environment",
  "runner_pool",
] as const;

/**
 * Official bE `f=i.folder` then `if(p) h(Vt(f)); else setSelectedFolder(f)`.
 * `src=external` is the SSH-folder confirm invent wall — skip.
 */
export function officialFolderFromSearch(search: string): string | undefined {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  if (params.get("src") === "external") return undefined;
  const folder = params.get("folder")?.trim();
  return folder || undefined;
}

/** Official `M.replace(pathname + stripped search)` after Tb consume. */
export function stripOfficialConsumedSearch(search: string): string {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  let changed = false;
  for (const key of OFFICIAL_CONSUMED_SEARCH_KEYS) {
    if (params.has(key)) {
      params.delete(key);
      changed = true;
    }
  }
  if (!changed) return search.startsWith("?") || search === "" ? search : `?${search}`;
  const next = params.toString();
  return next ? `?${next}` : "";
}

export function replaceOfficialConsumedSearch(): void {
  if (typeof window === "undefined") return;
  const next = stripOfficialConsumedSearch(window.location.search);
  if (next === window.location.search) return;
  const url = `${window.location.pathname}${next}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", url);
}

/**
 * Official `index-BELzQL5P.js` `function bB` exported as `Eq` → c119 `Vt`.
 * Pin dump keeps ZWNJ/ZWJ; strips ZWSP/LRM/RLM, bidi overrides, isolates, BOM, PUA.
 */
const OFFICIAL_PROMPT_KEEP_CF = new Set(["‌", "‍"]);

export function officialSanitizePromptText(input: string): string {
  let current = input;
  let previous = "";
  let iterations = 0;
  while (current !== previous && iterations < 10) {
    previous = current;
    current = current.normalize("NFKC");
    current = current.replace(/[\p{Cf}\p{Co}\p{Cn}]/gu, (ch) => (
      OFFICIAL_PROMPT_KEEP_CF.has(ch) ? ch : ""
    ));
    current = current.replace(/[\p{Cc}]/gu, (ch) => (
      ch === "\n" || ch === "\t" || ch === "\r" ? ch : ""
    ));
    current = current
      .replace(/[​‎‏]/g, "")
      .replace(/[‪-‮]/g, "")
      .replace(/[⁦-⁩]/g, "")
      .replace(/[﻿]/g, "")
      .replace(/[-]/g, "");
    iterations += 1;
  }
  if (iterations >= 10) {
    throw new Error(`Unicode sanitization reached maximum iterations (10) for input: ${input.slice(0, 100)}`);
  }
  return current;
}

export function useOfficialPromptUrlSeed({
  addError,
  enabled,
  isComposerReady,
  sessionBound,
  setComposerText,
}: {
  addError?: (message: string, options?: { error?: unknown; messageForLogging?: string }) => void;
  enabled: boolean;
  isComposerReady?: () => boolean;
  /** Official `K.current` — skip fetch/seed when a session is already bound (`void 0!==o`). */
  sessionBound?: boolean;
  setComposerText: (text: string) => void;
}) {
  const text = useI18nText(PROMPT_URL_MESSAGES);
  const setComposerTextRef = useRef(setComposerText);
  setComposerTextRef.current = setComposerText;
  const addErrorRef = useRef(addError);
  addErrorRef.current = addError;
  const isComposerReadyRef = useRef(isComposerReady);
  isComposerReadyRef.current = isComposerReady;

  useEffect(() => {
    if (!enabled || sessionBound || typeof window === "undefined") return undefined;
    const url = officialPromptUrlFromSearch(window.location.search);
    if (!url) return undefined;
    let cancelled = false;
    let seedTimer: number | undefined;
    fetch(url, { credentials: "omit" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((body) => {
        if (cancelled) return;
        const stripped = officialSanitizePromptText(body);
        if (!stripped) return;
        let attempts = 0;
        const seed = () => {
          if (cancelled) return;
          if (isComposerReadyRef.current && !isComposerReadyRef.current()) {
            if (attempts >= 40) return;
            attempts += 1;
            seedTimer = window.setTimeout(seed, 50);
            return;
          }
          setComposerTextRef.current(stripped);
        };
        seed();
      })
      .catch((error) => {
        if (cancelled) return;
        addErrorRef.current?.(text.failedToLoadPromptFromUrl, {
          messageForLogging: "epitaxy: prompt_url fetch failed",
          error,
        });
      });
    return () => {
      cancelled = true;
      if (seedTimer !== undefined) window.clearTimeout(seedTimer);
    };
  }, [enabled, sessionBound, text.failedToLoadPromptFromUrl]);
}
