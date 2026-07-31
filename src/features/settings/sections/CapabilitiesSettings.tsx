import { useId, useMemo } from "react";
import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { GhostSelect } from "../SettingsControls";
import { useSettingsBootstrap } from "../useSettingsBootstrap";
import { readBootstrapFeatureFlag } from "../notificationRowGates";
import { useErrors } from "../errorsToast";
import {
  renderMessageWithLearnMore,
  renderMessageWithLink,
  useCapabilitiesText,
} from "../settingsMessages";
import { normalizeToolSearchMode } from "../toolAccessPreference";

/**
 * Official Capabilities Fe (c71860c77-CQj8rzol):
 * Te Memory · Ce General · _e Visuals · Me (wiggle null) · ee Feature preview · Ee Skills
 *
 * Official show gates (same honesty family as notificationRowGates):
 * - Te Memory: d||c||N — N=melange cohort hard-false in this ion-dist; d/c = host memory
 *   status residual. Product 3P has no Anthropic memory status API → hide (do not invent).
 * - Ce CSV: l = _()||!1 residual (se("chat_follow_up_chips_main") is side-effect only).
 *   Product has no CSV follow-up chip consumer → hide.
 * - Ce Drive: b = u&&S (Drive connector residual). No Drive OAuth invent → hide.
 * - Ce Tool access: k = cache_scoped_prompt_ordering.enable_tool_search — product wired.
 * - _e Artifacts: always when Visuals mounts; product showArtifacts wired.
 * - _e AI turmeric: M = se("apps_use_turmeric") — missing/false hide; no product consumer → hide.
 * - _e Inline: C && (connected visualize MCP || orgBlocked). Product: require real toolKeys.
 * - Ee Skills: $() && se("claudeai_skills") — product Customize/skills residual keeps when flag on.
 * - Me / ee Feature preview: absent without residual arms — do not invent.
 *
 * Account keys still PATCH-able if residual later lands; UI does not show store-only fakes.
 */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Official `_e` Inline residual:
 *   C = se("claudeai_mcp_apps_visualize")
 *   I = connector named residual with isConnected + toolKeys from enabled_mcp_tools
 *   show when C && (I.isConnected || orgBlocked)
 * Product 3P: no invent visualize MCP — require real toolKeys under enabled_mcp_tools
 * (prefix or official enabledKey map) that are not the fake residual-only key.
 */
function inlineVisualizationsResidual(settings: Record<string, unknown>): {
  isConnected: boolean;
  isEnabled: boolean;
  toolKeys: string[];
} {
  const mcpTools = asRecord(settings.enabled_mcp_tools);
  // Official toolKeys come from connected visualize connector tools[].enabledKey.
  // Product honesty: only treat server-scoped keys (server:tool) as real MCP tool keys.
  // Bare residual "inline_visualizations" alone is not a connected connector.
  const toolKeys = Object.keys(mcpTools).filter((key) => key.includes(":"));
  if (toolKeys.length === 0) {
    return { isConnected: false, isEnabled: false, toolKeys: [] };
  }
  const isEnabled = toolKeys.some((key) => mcpTools[key] !== false);
  return { isConnected: true, isEnabled, toolKeys };
}

