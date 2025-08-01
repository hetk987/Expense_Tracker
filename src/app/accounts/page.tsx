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

export default function AccountsPage() {
  return (
    <AuthWrapper>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Management</h1>
          <p className="text-gray-600">
            Manage your connected bank accounts and credit cards
          </p>
        </div>

        <div className="grid gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common actions for managing your accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Link href="/link-account">
                  <Button>Link New Account</Button>
                </Link>
                <Link href="/transactions">
                  <Button variant="outline">View Transactions</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Account Manager */}
          <AccountManager />
        </div>

        {/* Information Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>About Account Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">
                  What happens when you unlink an account?
                </h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>
                    • All transaction data associated with the account is
                    permanently deleted
                  </li>
                  <li>• The account connection to your bank is removed</li>
                  <li>
                    • You'll need to re-link the account if you want to track it
                    again
                  </li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Security & Privacy</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Your financial data is encrypted and secure</li>
                  <li>• We use Plaid's secure API for all bank connections</li>
                  <li>• You can unlink accounts at any time</li>
                  <li>• No data is shared with third parties</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthWrapper>
  );
}
