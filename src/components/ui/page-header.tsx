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
        "bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700",
        className
      )}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                <Link
                  href="/"
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
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
                        className="hover:text-gray-700 transition-colors"
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
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Link>
              </div>
            )}

            {/* Title and Description */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                {title}
              </h1>
              {description && (
                <p className="text-lg text-gray-600 dark:text-gray-400 mt-3">
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
