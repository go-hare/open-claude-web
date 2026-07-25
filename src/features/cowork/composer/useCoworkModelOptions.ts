/**
 * Official model-options residual (index-BELzQL5P.js / c11959232):
 *
 *   u2()  — allModelOptions = activeOrganization.claude_ai_bootstrap_models_config
 *   ote / Ye("cowork_model"|"ccr_model") — GrowthBook allowed_models / model / supports_1m_context /
 *                        synthetic_allowed_models filter + 1M duplicates
 *   Fee/Hee/Fm — model id → display name
 *   Sticky:
 *     cowork → "cowork-sticky-model-selector" (zte)
 *     code/epitaxy → "ccr-sticky-model-selector" (Jee)
 *
 * Product: bootstrap comes from app://localhost/api/bootstrap (custom3p), which injects
 * applied userData/configLibrary inferenceModels into claude_ai_bootstrap_models_config
 * and growthbook.features.cowork_model + ccr_model. Never hardcode Anthropic Opus/Sonnet ids.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchBootstrapPayload } from "../../settings/accountSettingsApi";

export type CoworkModelOption = {
  /** Official model field — value sent to CLI / session start. */
  model: string;
  /** Display label (Hee residual). */
  name: string;
  inactive?: boolean;
  overflow?: boolean;
  label_override?: string;
};

export type CoworkModelsConfig = {
  allModelOptions: CoworkModelOption[];
  mainModels: CoworkModelOption[];
  overflowModels: CoworkModelOption[];
  defaultModel: string;
  /** Official default dropdown entry value. */
  defaultSelectorValue: "default";
};

const COWORK_STICKY_MODEL_KEY = "cowork-sticky-model-selector";
/** Official Jee residual — Code / epitaxy model sticky. */
export const CODE_STICKY_MODEL_KEY = "ccr-sticky-model-selector";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Official Fee residual (index-BELzQL5P.js @1364880):
 *   claude-{tier}-{major}[-{minor}][-YYYYMMDD][-fast][1m]
 *   {brand}-v{n}[-{suffix}]
 * Hee joins base/suffix/ctx; product uses Hee-equivalent for labels.
 */
export function formatCoworkModelDisplayName(modelId: string): string {
  if (!modelId) return modelId;
  const ctx = /\[1m\]/i.test(modelId) ? "1M" : undefined;
  const claude = modelId.match(/^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?!\d)(?:-\d{8})?(-fast)?/i);
  if (claude) {
    const [, tier, major, minor, fast] = claude;
    const base = `${tier.charAt(0).toUpperCase()}${tier.slice(1)} ${minor ? `${major}.${minor}` : major}`;
    return [base, fast ? "Fast" : undefined, ctx].filter(Boolean).join(" ");
  }
  // e.g. deepseek-v4-pro → Deepseek 4 Pro (official Fee second branch + Hee)
  const internal = modelId.match(/^([a-z0-9]+)-v(\d+)(?:-([a-z0-9]+))?/i);
  if (internal) {
    const [, brand, ver, suffix] = internal;
    const brandLabel = brand.charAt(0).toUpperCase() + brand.slice(1);
    const suffixLabel =
      suffix && suffix.toLowerCase() !== "prod"
        ? suffix.charAt(0).toUpperCase() + suffix.slice(1)
        : undefined;
    return [brandLabel, ver, suffixLabel, ctx].filter(Boolean).join(" ");
  }
  // Strip trailing [1m] / date for plain ids.
  const cleaned = modelId.replace(/\[[^\]]+\]$/, "").replace(/-20\d{6}$/, "");
  return ctx ? `${cleaned} 1M` : cleaned;
}

