/**
 * Official J6t AddMarketplaceModal (index-BELzQL5P.js).
 * Tm modalSize 2lg, URL field, Sync → _T.addMarketplace.
 * Host residual: local directory path only; git/url → REMOTE_HOST_UNSUPPORTED (Y6t).
 */
import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { OfficialButton } from "../../shared/OfficialButton";
import { OfficialInlineAlert } from "../../shared/OfficialInlineAlert";
import { OfficialModal } from "../../shared/OfficialModal";
import { OfficialTextInput } from "../../shared/OfficialTextInput";
import { useCustomizeText } from "../customizeMessages";
import {
  findExistingMarketplace,
  formatI18n,
  getCustomPlugins,
  marketplaceErrorCode,
  normalizeMarketplaceInput,
  SUPPORTED_MARKETPLACE_HOSTS,
  type MarketplaceRecord,
} from "./pluginMarketplace";

export function AddMarketplaceModal({
  existingMarketplaces = [],
  initialInput,
  isOpen,
  onClose,
  onSuccess,
}: {
  existingMarketplaces?: MarketplaceRecord[];
  initialInput?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (name: string) => void;
}) {
  const text = useCustomizeText();
  const urlId = useId();
  const [input, setInput] = useState(initialInput ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const normalized = useMemo(() => normalizeMarketplaceInput(input), [input]);

  useEffect(() => {
    if (isOpen && initialInput) setInput(initialInput);
  }, [isOpen, initialInput]);

  const resetAndClose = useCallback(() => {
    setInput("");
    setError(null);
    setPending(false);
    onClose();
  }, [onClose]);

  const onSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      if (!normalized) return;
      const existing = findExistingMarketplace(normalized, existingMarketplaces);
      if (existing) {
        setError(text.marketplaceAlreadyAdded);
        return;
      }
      const add = getCustomPlugins()?.addMarketplace;
      if (!add) {
        setError(text.failedToAddMarketplace);
        return;
      }
      setError(null);
      setPending(true);
      void add(normalized)
        .then((raw) => {
          const result = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
          if (result.success === false) {
            const message = typeof result.error === "string" ? result.error : "";
            setError(mapAddMarketplaceError(message, text));
            return;
          }
          const name =
            typeof result.name === "string" && result.name
              ? result.name
              : typeof result.id === "string"
                ? result.id
                : normalized;
          setInput("");
          setError(null);
          onSuccess?.(name);
          onClose();
        })
        .catch((caught: unknown) => {
          const message = caught instanceof Error ? caught.message : String(caught ?? "");
          setError(mapAddMarketplaceError(message, text));
        })
        .finally(() => {
          setPending(false);
        });
    },
    [existingMarketplaces, normalized, onClose, onSuccess, text],
  );

  return (
    <OfficialModal
      hasCloseButton
      isOpen={isOpen}
      modalSize="2lg"
      onClose={resetAndClose}
      title={text.addMarketplace}
    >
      <form className="flex flex-col gap-4 mt-4" onSubmit={onSubmit}>
        <OfficialInlineAlert message={text.marketplaceTrustWarning} variant="danger" />
        <div className="flex flex-col gap-1.5">
          <div>
            <label className="block text-sm font-medium text-text-200" htmlFor={urlId}>
              {text.url}
            </label>
            <p className="mt-0.5 text-xs text-text-400">{renderMarketplaceUrlHelp(text.addMarketplaceUrlHelp)}</p>
          </div>
          <OfficialTextInput
            autoFocus
            disabled={pending}
            error={!!error}
            id={urlId}
            onChange={(event) => {
              setInput(event.target.value);
              if (error) setError(null);
            }}
            placeholder={text.ownerRepoPlaceholder}
            size="sm"
            value={input}
          />
          {error ? <p className="text-sm text-danger-000 mt-1">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-3">
          <OfficialButton disabled={pending} onClick={resetAndClose} type="button" variant="secondary">
            {text.cancel}
          </OfficialButton>
          <OfficialButton disabled={!normalized || pending} loading={pending} type="submit" variant="primary">
            {text.sync}
          </OfficialButton>
        </div>
      </form>
    </OfficialModal>
  );
}

function mapAddMarketplaceError(message: string, text: { failedToAddMarketplace: string; marketplaceHostUnsupported: string }): string {
  const code = marketplaceErrorCode(message);
  if (code === "REMOTE_HOST_UNSUPPORTED" || /local marketplace path/i.test(message) || /not a directory/i.test(message)) {
    return formatI18n(text.marketplaceHostUnsupported, {
      hosts: SUPPORTED_MARKETPLACE_HOSTS.join(", "),
    });
  }
  return message.trim() || text.failedToAddMarketplace;
}

function renderMarketplaceUrlHelp(template: string) {
  const match = template.split(/<\/?code>/);
  if (match.length < 3) return template;
  return (
    <>
      {match[0]}
      <code className="rounded bg-bg-200 px-1 font-mono">{match[1]}</code>
      {match.slice(2).join("")}
    </>
  );
}
