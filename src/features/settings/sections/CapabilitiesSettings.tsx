import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { useSettingsBootstrap } from "../useSettingsBootstrap";

/**
 * Official Capabilities Fe (c71860c77-CQj8rzol):
 * <main className="flex flex-col pb-10">
 *   Te Memory · Ce General · _e Visuals · Me (null) · ee · Ee Skills
 * Visuals Artifacts: account.settings.preview_feature_uses_artifacts ?? true via mutate m()
 *   (same account/settings PATCH as Claude Code ccr_* keys).
 * AI-powered artifacts / Inline visualizations / Memory / CSV suggestions need GrowthBook arms —
 * leave those out rather than invent rows. Skills migration shell matches Ee when skills flag on.
 */
export function CapabilitiesSettings() {
  const { bootstrap, updateAccountSetting } = useSettingsBootstrap();
  const settings = bootstrap.account?.settings ?? {};
  // Official: b = l?.settings.preview_feature_uses_artifacts ?? !0
  const artifactsEnabled = settings.preview_feature_uses_artifacts !== false;

  return (
    <main className="flex flex-col pb-10">
      {/* Official Te Memory / Ce General: omitted until entitlement arms exist */}
      <SettingsSection title="视觉内容">
        <SettingsRow
          description="在对话旁边的独立窗口中生成代码、文档和设计内容。"
          label="Artifacts"
          control={
            <Switch
              checked={artifactsEnabled}
              onCheckedChange={(checked) => {
                void updateAccountSetting("preview_feature_uses_artifacts", checked);
              }}
            />
          }
        />
      </SettingsSection>
      <SettingsSection title="Skills">
        <p className="py-md text-footnote text-secondary">
          Skills 已迁移到{" "}
          <a
            className="cds-reset inline underline underline-offset-[3px] decoration-[color-mix(in_srgb,currentColor,transparent_60%)] transition duration-fast text-accent outline-none hover:decoration-current focus-visible:decoration-current focus-visible:shadow-focus rounded-[2px] cursor-pointer"
            href="/customize/skills"
          >
            自定义
          </a>
          。
        </p>
      </SettingsSection>
    </main>
  );
}
