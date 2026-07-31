/**
 * Official index-BELzQL5P kAt residual.
 * Mount: sticky chat input, after t$t, wrapper `px-4 pb-2` (v$t ~228178).
 * connected → null; connecting → Reconnecting... + Wa spinner;
 * disconnected + countdown → qq7KTocoOK; else Disconnected + Reconnect/Retry now.
 * CTA: official Dc secondary sm. Icons: Wa spinner / Ga warning (product Icon Spinner/Warning).
 * Host connectionState enum: connected | connecting | disconnected (no reconnecting).
 * Not the g$t status-row one-liner ("Reconnecting..." text-xs).
 */
import { useEffect, useState } from "react";
import { OfficialButton } from "../../../shared/OfficialButton";
import { Icon } from "../../../../shell/icons";

export function CoworkReconnectBanner({
  connectionState,
  nextReconnectTime,
  onRetryNow,
}: {
  connectionState?: string;
  nextReconnectTime?: number | null;
  onRetryNow?: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  useEffect(() => {
    if (typeof nextReconnectTime !== "number" || !Number.isFinite(nextReconnectTime)) {
      setSecondsLeft(null);
      return undefined;
    }
    const tick = () => {
      setSecondsLeft(Math.max(0, Math.ceil((nextReconnectTime - Date.now()) / 1000)));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [nextReconnectTime]);

  if (!connectionState || connectionState === "connected") return null;
  // Official kAt: isConnecting = connectionState === "connecting" only (index ~203285).
  // Product host enum has no "reconnecting"; do not invent extra states.
  const isConnecting = connectionState === "connecting";
  const hasCountdown = secondsLeft !== null && secondsLeft > 0;
  const label = isConnecting
    ? "Reconnecting..."
    : hasCountdown
      ? `Disconnected, attempting to reconnect in ${secondsLeft} second${secondsLeft === 1 ? "" : "s"}...`
      : "Disconnected";
  const ctaLabel = hasCountdown ? "Retry now" : "Reconnect";

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg bg-bg-200 border border-border-300 px-3 py-2 text-sm text-text-200"
      data-official-source="index-BELzQL5P.js:kAt"
    >
      <div className="flex items-center gap-2">
        {isConnecting ? (
          // Official Wa size 16 animate-spin text-text-300 flex-shrink-0
          <Icon
            className="text-text-300 flex-shrink-0 animate-spin"
            customSize={16}
            name="Spinner"
          />
        ) : (
          // Official Ga size 16 text-text-300 flex-shrink-0
          <Icon className="text-text-300 flex-shrink-0" customSize={16} name="Warning" />
        )}
        <span>{label}</span>
      </div>
      {!isConnecting ? (
        // Official Dc variant secondary size sm
        <OfficialButton onClick={() => onRetryNow?.()} size="sm" type="button" variant="secondary">
          {ctaLabel}
        </OfficialButton>
      ) : null}
    </div>
  );
}
