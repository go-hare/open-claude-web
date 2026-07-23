import { useId, useMemo } from "react";
import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { GhostSelect } from "../SettingsControls";
import { useSettingsBootstrap } from "../useSettingsBootstrap";
import { readBootstrapFeatureFlag } from "../notificationRowGates";
import {
  renderMessageWithLearnMore,
  renderMessageWithLink,
  useCapabilitiesText,
} from "../settingsMessages";

/**
 * Official Capabilities Fe (c71860c77-CQj8rzol):
 * Te Memory · Ce General · _e Visuals · Me (wiggle null) · ee Feature preview · Ee Skills
 *
 * Account keys (index-BELzQL5P):
 * - enabled_saffron_search — Search and reference chats
 * - enabled_saffron — Generate memory from chat history
 * - enabled_melange — melange default (memory mode residual)
 * - tool_search_mode — "on" | "off" (UI maps auto→on, off→off)
 * - enable_chat_suggestions — CSV chat suggestions
 * - enabled_gdrive_indexing — Google Drive cataloging
 * - preview_feature_uses_artifacts / enabled_turmeric
 * - enabled_mcp_tools — map of tool enabledKey → boolean (Inline visualizations)
 *
 * Product residual (3P / custom3p):
 * - GrowthBook missing → show arms that only need account/settings PATCH (no invent Anthropic memory API).
 * - Memory empty Ne only when memory isAvailable residual (enabled_saffron / melange).
 * - Memory description without userSetting API: cowork product → IStNSe/rhY (has zh).
 * - Inline visualizations residual key when no connected MCP tool keys.
 * - Drive cataloging is an account switch (enabled_gdrive_indexing) without inventing Drive OAuth.
 * - Me / ee (Feature preview) stay absent without residual arms — do not invent.
 */

const INLINE_VISUALIZATIONS_TOOL_KEY = "inline_visualizations";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function CapabilitiesSettings({
  onNavigate,
}: {
  /** Official ye() SPA navigate for Skills → /customize/skills (Ee residual). */
  onNavigate?: (href: string) => void;
} = {}) {
  const { bootstrap, updateAccountSetting, updateAccountSettings } = useSettingsBootstrap();
  const text = useCapabilitiesText();
  const settings = bootstrap.account?.settings ?? {};
  const payload = bootstrap.bootstrapPayload;

  const searchSwitchId = useId();
  const csvSwitchId = useId();
  const driveSwitchId = useId();
  const artifactsSwitchId = useId();
  const aiArtifactsSwitchId = useId();
  const inlineSwitchId = useId();

  const showCsv = useMemo(() => {
    const flag = readBootstrapFeatureFlag(payload, "chat_follow_up_chips_main");
    // Official Ce: l = _()||!1  — product residual missing flag still shows on desktop 3P.
    return flag !== false;
  }, [payload]);

  const showAiArtifacts = useMemo(() => {
    const flag = readBootstrapFeatureFlag(payload, "apps_use_turmeric");
    return flag !== false;
  }, [payload]);

  const showSkills = useMemo(() => {
    const flag = readBootstrapFeatureFlag(payload, "claudeai_skills");
    return flag !== false;
  }, [payload]);

  // Official Te Memory residual: product shows account-key arms without Anthropic-hosted status API.
  const showMemory = useMemo(() => {
    const saffron = readBootstrapFeatureFlag(payload, "claudeai_saffron");
    const melange = readBootstrapFeatureFlag(payload, "melange_enabled_for_chat");
    const memoryTab = readBootstrapFeatureFlag(payload, "claudeai_customize_memory_tab_main");
    // Missing flags → show (usable 3P settings). Explicit false → hide.
    return saffron !== false && melange !== false && memoryTab !== false;
  }, [payload]);

  const showToolAccess = useMemo(() => {
    // Official: cache_scoped_prompt_ordering.enable_tool_search. Missing → show product residual.
    const nested = asRecord(asRecord(payload?.growthbook)?.features);
    const scoped = asRecord(nested.cache_scoped_prompt_ordering);
    const dv = asRecord(scoped.defaultValue);
    if ("enable_tool_search" in dv) return dv.enable_tool_search !== false;
    if ("enable_tool_search" in scoped) return scoped.enable_tool_search !== false;
    return true;
  }, [payload]);

  const showDriveCatalog = useMemo(() => {
    // Official needs Drive connector residual; account key still useful for 3P.
    const flag = readBootstrapFeatureFlag(payload, "claudeai_gdrive_cataloging");
    return flag !== false;
  }, [payload]);

  const showInlineVisualizations = useMemo(() => {
    const flag = readBootstrapFeatureFlag(payload, "claudeai_mcp_apps_visualize");
    // Missing → show product residual toggle; explicit false → hide.
    return flag !== false;
  }, [payload]);

  // Official: b = l?.settings.preview_feature_uses_artifacts ?? !0
  const artifactsEnabled = settings.preview_feature_uses_artifacts !== false;
  // Official AI-powered: enabled_turmeric
  const aiArtifactsEnabled = settings.enabled_turmeric === true;
  // Official CSV: enable_chat_suggestions ?? true when General arm on
  const csvSuggestionsEnabled = settings.enable_chat_suggestions !== false;

  // Official we(): "off" === (tool_search_mode ?? "auto") ? "off" : "on"
  const toolAccessUi =
    (settings.tool_search_mode === "off" ? "off" : "on") as "on" | "off";

  const saffronSearchEnabled = settings.enabled_saffron_search === true;
  // Official memory available residual: enabled_saffron true (or melange path).
  const memoryFromHistoryEnabled =
    settings.enabled_saffron === true || settings.enabled_melange === true;
  const driveCatalogEnabled = settings.enabled_gdrive_indexing === true;

  const mcpTools = asRecord(settings.enabled_mcp_tools);
  // Product residual: residual key true, or any tool key explicitly true.
  const inlineChecked =
    mcpTools[INLINE_VISUALIZATIONS_TOOL_KEY] === true
    || Object.entries(mcpTools).some(
      ([key, value]) => key !== INLINE_VISUALIZATIONS_TOOL_KEY && value === true,
    );

  const showGeneral = showCsv || showToolAccess || showDriveCatalog;
  const showVisuals = true; // Artifacts always; AI / inline optional

  // Official Te: without userSetting/admin block + U() cowork → IStNSe/rhY (zh present).
  // Desktop personal shell always surfaces Cowork → cowork description residual.
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
                      },
                      {
                        value: "off",
                        label: text.toolsAlreadyLoaded,
                      },
                    ]}
                    onChange={(value) => {
                      // Official n({ tool_search_mode: a }) with a = "on" | "off"
                      void updateAccountSetting("tool_search_mode", value);
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
                    // Official: reduce toolKeys into enabled_mcp_tools map.
                    // Product residual: write residual key when no live MCP tool keys.
                    void updateAccountSetting("enabled_mcp_tools", {
                      ...mcpTools,
                      [INLINE_VISUALIZATIONS_TOOL_KEY]: checked,
                    });
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
