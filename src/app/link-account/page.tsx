"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink } from "react-plaid-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Link as LinkIcon,
  RefreshCw,
  Lock,
  Eye,
  Zap,
  Sparkles,
} from "lucide-react";
import { plaidApi } from "@/lib/api";
import { ExchangeTokenResponse, PlaidAccount } from "@/types";
import Link from "next/link";
import AuthWrapper from "@/components/AuthWrapper";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";

export default function LinkAccountPage() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ExchangeTokenResponse | null>(null);
  const [duplicateAccounts, setDuplicateAccounts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [linking, setLinking] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    createLinkToken();
    fetchAccounts();
  }, []);

  const createLinkToken = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await plaidApi.createLinkToken();
      setLinkToken(response.link_token);
    } catch (err) {
      console.error("Error creating link token:", err);
      setError("Failed to initialize card linking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const data = await plaidApi.getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const onSuccess = async (publicToken: string, metadata: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await plaidApi.exchangePublicToken(publicToken);

      // Check if there are duplicate accounts
      if (response.duplicateAccounts && response.duplicateAccounts.length > 0) {
        setDuplicateAccounts(response.duplicateAccounts);
        setError(null);
        return;
      }

      // Check if no accounts were found
      if (!response.accounts || response.accounts.length === 0) {
        setError(
          "No credit card accounts were found. Please make sure you have credit cards linked to your bank account."
        );
        return;
      }

      setSuccess(response);

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/");
      }, 3000);

      await fetchAccounts(); // Refresh accounts list
    } catch (err) {
      console.error("Error exchanging token:", err);
      setError("Failed to link credit card. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onExit = (err: any, metadata: any) => {
    if (err != null) {
      setError(
        "Credit card linking was cancelled or failed. Please try again."
      );
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit,
  });

  const handleLinkAccount = () => {
    if (ready) {
      open();
    }
  };

  const handleSyncAccounts = async () => {
    setSyncing(true);
    try {
      await plaidApi.syncTransactions();
      await fetchAccounts(); // Refresh accounts list
    } catch (error) {
      console.error("Error syncing accounts:", error);
    } finally {
      setSyncing(false);
    }
  };

  if (success) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <PageHeader
            title="Account Linked Successfully!"
            description="Your credit card has been successfully connected to your expense tracker."
            showBackButton
            backHref="/"
          />

          <div className="container mx-auto px-6 py-8 max-w-2xl">
            <Card className="border-0 shadow-apple-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <CardHeader className="text-center">
                <div className="mx-auto w-20 h-20 bg-green-500 rounded-3xl flex items-center justify-center mb-6 shadow-apple-lg">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-2xl text-green-700 dark:text-green-300">
                  Credit Card Linked Successfully!
                </CardTitle>
                <CardDescription className="text-green-600 dark:text-green-400">
                  Your credit card has been successfully connected to your
                  expense tracker.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Show newly linked accounts */}
                  {success.accounts && success.accounts.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-green-600" />
                        Newly Linked Cards:
                      </h3>
                      <div className="space-y-3">
                        {success.accounts.map((account) => (
                          <div
                            key={account.id}
                            className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                                <CreditCard className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {account.name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {account.mask ? `****${account.mask}` : ""} •{" "}
                                  {account.type}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="default"
                              className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Newly Linked
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show duplicate accounts if any */}
                  {success.duplicateAccounts &&
                    success.duplicateAccounts.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                          Already Linked Cards:
                        </h3>
                        <div className="space-y-3">
                          {success.duplicateAccounts.map((account) => (
                            <div
                              key={account.id}
                              className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                                  <CreditCard className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {account.name}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {account.mask ? `****${account.mask}` : ""}{" "}
                                    • {account.type}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant="secondary"
                                className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                              >
                                Already Linked
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                      You'll be redirected to the dashboard in a few seconds...
                    </p>
                  </div>

                  <Button asChild className="w-full gap-2">
                    <Link href="/">
                      Go to Dashboard Now
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  // Show duplicate accounts warning
  if (duplicateAccounts.length > 0) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <PageHeader
            title="Account Already Linked"
            description="The credit card you're trying to link is already connected to your account."
            showBackButton
            backHref="/"
          />

          <div className="container mx-auto px-6 py-8 max-w-2xl">
            <Card className="border-0 shadow-apple-lg bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20">
              <CardHeader className="text-center">
                <div className="mx-auto w-20 h-20 bg-yellow-500 rounded-3xl flex items-center justify-center mb-6 shadow-apple-lg">
                  <AlertCircle className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-2xl text-yellow-700 dark:text-yellow-300">
                  Account Already Linked
                </CardTitle>
                <CardDescription className="text-yellow-600 dark:text-yellow-400">
                  The credit card you're trying to link is already connected to
                  your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      Already Linked Cards:
                    </h3>
                    <div className="space-y-3">
                      {duplicateAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                              <CreditCard className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {account.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {account.mask ? `****${account.mask}` : ""} •{" "}
                                {account.type}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                          >
                            Already Linked
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    These accounts are already connected to your expense
                    tracker.
                  </p>

                  <div className="flex gap-3 justify-center">
                    <Button asChild className="gap-2">
                      <Link href="/">
                        Go to Dashboard
                        <ArrowLeft className="h-4 w-4 rotate-180" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDuplicateAccounts([]);
                        setError(null);
                      }}
                      className="gap-2"
                    >
                      Try Different Account
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PageHeader
          title="Link Your Credit Card"
          description="Connect your credit card to automatically track your spending"
          showBackButton
          backHref="/"
        />

        <div className="container mx-auto px-6 py-8 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Main Content */}
            <Card className="border-0 shadow-apple-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <CreditCard className="h-6 w-6" />
                  Connect Your Card
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Securely link your credit card using Plaid's trusted platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-red-700 dark:text-red-300">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-300">
                        Bank-Level Security
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        Your credentials are never stored and are protected by
                        bank-level encryption
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      What you'll get:
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Automatic transaction syncing
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Real-time spending tracking
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Categorized spending insights
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Secure, read-only access
                      </li>
                    </ul>
                  </div>
                </div>

                <Button
                  onClick={handleLinkAccount}
                  disabled={!ready || loading}
                  className="w-full gap-2"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-5 w-5" />
                      Link Credit Card
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Features */}
            <div className="space-y-6">
              <Card className="border-0 shadow-apple-lg">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">
                    Supported Credit Cards
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Connect cards from major banks and credit unions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Chase Credit Cards
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      American Express
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Capital One
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Citi Credit Cards
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Discover
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Bank of America
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      And thousands more...
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-apple-lg">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">
                    Security & Privacy
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Your financial data is protected with industry-leading
                    security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Lock className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Bank-Level Encryption
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        All data is encrypted using 256-bit SSL
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Read-Only Access
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        We can only view your transactions, never modify them
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        No Credential Storage
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Your card credentials are never stored on our servers
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sync Transactions */}
          <Card className="mt-8 border-0 shadow-apple-lg">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">
                Sync Transactions
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Manually sync transactions from your linked credit cards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Sync Latest Transactions
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Import the most recent transactions from all linked cards
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSyncAccounts}
                  disabled={syncing}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  {syncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span>{syncing ? "Syncing..." : "Sync Now"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Linked Accounts */}
          <Card className="mt-8 border-0 shadow-apple-lg">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">
                Linked Credit Cards
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Your currently connected credit cards
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No credit cards linked yet"
                  description="Link your first credit card to start tracking expenses and get insights into your spending patterns."
                  action={{
                    label: "Link Your First Card",
                    href: "/link-account",
                  }}
                />
              ) : (
                <div className="space-y-4">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-xl flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {account.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {account.mask} • {account.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthWrapper>
  );
}
