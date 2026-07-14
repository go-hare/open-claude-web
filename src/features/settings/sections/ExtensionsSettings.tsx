import { useState } from "react";
import type { RouteViewProps } from "../../../app/routes";
import { CdsButton, SettingsRow, SettingsSection, Switch, sectionBodyClass } from "../SettingsShell";
import { useDesktopPreferences } from "../useDesktopPreferences";

/**
 * Official Extensions overview (c71860c77-CrCPjj7D):
 * header Extensions + Browse; list/empty; Advanced settings; Drag .MCPB or .DXT files here to install.
 */
export function ExtensionsOverview({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  return (
    <main className="flex flex-col gap-8 h-full">
      <main className="flex flex-col gap-7">
        <section className="mb-xl last:mb-0 ">
          <div className={sectionBodyClass}>
            <div className="flex items-center justify-between gap-lg py-md  " role="group">
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                <div className="text-body text-primary"><span className="text-heading-semibold">扩展</span></div>
                <div className="text-body text-muted">允许 Claude 直接与电脑上的应用、数据和工具交互。</div>
              </div>
              <div className="flex shrink-0 items-center"><CdsButton>浏览扩展</CdsButton></div>
            </div>
            <div className="pt-md">
              <div className="extensions-overview flex flex-col h-full overflow-y-auto">
                <div className="flex items-center justify-center py-8"><div className="h-24" aria-hidden="true" /></div>
                <hr className="border-b-0.5 border-border-300 col-span-2 my-6 border-0" />
                <div className="flex flex-row gap-2 mb-4">
                  <CdsButton onClick={() => onNavigate("/settings/desktop/extensions/advanced")}>高级设置</CdsButton>
                </div>
                <div>
                  <p className="flex items-center gap-2 mt-0 mb-0">
                    <span className="text-text-500">Drag .MCPB or .DXT files here to install</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </main>
  );
}

export function ExtensionsAdvanced({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  const [preferences, setPreference] = useDesktopPreferences();
  const [status, setStatus] = useState("");
  return (
    <main className="flex flex-col h-full">
      <div className="px-6">
        <div className="extensions-header">
          <div className="flex items-center gap-1 mb-4">
            <span aria-hidden="true" className="inline-block w-4" />
            <BackToExtensions onNavigate={onNavigate} variant="span">All extensions</BackToExtensions>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 space-y-6">
        <SettingsSection title="Extension Settings">
          <SettingsRow description="当有新版本可用时自动更新扩展。关闭后需要手动更新。" label="为扩展开启自动更新" control={<Switch checked={!!preferences.autoUpdateExtensions} onCheckedChange={(checked) => setPreference("autoUpdateExtensions", checked)} />} />
          <SettingsRow description="If enabled, Claude will never use the system Node.js for extension MCP servers. This happens automatically when system’s Node.js is missing or outdated. " label="Use Built-in Node.js for MCP" control={<Switch checked={!!preferences.useBuiltInNodeForMcp} onCheckedChange={(checked) => setPreference("useBuiltInNodeForMcp", checked)} />} />
          <div><p className="text-body text-primary mb-3">Detected tools</p></div>
        </SettingsSection>
        <SettingsSection title="扩展开发者">
          <div className="flex flex-col gap-6 py-md">
            <div className="w-full rounded-lg border border-danger-300 bg-bg-000 p-4 text-sm text-text-300">
              <div className="font-medium mb-1">开发者工具警告</div>
              这些工具仅供扩展开发者使用。错误使用可能导致扩展异常，或影响系统安全。
            </div>
            <div className="flex gap-3 flex-wrap">
              <CdsButton primary onClick={() => setStatus("Install Extension")}>Install Extension</CdsButton>
              <CdsButton onClick={() => setStatus("Install Unpacked Extension")}>Install Unpacked Extension</CdsButton>
              <CdsButton onClick={() => setStatus("打开扩展文件夹")}>打开扩展文件夹</CdsButton>
              <CdsButton onClick={() => setStatus("打开扩展设置文件夹")}>打开扩展设置文件夹</CdsButton>
            </div>
            {status ? <p className="text-footnote text-text-400" role="status">{status}</p> : null}
          </div>
        </SettingsSection>
      </div>
    </main>
  );
}

export function ExtensionsDirectory({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  const [query, setQuery] = useState("");
  return (
    <main className="flex flex-col h-full">
      <main className="flex flex-col gap-4 h-full">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 mb-4">
            <span aria-hidden="true" className="inline-block w-4" />
            <BackToExtensions onNavigate={onNavigate} variant="span">全部扩展</BackToExtensions>
          </div>
          <h1 className="text-lg font-medium">[ANT ONLY] Manage global extension directory</h1>
          <p className="text-sm text-text-300">Upload, update, delete, and manage extensions in the directory</p>
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 px-4 py-2 rounded-lg border border-border-300 bg-bg-000 text-text-100 placeholder:text-text-400 focus:border-border-200 focus:ring-0 focus:outline-none"
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search extensions..."
            value={query}
          />
        </div>
        <div className="min-h-0 h-full">
          <div className="overflow-y-auto overflow-x-hidden min-h-0 pt-2 pb-8 h-full flex flex-col">
            <div className="flex-1 flex flex-col">
              <button className="group/card border-0.5 border-dashed border-border-300 hover:border-border-200 transition-all rounded-2xl flex flex-col gap-3 py-3 px-4 shadow-sm hover:shadow-[0_4px_20px_0_hsl(var(--always-black)/4%)] bg-bg-000 hover:bg-bg-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" type="button">
                <div className="flex flex-row items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-bg-200 flex items-center justify-center" aria-hidden="true" />
                  <div className="flex flex-col justify-center font-ui grow min-h-[4rem]">
                    <p className="text-text-100 text-sm font-medium">Upload new extension</p>
                    <p className="text-text-400 text-xs">向目录添加新扩展</p>
                  </div>
                </div>
              </button>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-text-300 mb-2">No extensions found</p>
                  <p className="text-text-400 text-sm">No extensions are available in the directory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </main>
  );
}

export function ExtensionNotFound({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  return (
    <main className="flex flex-col h-full">
      <div className="flex flex-col gap-4 p-6">
        <BackToExtensions onNavigate={onNavigate}>All extensions</BackToExtensions>
        <p className="text-text-300">未找到扩展</p>
      </div>
    </main>
  );
}

function BackToExtensions({ children, onNavigate, variant = "button" }: Pick<RouteViewProps, "onNavigate"> & { children: string; variant?: "button" | "span" }) {
  if (variant === "span") return <span className="cursor-pointer" onClick={() => onNavigate("/settings/desktop/extensions")}>{children}</span>;
  return (
    <button aria-label="Back" className="inline-flex items-center w-max rounded-sm gap-1.5 pe-1 text-sm" onClick={() => onNavigate("/settings/desktop/extensions")} type="button">
      {children}
    </button>
  );
}

