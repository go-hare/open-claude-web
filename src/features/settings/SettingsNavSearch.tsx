/**
 * Official SettingsNavSearch Kt (cc011544b-CBfVLbtk.js).
 * Field classNames from residual; popup lists section-name hits (Je/qe phrase index later).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../shell/icons";
import type { NavGroup } from "./SettingsShell";
import { useSettingsNavText } from "./settingsMessages";

type Hit = { id: string; label: string; icon?: string };

export function SettingsNavSearch({
  groups,
  onSelect,
}: {
  groups: NavGroup[];
  onSelect: (id: string) => void;
}) {
  const navText = useSettingsNavText();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const items = useMemo(
    () =>
      groups.flatMap((group) =>
        group.sections.map((section) => ({
          id: section.id,
          label: section.label,
          icon: section.icon,
        })),
      ),
    [groups],
  );
  const q = query.trim().toLowerCase();
  const hits: Hit[] = q
    ? items.filter((item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q))
    : [];

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <div
        className="flex h-control w-full cursor-text items-center gap-sm rounded px-sm bg-fill-field shadow-field-ring transition duration-fast [&:hover:not(:focus-within)]:shadow-field-hover has-[:focus-visible]:shadow-focus"
        onClick={() => inputRef.current?.focus()}
      >
        <Icon className="shrink-0 text-muted" name="Search" size="md" />
        <input
          aria-label={navText.searchSettings}
          className="cds-input hide-focus-ring min-w-0 flex-1 border-0 bg-transparent p-0 text-body text-primary outline-none placeholder:text-muted focus-visible:!shadow-none"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={navText.search}
          ref={inputRef}
          type="text"
          value={query}
        />
      </div>
      {open && q ? (
        <div className="absolute left-0 top-full z-popover mt-1 !max-w-none w-[280px] rounded-card bg-surface-3 shadow-panel p-1">
          <div className="max-h-[min(320px,var(--available-height))] overflow-y-auto p-1">
            {hits.length === 0 ? (
              <div className="flex min-h-[120px] flex-col items-center justify-center gap-sm px-md text-center text-muted">
                <Icon name="Search" size="lg" />
                <span className="text-body">{navText.noMatchingSettings}</span>
              </div>
            ) : (
              hits.map((hit) => (
                <button
                  className="flex h-auto w-full !px-1 py-1.5 text-left items-center gap-sm rounded text-body text-primary hover:bg-fill-ghost-hover"
                  key={hit.id}
                  onClick={() => {
                    onSelect(hit.id);
                    setQuery("");
                    setOpen(false);
                  }}
                  type="button"
                >
                  {hit.icon ? <Icon className="shrink-0 text-secondary" name={hit.icon} size="md" /> : null}
                  <span className="min-w-0 flex-1 truncate">{hit.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
