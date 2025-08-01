# Account Unlinking System

This document describes the account unlinking functionality that allows users to remove linked bank accounts and delete their associated transactional data.

## Overview

The account unlinking system provides a secure way to:

- Unlink individual bank accounts
- Unlink multiple accounts at once
- Permanently delete all associated transaction data
- Clean up orphaned link tokens

## Features

### Single Account Unlinking

- Unlink one account at a time
- Confirmation dialog to prevent accidental deletions
- Detailed feedback on the number of transactions deleted
- Automatic cleanup of orphaned link tokens

### Bulk Account Unlinking

- Unlink multiple accounts simultaneously
- Individual error handling for each account
- Summary report of successful and failed operations
- Graceful handling of invalid account IDs

### Data Safety

- Database transactions ensure data consistency
- Validation of account IDs before processing
- Comprehensive error handling and logging
- Confirmation dialogs for destructive operations

## API Endpoints

### Unlink Single Account

```
DELETE /api/plaid/accounts/unlink?accountId={accountId}
```

**Response:**

```json
{
  "success": true,
  "message": "Successfully unlinked account: Chase Credit Card",
  "deletedTransactions": 150,
  "accountName": "Chase Credit Card"
}
```

### Unlink Multiple Accounts

```
DELETE /api/plaid/accounts/unlink?accountIds={id1},{id2},{id3}
```

**Response:**

```json
{
  "success": true,
  "results": [...],
  "errors": [],
  "totalProcessed": 3,
  "successful": 3,
  "failed": 0
}
```

## Frontend Components

### AccountManager Component

Located at `src/components/AccountManager.tsx`

Features:

- Display all linked accounts
- Individual unlink buttons for each account
- Bulk unlink all accounts option
- Loading states and error handling
- Success/error feedback messages

### Accounts Page

Located at `src/app/accounts/page.tsx`

Features:

- Dedicated page for account management
- Quick actions for linking new accounts
- Information about the unlinking process
- Security and privacy information

## Database Operations

### What Gets Deleted

1. **Transactions**: All `PlaidTransaction` records associated with the account
2. **Account**: The `PlaidAccount` record itself
3. **Link Token**: The `PlaidLinkToken` record (if no other accounts use it)

### Database Transaction Safety

All operations are wrapped in database transactions to ensure:

- Atomicity: All operations succeed or fail together
- Consistency: Database remains in a valid state
- Isolation: Concurrent operations don't interfere

## Security Considerations

### Input Validation

- Account ID format validation
- Array validation for bulk operations
- Filtering of invalid account IDs

### User Confirmation

- Confirmation dialogs for single account unlinking
- Additional confirmation for bulk operations
- Clear warning about permanent data deletion

### Error Handling

- Comprehensive error logging
- User-friendly error messages
- Graceful degradation for partial failures

## Usage Examples

### Unlink a Single Account

```typescript
import { plaidApi } from "@/lib/api";

try {
  const result = await plaidApi.unlinkAccount("account-id-here");
  console.log(
    `Unlinked ${result.accountName}, deleted ${result.deletedTransactions} transactions`
  );
} catch (error) {
  console.error("Failed to unlink account:", error);
}
```

### Unlink Multiple Accounts

```typescript
import { plaidApi } from "@/lib/api";

try {
  const result = await plaidApi.unlinkAccounts(["id1", "id2", "id3"]);
  console.log(`Successfully unlinked ${result.successful} accounts`);
} catch (error) {
  console.error("Failed to unlink accounts:", error);
}
```

## Navigation

The account management functionality is accessible through:

1. **Header Navigation**: "Accounts" link in the main navigation
2. **Dashboard**: "Manage Accounts" button in the Linked Credit Cards section
3. **Direct URL**: `/accounts`

## Future Enhancements

Potential improvements for the unlinking system:

- Soft delete option (mark as inactive instead of permanent deletion)
- Account unlinking history/audit trail
- Scheduled unlinking (unlink after a certain period)
- Export data before unlinking
- Re-linking prevention for recently unlinked accounts
