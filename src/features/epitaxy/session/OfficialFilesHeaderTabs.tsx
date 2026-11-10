/**
 * Official cccc `Db` + cfe7 `Hm`/`q` Files header tabs (pill appearance).
 * Empty: title "Files" (`Im`). Open: ListBullet + tablist "Open files" (pin 2.31226.1 has no catalog id).
 * Tab icon: c280 `Eb` / `Ac` fileName size xs (`Vm`/`P`).
 */
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import { OfficialFileTypeIcon } from "./OfficialFileTypeIcon";
import { fileTabBasename } from "./officialFilesWordWrap";

export function OfficialFilesHeaderTabs({
  activePath,
  closeFileLabel,
  filesLabel,
  onActivate,
  onClose,
  onToggleTree,
  tabs,
  treeShown,
  treeTooltip,
}: {
  activePath?: string;
  closeFileLabel: string;
  filesLabel: string;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
  onToggleTree: () => void;
  tabs: string[];
  treeShown: boolean;
  treeTooltip: string;
}) {
  return (
    <div className="relative z-[1] flex min-w-0 flex-1 items-center gap-1 overflow-hidden draggable-none">
      <OfficialButton
        ariaLabel={treeTooltip}
        className="shrink-0 rounded text-secondary"
        icon="ListBullet"
        onClick={onToggleTree}
        pressed={treeShown}
        variant="ghost"
      />
      {tabs.length === 0 ? (
        <span className="text-body text-t7 select-none truncate pl-[1px]">{filesLabel}</span>
      ) : (
        <div
          aria-label="Open files"
          className="relative isolate -mx-[4px] flex min-w-0 flex-1 select-none items-center gap-[4px] overflow-x-hidden p-[4px] draggable-none"
          data-view-tab-bar=""
          role="tablist"
        >
          {tabs.map((path) => {
            const selected = path === activePath;
            const label = fileTabBasename(path);
            return (
              <div
                className={`group/tab relative isolate flex select-none min-w-[calc(1.25rem*var(--cds-rem-scale,1)_+_4px)] max-w-max h-[calc(1.5rem*var(--cds-rem-scale,1))] basis-[192px] items-center gap-[4px] overflow-clip text-body text-secondary rounded p-[2px] ${selected ? "text-primary" : "justify-start"}`}
                data-selected={selected || undefined}
                data-vtb-id={path}
                key={path}
                role="presentation"
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 -z-[1] rounded-[inherit] group-hover/tab:bg-fill-ghost-hover ${selected ? "!bg-fill-ghost-selected" : ""}`}
                />
                <button
                  aria-selected={selected}
                  className="flex h-full flex-1 items-center outline-none hide-focus-ring bg-transparent border-0 min-w-[22px] gap-[2px] px-0 cursor-default"
                  onClick={() => onActivate(path)}
                  role="tab"
                  title={path}
                  type="button"
                >
                  <span aria-hidden="true" className="grid size-[calc(1.25rem*var(--cds-rem-scale,1))] shrink-0 place-items-center">
                    <OfficialFileTypeIcon className="text-muted" fileName={label} size="xs" />
                  </span>
                  <span className="flex h-full min-w-0 max-w-[140px] flex-1 items-center overflow-x-clip">
                    <span className="whitespace-nowrap text-left truncate">{label}</span>
                  </span>
                </button>
                <button
                  aria-hidden="true"
                  aria-label={closeFileLabel}
                  className="grid size-[calc(1.25rem*var(--cds-rem-scale,1))] shrink-0 place-items-center rounded-sm text-muted hover:bg-fill-ghost-hover hover:text-primary group-data-[selected]/tab:text-primary bg-transparent border-0 cursor-default"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose(path);
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  tabIndex={-1}
                  type="button"
                >
                  <Icon name="XCrossCloseMedium" size="xs" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
