import { Menu } from "@base-ui-components/react/menu";
import { BaseMenuItem, BaseMenuPopup, BaseSubmenu } from "../../../shell/BaseMenu";
import { Icon } from "../../../shell/icons";
import { PLUGINS_AWARENESS_EMPTY_CTA } from "../customizeGates";

/**
 * Official o7t / PluginsSidebarSection (index-BELzQL5P).
 * Personal plugins header + Ide "Add plugin" menu:
 *   Browse plugins
 *   [if localPluginsVisible] Create plugin → Upload / Create with Claude
 * Empty: isGlobalEmpty && DT() → CTA ("Give Claude role-level…") else plain copy.
 *
 * Host currently has no kT.getPlugins/uploadPlugin/deletePlugin/setPluginEnabled,
 * so localPluginsVisible stays false (official JZ gate).
 */
export function PluginsSidebarSection({
  onBrowsePlugins,
  onUploadPlugin,
  onCreateWithClaude,
  localPluginsVisible = false,
  plugins = [],
}: {
  onBrowsePlugins: () => void;
  onUploadPlugin?: () => void;
  onCreateWithClaude?: () => void;
  localPluginsVisible?: boolean;
  plugins?: Array<{ id: string; name: string }>;
}) {
  const isGlobalEmpty = plugins.length === 0;

  return (
    <div className="flex flex-col gap-px">
      <hr className="border-t border-border-300 my-2 mx-2" />
      <div className="flex items-center justify-between gap-1.5 pb-1 px-3">
        <span className="text-text-500 font-small">Personal plugins</span>
        <Menu.Root>
          <Menu.Trigger
            aria-label="Add plugin"
            title="Add plugin"
            className="cds-reset inline-flex size-5 items-center justify-center rounded-md text-text-500 hover:bg-bg-300 hover:text-text-100 focus-visible:shadow-focus"
          >
            <Icon name="plusSmall" />
          </Menu.Trigger>
          <BaseMenuPopup align="start" side="bottom" sideOffset={4}>
            <BaseMenuItem icon="plugin" onClick={onBrowsePlugins}>
              Browse plugins
            </BaseMenuItem>
            {localPluginsVisible ? (
              <BaseSubmenu
                icon="plusSmall"
                label="Create plugin"
                popupAlign="start"
                popupSide="right"
              >
                <BaseMenuItem
                  icon="ArrowInSquare"
                  onClick={() => {
                    onUploadPlugin?.();
                  }}
                >
                  Upload plugin
                </BaseMenuItem>
                <BaseMenuItem
                  icon="spark"
                  onClick={() => {
                    onCreateWithClaude?.();
                  }}
                >
                  Create with Claude
                </BaseMenuItem>
              </BaseSubmenu>
            ) : null}
          </BaseMenuPopup>
        </Menu.Root>
      </div>

      {isGlobalEmpty ? (
        PLUGINS_AWARENESS_EMPTY_CTA ? (
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
        ) : (
          <p className="text-text-500 text-xs mt-2 mb-4 px-3">
            Plugins that you add or create will appear here.
          </p>
        )
      ) : (
        <div className="flex flex-col gap-px">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="flex items-center rounded-lg text-sm gap-3 px-4 py-1.5 text-text-100"
            >
              <span className="flex size-5 items-center justify-center">
                <Icon name="plugin" />
              </span>
              <span className="truncate">{plugin.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
