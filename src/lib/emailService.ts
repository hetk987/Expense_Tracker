import { BudgetProgress, BudgetAlert } from '@/types';
import { formatCurrency } from './utils';

// NOTE: Email functionality is currently DISABLED to avoid missing package dependencies
// To re-enable, install: npm install @sendgrid/mail nodemailer
// Then restore the original email sending methods

// Email service configuration
interface EmailConfig {
    provider: 'resend' | 'sendgrid' | 'nodemailer';
    apiKey: string;
    fromEmail: string;
    fromName: string;
}

// Email templates
interface EmailTemplate {
    subject: string;
    html: string;
    text: string;
}

export class EmailService {
    private config: EmailConfig;

    constructor() {
        this.config = {
            provider: (process.env.EMAIL_PROVIDER as 'resend' | 'sendgrid' | 'nodemailer') || 'resend',
            apiKey: process.env.EMAIL_API_KEY || '',
            fromEmail: process.env.FROM_EMAIL || 'noreply@expensetracker.com',
            fromName: process.env.FROM_NAME || 'Expense Tracker',
        };
    }

    /**
     * Send budget alert email
     */
    async sendBudgetAlert(
        userEmail: string,
        userName: string,
        progress: BudgetProgress,
        alertType: 'WARNING' | 'EXCEEDED' | 'APPROACHING'
    ): Promise<boolean> {
        // Email service temporarily disabled
        console.log(`Email service disabled: Would send ${alertType} alert to ${userEmail} for budget ${progress.budget.name}`);
        return true;
    }

    /**
     * Send weekly budget summary email
     */
    async sendWeeklyBudgetSummary(
        userEmail: string,
        userName: string,
        budgetProgressList: BudgetProgress[]
    ): Promise<boolean> {
        // Email service temporarily disabled
        console.log(`Email service disabled: Would send weekly summary to ${userEmail} with ${budgetProgressList.length} budgets`);
        return true;
    }

