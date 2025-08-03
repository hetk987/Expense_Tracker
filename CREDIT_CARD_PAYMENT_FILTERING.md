# Credit Card Payment Filtering

This document explains how the application filters out credit card payments from spending calculations to provide more accurate expense tracking.

## Overview

When you make purchases with your credit card, they appear as negative amounts (expenses). When you pay your credit card bill, it appears as a positive amount (payment). The payment transactions are filtered out from spending calculations because they represent money you're paying back, not new spending.

## How It Works

### Detection Logic

The system identifies credit card payments using the following criteria:

1. **Positive Amount**: Credit card payments are typically positive amounts that reduce your balance
2. **Transaction Name Patterns**: The system looks for common payment-related keywords in transaction names:

   - `payment`
   - `credit card payment`
   - `card payment`
   - `online payment`
   - `electronic payment`
   - `ach payment`
   - `bank transfer`
   - `transfer`
   - `payment thank you`
   - `payment received`
   - `credit card`
   - `cc payment`
   - `card`
   - `online transfer`
   - `electronic transfer`
   - `bill pay`
   - `bill payment`
   - `autopay`
   - `auto payment`
   - `recurring payment`
   - `monthly payment`
   - `statement credit`
   - `credit`
   - `refund`
   - `return`
   - `adjustment`
   - `fee reversal`
   - `interest charge reversal`

3. **Short Numeric Names**: Transactions with short names (≤20 characters) containing numbers and payment-related keywords

### What Gets Filtered Out

- Credit card bill payments
- Online transfers to credit cards
- ACH payments to credit cards
- Automatic payments
- Statement credits
- Refunds and returns
- Fee reversals

### What Stays In

- All actual purchases and charges (negative amounts)
- Interest charges
- Annual fees
- Late fees
- Foreign transaction fees
- Balance transfers (if they appear as charges)

## Implementation

### Frontend Changes

The filtering is applied in all chart and metric calculations:

- **Category Breakdown**: Only expenses, excluding payments
- **Time Series Data**: Only expenses, excluding payments
- **Credit Card Metrics**: Only expenses, excluding payments
- **Top Spending Categories**: Only expenses, excluding payments

### Backend Changes

- **Transaction Statistics**: Excludes credit card payments from spending totals
- **Category Statistics**: Excludes credit card payments from category breakdowns
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

1. **Accurate Spending Tracking**: Only shows actual expenses, not payments
2. **Better Budgeting**: Provides true spending patterns without payment noise
3. **Cleaner Analytics**: Charts and reports focus on actual consumption
4. **Consistent Metrics**: All calculations use the same filtered dataset

## Example

**Before Filtering:**

- Coffee purchase: -$5.00 ✅ (expense)
- Grocery purchase: -$50.00 ✅ (expense)
- Credit card payment: +$500.00 ❌ (payment - filtered out)

**After Filtering:**

- Total spending: $55.00 (only actual expenses)
- Payment transactions are excluded from all calculations

## Customization

If your bank uses different naming patterns for credit card payments, you can add them to the `paymentPatterns` array in the `isCreditCardPayment` function.
