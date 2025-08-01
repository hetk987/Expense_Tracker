# Debug Endpoint Security

## Overview

All debug API endpoints are now protected with environment-based access controls to prevent data leakage in production environments. This ensures that sensitive financial data and database operations are only accessible in development or when explicitly authorized.

## Security Implementation

### Environment-Based Access Control

Debug endpoints are only accessible when:

1. **Development Mode**: `NODE_ENV === 'development'`
2. **Explicit Debug Flag**: `ENABLE_DEBUG_ENDPOINTS === 'true'`

### Authentication Methods

#### 1. Development Mode (Default)

```bash
NODE_ENV=development
```

- Automatically enables debug endpoints
- No additional configuration needed
- Safe for local development

#### 2. Explicit Debug Flag

```bash
ENABLE_DEBUG_ENDPOINTS=true
```

- Enables debug endpoints in any environment
- Use with caution in production
- Should be temporary for troubleshooting

## Protected Endpoints

### `/api/debug/accounts`

- **Method**: GET
- **Purpose**: List all Plaid accounts
- **Data**: Account details, institution info, creation dates
- **Security**: Environment-based access control

### `/api/debug/transactions`

- **Method**: GET
- **Purpose**: List transactions with filtering
- **Data**: Transaction details, amounts, categories, account info
- **Security**: Environment-based access control

### `/api/debug/transactions/stats`

- **Method**: GET
- **Purpose**: Transaction statistics and analytics
- **Data**: Aggregated financial data, account summaries
- **Security**: Environment-based access control

### `/api/debug/test-constraint`

- **Method**: POST
- **Purpose**: Test database constraints
- **Data**: Creates test accounts
- **Security**: Environment-based access control

## Usage Examples

### Development Environment

```bash
# Debug endpoints automatically available
curl http://localhost:3000/api/debug/accounts
```

### Production with Debug Flag

```bash
# Enable debug endpoints temporarily
export ENABLE_DEBUG_ENDPOINTS=true

# Access debug endpoints (use with caution)
curl http://your-domain.com/api/debug/accounts
```

## Security Features

### 1. Access Logging

All debug endpoint access is logged with:

- Timestamp
- Endpoint accessed
- IP address
- User agent
- Environment information

### 2. Environment Validation

- Checks `NODE_ENV` environment variable
- Validates debug flags

### 3. Error Responses

- **403 Forbidden**: Debug endpoints not available
- **500 Internal Server Error**: Server-side errors

### 4. Debug Information

All responses include debug metadata:

```json
{
  "data": "...",
  "debug": {
    "environment": "development",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Environment Variables

### Required for Debug Access

```bash
# Development mode (automatic)
NODE_ENV=development

# OR explicit debug flag
ENABLE_DEBUG_ENDPOINTS=true
```

### Optional Configuration

```bash
# Enable debug endpoints explicitly
ENABLE_DEBUG_ENDPOINTS=true
```

## Security Best Practices

### 1. Development

- Use `NODE_ENV=development` for local development
- Debug endpoints are automatically available
- No additional configuration needed

### 2. Production

- Never enable debug endpoints permanently in production
- Use `ENABLE_DEBUG_ENDPOINTS=true` only for temporary access
- Monitor access logs for unauthorized attempts

### 3. Emergency Access

```bash
# Enable debug endpoints temporarily
export ENABLE_DEBUG_ENDPOINTS=true

# Access debug endpoint
curl https://your-domain.com/api/debug/accounts

# Disable after use
unset ENABLE_DEBUG_ENDPOINTS
```

### 4. Monitoring

- Review debug access logs regularly
- Monitor for unusual access patterns
- Alert on unauthorized access attempts
- Ensure debug flag is disabled after troubleshooting

## Implementation Details

### Debug Authentication Utility

Located at `src/lib/debugAuth.ts`:

```typescript
// Check if debug is enabled
export function isDebugEnabled(): boolean;

// Validate debug access
export function checkDebugAccess(request: NextRequest): NextResponse | null;

// Protect debug endpoints
export function debugProtected(handler: Function): Function;

// Log debug access
export function logDebugAccess(request: NextRequest, endpoint: string): void;
```

### Usage Pattern

```typescript
import { debugProtected, logDebugAccess } from "@/lib/debugAuth";

async function debugHandler(request: NextRequest) {
  logDebugAccess(request, "/api/debug/endpoint");
  // ... handler logic
}

export const GET = debugProtected(debugHandler);
```

## Troubleshooting

### Debug Endpoints Not Accessible

1. Check `NODE_ENV` environment variable
2. Verify `ENABLE_DEBUG_ENDPOINTS` setting
3. Check server logs for access attempts

### Production Deployment

1. Ensure debug endpoints are disabled by default
2. Use `ENABLE_DEBUG_ENDPOINTS=true` only for temporary access
3. Monitor access logs for security incidents
4. Disable debug flag after troubleshooting

## Compliance

This implementation ensures:

- **Data Protection**: Sensitive financial data is not exposed in production
- **Access Control**: Debug endpoints require explicit environment configuration
- **Audit Trail**: All access is logged for security monitoring
- **Environment Isolation**: Development and production environments are properly separated
