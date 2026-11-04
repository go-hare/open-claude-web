/**
 * Official Storage Cn / gn / _n / bn (c71860c77-C_7Gqn1u).
 * Host: claude.web.DeviceStorage + CoworkStorage (asar Lkt / eAt).
 * Do not invent previewCleanup / runCodeCleanup / workspace VM bytes.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { CdsDialog, CdsDialogBackdrop, CdsDialogCloseButton, CdsDialogTitle } from "../CdsDialog";
import { CdsButton, SettingsRow } from "../SettingsShell";
import {
  formatStorageBytes,
  formatStorageIcu,
  useDesktopSettingsText,
} from "../settingsMessages";
import { useErrorsOptional } from "../errorsToast";

type DeviceStorageUsage = {
  app: {
    browserPanesBytes: number;
    logsBytes: number;
    otherCachesBytes: number;
    webCacheBytes: number;
  };
  code?: {
    otherHistoryBytes: number;
    recordsBytes: number;
    scratchBytes: number;
    sessionCount: number;
    transcriptsBytes: number;
    worktrees: {
      bytes: number;
      count: number;
      idleCleanBytes: number;
      idleCleanCount: number;
      inUseCount: number;
      keptDirtyCount: number;
      repoCount: number;
    };
  };
  computedAt: number;
  incomplete: boolean;
  runtime: {
    claudeCodeBytes: number;
    claudeCodeVersionCount: number;
  };
};

type CoworkStorageUsage = {
  computedAt: number;
  conversations: {
    attachmentsBytes: number;
    chatCount: number;
    count: number;
    generatedFilesBytes: number;
    otherBytes: number;
    pluginCopiesBytes: number;
    stale: Array<{ bytes: number; count: number; olderThanDays: number }>;
    transcriptsBytes: number;
  };
  incomplete: boolean;
  otherBytes: number;
  shared: { pluginsBytes: number; skillsBytes: number };
  totalBytes: number;
  workspace?: {
    leftoverBytes: number;
    otherBytes: number;
    pendingUpdateBytes: number;
    sessionDiskBytes: number;
    systemImageBytes: number;
  };
};

type CoworkStorageCounts = {
  chatCount: number;
  count: number;
};

type LoadState<T> =
  | { status: "loading"; counts?: CoworkStorageCounts }
  | { status: "ready"; value: T; refreshing: boolean }
  | { status: "error" }
  | { status: "unavailable" };

type DeviceStorageBridge = {
  clearCacheAndRestart?: () => Promise<boolean | void>;
  getUsage?: (refresh?: boolean) => Promise<DeviceStorageUsage>;
  reveal?: () => Promise<unknown>;
};

type CoworkStorageBridge = {
  getCounts?: () => Promise<CoworkStorageCounts | null | undefined>;
  getUsage?: (refresh?: boolean) => Promise<CoworkStorageUsage | null | undefined>;
  reveal?: () => Promise<unknown>;
};

const STALE_DAYS = 30;
const HN =
  "settings-group-dividers scroll-fade-y -mx-pad-xl -my-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-xl py-2";
const POPUP_CLASS =
  "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col w-[calc(100vw-2rem)] max-w-[720px] max-h-[calc(100dvh_-_max(2rem,2*var(--desktop-titlebar-inset,0px))_-_2*max(env(safe-area-inset-top,0px),env(safe-area-inset-bottom,0px)))] rounded-card bg-surface-2 shadow-panel-lg outline-none z-modal cds-reset text-body font-normal text-primary";

function webRoot(): { DeviceStorage?: DeviceStorageBridge; CoworkStorage?: CoworkStorageBridge } | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { "claude.web"?: { DeviceStorage?: DeviceStorageBridge; CoworkStorage?: CoworkStorageBridge } })["claude.web"];
}

function deviceStorage(): DeviceStorageBridge | undefined {
  return webRoot()?.DeviceStorage;
}

function coworkStorage(): CoworkStorageBridge | undefined {
  return webRoot()?.CoworkStorage;
}

function workspaceBytes(usage: CoworkStorageUsage | null | undefined): number {
  const workspace = usage?.workspace;
  if (!workspace) return 0;
  return (
    workspace.systemImageBytes
    + workspace.sessionDiskBytes
    + workspace.pendingUpdateBytes
    + workspace.leftoverBytes
    + workspace.otherBytes
  );
}

function splitAreas(device: DeviceStorageUsage, cowork: CoworkStorageUsage | null) {
  const code = device.code;
  const vm = workspaceBytes(cowork);
  return {
    cowork: cowork ? cowork.totalBytes - vm : 0,
    code: code
      ? code.recordsBytes + code.transcriptsBytes + code.worktrees.bytes + code.scratchBytes
      : 0,
    runtime: vm + device.runtime.claudeCodeBytes,
    app:
      device.app.webCacheBytes
      + device.app.browserPanesBytes
      + device.app.logsBytes
      + device.app.otherCachesBytes,
  };
}

function relativeWhen(computedAt: number, locale?: string): string {
  const deltaSec = Math.round((computedAt - Date.now()) / 1000);
  const abs = Math.abs(deltaSec);
  const rtf = new Intl.RelativeTimeFormat(locale || undefined, { numeric: "auto" });
  if (abs < 60) return rtf.format(deltaSec, "second");
  if (abs < 3600) return rtf.format(Math.round(deltaSec / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(deltaSec / 3600), "hour");
  return rtf.format(Math.round(deltaSec / 86_400), "day");
}

function StackedMeter({
  categories,
  label,
  values,
}: {
  categories: Array<{ color?: string; hidden?: boolean; id: string; label: string }>;
  label: string;
  values: Record<string, number>;
}) {
  const visible = categories.filter((item) => !item.hidden);
  const total = visible.reduce((sum, item) => sum + (values[item.id] ?? 0), 0);
  return (
    <div
      aria-label={label}
      className="flex h-2 w-full overflow-hidden rounded-full bg-surface-300"
      data-cds="StackedMeter"
      role="img"
    >
      {visible.map((item, index) => {
        const amount = values[item.id] ?? 0;
        if (amount <= 0 || total <= 0) return null;
        const color =
          item.color === "muted"
            ? "var(--cds-chart-muted, var(--cds-text-muted))"
            : `var(--cds-chart-categorical-${index + 1}, var(--cds-fill-accent))`;
        return (
          <div
            key={item.id}
            style={{ width: `${(amount / total) * 100}%`, backgroundColor: color }}
          />
        );
      })}
    </div>
  );
}

/**
 * Official xn (c71860c77): Trigger `text-footnote` "Details" + Panel `flex flex-col gap-sm pt-sm`.
 * Native disclosure — do not import `@base-ui-components/react/collapsible` here
 * (Vite prebundle duplicate React → invalid hook / overlay crash).
 */
