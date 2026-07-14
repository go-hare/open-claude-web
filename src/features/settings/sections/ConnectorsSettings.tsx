import { sectionBodyClass } from "../SettingsShell";

/** Official connectors settings shell: migrated to Customize; desktop extensions link. */
export function ConnectorsSettings() {
  return (
    <div className="flex flex-col gap-7 pb-10">
      <main>
        <section className="mb-xl last:mb-0 ">
          <div className={sectionBodyClass}>
            <div className="flex items-start justify-between gap-lg pb-sm">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="text-heading-semibold text-primary">连接器</h3>
                <p className="text-footnote text-secondary">让 Claude 引用其他应用和服务，以获得更多上下文。</p>
                <p className="text-footnote text-secondary">
                  连接器已迁移到
                  <a
                    className="cds-reset inline underline underline-offset-[3px] decoration-[color-mix(in_srgb,currentColor,transparent_60%)] transition duration-fast text-accent outline-none hover:decoration-current focus-visible:decoration-current focus-visible:shadow-focus rounded-[2px] cursor-pointer "
                    href="/customize/connectors"
                  >
                    自定义
                  </a>
                  。
                </p>
              </div>
            </div>
            <div className="pt-md">
              <div className="w-full gap-2 flex justify-center items-center text-text-400">你的组织尚未启用任何连接器</div>
              <div className="mt-6 text-sm text-text-400">
                在找桌面扩展？可在{" "}
                <a
                  className="cds-reset inline underline underline-offset-[3px] decoration-[color-mix(in_srgb,currentColor,transparent_60%)] transition duration-fast text-accent outline-none hover:decoration-current focus-visible:decoration-current focus-visible:shadow-focus rounded-[2px] cursor-pointer "
                  href="/settings/desktop/extensions"
                >
                  这里
                </a>{" "}
                管理。
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
