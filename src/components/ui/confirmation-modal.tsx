"use client";

import { useEffect } from "react";
import { X, AlertTriangle, Trash2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  loading?: boolean;
  accountName?: string;
  isBulkAction?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText = "Cancel",
  type = "danger",
  loading = false,
  accountName,
  isBulkAction = false,
}: ConfirmationModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "danger":
        return {
          icon: Trash2,
          iconBg: "bg-red-100 dark:bg-red-900/40",
          iconColor: "text-red-600 dark:text-red-400",
          alertBg: "bg-red-50 dark:bg-red-900/20",
          alertBorder: "border-red-200 dark:border-red-800",
          alertText: "text-red-800 dark:text-red-200",
          alertSubtext: "text-red-600 dark:text-red-300",
          buttonVariant: "destructive" as const,
        };
      case "warning":
        return {
          icon: AlertTriangle,
          iconBg: "bg-yellow-100 dark:bg-yellow-900/40",
          iconColor: "text-yellow-600 dark:text-yellow-400",
          alertBg: "bg-yellow-50 dark:bg-yellow-900/20",
          alertBorder: "border-yellow-200 dark:border-yellow-800",
          alertText: "text-yellow-800 dark:text-yellow-200",
          alertSubtext: "text-yellow-600 dark:text-yellow-300",
          buttonVariant: "default" as const,
        };
      default:
        return {
          icon: CreditCard,
          iconBg: "bg-blue-100 dark:bg-blue-900/40",
          iconColor: "text-blue-600 dark:text-blue-400",
          alertBg: "bg-blue-50 dark:bg-blue-900/20",
          alertBorder: "border-blue-200 dark:border-blue-800",
          alertText: "text-blue-800 dark:text-blue-200",
          alertSubtext: "text-blue-600 dark:text-blue-300",
          buttonVariant: "default" as const,
        };
    }
  };

  const styles = getTypeStyles();
  const IconComponent = styles.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 ${styles.iconBg} rounded-full flex items-center justify-center`}
            >
              <IconComponent className={`w-5 h-5 ${styles.iconColor}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Account Info */}
          {accountName && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {isBulkAction ? "All Linked Accounts" : accountName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isBulkAction
                      ? "All accounts will be unlinked"
                      : "This account will be unlinked"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning Alert */}
          <div
            className={`flex items-start gap-3 p-4 ${styles.alertBg} ${styles.alertBorder} rounded-lg`}
          >
            <AlertTriangle
              className={`w-5 h-5 ${styles.iconColor} mt-0.5 flex-shrink-0`}
            />
            <div>
              <p className={`text-sm font-medium ${styles.alertText}`}>
                This action cannot be undone
              </p>
              <p className={`text-xs ${styles.alertSubtext} mt-1`}>
                {isBulkAction
                  ? "All transaction data from all accounts will be permanently deleted."
                  : "All associated transaction data will be permanently deleted."}
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>What happens:</strong> The account connection will be
              removed, all transaction history will be deleted, and you'll need
              to re-link the account if you want to track it again.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={styles.buttonVariant}
            onClick={onConfirm}
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Unlinking...
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
