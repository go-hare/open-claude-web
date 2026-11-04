import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  accountDetailsFromBootstrap,
  bootstrapUrls,
} from "../../../app/useDesktopCoworkAccountSync";
import { Icon } from "../../../shell/icons";
import { OfficialSparkIdle } from "../../shared/OfficialSparkIdle";
import { resolveCoworkHomeGreetingPolish } from "../composer/options";
import { openCoworkAgentFeedback } from "../session/activity/openCoworkAgentFeedback";
import {
  COWORK_SUPPORT_URL,
  resolveCoworkHeaderTitle,
  useCoworkNewTaskText,
} from "./coworkNewTaskMessages";

/** Official c621 gn `hn` — without this clamp, font-display can explode (~300px). */
const OFFICIAL_POLISH_TITLE_STYLE = {
  lineHeight: 1.5,
  fontSize: "clamp(1.875rem, 1.2rem + 2vw, 2.5rem)",
} as CSSProperties;

/** Official e90tCrG7ls ICU: `{learnSafely} or {giveFeedback}.` */
function renderCoworkSafetyOrFeedback(
  template: string,
  values: { learnSafely: ReactNode; giveFeedback: ReactNode },
): ReactNode {
  const parts = template.split(/(\{learnSafely\}|\{giveFeedback\})/g);
  return parts.map((part, index) => {
    if (part === "{learnSafely}") return <span key={index}>{values.learnSafely}</span>;
    if (part === "{giveFeedback}") return <span key={index}>{values.giveFeedback}</span>;
    return <span key={index}>{part}</span>;
  });
}

function openCoworkFeedback() {
  openCoworkAgentFeedback({ source: "agent_new_page" });
}

/**
 * Official c621 `ke` gate = org capabilities includes `raven` (shared-25 `kB`/`Pr`).
 * Chip `dr` only mounts when gate is true; 3p Gateway without raven → null (no invent).
 */
function useCoworkRavenOrgChip(): { name: string } | null {
  const [chip, setChip] = useState<{ name: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      for (const url of bootstrapUrls()) {
        try {
          const response = await fetch(url, { credentials: "include", cache: "no-store" });
          if (!response.ok) continue;
          const contentType = response.headers.get("content-type") || "";
          let payload: unknown = null;
          if (contentType.includes("json")) {
            payload = await response.json();
          } else {
            const text = await response.text();
            if (text.startsWith("{") || text.startsWith("[")) payload = JSON.parse(text) as unknown;
          }
          if (!payload || cancelled) return;
          const details = accountDetailsFromBootstrap(payload);
          // Residual ke: raven capability. Product maps account.is_raven.
          if (!details.isRaven || !details.organizationName) {
            setChip(null);
            return;
          }
          setChip({ name: details.organizationName });
          return;
        } catch {
          /* try next */
        }
      }
      if (!cancelled) setChip(null);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);
  return chip;
}

/**
 * Official c621 `dr` org chip above title when `ke()`.
 * Class string copied from residual mount (new node — not thrash swap).
 */
function CoworkOrgChip({ name }: { name: string }) {
  return (
    <div
      className="ml-0.5 inline-flex items-center rounded-lg h-8 pr-2.5 mb-5 text-center font-small bg-neutral-30 text-muted select-none gap-1 pl-1.5"
      data-official-source="c62135ccf-Dn28vJ3V.js:dr org chip"
    >
      <Icon name="Organization" size="md" />
      {name}
    </div>
  );
}

/**
 * Official c62135ccf `ir` / `gn` (2.31226.1):
 * - optional `dr` org chip when `ke()` (raven)
 * - polish (`cowork_home_greeting_polish`): centered `font-display text-secondary` + NUs72amU1j
 * - else: Spark `bt` size 28 + h1 `font-claude-response-title text-primary` + mWPGSbK6BB
 * - subtitle `rr({centered})`: e90tCrG7ls (or LOH63KpAMC when consider path off — product always shows both)
 *
 * Icon is official idle Spark `Am` via `bt`/`PC` — NOT the 248×248 Ace asset.
 */
export function CoworkHeader({
  polish: polishProp,
}: {
  /** Override GB polish gate; default = resolveCoworkHomeGreetingPolish(). */
  polish?: boolean;
} = {}) {
  const text = useCoworkNewTaskText();
  const polish = polishProp ?? resolveCoworkHomeGreetingPolish();
  const title = resolveCoworkHeaderTitle(text, polish);
  const orgChip = useCoworkRavenOrgChip();

  return (
    <div className="mb-6 pl-2" data-official-source="c62135ccf-Dn28vJ3V.js:ir/gn Cowork page header">
      {orgChip ? <CoworkOrgChip name={orgChip.name} /> : null}
      {polish ? (
        <h1
          className="font-display text-secondary -ml-2 text-balance text-center"
          data-official-source="c62135ccf-Dn28vJ3V.js:gn NUs72amU1j"
          style={OFFICIAL_POLISH_TITLE_STYLE}
        >
          <OfficialSparkIdle className="mr-[0.35em] inline-block h-[0.8em] w-[0.8em] align-[-0.075em]" />
          {title}
        </h1>
      ) : (
        <div className="flex items-start">
          <div className="-ml-10 mr-3 mt-1 shrink-0 hidden md:block">
            <OfficialSparkIdle className="block" size={28} />
          </div>
          <h1 className="font-claude-response-title text-primary">{title}</h1>
        </div>
      )}
      <p
        className={
          polish
            ? "font-small text-muted mt-3 -ml-2 flex flex-wrap items-center justify-center gap-2"
            : "font-small text-muted mt-2 flex flex-wrap items-center gap-2"
        }
        data-official-source="c62135ccf-Dn28vJ3V.js:rr subtitle"
      >
        {renderCoworkSafetyOrFeedback(text.safetyOrFeedback, {
          learnSafely: (
            <a className="underline-offset-2 hover:underline" href={COWORK_SUPPORT_URL} rel="noreferrer" target="_blank">
              {text.learnSafely}
            </a>
          ),
          giveFeedback: (
            <button className="underline-offset-2 hover:underline" onClick={openCoworkFeedback} type="button">
              {text.giveFeedback}
            </button>
          ),
        })}
      </p>
    </div>
  );
}
