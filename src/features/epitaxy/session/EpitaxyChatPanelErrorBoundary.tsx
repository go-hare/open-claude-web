/**
 * Official cc432 `pL` / shared-23 Ho residual around EpitaxyChatPanel:
 *   zr({ message: z0PjNhLbSp, onRetry, error })
 * `onRetry` = Xy(sessionId)+eM(sessionId)+reset. Product: clearError + remount.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { EpitaxyLandingError } from "../EpitaxyFrameSurface";
import { officialCodeSessionStore } from "./officialCodeSessionStore";

type Props = {
  children: ReactNode;
  onBack: () => void;
  sessionId?: string;
};

type State = {
  error: Error | null;
};

export class EpitaxyChatPanelErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prevProps: Props) {
    // Official pL reset is per-session. Vite HMR / invalid-hook can trap the panel
    // on the same id — still allow retry. Switching sessions always clears.
    if (prevProps.sessionId !== this.props.sessionId && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Residual: Sentry/Ho tags { feature: epitaxy, sessionId } — product logs only.
    if (typeof console !== "undefined") {
      console.warn("[EpitaxyChatPanel]", this.props.sessionId, error, info.componentStack);
    }
    if (typeof window !== "undefined") {
      (window as Window & { __epitaxyHoLast?: unknown }).__epitaxyHoLast = {
        sessionId: this.props.sessionId,
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
      };
    }
  }

  retry = () => {
    const sessionId = this.props.sessionId;
    if (sessionId) officialCodeSessionStore.getState().clearError(sessionId);
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      // Official pL → zr({ message: z0PjNhLbSp, onRetry }). Keep onBack as secondary exit.
      return (
        <EpitaxyLandingError
          error={this.state.error}
          onBack={this.props.onBack}
          onRetry={this.retry}
        />
      );
    }
    return this.props.children;
  }
}
