import { Request, Response } from 'express';
import { PlaidService } from '../services/plaidService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PlaidController {
    static async createLinkToken(req: Request, res: Response) {
        try {
            const linkToken = await PlaidService.createLinkToken();
            res.json({ link_token: linkToken });
        } catch (error) {
            console.error('Error creating link token:', error);
            res.status(500).json({ error: 'Failed to create link token' });
        }
    }

    static async exchangePublicToken(req: Request, res: Response) {
        try {
            const { public_token } = req.body;

            if (!public_token) {
                return res.status(400).json({ error: 'Public token is required' });
            }

            const accessToken = await PlaidService.exchangePublicToken(public_token);

            // Get accounts for this access token
            const accounts = await PlaidService.getAccounts(accessToken);

            // Store accounts in database
            const linkToken = await prisma.plaidLinkToken.findFirst({
                where: {
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            if (!linkToken) {
                return res.status(400).json({ error: 'No valid link token found' });
            }

            // Store accounts
            for (const account of accounts) {
                await prisma.plaidAccount.create({
                    data: {
                        plaidAccountId: account.account_id,
                        name: account.name,
                        mask: account.mask,
                        type: account.type,
                        subtype: account.subtype,
                        institutionId: account.institution_id,
                        linkTokenId: linkToken.id,
                    },
                });
            }

            res.json({
                message: 'Accounts linked successfully',
                accounts: accounts.map(acc => ({
                    id: acc.account_id,
                    name: acc.name,
                    type: acc.type,
                    subtype: acc.subtype,
                }))
            });
        } catch (error) {
            console.error('Error exchanging public token:', error);
            res.status(500).json({ error: 'Failed to exchange public token' });
        }
    }

    static async getAccounts(req: Request, res: Response) {
        try {
            const accounts = await prisma.plaidAccount.findMany({
                include: {
                    transactions: {
                        orderBy: {
                            date: 'desc',
                        },
                        take: 10, // Get last 10 transactions
                    },
                },
            });

            res.json(accounts);
        } catch (error) {
            console.error('Error getting accounts:', error);
            res.status(500).json({ error: 'Failed to get accounts' });
        }
    }

    static async getTransactions(req: Request, res: Response) {
        try {
            const { accountId, startDate, endDate, limit = 50, offset = 0 } = req.query;

            const where: any = {};

            if (accountId) {
                where.accountId = accountId as string;
            }

            if (startDate && endDate) {
                where.date = {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string),
                };
            }

            const transactions = await prisma.plaidTransaction.findMany({
                where,
                include: {
                    account: true,
                },
                orderBy: {
                    date: 'desc',
                },
                take: parseInt(limit as string),
                skip: parseInt(offset as string),
            });

            const total = await prisma.plaidTransaction.count({ where });

            res.json({
                transactions,
                pagination: {
                    total,
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                },
            });
        } catch (error) {
            console.error('Error getting transactions:', error);
            res.status(500).json({ error: 'Failed to get transactions' });
        }
    }

    static async handleWebhook(req: Request, res: Response) {
        try {
            const { webhook_type, webhook_code, item_id } = req.body;

            console.log('Received webhook:', { webhook_type, webhook_code, item_id });

            // Handle different webhook types
            switch (webhook_type) {
                case 'TRANSACTIONS':
                    if (webhook_code === 'INITIAL_UPDATE' || webhook_code === 'HISTORICAL_UPDATE' || webhook_code === 'DEFAULT_UPDATE') {
                        // Trigger transaction sync
                        await PlaidService.syncTransactions();
                    }
                    break;
                case 'ITEM':
                    if (webhook_code === 'ERROR') {
                        console.error('Plaid item error:', req.body);
                    }
                    break;
                default:
                    console.log('Unhandled webhook type:', webhook_type);
            }

            res.json({ status: 'ok' });
        } catch (error) {
            console.error('Error handling webhook:', error);
            res.status(500).json({ error: 'Failed to handle webhook' });
        }
    }

    static async syncTransactions(req: Request, res: Response) {
        try {
            await PlaidService.syncTransactions();
            res.json({ message: 'Transaction sync completed' });
        } catch (error) {
            console.error('Error syncing transactions:', error);
            res.status(500).json({ error: 'Failed to sync transactions' });
        }
    }
} 