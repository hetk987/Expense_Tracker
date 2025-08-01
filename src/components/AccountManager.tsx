"use client";

import { useState, useEffect } from "react";
import { plaidApi } from "@/lib/api";
import { PlaidAccount } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AccountManagerProps {
  onAccountsChange?: () => void;
}

export default function AccountManager({
  onAccountsChange,
}: AccountManagerProps) {
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedAccounts = await plaidApi.getAccounts();
      setAccounts(fetchedAccounts);
    } catch (err) {
      console.error("Error fetching accounts:", err);
      setError("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleUnlinkAccount = async (
    accountId: string,
    accountName: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to unlink "${accountName}"? This will permanently delete all associated transaction data.`
      )
    ) {
      return;
    }

    try {
      setUnlinking(accountId);
      setError(null);
      setSuccess(null);

      const result = await plaidApi.unlinkAccount(accountId);

      if (result.success) {
        setSuccess(
          `Successfully unlinked ${result.accountName}. Deleted ${result.deletedTransactions} transactions.`
        );
        await fetchAccounts(); // Refresh the accounts list
        onAccountsChange?.(); // Notify parent component
      } else {
        setError("Failed to unlink account");
      }
    } catch (err) {
      console.error("Error unlinking account:", err);
      setError("Failed to unlink account. Please try again.");
    } finally {
      setUnlinking(null);
    }
  };

  const handleUnlinkAllAccounts = async () => {
    if (
      !confirm(
        "Are you sure you want to unlink ALL accounts? This will permanently delete all transaction data. This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setUnlinking("all");
      setError(null);
      setSuccess(null);

      const accountIds = accounts.map((account) => account.id);
      const result = await plaidApi.unlinkAccounts(accountIds);

      if (result.success) {
        setSuccess(
          `Successfully unlinked ${result.successful} accounts. Deleted transactions from all accounts.`
        );
        await fetchAccounts(); // Refresh the accounts list
        onAccountsChange?.(); // Notify parent component
      } else {
        setError(
          `Failed to unlink some accounts. ${result.failed} accounts failed to unlink.`
        );
      }
    } catch (err) {
      console.error("Error unlinking all accounts:", err);
      setError("Failed to unlink accounts. Please try again.");
    } finally {
      setUnlinking(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Linked Accounts</CardTitle>
          <CardDescription>Loading accounts...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Linked Accounts</CardTitle>
              <CardDescription>
                Manage your connected bank accounts and credit cards
              </CardDescription>
            </div>
            {accounts.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleUnlinkAllAccounts}
                disabled={unlinking === "all"}
              >
                {unlinking === "all" ? "Unlinking..." : "Unlink All"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
              {success}
            </div>
          )}

          {accounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No accounts linked yet.</p>
              <p className="text-sm mt-2">
                Link your first account to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{account.name}</h3>
                      {account.mask && (
                        <span className="text-sm text-gray-500">
                          •••• {account.mask}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{account.type}</Badge>
                      {account.subtype && (
                        <Badge variant="outline">{account.subtype}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Institution ID: {account.institutionId}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleUnlinkAccount(account.id, account.name)
                    }
                    disabled={unlinking === account.id || unlinking === "all"}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {unlinking === account.id ? "Unlinking..." : "Unlink"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