    /**
     * Send with Resend (recommended)
     */
    private async sendWithResend(emailData: any): Promise<boolean> {
        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(emailData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Resend API error:', errorData);
                return false;
            }

            const result = await response.json();
            console.log('Email sent successfully with Resend:', result.id);
            return true;
        } catch (error) {
            console.error('Error with Resend:', error);
            return false;
        }
    }

    /**
     * Send with SendGrid - DISABLED
     */
    private async sendWithSendGrid(emailData: any): Promise<boolean> {
        console.log('SendGrid email service is disabled');
        return false;
    }

    /**
     * Send with Nodemailer - DISABLED
     */
    private async sendWithNodemailer(emailData: any): Promise<boolean> {
        console.log('Nodemailer email service is disabled');
        return false;
    }

    /**
     * Generic send email method
     */
    private async sendEmail(emailData: any): Promise<boolean> {
        switch (this.config.provider) {
            case 'resend':
                return await this.sendWithResend(emailData);
            case 'sendgrid':
                return await this.sendWithSendGrid(emailData);
            case 'nodemailer':
                return await this.sendWithNodemailer(emailData);
            default:
                return false;
        }
    }

    /**
     * Generate budget alert email template
     */
    private generateBudgetAlertTemplate(
        progress: BudgetProgress,
        alertType: 'WARNING' | 'EXCEEDED' | 'APPROACHING',
        userName: string
    ): EmailTemplate {
        const { budget, spent, remaining, percentage } = progress;

        const alertMessages = {
            WARNING: {
                emoji: '⚠️',
                title: 'Budget Warning',
                message: `Your "${budget.name}" budget has reached ${Math.round(percentage)}% of your limit.`,
                color: '#f59e0b',
            },
            EXCEEDED: {
                emoji: '🚨',
                title: 'Budget Exceeded',
                message: `Your "${budget.name}" budget has been exceeded by ${formatCurrency(Math.abs(remaining))}.`,
                color: '#dc2626',
            },
            APPROACHING: {
                emoji: '📊',
                title: 'Budget Alert',
                message: `Your "${budget.name}" budget is approaching its limit at ${Math.round(percentage)}%.`,
                color: '#2563eb',
            },
        };

        const alert = alertMessages[alertType];

        const subject = `${alert.emoji} ${alert.title}: ${budget.name}`;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${alert.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: ${alert.color}; color: white; padding: 24px; text-align: center; }
        .content { padding: 24px; }
        .alert-box { background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .progress-bar { background-color: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden; margin: 12px 0; }
        .progress-fill { height: 100%; background-color: ${alert.color}; }
        .footer { background-color: #f9fafb; padding: 16px; text-align: center; color: #6b7280; font-size: 14px; }
        .button { display: inline-block; background-color: ${alert.color}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${alert.emoji} ${alert.title}</h1>
        </div>
        <div class="content">
            <p>Hi ${userName},</p>
            <p>${alert.message}</p>
            
            <div class="alert-box">
                <h3>${budget.name}</h3>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                <p><strong>Spent:</strong> ${formatCurrency(spent)} of ${formatCurrency(budget.amount)} (${Math.round(percentage)}%)</p>
                <p><strong>Remaining:</strong> ${progress.isOverBudget ? formatCurrency(Math.abs(remaining)) + ' over budget' : formatCurrency(remaining)}</p>
                ${progress.daysRemaining > 0 ? `<p><strong>Days remaining:</strong> ${progress.daysRemaining}</p>` : ''}
            </div>
            
            <p>To review your budget and spending details, click the button below:</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/budgets" class="button">View Budget Dashboard</a></p>
            
            <p>Best regards,<br>Your Expense Tracker Team</p>
        </div>
        <div class="footer">
            <p>You're receiving this email because you have budget alerts enabled. You can manage your notification preferences in your account settings.</p>
        </div>
    </div>
</body>
</html>`;

        const text = `
${alert.title}: ${budget.name}

Hi ${userName},

${alert.message}

Budget Details:
- Spent: ${formatCurrency(spent)} of ${formatCurrency(budget.amount)} (${Math.round(percentage)}%)
- Remaining: ${progress.isOverBudget ? formatCurrency(Math.abs(remaining)) + ' over budget' : formatCurrency(remaining)}
${progress.daysRemaining > 0 ? `- Days remaining: ${progress.daysRemaining}` : ''}

View your budget dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/budgets

Best regards,
Your Expense Tracker Team
`;

        return { subject, html, text };
    }

    /**
     * Generate weekly summary email template
     */
    private generateWeeklySummaryTemplate(
        budgetProgressList: BudgetProgress[],
        userName: string
    ): EmailTemplate {
        const totalBudgets = budgetProgressList.length;
        const exceededBudgets = budgetProgressList.filter(p => p.isOverBudget).length;
        const warningBudgets = budgetProgressList.filter(p =>
            p.percentage >= p.budget.alertThreshold && !p.isOverBudget
        ).length;

        const subject = `📊 Weekly Budget Summary - ${totalBudgets} Budgets Tracked`;

        const budgetRows = budgetProgressList
            .sort((a, b) => b.percentage - a.percentage)
            .map(progress => {
                const status = progress.isOverBudget ? '🚨' :
                    progress.percentage >= progress.budget.alertThreshold ? '⚠️' : '✅';
                return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${status} ${progress.budget.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(progress.spent)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(progress.budget.amount)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${Math.round(progress.percentage)}%</td>
        </tr>`;
            }).join('');

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Budget Summary</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #2563eb; color: white; padding: 24px; text-align: center; }
        .content { padding: 24px; }
        .stats { display: flex; justify-content: space-around; margin: 24px 0; }
        .stat { text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #2563eb; }
        .stat-label { font-size: 14px; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th { background-color: #f3f4f6; padding: 12px 8px; text-align: left; font-weight: 600; }
        .footer { background-color: #f9fafb; padding: 16px; text-align: center; color: #6b7280; font-size: 14px; }
        .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Weekly Budget Summary</h1>
        </div>
        <div class="content">
            <p>Hi ${userName},</p>
            <p>Here's your weekly budget summary with insights into your spending patterns:</p>
            
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">${totalBudgets}</div>
                    <div class="stat-label">Total Budgets</div>
                </div>
                <div class="stat">
                    <div class="stat-number" style="color: #dc2626;">${exceededBudgets}</div>
                    <div class="stat-label">Over Budget</div>
                </div>
                <div class="stat">
                    <div class="stat-number" style="color: #f59e0b;">${warningBudgets}</div>
                    <div class="stat-label">Warning</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Budget Name</th>
                        <th style="text-align: right;">Spent</th>
                        <th style="text-align: right;">Budget</th>
                        <th style="text-align: right;">Usage</th>
                    </tr>
                </thead>
                <tbody>
                    ${budgetRows}
                </tbody>
            </table>
            
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/budgets" class="button">View Detailed Budget Dashboard</a></p>
            
            <p>Keep up the great work managing your finances!</p>
            
            <p>Best regards,<br>Your Expense Tracker Team</p>
        </div>
        <div class="footer">
            <p>You're receiving this weekly summary because you have budget notifications enabled.</p>
        </div>
    </div>
</body>
</html>`;

        const text = `
Weekly Budget Summary

Hi ${userName},

Here's your weekly budget summary:

Summary:
- Total Budgets: ${totalBudgets}
- Over Budget: ${exceededBudgets}
- Warning: ${warningBudgets}

Budget Details:
${budgetProgressList.map(progress => {
            const status = progress.isOverBudget ? 'OVER' :
                progress.percentage >= progress.budget.alertThreshold ? 'WARN' : 'OK';
            return `- ${progress.budget.name}: ${formatCurrency(progress.spent)} / ${formatCurrency(progress.budget.amount)} (${Math.round(progress.percentage)}%) [${status}]`;
        }).join('\n')}

View your detailed budget dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/budgets

Best regards,
Your Expense Tracker Team
`;

        return { subject, html, text };
    }
}

