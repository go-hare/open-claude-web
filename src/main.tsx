import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./app/App";
import { queryClient } from "./app/queryClient";
import { bootstrapAppearanceFromStorage } from "./features/settings/appearanceSettings";
import { ErrorsProvider, ErrorsToastHost } from "./features/settings/errorsToast";
import "./styles/global.css";

bootstrapAppearanceFromStorage();

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element");
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
