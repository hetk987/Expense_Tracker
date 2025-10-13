"use client";

import { useState, useEffect } from "react";
import { BudgetAlert } from "@/types";
import { budgetApi } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { formatCurrency } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Mail,
  Bell,
  BellOff,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BudgetAlertPanelProps {
  className?: string;
}

export default function BudgetAlertPanel({
  className = "",
}: BudgetAlertPanelProps) {
  const isDark = useTheme();
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emailTesting, setEmailTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("user@example.com");
  const [testName, setTestName] = useState("Test User");

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const alertsData = await budgetApi.getBudgetAlerts();
      setAlerts(alertsData);
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAlerts = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const markAlertAsRead = async (alertId: string) => {
    try {
      await budgetApi.markAlertAsRead(alertId);
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, isRead: true } : alert
        )
      );
    } catch (error) {
      console.error("Error marking alert as read:", error);
    }
  };

  const checkAlerts = async () => {
    try {
      setRefreshing(true);
      const result = await budgetApi.checkBudgetAlerts(testEmail, testName);
      await loadAlerts(); // Reload to get new alerts
      alert(`${result.message}\nEmails sent to: ${testEmail}`);
    } catch (error) {
      console.error("Error checking alerts:", error);
      alert("Failed to check alerts");
    } finally {
      setRefreshing(false);
    }
  };

  const sendWeeklySummary = async () => {
    try {
      setEmailTesting(true);
      const result = await budgetApi.sendWeeklySummary(testEmail, testName);
      alert(`${result.message}\nEmail sent to: ${testEmail}`);
    } catch (error) {
      console.error("Error sending weekly summary:", error);
      alert("Failed to send weekly summary");
    } finally {
      setEmailTesting(false);
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case "EXCEEDED":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "WARNING":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "APPROACHING":
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertColor = (alertType: string, isRead: boolean) => {
    const opacity = isRead ? "opacity-60" : "";
    switch (alertType) {
      case "EXCEEDED":
        return `border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 ${opacity}`;
      case "WARNING":
        return `border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 ${opacity}`;
      case "APPROACHING":
        return `border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 ${opacity}`;
      default:
        return `border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 ${opacity}`;
    }
  };

  const formatAlertMessage = (alert: BudgetAlert) => {
    const budgetName = alert.budget?.name || "Unknown Budget";
    switch (alert.alertType) {
      case "EXCEEDED":
        return `${budgetName} budget exceeded (${alert.percentage}%)`;
      case "WARNING":
        return `${budgetName} budget warning (${alert.percentage}%)`;
      case "APPROACHING":
        return `${budgetName} budget approaching limit (${alert.percentage}%)`;
      default:
        return `${budgetName} budget alert`;
    }
  };

  if (loading) {
    return (
      <div
        className={`${className} bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700`}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${className} bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Budget Alerts
          </h3>
          {alerts.filter((a) => !a.isRead).length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {alerts.filter((a) => !a.isRead).length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshAlerts}
            disabled={refreshing}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh alerts"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Email Testing Section */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Email Notification Testing
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Test email address"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
          <input
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="Test user name"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={checkAlerts}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {refreshing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            Check & Send Alerts
          </button>
          <button
            onClick={sendWeeklySummary}
            disabled={emailTesting}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {emailTesting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            Send Weekly Summary
          </button>
        </div>
      </div>

      {/* Alerts List */}
      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 transition-all duration-200 ${getAlertColor(
                alert.alertType,
                alert.isRead
              )}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.alertType)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className={`font-medium text-gray-900 dark:text-gray-100 ${
                          alert.isRead ? "opacity-60" : ""
                        }`}
                      >
                        {formatAlertMessage(alert)}
                      </h4>
                      {!alert.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p
                      className={`text-sm text-gray-600 dark:text-gray-400 ${
                        alert.isRead ? "opacity-60" : ""
                      }`}
                    >
                      Amount: {formatCurrency(alert.amount)} •{" "}
                      {formatDistanceToNow(new Date(alert.triggeredAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!alert.isRead && (
                    <button
                      onClick={() => markAlertAsRead(alert.id)}
                      className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded transition-colors"
                      title="Mark as read"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <BellOff className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-gray-900 dark:text-gray-100 font-medium mb-2">
            No alerts
          </h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            You're all caught up! No budget alerts at the moment.
          </p>
        </div>
      )}
    </div>
  );
}

