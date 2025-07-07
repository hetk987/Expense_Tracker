# Expense Tracker Backend with Plaid Integration

This backend provides expense tracking functionality with Plaid integration for automatic transaction syncing.

## Features

- Manual expense tracking
- Plaid integration for automatic transaction syncing
- Daily scheduled job to sync new transactions
- RESTful API endpoints
- PostgreSQL database with Prisma ORM

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/expense_tracker"

# Server
PORT=3000

# Plaid Configuration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox  # or 'development' or 'production'
PLAID_WEBHOOK_URL=https://your-domain.com/plaid/webhook
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed the database
npx prisma db seed
```

### 4. Start the Server

```bash
# Development
npm run dev

# Production
npm start
```

## Plaid Integration

### Getting Plaid Credentials

1. Sign up for a Plaid account at https://dashboard.plaid.com/
2. Create a new app in the Plaid Dashboard
3. Get your Client ID and Secret from the dashboard
4. Set up webhook endpoints (optional but recommended)

### API Endpoints

#### Plaid Integration

- `POST /plaid/create-link-token` - Create a link token for Plaid Link
- `POST /plaid/exchange-token` - Exchange public token for access token
- `GET /plaid/accounts` - Get all linked accounts
- `GET /plaid/transactions` - Get transactions with filtering
- `POST /plaid/webhook` - Handle Plaid webhooks
- `POST /plaid/sync` - Manually trigger transaction sync

#### Existing Endpoints

- `GET /expense` - Get all expenses
- `POST /expense` - Create a new expense
- `GET /category` - Get all categories
- `POST /category` - Create a new category
- `GET /tag` - Get all tags
- `POST /tag` - Create a new tag

## Scheduled Jobs

The application includes a daily scheduled job that runs at 2 AM to sync new transactions from Plaid. This can be customized in `src/services/schedulerService.ts`.

## Database Schema

The application uses the following main models:

- `Expense` - Manual expense entries
- `Category` - Expense categories
- `Tag` - Expense tags
- `PlaidAccount` - Linked bank accounts
- `PlaidTransaction` - Transactions from Plaid
- `PlaidLinkToken` - Plaid link tokens

## Frontend Integration

To integrate with a frontend:

1. Use the `/plaid/create-link-token` endpoint to get a link token
2. Use Plaid Link to connect bank accounts
3. Exchange the public token using `/plaid/exchange-token`
4. Fetch transactions using `/plaid/transactions`
5. Create visualizations using the transaction data

## Development

### Running in Development Mode

```bash
npm run dev
```

This will start the server with hot reloading using nodemon.

### Database Migrations

When making schema changes:

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations to production
npx prisma migrate deploy
```

### Prisma Studio

To view and edit data in a GUI:

```bash
npx prisma studio
```
