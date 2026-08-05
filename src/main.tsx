import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./app/App";
import { queryClient } from "./app/queryClient";
import { bootstrapAppearanceFromStorage } from "./features/settings/appearanceSettings";
import { ErrorsProvider, ErrorsToastHost } from "./features/settings/errorsToast";
import { getInitialLocale, loadI18nResource } from "./i18n/footerMenuMessages";
import "./styles/global.css";
import "./styles/sidebarInteractions.css";

bootstrapAppearanceFromStorage();

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element");
}

// Preload locale catalog before first paint so useI18nText does not flash English
// defaultMessage while /i18n/{locale}.json + overrides are still in flight (hard refresh).
void (async () => {
  try {
    await loadI18nResource(getInitialLocale());
  } catch {
    /* catalog fetch failed — render with defaultMessage fallback */
  }
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ErrorsProvider>
          <App />
          <ErrorsToastHost />
        </ErrorsProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
})();
