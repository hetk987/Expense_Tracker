# Credit Card Payment Filtering

This document explains how the application filters out credit card payments from spending calculations to provide more accurate expense tracking.

## Overview

The system now uses a simple and precise filtering approach to identify and exclude credit card payment transactions from spending calculations.

## How It Works

### Detection Logic

The system identifies credit card payments using these specific criteria:

1. **Transaction Name**: Contains "INTERNET PAYMENT - THANK YOU" (case-insensitive)
2. **Merchant Name**: Is null, undefined, or empty string (no merchant)
3. **Category**: Is exactly "LOAN_PAYMENT" (case-insensitive)

**All three conditions must be met** for a transaction to be filtered out.

### What Gets Filtered Out

- Transactions with name "INTERNET PAYMENT - THANK YOU"
- No merchant name associated
- Personal finance category is "LOAN_PAYMENT"

### What Stays In

- All other transactions, including:
  - Actual purchases and charges
  - Other types of payments
  - Transactions with different names
  - Transactions with merchant names
  - Transactions with different categories

## Implementation

### Frontend Changes

The filtering is applied in all chart and metric calculations:

- **Category Breakdown**: Only expenses, excluding specific credit card payments
- **Time Series Data**: Only expenses, excluding specific credit card payments
- **Credit Card Metrics**: Only expenses, excluding specific credit card payments
- **Top Spending Categories**: Only expenses, excluding specific credit card payments

### Backend Changes

- **Transaction Statistics**: Excludes specific credit card payments from spending totals
- **Category Statistics**: Excludes specific credit card payments from category breakdowns
- **Debug Endpoints**: Can show/hide credit card payments for debugging

## Debugging

### View Filtered Transactions

To see which transactions are being filtered out, use the debug endpoint:

```
GET /api/debug/transactions?showCreditCardPayments=true
```

This will return:

- `transactions`: All transactions (including payments)
- `creditCardPayments`: Only the transactions identified as credit card payments
- `summary.creditCardPaymentsCount`: Number of filtered payments
- `summary.creditCardPaymentsTotal`: Total amount of filtered payments

### Manual Override

If you need to manually adjust the filtering logic, you can modify the `isCreditCardPayment` function in `src/lib/chartUtils.ts`.

## Benefits

1. **Precise Filtering**: Only filters out specific credit card payment patterns
2. **Reduced False Positives**: Won't accidentally filter out legitimate transactions
3. **Simple Logic**: Easy to understand and maintain
4. **Consistent Results**: Predictable filtering behavior

## Example

**Before Filtering:**

- Coffee purchase: -$5.00 ✅ (expense)
- Grocery purchase: -$50.00 ✅ (expense)
- "INTERNET PAYMENT - THANK YOU" (no merchant, LOAN_PAYMENT): +$500.00 ❌ (filtered out)

**After Filtering:**

- Total spending: $55.00 (only actual expenses)
- Specific credit card payment transactions are excluded from all calculations

## Customization

If you need to add more specific patterns to filter out, you can modify the `isCreditCardPayment` function in `src/lib/chartUtils.ts` to include additional conditions.
