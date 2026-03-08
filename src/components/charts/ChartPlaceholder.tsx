import { LucideIcon, AlertTriangle, BarChart3 } from "lucide-react";

export function ChartLoadingSpinner() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );
}

type ChartEmptyOrErrorProps = {
  type: "error" | "empty";
  message: string;
  subMessage?: string;
  icon?: LucideIcon;
};

const defaultIcons = {
  error: AlertTriangle,
  empty: BarChart3,
};

const defaultSubMessages = {
  error: "Try refreshing the page",
  empty: "Sync transactions to see your data",
};

export function ChartEmptyOrError({
  type,
  message,
  subMessage,
  icon: Icon = defaultIcons[type],
}: ChartEmptyOrErrorProps) {
  const isError = type === "error";
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div
          className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            isError
              ? "bg-red-100 dark:bg-red-900/20"
              : "bg-gray-100 dark:bg-gray-800"
          }`}
        >
          <Icon
            className={`h-8 w-8 ${
              isError ? "text-red-400" : "text-gray-400"
            }`}
          />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{message}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {subMessage ?? defaultSubMessages[type]}
        </p>
      </div>
    </div>
  );
}

export function ChartErrorFallback() {
  return (
    <div className="h-full flex items-center justify-center">
      <ChartEmptyOrError
        type="error"
        message="Chart failed to render"
        subMessage="Try refreshing the page"
      />
    </div>
  );
}
