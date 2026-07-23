/**
 * Official ErrorsProvider residual (index-BELzQL5P DC/PC + tXt/XQt/QQt/ZQt):
 * - DC: toasts state + addError / addApiError / addSuccess / clearToast
 * - PC: useContext(RC) — must be under provider
 * - tXt: group by uniqueKey/message, map → XQt, viewport QQt
 * - XQt: default duration 6500; info = background, warning/danger = foreground
 * - QQt: fixed top-right z-toast (desktop titlebar offset via --toast-top-offset)
 *
 * Profile X (c0db37792): addSuccess("Saved" fsB/4pdUqN) / addError("Couldn't save…" ecSHaFmEbs).
 * No @radix-ui/react-toast in package.json — structure/classNames match XQt; auto-dismiss via timeout.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "../../shell/icons";

export type ToastType = "info" | "warning" | "danger";

export type AppToast = {
  details?: string;
  duration?: number;
  id: number;
  message: ReactNode;
  toastType: ToastType;
  uniqueKey?: string;
};

export type AddErrorOptions = {
  error?: unknown;
  errorContext?: unknown;
  messageForLogging?: string;
  timeout?: number;
  uniqueKey?: string;
};

export type AddSuccessOptions = {
  timeout?: number;
  uniqueKey?: string;
};

export type ErrorsContextValue = {
  addApiError: (error: unknown, options?: AddErrorOptions) => number;
  addError: (message: ReactNode, options?: AddErrorOptions) => number;
  addSuccess: (message: ReactNode, options?: AddSuccessOptions) => number;
  clearToast: (id: number) => void;
  toasts: AppToast[];
};

const ErrorsContext = createContext<ErrorsContextValue | null>(null);

const DEFAULT_INFO_DURATION_MS = 6500;
const TOAST_ANIMATION_CLASS = "_toastAnimation_14na3_2";

export function ErrorsProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const idRef = useRef(1);

  const clearToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addError = useCallback((message: ReactNode, options?: AddErrorOptions) => {
    const id = idRef.current++;
    setToasts((current) => [
      ...current,
      {
        id,
        message,
        toastType: "warning",
        uniqueKey: options?.uniqueKey,
        duration: options?.timeout,
        details: "",
      },
    ]);
    return id;
  }, []);

  const addApiError = useCallback(
    (error: unknown, options?: AddErrorOptions) => {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "This isn't working right now. You can try again later.";
      return addError(message, options);
    },
    [addError],
  );

  const addSuccess = useCallback((message: ReactNode, options?: AddSuccessOptions) => {
    const id = idRef.current++;
    setToasts((current) => [
      ...current,
      {
        id,
        message,
        toastType: "info",
        uniqueKey: options?.uniqueKey,
        duration: options?.timeout,
      },
    ]);
    return id;
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      addError,
      addApiError,
      addSuccess,
      clearToast,
    }),
    [toasts, addError, addApiError, addSuccess, clearToast],
  );

  return <ErrorsContext.Provider value={value}>{children}</ErrorsContext.Provider>;
}

/** Official PC() */
export function useErrors(): ErrorsContextValue {
  const value = useContext(ErrorsContext);
  if (!value) throw new Error("Must be called within ErrorsProvider");
  return value;
}

/** Soft hook for optional contexts (tests / tree without provider). */
export function useErrorsOptional(): ErrorsContextValue | null {
  return useContext(ErrorsContext);
}

type GroupedToast = {
  count: number;
  toast: AppToast;
  toastIds: number[];
};

function groupToasts(toasts: AppToast[]): GroupedToast[] {
  const map = new Map<string, GroupedToast>();
  for (const toast of toasts) {
    const key =
      toast.uniqueKey ??
      (typeof toast.message === "string" || typeof toast.message === "number"
        ? String(toast.message)
        : `id:${toast.id}`);
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.toastIds.push(toast.id);
    } else {
      map.set(key, { count: 1, toast, toastIds: [toast.id] });
    }
  }
  return Array.from(map.values());
}

function ToastCard({
  duration,
  message,
  onClose,
  type,
}: {
  duration: number | undefined;
  message: ReactNode;
  onClose: () => void;
  type: ToastType;
}) {
  // Official XQt + radix data-state: open uses _toastAnimation translateX reverse (slide in from right).
  // closed: fade reverse; tXt waits ~200ms after onOpenChange(false) before clearToast.
  const [state, setState] = useState<"open" | "closed">("open");
  const closedRef = useRef(false);
  const resolvedDuration =
    duration ?? (type === "info" ? DEFAULT_INFO_DURATION_MS : Number.POSITIVE_INFINITY);

  const beginClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    setState("closed");
    window.setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (!Number.isFinite(resolvedDuration) || resolvedDuration <= 0) return;
    const timer = window.setTimeout(beginClose, resolvedDuration);
    return () => window.clearTimeout(timer);
  }, [beginClose, resolvedDuration]);

  const iconName = type === "info" ? "CheckCircle" : type === "danger" ? "XCircle" : "Warning";
  const colorContext = type === "danger" ? "danger" : type === "warning" ? "warning" : undefined;

  return (
    <div className={`flex justify-end ${TOAST_ANIMATION_CLASS}`} data-state={state}>
      <div
        data-color-context={colorContext}
        className={[
          "max-w-lg rounded-xl border-0.5 shadow-md p-2 text-sm overflow-hidden bg-bg-000 border-border-100",
          type === "warning" ? "bg-warning-900 border-warning-200" : "",
          type === "danger" ? "bg-danger-900 border-danger-200" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="status"
      >
        <div
          className={[
            "flex gap-2 justify-between ml-1",
            type === "warning" ? "text-warning-000" : "",
            type === "danger" ? "text-danger-000" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="flex min-w-0 items-start gap-2">
            <div className="flex h-6 items-center">
              <Icon name={iconName} size="md" alt={type} />
            </div>
            <div className="mt-0.5 min-w-0 break-words select-text">{message}</div>
          </div>
          <button
            type="button"
            className="cds-reset inline-flex size-6 shrink-0 items-center justify-center rounded text-inherit opacity-70 outline-none transition hover:opacity-100 focus-visible:shadow-focus"
            aria-label="Close"
            onClick={beginClose}
          >
            <Icon name="X" size="sm" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Official tXt + QQt viewport (desktop: pad under titlebar). */
export function ErrorsToastHost() {
  const { toasts, clearToast } = useErrors();
  const groups = useMemo(() => groupToasts(toasts), [toasts]);

  return (
    <div
      className="fixed top-0 z-toast flex flex-col gap-3 p-4 draggable-none pointer-events-none"
      style={{
        right: "var(--launch-drawer-width, 0px)",
        paddingTop: "var(--toast-top-offset, 48px)",
      }}
      aria-label="Notifications"
    >
      {groups.map((group) => {
        const key = group.toastIds.join("-");
        const duration =
          group.toast.duration ?? (group.toast.toastType === "info" ? undefined : Number.POSITIVE_INFINITY);
        return (
          <div key={key} className="pointer-events-auto">
            <ToastCard
              duration={duration}
              message={
                group.count > 1 ? (
                  <span>
                    {group.toast.message}{" "}
                    <span className="opacity-70">×{group.count}</span>
                  </span>
                ) : (
                  group.toast.message
                )
              }
              type={group.toast.toastType}
              onClose={() => {
                // ToastCard already waited ~200ms in data-state=closed before calling onClose.
                group.toastIds.forEach(clearToast);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
