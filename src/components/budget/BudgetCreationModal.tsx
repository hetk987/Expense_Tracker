"use client";

import { useState, useEffect } from "react";
import { Budget, CreateBudgetRequest, PlaidAccount } from "@/types";
import { useTheme } from "@/hooks/useTheme";
import {
  X,
  DollarSign,
  Calendar,
  Target,
  Building,
  Tag,
  AlertTriangle,
} from "lucide-react";
import { format, addDays, addWeeks, addMonths, addYears } from "date-fns";

interface BudgetCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (budgetData: CreateBudgetRequest) => Promise<void>;
  onUpdate?: (
    budgetId: string,
    updates: Partial<CreateBudgetRequest>
  ) => Promise<void>;
  budget?: Budget | null; // For editing existing budget
  accounts: PlaidAccount[];
  categories: string[];
  loading?: boolean;
}

const BUDGET_TYPES = [
  {
    value: "TOTAL",
    label: "Total Spending",
    icon: DollarSign,
    description: "Set a limit for all spending",
  },
  {
    value: "CATEGORY",
    label: "Category",
    icon: Tag,
    description: "Budget for a specific category",
  },
  {
    value: "MERCHANT",
    label: "Merchant",
    icon: Building,
    description: "Budget for a specific merchant",
  },
  {
    value: "ACCOUNT",
    label: "Account",
    icon: Target,
    description: "Budget for a specific account",
  },
];

const PERIODS = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "CUSTOM", label: "Custom Period" },
];

export default function BudgetCreationModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  budget,
  accounts,
  categories,
  loading = false,
}: BudgetCreationModalProps) {
  const isDark = useTheme();
  const isEditing = !!budget;

  const [formData, setFormData] = useState<CreateBudgetRequest>({
    name: "",
    budgetType: "TOTAL",
    amount: 0,
    period: "MONTHLY",
    startDate: format(new Date(), "yyyy-MM-dd"),
    alertThreshold: 80,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [merchantSuggestions] = useState<string[]>([
    "Amazon",
    "Starbucks",
    "Target",
    "Walmart",
    "McDonald's",
    "Uber",
    "Netflix",
    "Spotify",
  ]);

  // Initialize form data when budget prop changes
  useEffect(() => {
    if (budget) {
      setFormData({
        name: budget.name,
        budgetType: budget.budgetType,
        targetValue: budget.targetValue,
        merchantName: budget.merchantName,
        accountId: budget.accountId,
        amount: budget.amount,
        period: budget.period,
        startDate: format(new Date(budget.startDate), "yyyy-MM-dd"),
        endDate: budget.endDate
          ? format(new Date(budget.endDate), "yyyy-MM-dd")
          : undefined,
        alertThreshold: budget.alertThreshold,
      });
    } else {
      // Reset form for new budget
      setFormData({
        name: "",
        budgetType: "TOTAL",
        amount: 0,
        period: "MONTHLY",
        startDate: format(new Date(), "yyyy-MM-dd"),
        alertThreshold: 80,
      });
    }
    setErrors({});
  }, [budget, isOpen]);

  // Calculate end date based on period
  useEffect(() => {
    if (formData.period !== "CUSTOM" && formData.startDate) {
      const startDate = new Date(formData.startDate);
      let endDate: Date;

      switch (formData.period) {
        case "WEEKLY":
          endDate = addWeeks(startDate, 1);
          break;
        case "MONTHLY":
          endDate = addMonths(startDate, 1);
          break;
        case "YEARLY":
          endDate = addYears(startDate, 1);
          break;
        default:
          return;
      }

      setFormData((prev) => ({
        ...prev,
        endDate: format(endDate, "yyyy-MM-dd"),
      }));
    }
  }, [formData.period, formData.startDate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Budget name is required";
    }

    if (formData.amount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (formData.budgetType === "CATEGORY" && !formData.targetValue) {
      newErrors.targetValue = "Category is required";
    }

    if (formData.budgetType === "MERCHANT" && !formData.merchantName?.trim()) {
      newErrors.merchantName = "Merchant name is required";
    }

    if (formData.budgetType === "ACCOUNT" && !formData.accountId) {
      newErrors.accountId = "Account is required";
    }

    if (formData.endDate && formData.startDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (isEditing && budget && onUpdate) {
        await onUpdate(budget.id, formData);
      } else {
        await onSave(formData);
      }
      onClose();
    } catch (error) {
      console.error("Error saving budget:", error);
    }
  };

  const handleInputChange = (field: keyof CreateBudgetRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? "Edit Budget" : "Create New Budget"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Budget Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Budget Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Monthly Groceries, Coffee Budget"
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Budget Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Budget Type *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BUDGET_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.budgetType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleInputChange("budgetType", type.value)}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-5 h-5 ${
                          isSelected ? "text-blue-600" : "text-gray-500"
                        }`}
                      />
                      <div>
                        <div
                          className={`font-medium ${
                            isSelected
                              ? "text-blue-900 dark:text-blue-100"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {type.label}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {type.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional fields based on budget type */}
          {formData.budgetType === "CATEGORY" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={formData.targetValue || ""}
                onChange={(e) =>
                  handleInputChange("targetValue", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.targetValue
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.targetValue && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.targetValue}
                </p>
              )}
            </div>
          )}

          {formData.budgetType === "MERCHANT" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Merchant Name *
              </label>
              <input
                type="text"
                list="merchant-suggestions"
                value={formData.merchantName || ""}
                onChange={(e) =>
                  handleInputChange("merchantName", e.target.value)
                }
                placeholder="e.g., Starbucks, Amazon"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.merchantName
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
              <datalist id="merchant-suggestions">
                {merchantSuggestions.map((merchant) => (
                  <option key={merchant} value={merchant} />
                ))}
              </datalist>
              {errors.merchantName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.merchantName}
                </p>
              )}
            </div>
          )}

          {formData.budgetType === "ACCOUNT" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account *
              </label>
              <select
                value={formData.accountId || ""}
                onChange={(e) => handleInputChange("accountId", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.accountId
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <option value="">Select an account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} {account.mask ? `••••${account.mask}` : ""}
                  </option>
                ))}
              </select>
              {errors.accountId && (
                <p className="mt-1 text-sm text-red-600">{errors.accountId}</p>
              )}
            </div>
          )}

          {/* Amount and Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Budget Amount *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount || ""}
                  onChange={(e) =>
                    handleInputChange("amount", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.amount
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Period *
              </label>
              <select
                value={formData.period}
                onChange={(e) => handleInputChange("period", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PERIODS.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.startDate
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date {formData.period === "CUSTOM" && "*"}
              </label>
              <input
                type="date"
                value={formData.endDate || ""}
                onChange={(e) =>
                  handleInputChange("endDate", e.target.value || undefined)
                }
                disabled={formData.period !== "CUSTOM"}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formData.period !== "CUSTOM"
                    ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                    : ""
                } ${
                  errors.endDate
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Alert Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Alert Threshold: {formData.alertThreshold}%
            </label>
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={formData.alertThreshold}
              onChange={(e) =>
                handleInputChange("alertThreshold", parseInt(e.target.value))
              }
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>50%</span>
              <span>100%</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              You'll be alerted when spending reaches this percentage of your
              budget
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {isEditing ? "Update Budget" : "Create Budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