function Details({ children, label }: { children: ReactNode; label: string }) {
  const text = useDesktopSettingsText();
  return (
    <details>
      <summary aria-label={label} className="text-footnote cursor-pointer select-none">
        {text.details}
      </summary>
      <div className="flex flex-col gap-sm pt-sm">{children}</div>
    </details>
  );
}

function KindBar({
  items,
  label,
}: {
  items: Array<{ bytes: number; id: string; label: string }>;
  label: string;
}) {
  const shown = items.filter((item) => item.bytes > 0);
  const total = shown.reduce((sum, item) => sum + item.bytes, 0);
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-col gap-xs">
      {total > 0 ? (
        <div
          aria-label={`${label}: ${shown.map((item) => `${item.label} ${formatStorageBytes(item.bytes)}`).join("; ")}`}
          className="flex h-1 w-full gap-px overflow-hidden rounded-full bg-surface-2"
          role="img"
        >
          {shown.map((item) => (
            <div
              key={item.id}
              style={{
                width: `${(item.bytes / total) * 100}%`,
                backgroundColor: "var(--cds-chart-categorical-2, var(--cds-fill-accent))",
              }}
            />
          ))}
        </div>
      ) : null}
      <ul className="flex flex-wrap items-center gap-x-lg gap-y-xs" role="list">
        {shown.map((item) => (
          <li className="inline-flex items-center gap-xs whitespace-nowrap text-footnote" key={item.id}>
            <span className="text-secondary">{item.label}</span>
            <span className="tabular-nums text-muted">{formatStorageBytes(item.bytes)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CoworkRow({
  bytes,
  cowork,
}: {
  bytes: number | null;
  cowork: LoadState<CoworkStorageUsage>;
}) {
  const text = useDesktopSettingsText();
  if (cowork.status === "unavailable") return null;
  const ready = cowork.status === "ready" ? cowork.value : null;
  const stale = ready?.conversations.stale.find((item) => item.olderThanDays === STALE_DAYS);
  const counts = cowork.status === "loading" ? cowork.counts : undefined;
  let description: ReactNode;
  if (ready) {
    const countLine = formatStorageIcu(
      ready.conversations.chatCount > 0 ? text.coworkTasksAndChats : text.coworkTasksOnly,
      { count: ready.conversations.count },
    );
    const staleLine =
      stale && stale.count > 0
        ? formatStorageIcu(text.coworkStaleActivity, {
            count: stale.count,
            days: STALE_DAYS,
            size: formatStorageBytes(stale.bytes),
          })
        : formatStorageIcu(text.coworkAllActive, { days: STALE_DAYS });
    description = `${countLine} ${staleLine}`;
  } else if (cowork.status === "error") {
    description = text.storageUnavailable;
  } else if (counts) {
    description = formatStorageIcu(
      counts.chatCount > 0 ? text.coworkMeasuringChats : text.coworkMeasuringTasks,
      { count: counts.count },
    );
  } else {
    description = <div className="h-5 w-2/3 rounded bg-surface-300" />;
  }
  return (
    <SettingsRow
      below={
        ready && ready.totalBytes > 0 ? (
          <Details label={text.coworkTaskDetails}>
            <KindBar
              items={[
                {
                  id: "history",
                  label: text.taskHistory,
                  bytes: ready.conversations.transcriptsBytes + ready.conversations.otherBytes,
                },
                {
                  id: "files",
                  label: text.attachmentsAndGeneratedFiles,
                  bytes: ready.conversations.attachmentsBytes + ready.conversations.generatedFilesBytes,
                },
                {
                  id: "pluginCopies",
                  label: text.perTaskPluginCopies,
                  bytes: ready.conversations.pluginCopiesBytes,
                },
                {
                  id: "shared",
                  label: text.pluginsAndSkills,
                  bytes: ready.shared.pluginsBytes + ready.shared.skillsBytes,
                },
              ]}
              label={text.coworkStorageByKind}
            />
          </Details>
        ) : undefined
      }
      control={
        <span className="text-body text-primary tabular-nums">
          {ready && bytes !== null ? formatStorageBytes(bytes) : null}
        </span>
      }
      description={description}
      label={text.coworkTasks}
    />
  );
}

function StorageBody() {
  const text = useDesktopSettingsText();
  const errors = useErrorsOptional();
  const [device, setDevice] = useState<LoadState<DeviceStorageUsage>>({ status: "loading" });
  const [cowork, setCowork] = useState<LoadState<CoworkStorageUsage>>(() =>
    coworkStorage()?.getUsage ? { status: "loading" } : { status: "unavailable" },
  );
  const gen = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback((refresh: boolean) => {
    const n = ++gen.current;
    clearTimeout(retryTimer.current);
    const deviceApi = deviceStorage();
    const coworkApi = coworkStorage();
    void (deviceApi?.getUsage?.(refresh) ?? Promise.reject(new Error("no DeviceStorage.getUsage")))
      .then((value) => {
        if (n !== gen.current) return;
        setDevice({ status: "ready", value, refreshing: false });
      })
      .catch((error) => {
        if (n !== gen.current) return;
        setDevice((current) => (current.status === "ready" ? { ...current, refreshing: false } : { status: "error" }));
        errors?.addError(text.storageUnavailable, {
          error,
          messageForLogging: "device_storage",
        });
      });
    if (!coworkApi?.getUsage) return;
    const retry = (attempt: number) => {
      void coworkApi.getUsage?.(refresh).then(
        (value) => {
          if (n !== gen.current) return;
          if (value) {
            setCowork({ status: "ready", value, refreshing: false });
            return;
          }
          if (attempt < 5) {
            retryTimer.current = setTimeout(() => retry(attempt + 1), 3000);
            return;
          }
          setCowork((current) =>
            current.status === "ready" ? { ...current, refreshing: false } : { status: "unavailable" },
          );
        },
        () => {
          if (n !== gen.current) return;
          setCowork((current) =>
            current.status === "ready" ? { ...current, refreshing: false } : { status: "error" },
          );
        },
      );
    };
    retry(1);
    void coworkApi.getCounts?.().then((counts) => {
      if (n !== gen.current || !counts) return;
      setCowork((current) => (current.status === "loading" ? { status: "loading", counts } : current));
    }).catch(() => undefined);
  }, [errors, text.storageUnavailable]);

  useEffect(() => {
    const token = gen;
    load(false);
    return () => {
      token.current += 1;
      clearTimeout(retryTimer.current);
    };
  }, [load]);

  const onRefresh = () => {
    setDevice((current) =>
      current.status === "ready" ? { ...current, refreshing: true } : { status: "loading" },
    );
    setCowork((current) =>
      current.status === "ready"
        ? { ...current, refreshing: true }
        : current.status === "unavailable"
          ? current
          : { status: "loading" },
    );
    load(true);
  };

  const refreshing =
    device.status === "loading"
    || (device.status === "ready" && device.refreshing)
    || cowork.status === "loading"
    || (cowork.status === "ready" && cowork.refreshing);

  const footer = (
    <div className="flex shrink-0 items-center justify-end gap-sm border-t border-alpha-1 px-xl py-md">
      <CdsButton
        onClick={() => {
          void deviceStorage()?.reveal?.();
        }}
      >
        <Icon name="Folder" size="sm" />
        {text.openFolder}
      </CdsButton>
      <CdsButton disabled={refreshing} onClick={onRefresh}>
        <Icon name="ArrowClockwise" size="sm" />
        {text.refresh}
      </CdsButton>
    </div>
  );

  if (device.status !== "ready") {
    return (
      <>
        <div aria-busy={device.status === "loading" || undefined} className={HN}>
          {device.status === "loading" ? (
            <div className="flex flex-col gap-md py-sm">
              <div className="h-5 w-1/3 rounded bg-surface-300" />
              <div className="h-2 w-full rounded bg-surface-300" />
              <div className="h-5 w-2/3 rounded bg-surface-300" />
              <div className="h-5 w-1/2 rounded bg-surface-300" />
            </div>
          ) : (
            <SettingsRow description={text.storageUnavailable} label={text.diskSpaceUsed} />
          )}
          <CoworkRow
            bytes={
              cowork.status === "ready"
                ? device.status === "error"
                  ? cowork.value.totalBytes
                  : cowork.value.totalBytes - workspaceBytes(cowork.value)
                : null
            }
            cowork={cowork}
          />
        </div>
        {footer}
      </>
    );
  }

  const coworkReady = cowork.status === "ready" ? cowork.value : null;
  const areas = splitAreas(device.value, coworkReady);
  const total = areas.cowork + areas.code + areas.runtime + areas.app;
  const coworkPending = cowork.status !== "unavailable" && coworkReady === null;
  const incomplete = device.value.incomplete || (coworkReady?.incomplete ?? false) || coworkPending;
  const when = Math.min(device.value.computedAt, coworkReady?.computedAt ?? device.value.computedAt);
  const categories = [
    { id: "cowork", label: text.coworkTasks, hidden: cowork.status !== "ready" },
    { id: "code", label: text.codeSessionsAndWorktrees, hidden: !device.value.code },
    { id: "runtime", label: text.runtime },
    { id: "app", label: text.appCachesAndLogs, color: "muted" },
  ];
  const canClear = typeof deviceStorage()?.clearCacheAndRestart === "function";

  return (
    <>
      <div className={HN}>
        <SettingsRow
          below={
            <div className="flex flex-col gap-sm">
              <StackedMeter categories={categories} label={text.storageByArea} values={areas} />
              <ul className="flex flex-wrap items-center gap-x-lg gap-y-xs" role="list">
                {categories.filter((item) => !item.hidden).map((item) => (
                  <li className="inline-flex items-center gap-xs whitespace-nowrap text-footnote" key={item.id}>
                    <span className="text-secondary">{item.label}</span>
                    <span className="tabular-nums text-muted">{formatStorageBytes(areas[item.id as keyof typeof areas])}</span>
                  </li>
                ))}
              </ul>
            </div>
          }
          control={<span className="font-base-bold text-primary tabular-nums">{formatStorageBytes(total)}</span>}
          description={
            incomplete
              ? text.storageLowerBound
              : formatStorageIcu(text.storageCalculatedWhen, { when: relativeWhen(when) })
          }
          label={text.diskSpaceUsed}
        />
        <CoworkRow bytes={areas.cowork} cowork={cowork} />
        {device.value.code ? (
          <SettingsRow
            control={<span className="text-body text-primary tabular-nums">{formatStorageBytes(areas.code)}</span>}
            description={
              device.value.code.worktrees.count > 0
                ? formatStorageIcu(text.codeSessionsAndWorktreesCount, {
                    sessions: device.value.code.sessionCount,
                    worktrees: formatStorageIcu(text.codeWorktreesCount, {
                      count: device.value.code.worktrees.count,
                    }),
                  })
                : formatStorageIcu(text.codeSessionsCount, {
                    sessions: device.value.code.sessionCount,
                  })
            }
            label={text.codeSessionsAndWorktrees}
          />
        ) : null}
        <SettingsRow
          control={<span className="text-body text-primary tabular-nums">{formatStorageBytes(areas.runtime)}</span>}
          label={text.runtime}
        />
        <SettingsRow
          below={
            areas.app > 0 || canClear ? (
              <Details label={text.appCacheDetails}>
                <KindBar
                  items={[
                    { id: "web", label: text.webCache, bytes: device.value.app.webCacheBytes },
                    { id: "panes", label: text.browserPanes, bytes: device.value.app.browserPanesBytes },
                    { id: "logs", label: text.logs, bytes: device.value.app.logsBytes },
                    { id: "other", label: text.other, bytes: device.value.app.otherCachesBytes },
                  ]}
                  label={text.appStorageByKind}
                />
                {canClear ? (
                  <div>
                    <CdsButton
                      onClick={() => {
                        void deviceStorage()?.clearCacheAndRestart?.();
                      }}
                    >
                      {text.clearCacheAndRestart}
                    </CdsButton>
                  </div>
                ) : null}
              </Details>
            ) : undefined
          }
          control={<span className="text-body text-primary tabular-nums">{formatStorageBytes(areas.app)}</span>}
          description={text.webCacheBrowserPanesLogs}
          label={text.appCachesAndLogs}
        />
      </div>
      {footer}
    </>
  );
}

function StorageDialog({ onOpenChange, open }: { onOpenChange: (open: boolean) => void; open: boolean }) {
  const text = useDesktopSettingsText();
  return (
    <CdsDialog.Root onOpenChange={onOpenChange} open={open}>
      <CdsDialog.Portal>
        <div className="cds-root" data-density="comfortable" data-platform="desktop">
          <CdsDialogBackdrop />
          <CdsDialog.Popup className={POPUP_CLASS} data-cds="Dialog">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]">
              <div className="flex shrink-0 items-start justify-between gap-md px-xl pt-xl pb-md">
                <div className="flex min-w-0 flex-col gap-1">
                  <CdsDialogTitle className="text-heading-semibold text-primary">
                    {text.storage}
                  </CdsDialogTitle>
                  <p className="text-body text-secondary">{text.storageModalDescription}</p>
                </div>
                <CdsDialogCloseButton aria-label={text.close} onClick={() => onOpenChange(false)} />
              </div>
              {open ? <StorageBody /> : null}
            </div>
          </CdsDialog.Popup>
        </div>
      </CdsDialog.Portal>
    </CdsDialog.Root>
  );
}

/** Official wn — Storage row + Manage. Hidden when DeviceStorage.getUsage is absent. */
export function DesktopStorageSettings() {
  const text = useDesktopSettingsText();
  const [open, setOpen] = useState(false);
  if (typeof deviceStorage()?.getUsage !== "function") return null;
  return (
    <>
      <SettingsRow
        control={<CdsButton onClick={() => setOpen(true)}>{text.storageManage}</CdsButton>}
        description={text.storageDescription}
        label={text.storage}
      />
      <StorageDialog onOpenChange={setOpen} open={open} />
    </>
  );
}
