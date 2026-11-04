/**
 * Official formatjs subset for catalog strings we consume at runtime:
 * `{name}` plus `{count, plural, one {…} other {…}}` (nested, `#` → number).
 * Used by Ayx9qWb2Pk / hZaDU7GBba. Not a full ICU engine.
 */

const PLURAL_RE = /\{(\w+)\s*,\s*plural\s*,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g;

export function formatOfficialIcu(
  message: string,
  values: Record<string, string | number> = {},
): string {
  let out = message.replace(PLURAL_RE, (_all, name: string, one: string, other: string) => {
    const raw = values[name];
    const n = typeof raw === "number" ? raw : Number(raw);
    const branch = n === 1 ? one : other;
    return branch.replace(/#/g, String(Number.isFinite(n) ? n : raw ?? ""));
  });
  out = out.replace(/\{(\w+)\s*,\s*number\}/g, (_all, name: string) => String(values[name] ?? ""));
  for (const [key, value] of Object.entries(values)) {
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}
