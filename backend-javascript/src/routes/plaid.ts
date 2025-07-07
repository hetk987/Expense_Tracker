import express from 'express';
import { PlaidController } from '../controllers/plaidController';

const router = express.Router();

// Create a link token for Plaid Link
router.post('/create-link-token', PlaidController.createLinkToken);

// Exchange public token for access token and store accounts
router.post('/exchange-token', PlaidController.exchangePublicToken);

// Get all linked accounts
router.get('/accounts', PlaidController.getAccounts);

// Get transactions with optional filtering
router.get('/transactions', PlaidController.getTransactions);

// Handle Plaid webhooks
router.post('/webhook', PlaidController.handleWebhook);

// Manual trigger for transaction sync
router.post('/sync', PlaidController.syncTransactions);

export default router; 