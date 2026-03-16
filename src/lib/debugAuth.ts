import { NextRequest, NextResponse } from 'next/server';

/**
 * Environment-based debug endpoint security.
 * Debug routes are disabled in production unless explicitly enabled via env.
 */
export function isDebugEnabled(): boolean {
    if (process.env.NODE_ENV === 'development') {
        return true;
    }
    if (process.env.DEBUG_API_ENABLED === 'true' || process.env.ENABLE_DEBUG_ENDPOINTS === 'true') {
        return true;
    }
    return false;
}

/**
 * Middleware function to protect debug endpoints
 * Returns null if access is allowed, or a response if access is denied
 */
export function checkDebugAccess(request: NextRequest): NextResponse | null {
    if (!isDebugEnabled()) {
        return NextResponse.json(
            {
                error: 'Debug endpoints are not available in this environment',
                message: 'This endpoint is only available in development mode',
            },
            { status: 403 }
        );
    }

    return null; // Access allowed
}

/**
 * Wrapper function to protect debug endpoints
 * Usage: export const GET = debugProtected(async (request) => { ... })
 */
export function debugProtected(
    handler: (request: NextRequest) => Promise<NextResponse>
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        const accessCheck = checkDebugAccess(request);
        if (accessCheck) {
            return accessCheck;
        }

        return handler(request);
    };
}

/**
 * Log debug endpoint access for security monitoring
 */
export function logDebugAccess(request: NextRequest, endpoint: string): void {
    const timestamp = new Date().toISOString();
    const ip = request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    console.log(`[DEBUG ACCESS] ${timestamp} - ${endpoint} - IP: ${ip} - UA: ${userAgent}`);
} 