import { useState } from "react";

/**
 * Official add-custom-connector modal surface (Ht opens qa with connectorName/Url).
 * Fields align with i18n: Name + Server URL (C9POHlEjKc / Remote MCP server URL).
 */
export function AddCustomConnectorDialog({
  initialName = "",
  initialUrl = "",
  onClose,
  onSubmit,
}: {
  initialName?: string;
  initialUrl?: string;
  onClose: () => void;
  onSubmit: (value: { name: string; url: string }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState(initialUrl);
  const canSubmit = url.trim().length > 0;

  return (
    <div className="fixed inset-0 z-popover flex items-center justify-center bg-[hsl(var(--always-black)/40%)] p-4" role="dialog" aria-label="Add custom connector">
      <div className="w-full max-w-md rounded-2xl border border-border-300 bg-bg-000 shadow-panel">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-300">
          <h2 className="font-large-bold">Add custom connector</h2>
          <button type="button" aria-label="关闭" onClick={onClose} className="cds-reset inline-flex size-8 items-center justify-center rounded-lg text-text-300 hover:bg-bg-200">
            ×
          </button>
        </div>
        <form
          className="flex flex-col gap-4 px-6 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            onSubmit({ name: name.trim(), url: url.trim() });
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-text-300">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 rounded-lg border border-border-300 bg-bg-100 px-3 text-sm text-text-100 outline-none focus:shadow-focus"
              placeholder="My MCP server"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-text-300">Server URL</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="h-10 rounded-lg border border-border-300 bg-bg-100 px-3 text-sm text-text-100 outline-none focus:shadow-focus"
              placeholder="https://"
              required
            />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-border-300 px-3 text-sm text-text-100 hover:bg-bg-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-9 items-center rounded-lg bg-text-000 px-3 text-sm text-bg-000 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
