# Debug Endpoints

This document describes the debug endpoints available for troubleshooting and data inspection.

## Available Endpoints

### 1. **Get All Accounts**

**Endpoint:** `GET /api/debug/accounts`

Returns all accounts in the database with detailed information.

**Response:**

```json
{
  "total": 5,
  "accounts": [
    {
      "id": "uuid",
      "plaidAccountId": "plaid_account_id",
      "name": "Chase Credit Card",
      "mask": "1234",
      "type": "credit",
      "subtype": "credit card",
      "institutionId": "ins_123",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. **Test Database Constraint**

**Endpoint:** `POST /api/debug/test-constraint`

Tests the unique constraint on `plaidAccountId` by attempting to create a duplicate account.

**Request Body:**

```json
{
  "plaidAccountId": "test_account_id",
  "name": "Test Account",
  "mask": "1234",
  "type": "credit",
  "subtype": "credit card",
  "institutionId": "ins_test"
}
```

**Response (Success - Constraint Working):**

```json
{
  "success": false,
  "message": "Unique constraint working correctly - duplicate prevented",
  "error": "Unique constraint failed on the fields: (`plaidAccountId`)"
}
```

### 3. **Get All Transactions**

**Endpoint:** `GET /api/debug/transactions`

Returns all transactions with filtering and pagination options.

**Query Parameters:**

- `limit` (optional): Number of transactions to return (default: 50)
- `offset` (optional): Number of transactions to skip (default: 0)
- `accountId` (optional): Filter by account ID
- `startDate` (optional): Filter by start date (YYYY-MM-DD)
- `endDate` (optional): Filter by end date (YYYY-MM-DD)

**Example:** `GET /api/debug/transactions?limit=10&accountId=uuid&startDate=2024-01-01`

**Response:**

```json
{
  "total": 150,
  "limit": 10,
  "offset": 0,
  "hasMore": true,
  "summary": {
    "totalTransactions": 150,
    "totalAmount": "5000.00",
    "averageAmount": "33.33",
    "minAmount": "1.00",
    "maxAmount": "500.00",
    "dateRange": {
      "earliest": "2024-01-01T00:00:00Z",
      "latest": "2024-01-31T00:00:00Z"
    }
  },
  "topCategories": [
    {
      "category": ["Food and Drink", "Restaurants"],
      "count": 25,
      "totalAmount": "750.00"
    }
  ],
  "transactions": [
    {
      "id": "uuid",
      "plaidTransactionId": "plaid_transaction_id",
      "amount": "25.50",
      "currency": "USD",
      "date": "2024-01-15T00:00:00Z",
      "name": "Starbucks",
      "merchantName": "Starbucks",
      "category": ["Food and Drink", "Restaurants"],
      "pending": false,
      "paymentChannel": "online",
      "transactionType": "place",
      "createdAt": "2024-01-15T00:00:00Z",
      "updatedAt": "2024-01-15T00:00:00Z",
      "account": {
        "id": "uuid",
        "name": "Chase Credit Card",
        "mask": "1234",
        "type": "credit",
        "plaidAccountId": "plaid_account_id",
        "institutionId": "ins_123"
      }
    }
  ]
}
```

### 4. **Get Transaction Statistics**

**Endpoint:** `GET /api/debug/transactions/stats`

Returns comprehensive transaction statistics and analytics.

**Response:**

```json
{
  "overall": {
    "totalTransactions": 150,
    "totalAmount": "5000.00",
    "averageAmount": "33.33",
    "minAmount": "1.00",
    "maxAmount": "500.00",
    "dateRange": {
      "earliest": "2024-01-01T00:00:00Z",
      "latest": "2024-01-31T00:00:00Z"
    }
  },
  "byAccount": [
    {
      "accountId": "uuid",
      "accountName": "Chase Credit Card",
      "accountMask": "1234",
      "accountType": "credit",
      "transactionCount": 75,
      "totalAmount": "2500.00",
      "averageAmount": "33.33"
    }
  ],
  "byCategory": [
    {
      "category": ["Food and Drink", "Restaurants"],
      "count": 25,
      "totalAmount": "750.00"
    }
  ],
  "byMonth": [
    {
      "month": "2024-01-01T00:00:00Z",
      "count": 150,
      "total_amount": "5000.00",
      "avg_amount": "33.33"
    }
  ],
  "byStatus": [
    {
      "pending": false,
      "count": 140,
      "totalAmount": "4700.00"
    },
    {
      "pending": true,
      "count": 10,
      "totalAmount": "300.00"
    }
  ],
  "recentTransactions": [
    {
      "id": "uuid",
      "name": "Starbucks",
      "amount": "25.50",
      "date": "2024-01-15T00:00:00Z",
      "pending": false,
      "category": ["Food and Drink", "Restaurants"],
      "accountName": "Chase Credit Card",
      "accountMask": "1234"
    }
  ]
}
```

## Usage Examples

### Check for Duplicate Accounts

```bash
curl http://localhost:3000/api/debug/accounts
```

### Test Database Constraints

```bash
curl -X POST http://localhost:3000/api/debug/test-constraint \
  -H "Content-Type: application/json" \
  -d '{
    "plaidAccountId": "test_123",
    "name": "Test Account",
    "mask": "1234",
    "type": "credit",
    "subtype": "credit card",
    "institutionId": "ins_test"
  }'
```

### Get Recent Transactions

```bash
curl "http://localhost:3000/api/debug/transactions?limit=10"
```

### Get Transaction Statistics

```bash
curl http://localhost:3000/api/debug/transactions/stats
```

### Filter Transactions by Date Range

```bash
curl "http://localhost:3000/api/debug/transactions?startDate=2024-01-01&endDate=2024-01-31"
```

## Troubleshooting

### Duplicate Account Issues

1. Use `/api/debug/accounts` to see all accounts
2. Use `/api/debug/test-constraint` to verify database constraints
3. Check the console logs during account linking for detailed information

### Transaction Issues

1. Use `/api/debug/transactions` to inspect transaction data
2. Use `/api/debug/transactions/stats` for analytics
3. Check for data consistency and missing relationships

### Database Issues

1. Verify schema with `npx prisma db push`
2. Check database connection with `npx prisma studio`
3. Use debug endpoints to inspect data integrity