function bootstrapOrgModels(bootstrap: Record<string, unknown> | null): CoworkModelOption[] {
  if (!bootstrap) return [];
  const account = asRecord(bootstrap.account);
  const memberships = Array.isArray(account?.memberships) ? account!.memberships : [];
  const membership = asRecord(memberships[0]);
  const organization = asRecord(membership?.organization);
  const config = organization?.claude_ai_bootstrap_models_config;
  if (!Array.isArray(config)) return [];
  const options: CoworkModelOption[] = [];
  for (const row of config) {
    const bag = asRecord(row);
    if (!bag) continue;
    const model = asString(bag.model) ?? asString(bag.id) ?? asString(bag.name);
    if (!model) continue;
    // Official Hee residual: display via Fee(model id). Bootstrap often stores name === model id
    // (e.g. deepseek-v4-pro); only honor a distinct name / label_override as preformatted.
    const rawName = asString(bag.name);
    const labelOverride = asString(bag.label_override);
    const name =
      labelOverride ??
      (rawName && rawName !== model ? rawName : formatCoworkModelDisplayName(model));
    options.push({
      model,
      name,
      inactive: bag.inactive === true,
      overflow: bag.overflow === true,
      label_override: labelOverride,
    });
  }
  return options;
}

function growthbookFeatureDefault(
  bootstrap: Record<string, unknown> | null,
  featureKey: string,
): Record<string, unknown> | null {
  if (!bootstrap) return null;
  const features = asRecord(asRecord(bootstrap.growthbook)?.features);
  if (!features || !(featureKey in features)) return null;
  const feature = asRecord(features[featureKey]);
  return asRecord(feature?.defaultValue) ?? feature;
}

/**
 * Official ote/Ye residual filter over bootstrap models.
 * @param featureKeys preferred GrowthBook feature order (cowork vs ccr).
 */
export function resolveCoworkModelsConfig(
  bootstrap: Record<string, unknown> | null,
  featureKeys: string[] = ["cowork_model", "ccr_model", "3110209724", "1736264167"],
): CoworkModelsConfig {
  const bootstrapModels = bootstrapOrgModels(bootstrap);
  let feature: Record<string, unknown> | null = null;
  for (const key of featureKeys) {
    feature = growthbookFeatureDefault(bootstrap, key);
    if (feature) break;
  }

  const synthetic = asRecord(feature?.synthetic_allowed_models) ?? {};
  const syntheticKeys = Object.keys(synthetic);
  // Official: if cowork_model synthetic_allowed_models non-empty → replace list with those keys.
  if (syntheticKeys.length > 0) {
    const options = syntheticKeys.map((model) => ({
      model,
      name: asString(synthetic[model]) ?? formatCoworkModelDisplayName(model),
      inactive: false,
    }));
    const featureDefault = asString(feature?.model);
    const defaultModel = featureDefault && syntheticKeys.includes(featureDefault)
      ? featureDefault
      : options[0]?.model ?? "";
    return {
      allModelOptions: options,
      mainModels: options,
      overflowModels: [],
      defaultModel,
      defaultSelectorValue: "default",
    };
  }

  const allowed = Array.isArray(feature?.allowed_models)
    ? feature!.allowed_models.filter((item): item is string => typeof item === "string" && item.length > 0)
    : bootstrapModels.map((item) => item.model);
  const supports1m = Array.isArray(feature?.supports_1m_context)
    ? feature!.supports_1m_context.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
  const featureDefault = asString(feature?.model) ?? bootstrapModels[0]?.model ?? "";

  // Expand 1M variants (official ote 1m residual).
  let expanded = bootstrapModels;
  if (supports1m.length > 0) {
    const seen = new Set(expanded.map((item) => item.model));
    const next: CoworkModelOption[] = [];
    for (const item of expanded) {
      next.push(item);
      if (!supports1m.includes(item.model)) continue;
      const oneM = `${item.model}[1m]`;
      if (seen.has(oneM)) continue;
      seen.add(oneM);
      next.push({
        ...item,
        model: oneM,
        // Official Fee/Hee: id with [1m] → "... 1M" display; keep residual readable.
        name: formatCoworkModelDisplayName(oneM),
      });
    }
    expanded = next;
  }

  // Filter to allowed_models when feature provides them; if empty allowed, keep bootstrap list.
  let filtered =
    allowed.length > 0
      ? expanded.filter((item) => allowed.includes(item.model)).map((item) =>
          item.inactive ? { ...item, inactive: false } : item,
        )
      : expanded.map((item) => (item.inactive ? { ...item, inactive: false } : item));

  // Ensure feature default is present even if missing from bootstrap list.
  if (featureDefault && !filtered.some((item) => item.model === featureDefault)) {
    filtered = [
      {
        model: featureDefault,
        name: formatCoworkModelDisplayName(featureDefault),
        inactive: false,
      },
      ...filtered,
    ];
  }

  // If still empty, surface allowed ids as last resort (never invent Sonnet/Opus).
  if (filtered.length === 0 && allowed.length > 0) {
    filtered = allowed.map((model) => ({
      model,
      name: formatCoworkModelDisplayName(model),
      inactive: false,
    }));
  }

  const defaultModel =
    (featureDefault && filtered.some((item) => item.model === featureDefault)
      ? featureDefault
      : filtered[0]?.model) ?? "";

  return {
    allModelOptions: filtered,
    mainModels: filtered.filter((item) => !item.overflow),
    overflowModels: filtered.filter((item) => item.overflow),
    defaultModel,
    defaultSelectorValue: "default",
  };
}

