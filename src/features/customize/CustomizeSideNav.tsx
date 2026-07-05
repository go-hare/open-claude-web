import { Icon } from "../../shell/icons";

type CustomizeSideNavProps = {
  activePath: string;
  onBrowsePlugins: () => void;
  onNavigate: (path: string) => void;
};

const PLUGINS_ENABLED = true;
const SKILLS_ENABLED = false;

export function CustomizeSideNav({ activePath, onBrowsePlugins, onNavigate }: CustomizeSideNavProps) {
  // index-BELzQL5P:315919-316033: unframed customize sidebar:
  // nav w-[256px], top back/title, route links, Personal plugins block.
  return (
    <nav className="flex flex-col h-full shrink-0 overflow-hidden border-r border-border-300 bg-bg-100 w-[256px]">
      <div className="flex items-center gap-2 py-3 px-4">
        <button
          type="button"
          aria-label="Back"
          onClick={() => onNavigate("/epitaxy")}
          className="cds-reset inline-flex size-8 items-center justify-center rounded-lg text-text-300 hover:bg-bg-300 hover:text-text-100 focus-visible:shadow-focus"
        >
          <Icon name="arrowLeft" />
        </button>
        <span className="font-large-bold">自定义</span>
      </div>

      <div className="flex flex-col gap-px flex-1 overflow-y-auto p-2">
        {SKILLS_ENABLED ? (
          <CustomizeNavButton active={activePath.startsWith("/customize/skills")} icon="spark" onClick={() => onNavigate("/customize/skills")}>
            Skills
          </CustomizeNavButton>
        ) : null}
        <CustomizeNavButton active={activePath.startsWith("/customize/connectors")} icon="connectors" onClick={() => onNavigate("/customize/connectors")}>
          连接器
        </CustomizeNavButton>

        {PLUGINS_ENABLED ? (
          <>
            <hr className="border-t border-border-300 my-2 mx-2" />
            <div className="flex items-center justify-between gap-1.5 pb-1 px-3">
              <span className="text-text-500 font-small">Personal plugins</span>
              <button
                type="button"
                aria-label="Add plugin"
                onClick={onBrowsePlugins}
                className="cds-reset inline-flex size-5 items-center justify-center rounded-md text-text-500 hover:bg-bg-300 hover:text-text-100 focus-visible:shadow-focus"
              >
                <Icon name="plusSmall" />
              </button>
            </div>
            <div className="flex flex-col gap-3 mt-2 mb-4 px-4 items-center text-center">
              <p className="text-text-500 text-xs">Give Claude role-level expertise with plugins</p>
              <button
                type="button"
                onClick={onBrowsePlugins}
                className="cds-reset inline-flex h-8 items-center justify-center rounded-lg border border-border-300 bg-bg-000 px-3 text-sm text-text-100 shadow-sm hover:bg-bg-100 focus-visible:shadow-focus"
              >
                Browse plugins
              </button>
            </div>
          </>
        ) : null}
      </div>
    </nav>
  );
}

function CustomizeNavButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: string;
  icon: string;
  onClick: () => void;
}) {
  const className = [
    "cds-reset flex items-center rounded-lg text-sm transition-all gap-3 px-4 py-1.5",
    active ? "bg-bg-300 text-text-100 font-semibold" : "text-text-100 hover:bg-bg-300",
  ].join(" ");

  return (
    <button type="button" onClick={onClick} className={className} aria-current={active ? "true" : undefined}>
      <span className="flex size-5 items-center justify-center">
        <Icon name={icon} />
      </span>
      <span>{children}</span>
    </button>
  );
}