export function CapabilitiesSettings({
  onNavigate,
}: {
  /** Official ye() SPA navigate for Skills → /customize/skills (Ee residual). */
  onNavigate?: (href: string) => void;
} = {}) {
  const { bootstrap, updateAccountSetting, updateAccountSettings } = useSettingsBootstrap();
  const text = useCapabilitiesText();
  const { addSuccess } = useErrors();
  const settings = bootstrap.account?.settings ?? {};
  const payload = bootstrap.bootstrapPayload;

  const searchSwitchId = useId();
  const csvSwitchId = useId();
  const driveSwitchId = useId();
  const artifactsSwitchId = useId();
  const aiArtifactsSwitchId = useId();
  const inlineSwitchId = useId();

  /**
   * Official Ce CSV: l = _()||!1 residual (not se flag). Product has no CSV chip
   * consumer — hide like missing residual (do not invent store-only switch).
   */
  const showCsv = false;

  /**
   * Official _e AI-powered: M = se("apps_use_turmeric") — true only.
   * Missing/false hide; product has no turmeric consumer → never invent true in GB.
   */
  const showAiArtifacts = useMemo(
    () => readBootstrapFeatureFlag(payload, "apps_use_turmeric") === true,
    [payload],
  );

  /** Official Ee: $() && se("claudeai_skills"). Product Customize/skills residual. */
  const showSkills = useMemo(() => {
    const flag = readBootstrapFeatureFlag(payload, "claudeai_skills");
    // Missing → show product residual (Skills route exists). Explicit false → hide.
    return flag !== false;
  }, [payload]);

  /**
   * Official Te: d||c||N (memory host residual / melange cohort).
   * This ion-dist hard-codes melange cohort false; product 3P has no memory status API.
   * Hide entire Memory section — do not invent saffron/melange store-only toggles.
   */
  const showMemory = false;

  const showToolAccess = useMemo(() => {
    // Official: cache_scoped_prompt_ordering.enable_tool_search.
    // Product residual: missing → show (wired tool_search_mode eager/defer).
    const nested = asRecord(asRecord(payload?.growthbook)?.features);
    const scoped = asRecord(nested.cache_scoped_prompt_ordering);
    const dv = asRecord(scoped.defaultValue);
    if ("enable_tool_search" in dv) return dv.enable_tool_search !== false;
    if ("enable_tool_search" in scoped) return scoped.enable_tool_search !== false;
    return true;
  }, [payload]);

  /**
   * Official Ce Drive: b = u&&S (Drive connector residual).
   * Product does not invent Drive OAuth / cataloging pipeline → hide.
   */
  const showDriveCatalog = false;

  const inlineResidual = useMemo(
    () => inlineVisualizationsResidual(settings),
    [settings],
  );

  const showInlineVisualizations = useMemo(() => {
    // Official _e: C && (I.isConnected || N). Product: no invent N org-block arm
    // as a way to show a disabled fake switch — require connected toolKeys.
    const flag = readBootstrapFeatureFlag(payload, "claudeai_mcp_apps_visualize");
    if (flag === false) return false;
    // Missing flag: still allow residual when real MCP toolKeys exist.
    return inlineResidual.isConnected;
  }, [payload, inlineResidual.isConnected]);

  // Official: b = l?.settings.preview_feature_uses_artifacts ?? !0
  const artifactsEnabled = settings.preview_feature_uses_artifacts !== false;
  // Official AI-powered: enabled_turmeric (row hidden unless showAiArtifacts)
  const aiArtifactsEnabled = settings.enabled_turmeric === true;
  // Official CSV: enable_chat_suggestions (row hidden unless showCsv)
  const csvSuggestionsEnabled = settings.enable_chat_suggestions !== false;

  // Official we(): "off" === (tool_search_mode ?? "auto") ? "off" : "on"
  const toolAccessUi = normalizeToolSearchMode(settings.tool_search_mode);

  const saffronSearchEnabled = settings.enabled_saffron_search === true;
  const memoryFromHistoryEnabled =
    settings.enabled_saffron === true || settings.enabled_melange === true;
  const driveCatalogEnabled = settings.enabled_gdrive_indexing === true;

  const mcpTools = asRecord(settings.enabled_mcp_tools);
  const inlineChecked = showInlineVisualizations && inlineResidual.isEnabled;

  const showGeneral = showCsv || showToolAccess || showDriveCatalog;
  // Official _e always mounts Visuals (Artifacts row). AI / inline optional.
  const showVisuals = true;

  // Dead-code path kept for residual structure when showMemory later gains host API.
  const memoryHistoryDescription = renderMessageWithLearnMore(
    text.generateMemoryFromHistoryDescriptionCowork,
  );

  return (
    <main className="flex flex-col pb-10">
      {showMemory ? (
        <SettingsSection title={text.memory}>
          <SettingsRow
            htmlFor={searchSwitchId}
            label={text.searchAndReferenceChats}
            description={renderMessageWithLearnMore(text.searchAndReferenceChatsDescription)}
            control={
              <Switch
                id={searchSwitchId}
                checked={saffronSearchEnabled}
                onCheckedChange={(checked) => {
                  void updateAccountSetting("enabled_saffron_search", checked);
                }}
              />
            }
          />
          <SettingsRow
            className="group"
            label={text.generateMemoryFromHistory}
            description={memoryHistoryDescription}
            control={
              <Switch
                checked={memoryFromHistoryEnabled}
                onCheckedChange={(checked) => {
                  // Official toggleSaffron / set memory available writes enabled_saffron.
                  // Batch keys in one PATCH so concurrent void calls cannot clobber.
                  void updateAccountSettings(
                    checked
                      ? { enabled_saffron: true }
                      : { enabled_saffron: false, enabled_melange: false },
                  );
                }}
              />
            }
          />
          {/*
            Official Ne: only when isAvailable; empty → Chat memory · No memory yet.
            Chrome: bg-alpha-1 (not surface-1). No invent hosted memory manage modal.
          */}
          {memoryFromHistoryEnabled ? (
            <div className="flex w-full items-center justify-between rounded-lg bg-alpha-1 px-md py-sm text-left">
              <span className="min-w-0 truncate">
                <span className="text-body text-primary">{text.chatMemory}</span>
                <span className="text-footnote text-muted"> · {text.noMemoryYet}</span>
              </span>
            </div>
          ) : null}
        </SettingsSection>
      ) : null}

      {showGeneral ? (
        <SettingsSection title={text.general}>
          {showToolAccess ? (
            <SettingsRow
              label={text.toolAccessMode}
              description={text.toolAccessModeDescription}
              control={
                <div className="w-[220px]">
                  <GhostSelect
                    align="end"
                    value={toolAccessUi}
                    options={[
                      {
                        value: "on",
                        label: text.loadToolsWhenNeeded,
                        description: text.loadToolsWhenNeededDescription,
                      },
                      {
                        value: "off",
                        label: text.toolsAlreadyLoaded,
                        description: text.toolsAlreadyLoadedDescription,
                      },
                    ]}
                    onChange={(value) => {
                      // Official n({ tool_search_mode: a }) + success toast we()
                      const mode = normalizeToolSearchMode(value);
                      void updateAccountSetting("tool_search_mode", mode).then(() => {
                        addSuccess(
                          mode === "off"
                            ? text.toolAccessSetAlreadyLoaded
                            : text.toolAccessSetLoadWhenNeeded,
                        );
                      });
                    }}
                  />
                </div>
              }
            />
          ) : null}
          {showCsv ? (
            <SettingsRow
              htmlFor={csvSwitchId}
              label={text.csvChatSuggestions}
              description={text.csvChatSuggestionsDescription}
              control={
                <Switch
                  id={csvSwitchId}
                  checked={csvSuggestionsEnabled}
                  onCheckedChange={(checked) => {
                    void updateAccountSetting("enable_chat_suggestions", checked);
                  }}
                />
              }
            />
          ) : null}
          {showDriveCatalog ? (
            <SettingsRow
              htmlFor={driveSwitchId}
              label={text.googleDriveCataloging}
              description={text.googleDriveCatalogingDescription}
              control={
                <Switch
                  id={driveSwitchId}
                  checked={driveCatalogEnabled}
                  onCheckedChange={(checked) => {
                    // Official toggleDriveSearchAndIndexingEnabled → enabled_gdrive_indexing
                    void updateAccountSetting("enabled_gdrive_indexing", checked);
                  }}
                />
              }
            />
          ) : null}
        </SettingsSection>
      ) : null}

      {showVisuals ? (
        <SettingsSection title={text.visuals}>
          <SettingsRow
            htmlFor={artifactsSwitchId}
            label={text.artifacts}
            description={text.artifactsDescription}
            control={
              <Switch
                id={artifactsSwitchId}
                checked={artifactsEnabled}
                onCheckedChange={(checked) => {
                  void updateAccountSetting("preview_feature_uses_artifacts", checked);
                }}
              />
            }
          />
          {showAiArtifacts ? (
            <SettingsRow
              htmlFor={aiArtifactsSwitchId}
              label={text.aiPoweredArtifacts}
              description={text.aiPoweredArtifactsDescription}
              control={
                <Switch
                  id={aiArtifactsSwitchId}
                  checked={aiArtifactsEnabled}
                  onCheckedChange={(checked) => {
                    void updateAccountSetting("enabled_turmeric", checked);
                  }}
                />
              }
            />
          ) : null}
          {showInlineVisualizations ? (
            <SettingsRow
              htmlFor={inlineSwitchId}
              label={text.inlineVisualizations}
              description={text.inlineVisualizationsDescription}
              control={
                <Switch
                  id={inlineSwitchId}
                  checked={inlineChecked}
                  onCheckedChange={(checked) => {
                    // Official: reduce I.toolKeys into enabled_mcp_tools map.
                    // Only when residual toolKeys exist (connected visualize MCP).
                    if (inlineResidual.toolKeys.length === 0) return;
                    const next = { ...mcpTools };
                    for (const key of inlineResidual.toolKeys) {
                      next[key] = checked;
                    }
                    void updateAccountSetting("enabled_mcp_tools", next);
                  }}
                />
              }
            />
          ) : null}
        </SettingsSection>
      ) : null}

      {showSkills ? (
        <SettingsSection title={text.skills}>
          <p className="py-md text-footnote text-secondary">
            {/* Official Ee: ye("/customize/skills") → SPA link, not full reload. */}
            {renderMessageWithLink(text.skillsMoved, "/customize/skills", undefined, onNavigate)}
          </p>
        </SettingsSection>
      ) : null}
    </main>
  );
}
