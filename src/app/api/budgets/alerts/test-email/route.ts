import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/emailService';
import { getUserInfo } from '@/lib/clerkHelpers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userEmail, userName } = body;

        // Get authenticated user info from Clerk
        const userInfo = await getUserInfo();
        
        if (!userInfo) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        // Use provided email/name for testing, or fall back to authenticated user info
        const email = userEmail || userInfo.email;
        const name = userName || userInfo.name;

        const emailService = new EmailService();
        const success = await emailService.sendTestEmail(email, name);

        if (!success) {
            return NextResponse.json(
                { error: 'Failed to send test email. Check your RESEND_API_KEY configuration.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Test email sent successfully to ${email}`
        });
    } catch (error) {
        console.error('Error sending test email:', error);
        return NextResponse.json(
            { error: 'Failed to send test email' },
            { status: 500 }
        );
    }
}

