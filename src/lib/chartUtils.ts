import { PlaidTransaction, CategoryData, TimeSeriesData } from '@/types'
import { format, parseISO, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns'

/**
 * Gets credit card payments that are being filtered out (for debugging/transparency)
 */
export function getCreditCardPayments(transactions: PlaidTransaction[]): PlaidTransaction[] {
    return transactions.filter(transaction => isCreditCardPayment(transaction))
}

/**
 * Enhanced function to identify credit card payments with more comprehensive patterns
 */
export function isCreditCardPayment(transaction: PlaidTransaction): boolean {
    // Simple and precise filtering: only filter out specific credit card payment patterns
    const name = transaction.name.toUpperCase();
    const merchantName = transaction.merchantName;
    const category = transaction.category?.toUpperCase();

    // Filter out transactions that match the specific pattern:
    // 1. Name contains "INTERNET PAYMENT - THANK YOU"
    // 2. No merchant name (null, undefined, or empty string)
    // 3. Category is "LOAN_PAYMENT"
    if (name.includes('INTERNET PAYMENT - THANK YOU') &&
        (!merchantName || merchantName.trim() === '') &&
        category === 'LOAN_PAYMENT') {
        return true;
    }

    return false;
}

/**
 * Filters out credit card payments from transactions for spending calculations
 */
export function filterOutCreditCardPayments(transactions: PlaidTransaction[]): PlaidTransaction[] {
    return transactions.filter(transaction => !isCreditCardPayment(transaction))
}

/**
 * Filters out credit card payments from partial transaction objects (for backend use)
 */
export function filterOutCreditCardPaymentsPartial<T extends { amount: number; name: string; merchantName?: string | null; category?: string }>(
    transactions: T[]
): T[] {
    return transactions.filter((transaction) => {
        // Use the same simplified logic as isCreditCardPayment
        const name = transaction.name.toUpperCase();
        const merchantName = transaction.merchantName;
        const category = transaction.category?.toUpperCase();

        // Filter out transactions that match the specific pattern:
        // 1. Name contains "INTERNET PAYMENT - THANK YOU"
        // 2. No merchant name (null, undefined, or empty string)
        // 3. Category is "LOAN_PAYMENTS"
        if (name.includes('INTERNET PAYMENT - THANK YOU') &&
            (!merchantName || merchantName.trim() === '') &&
            category === 'LOAN_PAYMENTS') {
            return false; // Filter out this transaction
        }

        return true; // Keep this transaction
    });
}

export function processCategoryData(transactions: PlaidTransaction[]): CategoryData[] {
    const categoryMap = new Map<string, { amount: number; count: number }>()

    // Filter out credit card payments before processing
    const filteredTransactions = filterOutCreditCardPayments(transactions)

    // Process transactions
    filteredTransactions.forEach(transaction => {
        if (transaction.amount < 0) { // Only process expenses (negative amounts)
            // Fix: Use full category name, not just first character
            const category = transaction.category || 'Uncategorized'
            const current = categoryMap.get(category) || { amount: 0, count: 0 }

            categoryMap.set(category, {
                amount: current.amount + Math.abs(transaction.amount),
                count: current.count + 1
            })
        }
    })

    // Convert to array and calculate percentages
    const totalAmount = Array.from(categoryMap.values()).reduce((sum, item) => sum + item.amount, 0)

    const categoryData: CategoryData[] = Array.from(categoryMap.entries())
        .map(([category, { amount, count }]) => ({
            category,
            amount,
            count,
            percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount) // Sort by amount descending

    return categoryData
}

export function processTimeSeriesData(
    transactions: PlaidTransaction[],
    startDate: string,
    endDate: string
): TimeSeriesData[] {
    const dateMap = new Map<string, { amount: number; count: number }>()

    // Initialize all dates in range with zero values
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    const dateRange = eachDayOfInterval({ start, end })

    dateRange.forEach(date => {
        const dateKey = format(date, 'yyyy-MM-dd')
        dateMap.set(dateKey, { amount: 0, count: 0 })
    })

    // Filter out credit card payments before processing
    const filteredTransactions = filterOutCreditCardPayments(transactions)

    // Process transactions
    filteredTransactions.forEach(transaction => {
        if (transaction.amount < 0) { // Only process expenses
            const dateKey = format(parseISO(transaction.date), 'yyyy-MM-dd')
            const current = dateMap.get(dateKey)

            if (current) {
                dateMap.set(dateKey, {
                    amount: current.amount + Math.abs(transaction.amount),
                    count: current.count + 1
                })
            }
        }
    })

    // Convert to array and sort by date
    const timeSeriesData: TimeSeriesData[] = Array.from(dateMap.entries())
        .map(([date, { amount, count }]) => ({
            date: format(parseISO(date), 'MMM dd'),
            amount,
            count
        }))
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())

    return timeSeriesData
}

export function getAvailableCategories(transactions: PlaidTransaction[]): string[] {
    const categories = new Set<string>()

    transactions.forEach(transaction => {
        if (transaction.category) {
            categories.add(transaction.category)
        }
    })

    return Array.from(categories).sort()
}

export function calculateCreditCardMetrics(transactions: PlaidTransaction[]) {
    // Filter out credit card payments before calculating metrics
    const filteredTransactions = filterOutCreditCardPayments(transactions)
    const expenses = filteredTransactions.filter(t => t.amount < 0)
    const totalSpending = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const averageTransaction = expenses.length > 0 ? totalSpending / expenses.length : 0
    const largestTransaction = expenses.length > 0 ? Math.max(...expenses.map(t => Math.abs(t.amount))) : 0

    return {
        totalSpending,
        averageTransaction,
        largestTransaction,
        transactionCount: expenses.length
    }
}

export function getTopSpendingCategories(transactions: PlaidTransaction[], limit: number = 5): CategoryData[] {
    const categoryData = processCategoryData(transactions)
    return categoryData.slice(0, limit)
}

export function processTransactionsForCharts(transactions: PlaidTransaction[]) {
    const categoryBreakdown = processCategoryData(transactions)
    const topCategories = getTopSpendingCategories(transactions, 5)

    return {
        categoryBreakdown,
        topCategories
    }
} 