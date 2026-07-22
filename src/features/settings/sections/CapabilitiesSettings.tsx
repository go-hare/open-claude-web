import { useMemo } from "react";
import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { useSettingsBootstrap } from "../useSettingsBootstrap";
import { readBootstrapFeatureFlag } from "../notificationRowGates";

/**
 * Official Capabilities Fe (c71860c77-CQj8rzol):
 * Te Memory · Ce General · _e Visuals · Me · ee · Ee Skills
 *
 * Honest residual (official gates we honor without inventing Anthropic-only arms):
 * - Artifacts: preview_feature_uses_artifacts ?? true (always shown; code-exec lock tooltip omitted without org arm)
 * - AI-powered artifacts: enabled_turmeric; section row gated by apps_use_turmeric
 *   (missing flag → show for 3P product residual; explicit false → hide)
 * - CSV chat suggestions: enable_chat_suggestions ?? true; row gated by chat_follow_up_chips_main
 *   (missing → show; explicit false → hide). Official also OR desktop residual `_()||!1`.
 * - Memory Te: saffron search / melange / chat memory status — Anthropic-hosted; omit without arms
 * - Inline visualizations: claudeai_mcp_apps_visualize + MCP connector tools — omit without connector
 * - Google Drive cataloging: Drive connector residual — omit without connector
 * - Skills Ee: desktop && claudeai_skills (missing → show migration; explicit false → hide)
 */
export function CapabilitiesSettings() {
  const { bootstrap, updateAccountSetting } = useSettingsBootstrap();
  const settings = bootstrap.account?.settings ?? {};
  const payload = bootstrap.bootstrapPayload;

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

  // Official: b = l?.settings.preview_feature_uses_artifacts ?? !0
  const artifactsEnabled = settings.preview_feature_uses_artifacts !== false;
  // Official AI-powered: enabled_turmeric
  const aiArtifactsEnabled = settings.enabled_turmeric === true;
  // Official CSV: enable_chat_suggestions ?? true when General arm on
  const csvSuggestionsEnabled = settings.enable_chat_suggestions !== false;

  const showGeneral = showCsv; // Drive/tool-search arms not present
  const showVisuals = true; // Artifacts always; AI row optional

  return (
    <main className="flex flex-col pb-10">
      {/* Official Te Memory omitted without saffron/melange/memory status arms */}
      {showGeneral ? (
        <SettingsSection title="General">
          {showCsv ? (
            <SettingsRow
              label="CSV chat suggestions"
              description="Claude will suggest responses when you upload CSVs to your conversation."
              control={
                <Switch
                  checked={csvSuggestionsEnabled}
                  onCheckedChange={(checked) => {
                    void updateAccountSetting("enable_chat_suggestions", checked);
                  }}
                />
              }
            />
          ) : null}
        </SettingsSection>
      ) : null}
      {showVisuals ? (
        <SettingsSection title="Visuals">
          <SettingsRow
            label="Artifacts"
            description="Generate code, documents, and designs in a dedicated window alongside your conversation."
            control={
              <Switch
                checked={artifactsEnabled}
                onCheckedChange={(checked) => {
                  void updateAccountSetting("preview_feature_uses_artifacts", checked);
                }}
              />
            }
          />
          {showAiArtifacts ? (
            <SettingsRow
              label="AI-powered artifacts"
              description="Build apps and interactive documents that use Claude inside the artifact."
              control={
                <Switch
                  checked={aiArtifactsEnabled}
                  onCheckedChange={(checked) => {
                    void updateAccountSetting("enabled_turmeric", checked);
                  }}
                />
              }
            />
          ) : null}
          {/* Inline visualizations omitted: needs claudeai_mcp_apps_visualize + connected MCP tools */}
        </SettingsSection>
      ) : null}
      {showSkills ? (
        <SettingsSection title="Skills">
          <p className="py-md text-footnote text-secondary">
            Skills have moved to{" "}
            <a
              className="cds-reset inline cursor-pointer rounded-[2px] text-accent underline decoration-[color-mix(in_srgb,currentColor,transparent_60%)] underline-offset-[3px] outline-none transition duration-fast hover:decoration-current focus-visible:shadow-focus focus-visible:decoration-current"
              href="/customize/skills"
            >
              Customize
            </a>
            .
          </p>
        </SettingsSection>
      ) : null}
    </main>
  );
}
