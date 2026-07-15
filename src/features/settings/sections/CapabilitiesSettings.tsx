import { useState } from "react";
import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";

/**
 * Official Capabilities Fe (c71860c77-CQj8rzol):
 * <main><Te Memory /><Ce General /><_e Visuals /><Me null /><_Component15 /><Ee Skills /></main>
 * Memory/General tool arms need account GrowthBook + API; ship Visuals Artifacts + Skills migration shell.
 * Do not invent gated Memory/tool-search UI without arms — leave section slots empty rather than fake rows.
 */
export function CapabilitiesSettings() {
  const [artifacts, setArtifacts] = useState(true);
  return (
    <main className="flex flex-col pb-10">
      {/* Official Te Memory / Ce General: omitted until entitlement arms exist */}
      <SettingsSection title="视觉内容">
        <SettingsRow
          description="在对话旁边的独立窗口中生成代码、文档和设计内容。"
          label="Artifacts"
          control={<Switch checked={artifacts} onCheckedChange={setArtifacts} />}
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
