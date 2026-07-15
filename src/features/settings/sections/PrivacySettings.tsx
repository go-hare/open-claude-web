import {
  providerDisplayName,
  useSettingsBootstrap,
} from "../useSettingsBootstrap";

/**
 * Official Privacy personal page (cc989143e):
 * - cn gate: dn() = !raven, else redirect admin privacy /settings
 * - Body _Component18 → _Component16 gateway provider card when org uses external inference
 *   (custom3p / Gateway path). Anthropic-hosted privacy toggles need account GrowthBook arms —
 *   do not invent them here.
 */
export function PrivacySettings() {
  const { bootstrap } = useSettingsBootstrap();
  const providerName = providerDisplayName(bootstrap, "Gateway");

  return (
    <main className="flex flex-col pb-10">
      <div className="pb-xl">
        <div className="flex flex-col rounded-card bg-surface-1 p-lg shadow-card-ring">
          <p className="pb-md text-footnote">
            你当前正通过组织自己的推理提供方（{providerName}）使用 Claude。你的对话会发送到该提供方，而不是 Anthropic，并受你组织与该提供方协议的约束。
          </p>
          <div className="border-t border-alpha-1 pt-sm">
            <div className="flex flex-col gap-md pt-xs">
              <div>
                <p className="text-body text-primary">Anthropic 看不到的内容</p>
                <ul className="list-disc pl-6 pt-1 space-y-1">
                  <li><p className="text-body text-primary">你的提示词、Claude 的回复，以及任何对话内容</p></li>
                  <li><p className="text-body text-primary">你的文件、代码或工作区内容</p></li>
                  <li><p className="text-body text-primary">你的身份信息或账户详情</p></li>
                </ul>
              </div>
              <div>
                <p className="text-body text-primary">Anthropic 可能会接收到的内容（由你的组织配置）</p>
                <ul className="list-disc pl-6 pt-1 space-y-1">
                  <li><p className="text-body text-primary">崩溃报告与错误诊断信息，便于我们修复问题</p></li>
                  <li><p className="text-body text-primary">匿名使用指标，包括使用次数（不含对话内容）</p></li>
                  <li><p className="text-body text-primary">更新检查请求，用于让应用保持最新</p></li>
                  <li><p className="text-body text-primary">诊断报告，但仅在你明确选择“发送给 Anthropic”时才会发送</p></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
