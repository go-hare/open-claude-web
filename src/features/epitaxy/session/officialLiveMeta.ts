/**
 * Official ion-dist index-BELzQL5P `Fke` / `Uke` live meta extraction.
 *
 * CLI emits:
 * - system init → model + permissionMode
 * - system status → permissionMode when mode changes (EnterPlanMode / ExitPlanMode / Shift+Tab / set_permission_mode)
 * - assistant (root) → model when present and not "<synthetic>"
 *
 * Official merges into bucket.liveMeta; Mode pill is seeded from host session.permissionMode
 * (`be(n.permissionMode)`) and live-updated via system/status (Fke) + permission_mode_changed.
 */

export type OfficialLiveMeta = {
  model?: string;
  permissionMode?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Official permission modes accepted by the Mode pill / CLI. */
const PERMISSION_MODES = new Set([
  "acceptEdits",
  "auto",
  "bypassPermissions",
  "default",
  "dontAsk",
  "plan",
]);

function normalizePermissionMode(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const mapped = value === "bypass" ? "bypassPermissions" : value;
  return PERMISSION_MODES.has(mapped) ? mapped : undefined;
}

/**
 * Official `Fke(e)` — extract live meta from a single CLI / bridge message envelope.
 * Accepts either the raw CLI event or a `{ type:"message", message }` bridge wrapper.
 */
export function extractOfficialLiveMeta(event: unknown): OfficialLiveMeta | null {
  const outer = asRecord(event);
  // Bridge shape: { type: "message", message: <cli event> }
  const raw =
    stringValue(outer.type) === "message" && outer.message && typeof outer.message === "object"
      ? asRecord(outer.message)
      : outer;

  const type = stringValue(raw.type);
  if (type === "assistant" && !raw.parent_tool_use_id) {
    const model = stringValue(asRecord(raw.message).model) ?? stringValue(raw.model);
    if (model && model !== "<synthetic>") return { model };
    return null;
  }

  if (type !== "system") return null;
  const subtype = stringValue(raw.subtype);
  if (subtype === "init") {
    const meta: OfficialLiveMeta = {};
    const model = stringValue(raw.model);
    if (model && model !== "<synthetic>") meta.model = model;
    const permissionMode = normalizePermissionMode(stringValue(raw.permissionMode));
    if (permissionMode) meta.permissionMode = permissionMode;
    return Object.keys(meta).length > 0 ? meta : null;
  }
  if (subtype === "status") {
    const permissionMode = normalizePermissionMode(stringValue(raw.permissionMode));
    return permissionMode ? { permissionMode } : null;
  }
  return null;
}

/** Official `Uke(messages)` — fold Fke over a transcript list (last write wins). */
export function foldOfficialLiveMeta(events: unknown[]): OfficialLiveMeta | null {
  let meta: OfficialLiveMeta | null = null;
  for (const event of events) {
    const next = extractOfficialLiveMeta(event);
    if (next) meta = { ...(meta ?? {}), ...next };
  }
  return meta;
}

/**
 * Mode recovery from transcript: only system/status (CLI mode transitions).
 * system/init must NOT clobber host session.permissionMode on cold open —
 * official Mode pill seeds from session.permissionMode (`be(n.permissionMode)`),
 * not from Uke(init). Status is the live Fke signal for EnterPlanMode / ExitPlanMode.
 */
export function foldOfficialStatusPermissionMode(events: unknown[]): string | undefined {
  let mode: string | undefined;
  for (const event of events) {
    const outer = asRecord(event);
    const raw =
      stringValue(outer.type) === "message" && outer.message && typeof outer.message === "object"
        ? asRecord(outer.message)
        : outer;
    if (stringValue(raw.type) !== "system" || stringValue(raw.subtype) !== "status") continue;
    const permissionMode = normalizePermissionMode(stringValue(raw.permissionMode));
    if (permissionMode) mode = permissionMode;
  }
  return mode;
}
