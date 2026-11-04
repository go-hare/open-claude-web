/**
 * Official c11959232 Ho residual around EpitaxyChatPanel:
 * fallback → uc({ message: "Something went wrong loading this session.", onBack, error }).
 * Product uses EpitaxyLandingError for the same copy + Back to landing page.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { EpitaxyLandingError } from "../EpitaxyFrameSurface";

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
  }

  render() {
    if (this.state.error) {
      // Official c119 Ho → uc({ message, onBack, error }) — always Back (KGeQPLIrlo), never Fazw Try again.
      return <EpitaxyLandingError error={this.state.error} onBack={this.props.onBack} />;
    }
    return this.props.children;
  }
}
