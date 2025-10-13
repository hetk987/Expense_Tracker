import { prisma } from './prismaClient';
import { Budget, BudgetProgress, BudgetAlert, BudgetSummary, CreateBudgetRequest } from '@/types';
import { filterOutCreditCardPaymentsPartial } from './chartUtils';
import { addDays, addWeeks, addMonths, addYears, isAfter, isBefore, differenceInDays } from 'date-fns';
import { EmailService } from './emailService';

export class BudgetService {
    /**
     * Creates a new budget
     */
    static async createBudget(userId: string, budgetData: CreateBudgetRequest): Promise<Budget> {
        const budget = await prisma.budget.create({
            data: {
                userId,
                name: budgetData.name,
                budgetType: budgetData.budgetType,
                targetValue: budgetData.targetValue,
                merchantName: budgetData.merchantName,
                accountId: budgetData.accountId,
                amount: budgetData.amount,
                period: budgetData.period,
                startDate: new Date(budgetData.startDate),
                endDate: budgetData.endDate ? new Date(budgetData.endDate) : undefined,
                alertThreshold: budgetData.alertThreshold || 80,
            },
            include: {
                account: true,
                alerts: true,
            },
        });

        return BudgetService.convertPrismaBudget(budget);
    }

    /**
     * Gets all budgets for a user
     */
    static async getBudgets(userId: string, filters?: { budgetType?: string; isActive?: boolean }): Promise<Budget[]> {
        const where: any = { userId };

        if (filters?.budgetType) {
            where.budgetType = filters.budgetType;
        }

        if (filters?.isActive !== undefined) {
            where.isActive = filters.isActive;
        }

        const budgets = await prisma.budget.findMany({
            where,
            include: {
                account: true,
                alerts: {
                    orderBy: { triggeredAt: 'desc' },
                    take: 5,
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return budgets.map(BudgetService.convertPrismaBudget);
    }

    /**
     * Gets a specific budget by ID
     */
    static async getBudgetById(budgetId: string, userId: string): Promise<Budget | null> {
        const budget = await prisma.budget.findFirst({
            where: { id: budgetId, userId },
            include: {
                account: true,
                alerts: {
                    orderBy: { triggeredAt: 'desc' },
                },
            },
        });

        return budget ? BudgetService.convertPrismaBudget(budget) : null;
    }

    /**
     * Updates a budget
     */
    static async updateBudget(budgetId: string, userId: string, updates: Partial<CreateBudgetRequest>): Promise<Budget | null> {
        const budget = await prisma.budget.updateMany({
            where: { id: budgetId, userId },
            data: {
                ...updates,
                startDate: updates.startDate ? new Date(updates.startDate) : undefined,
                endDate: updates.endDate ? new Date(updates.endDate) : undefined,
                updatedAt: new Date(),
            },
        });

        if (budget.count === 0) return null;

        return this.getBudgetById(budgetId, userId);
    }

    /**
     * Deletes a budget
     */
    static async deleteBudget(budgetId: string, userId: string): Promise<boolean> {
        const result = await prisma.budget.deleteMany({
            where: { id: budgetId, userId },
        });

        return result.count > 0;
    }

    /**
     * Calculates budget progress and spending
     */
    static async calculateBudgetProgress(budgetId: string, userId: string): Promise<BudgetProgress | null> {
        const budget = await this.getBudgetById(budgetId, userId);
        if (!budget) return null;

        const { startDate, endDate } = this.getBudgetPeriodDates(budget);
        const spent = await this.calculateSpentAmount(budget, startDate, endDate);

        const remaining = Math.max(0, budget.amount - spent);
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
        const daysRemaining = differenceInDays(endDate, new Date());
        const isOverBudget = spent > budget.amount;

        // Calculate projected spend based on current rate
        const daysPassed = differenceInDays(new Date(), startDate);
        const totalDays = differenceInDays(endDate, startDate);
        const spendRate = daysPassed > 0 ? spent / daysPassed : 0;
        const projectedSpend = spendRate * totalDays;

        return {
            budget,
            spent,
            remaining,
            percentage,
            daysRemaining: Math.max(0, daysRemaining),
            isOverBudget,
            projectedSpend,
        };
    }

    /**
     * Gets budget progress for all user budgets
     */
    static async getAllBudgetProgress(userId: string): Promise<BudgetProgress[]> {
        const budgets = await this.getBudgets(userId, { isActive: true });
        const progressPromises = budgets.map(budget =>
            this.calculateBudgetProgress(budget.id, userId)
        );

        const results = await Promise.all(progressPromises);
        return results.filter((progress): progress is BudgetProgress => progress !== null);
    }

    /**
     * Gets budget summary statistics
     */
    static async getBudgetSummary(userId: string): Promise<BudgetSummary> {
        const budgets = await this.getBudgets(userId);
        const progressList = await this.getAllBudgetProgress(userId);

        const activeBudgets = budgets.filter(b => b.isActive).length;
        const exceededBudgets = progressList.filter(p => p.isOverBudget).length;
        const totalBudgetAmount = budgets.reduce((sum, b) => sum + b.amount, 0);
        const totalSpent = progressList.reduce((sum, p) => sum + p.spent, 0);
        const averageAdherence = progressList.length > 0
            ? progressList.reduce((sum, p) => sum + Math.min(100, p.percentage), 0) / progressList.length
            : 0;

        return {
            totalBudgets: budgets.length,
            activeBudgets,
            exceededBudgets,
            totalBudgetAmount,
            totalSpent,
            averageAdherence,
        };
    }

    /**
     * Checks for budget alerts and creates them if needed
     */
    static async checkBudgetAlerts(userId: string, userEmail?: string, userName?: string): Promise<BudgetAlert[]> {
        const progressList = await this.getAllBudgetProgress(userId);
        const newAlerts: BudgetAlert[] = [];
        const emailService = new EmailService();

        for (const progress of progressList) {
            const budget = progress.budget;
            const percentage = progress.percentage;

            // Check if we need to create alerts
            let alertType: "WARNING" | "EXCEEDED" | "APPROACHING" | null = null;

            if (percentage >= 100) {
                alertType = "EXCEEDED";
            } else if (percentage >= budget.alertThreshold) {
                alertType = "WARNING";
            } else if (percentage >= budget.alertThreshold - 10) {
                alertType = "APPROACHING";
            }

            if (alertType) {
                // Check if we already have a recent alert of this type
                const recentAlert = await prisma.budgetAlert.findFirst({
                    where: {
                        budgetId: budget.id,
                        alertType,
                        triggeredAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                        },
                    },
                });

                if (!recentAlert) {
                    const alert = await prisma.budgetAlert.create({
                        data: {
                            budgetId: budget.id,
                            alertType,
                            amount: progress.spent,
                            percentage: Math.round(percentage),
                        },
                        include: {
                            budget: true,
                        },
                    });

                    const convertedAlert = BudgetService.convertPrismaAlert(alert);
                    newAlerts.push(convertedAlert);

                    // Send email notification if email and name are provided
                    if (userEmail && userName) {
                        try {
                            await emailService.sendBudgetAlert(userEmail, userName, progress, alertType);
                            console.log(`Budget alert email sent to ${userEmail} for budget: ${budget.name}`);
                        } catch (error) {
                            console.error(`Failed to send budget alert email:`, error);
                        }
                    }
                }
            }
        }

        return newAlerts;
    }

    /**
     * Gets unread budget alerts for a user
     */
    static async getUnreadAlerts(userId: string): Promise<BudgetAlert[]> {
        const alerts = await prisma.budgetAlert.findMany({
            where: {
                budget: { userId },
                isRead: false,
            },
            include: {
                budget: true,
            },
            orderBy: { triggeredAt: 'desc' },
        });

        return alerts.map(BudgetService.convertPrismaAlert);
    }

    /**
     * Marks an alert as read
     */
    static async markAlertAsRead(alertId: string, userId: string): Promise<boolean> {
        const result = await prisma.budgetAlert.updateMany({
            where: {
                id: alertId,
                budget: { userId },
            },
            data: { isRead: true },
        });

        return result.count > 0;
    }

    /**
     * Send weekly budget summary email
     */
    static async sendWeeklySummary(userId: string, userEmail: string, userName: string): Promise<boolean> {
        try {
            const progressList = await this.getAllBudgetProgress(userId);
            if (progressList.length === 0) {
                console.log('No budgets found for weekly summary');
                return false;
            }

            const emailService = new EmailService();
            const success = await emailService.sendWeeklyBudgetSummary(userEmail, userName, progressList);

            if (success) {
                console.log(`Weekly budget summary sent to ${userEmail}`);
            }

            return success;
        } catch (error) {
            console.error('Error sending weekly budget summary:', error);
            return false;
        }
    }

    /**
     * Check and send alerts for all users (for scheduled jobs)
     */
    static async checkAndSendAlertsForAllUsers(): Promise<{ success: number; failed: number }> {
        let success = 0;
        let failed = 0;

        try {
            // Get all unique user IDs from budgets
            const userBudgets = await prisma.budget.findMany({
                where: { isActive: true },
                select: { userId: true },
                distinct: ['userId'],
            });

            for (const { userId } of userBudgets) {
                try {
                    // For now, we'll use placeholder email and name
                    // In a real app, you'd get this from a User table
                    const userEmail = `user-${userId}@example.com`;
                    const userName = `User ${userId}`;

                    await this.checkBudgetAlerts(userId, userEmail, userName);
                    success++;
                } catch (error) {
                    console.error(`Failed to check alerts for user ${userId}:`, error);
                    failed++;
                }
            }
        } catch (error) {
            console.error('Error in checkAndSendAlertsForAllUsers:', error);
        }

        return { success, failed };
    }

    /**
     * Mark multiple alerts as read
     */
    static async markMultipleAlertsAsRead(alertIds: string[], userId: string): Promise<number> {
        try {
            const result = await prisma.budgetAlert.updateMany({
                where: {
                    id: { in: alertIds },
                    budget: { userId },
                },
                data: { isRead: true },
            });

            return result.count;
        } catch (error) {
            console.error('Error marking multiple alerts as read:', error);
            return 0;
        }
    }

    /**
     * Gets merchant suggestions for budget creation
     */
    static async getMerchantSuggestions(userId: string, limit: number = 10): Promise<{ merchantName: string; totalSpent: number; transactionCount: number }[]> {
        // Get accounts for the user (assuming userId maps to account ownership)
        const accounts = await prisma.plaidAccount.findMany({
            // Note: You'll need to add userId to PlaidAccount model or implement user-account relationship
            select: { id: true },
        });

        const accountIds = accounts.map(a => a.id);

        const merchants = await prisma.plaidTransaction.groupBy({
            by: ['merchantName'],
            where: {
                accountId: { in: accountIds },
                merchantName: { not: null },
                amount: { lt: 0 }, // Only expenses
            },
            _sum: { amount: true },
            _count: { id: true },
            orderBy: { _sum: { amount: 'asc' } }, // Most negative (highest spending)
            take: limit,
        });

        return merchants
            .filter(m => m.merchantName)
            .map(m => ({
                merchantName: m.merchantName!,
                totalSpent: Math.abs(Number(m._sum.amount || 0)),
                transactionCount: m._count.id,
            }));
    }

    /**
     * Helper: Calculate spent amount for a budget
     */
    private static async calculateSpentAmount(budget: Budget, startDate: Date, endDate: Date): Promise<number> {
        let where: any = {
            date: { gte: startDate, lte: endDate },
            amount: { lt: 0 }, // Only expenses
        };

        // Apply budget-specific filters
        switch (budget.budgetType) {
            case 'CATEGORY':
                where.category = budget.targetValue;
                break;
            case 'MERCHANT':
                where.merchantName = { contains: budget.merchantName, mode: 'insensitive' };
                break;
            case 'ACCOUNT':
                where.accountId = budget.accountId;
                break;
            // 'TOTAL' includes all transactions (no additional filter)
        }

        const transactions = await prisma.plaidTransaction.findMany({
            where,
            select: { amount: true, name: true, merchantName: true, category: true },
        });

        // Filter out credit card payments
        const filteredTransactions = filterOutCreditCardPaymentsPartial(transactions);

        return filteredTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    }

    /**
     * Helper: Get budget period start and end dates
     */
    private static getBudgetPeriodDates(budget: Budget): { startDate: Date; endDate: Date } {
        const startDate = new Date(budget.startDate);
        let endDate: Date;

        if (budget.endDate) {
            endDate = new Date(budget.endDate);
        } else {
            // Calculate end date based on period
            switch (budget.period) {
                case 'WEEKLY':
                    endDate = addWeeks(startDate, 1);
                    break;
                case 'MONTHLY':
                    endDate = addMonths(startDate, 1);
                    break;
                case 'YEARLY':
                    endDate = addYears(startDate, 1);
                    break;
                default:
                    endDate = addMonths(startDate, 1); // Default to monthly
            }
        }

        return { startDate, endDate };
    }

    /**
     * Helper: Convert Prisma Budget to our Budget interface
     */
    private static convertPrismaBudget(budget: any): Budget {
        return {
            id: budget.id,
            userId: budget.userId,
            name: budget.name,
            budgetType: budget.budgetType,
            targetValue: budget.targetValue,
            merchantName: budget.merchantName,
            accountId: budget.accountId,
            amount: Number(budget.amount),
            period: budget.period,
            startDate: budget.startDate.toISOString(),
            endDate: budget.endDate?.toISOString(),
            isActive: budget.isActive,
            alertThreshold: budget.alertThreshold,
            createdAt: budget.createdAt.toISOString(),
            updatedAt: budget.updatedAt.toISOString(),
            account: budget.account ? {
                id: budget.account.id,
                plaidAccountId: budget.account.plaidAccountId,
                name: budget.account.name,
                mask: budget.account.mask,
                type: budget.account.type,
                subtype: budget.account.subtype,
                institutionId: budget.account.institutionId,
                createdAt: budget.account.createdAt.toISOString(),
                updatedAt: budget.account.updatedAt.toISOString(),
            } : undefined,
            alerts: budget.alerts?.map(BudgetService.convertPrismaAlert),
        };
    }

    /**
     * Helper: Convert Prisma BudgetAlert to our BudgetAlert interface
     */
    private static convertPrismaAlert(alert: any): BudgetAlert {
        return {
            id: alert.id,
            budgetId: alert.budgetId,
            alertType: alert.alertType,
            triggeredAt: alert.triggeredAt.toISOString(),
            amount: Number(alert.amount),
            percentage: alert.percentage,
            isRead: alert.isRead,
            budget: alert.budget ? BudgetService.convertPrismaBudget(alert.budget) : undefined,
        };
    }
}
