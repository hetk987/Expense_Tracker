import AccountManager from "@/components/AccountManager";
import AuthWrapper from "@/components/AuthWrapper";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import PageHeader from "@/components/ui/page-header";
import { CreditCard, Settings, Shield, Info, ArrowRight } from "lucide-react";

export default function AccountsPage() {
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PageHeader
          title="Account Management"
          description="Manage your connected bank accounts and credit cards"
          breadcrumbs={[{ label: "Accounts" }]}
          actions={
            <Button asChild className="gap-2">
              <Link
                href="/link-account"
                className="flex flex-row items-center gap-2"
              >
                <CreditCard className="h-5 w-5" />
                Link New Account
              </Link>
            </Button>
          }
        />

        <div className="container mx-auto px-6 py-8 max-w-6xl">
          <div className="grid gap-8">
            {/* Quick Actions */}
            <Card className="border-0 shadow-apple-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Settings className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Common actions for managing your accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button asChild className="gap-2">
                    <Link
                      href="/link-account"
                      className="flex flex-row items-center gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      Link New Account
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="gap-2">
                    <Link
                      href="/transactions"
                      className="flex flex-row items-center gap-2"
                    >
                      View Transactions
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Manager */}
            <AccountManager />

            {/* Information Section */}
            {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border-0 shadow-apple-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Info className="h-5 w-5" />
                    About Account Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      What happens when you unlink an account?
                    </h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 ml-6">
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        <span>
                          All transaction data associated with the account is
                          permanently deleted
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        <span>
                          The account connection to your bank is removed
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        <span>
                          You'll need to re-link the account if you want to
                          track it again
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        <span>This action cannot be undone</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-apple-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Shield className="h-5 w-5" />
                    Security & Privacy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Your data is protected
                    </h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 ml-6">
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span>Your financial data is encrypted and secure</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span>
                          We use Plaid's secure API for all bank connections
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span>You can unlink accounts at any time</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span>No data is shared with third parties</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div> */}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}
