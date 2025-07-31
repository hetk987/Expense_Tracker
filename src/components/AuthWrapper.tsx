"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ReactNode } from "react";

interface AuthWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function AuthWrapper({ children, fallback }: AuthWrapperProps) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        {fallback || (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome to Expense Tracker
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Please sign in to access your expense tracking dashboard.
              </p>
            </div>
          </div>
        )}
      </SignedOut>
    </>
  );
}