export type CoworkModelSelectorItem = {
  label: string;
  value: string;
};

/**
 * Official new-task / session model dropdown items:
 *   cowork: [{value:"default", label:"Default model"}, ...allModelOptions]
 *   code (c119): [{value:"default", label:"Default"}, ...allModelOptions]  (header "Models")
 */
export function coworkModelSelectorItems(
  config: CoworkModelsConfig,
  options?: { defaultLabel?: string },
): CoworkModelSelectorItem[] {
  const defaultLabel = options?.defaultLabel ?? "Default model";
  return [
    { value: "default", label: defaultLabel },
    ...config.allModelOptions
      .filter((item) => !item.inactive)
      .map((item) => ({
        value: item.model,
        label: item.label_override ?? item.name,
      })),
  ];
}

/** Official Code Models menu residual — Default + bag models (not Sonnet/Opus invent). */
export function codeModelSelectorItems(config: CoworkModelsConfig): CoworkModelSelectorItem[] {
  return coworkModelSelectorItems(config, { defaultLabel: "Default" });
}

export function readStickyModelPreference(storageKey: string): string | null {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function writeStickyModelPreference(storageKey: string, model: string | null): void {
  try {
    if (!model || model === "default") {
      localStorage.removeItem(storageKey);
      return;
    }
    localStorage.setItem(storageKey, model);
  } catch {
    // ignore quota / private mode
  }
}

export function readCoworkStickyModelPreference(): string | null {
  return readStickyModelPreference(COWORK_STICKY_MODEL_KEY);
}

export function writeCoworkStickyModelPreference(model: string | null): void {
  writeStickyModelPreference(COWORK_STICKY_MODEL_KEY, model);
}

export function readCodeStickyModelPreference(): string | null {
  return readStickyModelPreference(CODE_STICKY_MODEL_KEY);
}

export function writeCodeStickyModelPreference(model: string | null): void {
  writeStickyModelPreference(CODE_STICKY_MODEL_KEY, model);
}

/**
 * Normalize session/UI model against allowed bag values.
 * Unknown / shell-leaked ids (grok-4.5, kimi-k3, bare sonnet/opus) → "default".
 */
export function normalizeSelectorModelValue(
  value: string | undefined,
  allowedValues: string[],
): string {
  if (!value || value === "default" || value === "opus-4") return "default";
  if (value === "sonnet-4") value = "sonnet";
  if (allowedValues.length === 0) {
    // Before bootstrap loads: keep non-foreign shortnames only if already default-ish.
    if (value === "sonnet" || value === "opus" || value === "haiku") return "default";
    // Do not keep shell-leaked full ids in the footer while list is empty.
    if (/^(grok|kimi|gpt|o\d)/i.test(value) || value.includes("/")) return "default";
    return value === "default" ? "default" : value;
  }
  if (allowedValues.includes(value)) return value;
  return "default";
}

type ModelOptionsHookResult = {
  ready: boolean;
  config: CoworkModelsConfig;
  items: CoworkModelSelectorItem[];
  preferredSelectorValue: string;
  stickyModelPreference: string | null;
  setStickyModelPreference: (model: string | null) => void;
  labelFor: (value: string) => string;
  defaultModel: string;
};

function useBootstrapModelOptions(input: {
  featureKeys: string[];
  stickyKey: string;
  defaultLabel: string;
  itemsFromConfig: (config: CoworkModelsConfig) => CoworkModelSelectorItem[];
}): ModelOptionsHookResult {
  const [bootstrap, setBootstrap] = useState<Record<string, unknown> | null>(null);
  const [ready, setReady] = useState(false);
  const [sticky, setSticky] = useState<string | null>(() => readStickyModelPreference(input.stickyKey));

  useEffect(() => {
    let alive = true;
    void fetchBootstrapPayload().then((payload) => {
      if (!alive) return;
      setBootstrap(payload);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const config = useMemo(
    () => resolveCoworkModelsConfig(bootstrap, input.featureKeys),
    [bootstrap, input.featureKeys],
  );
  const items = useMemo(() => input.itemsFromConfig(config), [config, input]);

  const setStickyModelPreference = useCallback(
    (model: string | null) => {
      writeStickyModelPreference(input.stickyKey, model);
      setSticky(model && model !== "default" ? model : null);
    },
    [input.stickyKey],
  );

  const preferredSelectorValue = useMemo(() => {
    if (sticky && config.allModelOptions.some((item) => item.model === sticky)) return sticky;
    return "default" as const;
  }, [config.allModelOptions, sticky]);

  const labelFor = useCallback(
    (value: string) =>
      items.find((item) => item.value === value)?.label
      ?? (value === "default" ? input.defaultLabel : formatCoworkModelDisplayName(value)),
    [input.defaultLabel, items],
  );

  return {
    ready,
    config,
    items,
    preferredSelectorValue,
    stickyModelPreference: sticky,
    setStickyModelPreference,
    labelFor,
    defaultModel: config.defaultModel,
  };
}

const COWORK_FEATURE_KEYS = ["cowork_model", "ccr_model", "3110209724", "1736264167"] as const;
const CODE_FEATURE_KEYS = ["ccr_model", "cowork_model", "3110209724", "1736264167"] as const;

/**
 * Official Fte/ote residual for cowork model list + sticky preference.
 */
export function useCoworkModelOptions() {
  const featureKeys = useMemo(() => [...COWORK_FEATURE_KEYS], []);
  const itemsFromConfig = useCallback(
    (config: CoworkModelsConfig) => coworkModelSelectorItems(config),
    [],
  );
  return useBootstrapModelOptions({
    featureKeys,
    stickyKey: COWORK_STICKY_MODEL_KEY,
    defaultLabel: "Default model",
    itemsFromConfig,
  });
}

/**
 * Official c119 Ye("ccr_model") + Jee sticky residual for Code / epitaxy Models menu.
 * Effort section stays separate (fm residual) — not part of model list.
 */
export function useCodeModelOptions() {
  const featureKeys = useMemo(() => [...CODE_FEATURE_KEYS], []);
  const itemsFromConfig = useCallback(
    (config: CoworkModelsConfig) => codeModelSelectorItems(config),
    [],
  );
  return useBootstrapModelOptions({
    featureKeys,
    stickyKey: CODE_STICKY_MODEL_KEY,
    defaultLabel: "Default",
    itemsFromConfig,
  });
}
