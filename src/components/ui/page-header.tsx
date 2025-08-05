import React from "react";
import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  showBackButton?: boolean;
  backHref?: string;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  showBackButton = false,
  backHref = "/",
  className,
}) => {
  return (
    <div
      className={cn(
        "bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700",
        className
      )}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <Link
                  href="/"
                  className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <ChevronLeft className="h-4 w-4" />
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-gray-900 dark:text-white font-medium">
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}

            {/* Back Button */}
            {showBackButton && (
              <div className="mb-4">
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Link>
              </div>
            )}

            {/* Title and Description */}
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {title}
              </h1>
              {description && (
                <p className="text-lg text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center gap-3 ml-6">{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
