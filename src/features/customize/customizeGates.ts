/**
 * Official customize feature gates (index-BELzQL5P / c63a78ed4).
 *
 * - Skills nav + index card: E7t `s = QZ()` / el `u = fs()` where
 *   QZ = KZ() && YZ() = gA("wiggle").isAvailable && gA("skills").isAvailable.
 * - Browse plugins index card: el `m = !(plugins_mode_awareness && selectedMode === "chat")`.
 * - Local plugins create/upload menu: JZ requires host
 *   kT.getPlugins/uploadPlugin/deletePlugin/setPluginEnabled.
 * - Personal plugins empty CTA: c7t uses `isGlobalEmpty && DT()` where DT → bb.
 *   Official desktop customize currently shows plain empty copy (no Browse CTA).
 */

/** Match official reachable customize UI (Skills nav + Create new skills card). */
export const SKILLS_ENABLED = true;

/** Official el: hide only under plugins_mode_awareness + chat mode. */
export const BROWSE_PLUGINS_CARD_VISIBLE = true;

/**
 * Official JZ/localPluginsVisible — Create plugin submenu (Upload / Create with Claude).
 * Official desktop Code customize shows Create plugin when host plugin APIs + flag allow.
 * Local shell enables the c7t menu surface (handlers wired via CustomizePage callbacks).
 */
export const LOCAL_PLUGINS_VISIBLE = true;

/**
 * Official o7t empty personal plugins:
 * awareness CTA when isGlobalEmpty && DT(); else plain copy.
 * Official Code customize (user screenshot) paints awareness CTA + Browse plugins button.
 */
export const PLUGINS_AWARENESS_EMPTY_CTA = true;

export const PLUGINS_SECTION_ENABLED = true;

/**
 * Official Vl skill_creation feature flag (Ia("skill_creation").isAvailable).
 * When true, Add skill menu shows Create skill submenu.
 */
export const SKILL_CREATION_ENABLED = true;
