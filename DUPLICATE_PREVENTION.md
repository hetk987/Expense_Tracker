# Duplicate Account Prevention

This document explains how the system prevents duplicate credit card accounts from being saved to the database.

## How It Works

### 1. **Pre-Save Validation**

Before creating any database records, the system checks each account against existing records using the unique `plaidAccountId` field.

```typescript
// Check for duplicate accounts before creating new ones
const duplicateAccounts = [];
const newAccounts = [];

for (const account of accountsResponse.data.accounts) {
  const existingAccount = await prisma.plaidAccount.findUnique({
    where: {
      plaidAccountId: account.account_id,
    },
  });

  if (existingAccount) {
    duplicateAccounts.push(existingAccount);
  } else {
    newAccounts.push(account);
  }
}
```

### 2. **Selective Database Operations**

The system only performs database operations when necessary:

- **All Duplicates**: No database operations performed
- **No Accounts**: No database operations performed
- **Mixed/New Only**: Only new accounts are saved

### 3. **Database Creation Logic**

Only accounts in the `newAccounts` array are saved to the database:

```typescript
// Store only new accounts in database (duplicates are excluded)
const createdAccounts = await Promise.all(
  newAccounts.map(async (account) => {
    return await prisma.plaidAccount.create({
      data: {
        plaidAccountId: account.account_id,
        name: account.name,
        mask: account.mask,
        type: account.type,
        subtype: account.subtype,
        institutionId: institutionId,
        linkTokenId: linkToken.id,
        accessToken: accessToken,
      },
    });
  })
);
```

## Key Safety Features

### ✅ **No Duplicate Records**

- Duplicate accounts are never saved to the database
- Each `plaidAccountId` is unique and checked before creation

### ✅ **Early Exit for All Duplicates**

- If all accounts are duplicates, the function returns early
- No unnecessary database operations are performed

### ✅ **Comprehensive Logging**

- All duplicate detection is logged for debugging
- Clear indication of what accounts are new vs duplicate

### ✅ **User Feedback**

- Users see exactly which accounts are already linked
- Clear messaging about duplicate vs new accounts

## Database Schema Protection

The database schema also provides protection:

```prisma
model PlaidAccount {
  plaidAccountId String  @unique  // Prevents duplicates at DB level
  // ... other fields
}
```

The `@unique` constraint on `plaidAccountId` provides an additional safety net at the database level.

## Testing Scenarios

1. **New Account**: Account not in database → Saved successfully
2. **Duplicate Account**: Account already exists → Skipped, user notified
3. **Mixed Accounts**: Some new, some duplicate → Only new ones saved
4. **All Duplicates**: All accounts exist → No database operations, user warned

## Logging Output

The system provides detailed logging:

```
New account found: Chase Credit Card (abc123)
Duplicate account found: Amex Gold Card (def456)
Total accounts: 2, New: 1, Duplicates: 1
Creating 1 new account records in database
Successfully processed: 1 new accounts, 1 duplicates skipped
```

This ensures complete transparency about what accounts are being processed and why.
