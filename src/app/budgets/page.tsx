"use client";

import { useState } from "react";
import AuthWrapper from "@/components/AuthWrapper";
import Header from "@/components/Header";
import BudgetDashboard from "@/components/budget/BudgetDashboard";
import PageHeader from "@/components/ui/page-header";

export default function BudgetsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* <Header /> */}

      <AuthWrapper>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            title="Budget Management"
            description="Create and track budgets to stay on top of your spending goals"
          />

          <BudgetDashboard className="mt-8" />
        </div>
      </AuthWrapper>
    </div>
  );
}

