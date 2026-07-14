import { useState } from "react";
import { CdsButton, sectionBodyClass, secondaryButtonClass } from "../SettingsShell";

/**
 * Official Local MCP servers R/D (cadc35a07):
 * title 7+U8x5o7v9 + empty TrS+kwadjI + Edit configuration + Developer docs J1rj3Exw6V.
 */
export function DesktopDeveloper() {
  const [status, setStatus] = useState("");
  return (
    <main className="flex flex-col gap-8 h-full">
      <section className="mb-xl last:mb-0 ">
        <div className="mb-md flex items-start justify-between gap-lg">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="text-heading-semibold text-primary">
              本地 MCP 服务器
              <span className="block pt-xs text-footnote font-normal text-secondary">添加并管理你当前正在开发的 MCP 服务器。 </span>
            </h3>
          </div>
        </div>
        <div className={sectionBodyClass}>
          <div className="flex flex-col h-[180px] pt-md">
            <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden h-full">
              <div className="flex flex-col gap-3 items-center justify-center text-center flex-1 gap-4">
                <div className="h-[72px] w-[72px]" aria-hidden="true" />
                <p className="max-w-[60%] text-text-300">尚未添加任何服务器</p>
                <div className="inline-flex gap-3">
                  <CdsButton primary onClick={() => setStatus("编辑配置")}>编辑配置</CdsButton>
                  <a className={secondaryButtonClass} href="https://modelcontextprotocol.io/quickstart" rel="noopener noreferrer" target="_blank">
                    <span className="absolute inset-0 -z-[1] rounded-[inherit] transition-colors duration-fast group-focus-visible/btn:shadow-[inset_0_0_0_1px_var(--cds-page-bg)] bg-fill-secondary group-hover/btn:bg-fill-secondary-hover group-aria-pressed/btn:bg-accent group-hover/btn:group-aria-pressed/btn:bg-accent cds-btn-squish shadow-field" />
                    <span className="inline-flex items-center gap-1 ">开发者文档</span>
                  </a>
                </div>
                {status ? <p className="text-footnote text-text-400" role="status">{status}</p> : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
