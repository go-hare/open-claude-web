/**
 * Official index-BELzQL5P VYt — ConfirmDialog over UYt.pending for $Yt.
 * Mount once near app root (same role as official VYt memo).
 */
import { useSyncExternalStore, type ReactNode } from "react";
import { useCurrentLocale } from "../i18n/footerMenuMessages";
import { useShellText } from "../i18n/shellMessages";
import { ConfirmDialog } from "./ConfirmDialog";
import { officialWorktreeDisposalStore } from "./officialWorktreeDisposalStore";

function uncommittedBody(count: number, locale: string, template: string): string {
  if (locale.startsWith("zh")) {
    return template.replace("{count}", String(count));
  }
  if (count === 1) {
    return "This session's worktree has 1 uncommitted change that will be permanently discarded.";
  }
  return template.replace("{count}", String(count));
}

export function OfficialWorktreeDisposalDialog() {
  const text = useShellText();
  const locale = useCurrentLocale();
  const pending = useSyncExternalStore(
    (listener) => officialWorktreeDisposalStore.subscribe(listener),
    () => officialWorktreeDisposalStore.getState().pending,
    () => null,
  );
  if (!pending) return null;

  const { action, changes, resolve } = pending;
  const finish = (confirmed: boolean) => {
    officialWorktreeDisposalStore.getState().close();
    resolve(confirmed);
  };
  const preview = changes.slice(0, 10);
  const more = changes.length - 10;
  const message: ReactNode = (
    <div className="flex flex-col gap-3">
      <p>{uncommittedBody(changes.length, locale, text.uncommittedDiscardBody)}</p>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-bg-200 p-2 font-mono text-xs text-text-300">
        {preview.join("\n")}
        {more > 0 ? `\n${text.uncommittedAndMore.replace("{more}", String(more))}` : null}
      </pre>
    </div>
  );

  return (
    <ConfirmDialog
      cancelText={text.cancel}
      confirmText={action === "archive" ? text.archiveAnyway : text.deleteAnyway}
      isOpen
      message={message}
      onClose={() => finish(false)}
      onConfirm={() => finish(true)}
      title={action === "archive" ? text.archiveWithUncommittedTitle : text.deleteWithUncommittedTitle}
      variant="danger"
    />
  );
}
