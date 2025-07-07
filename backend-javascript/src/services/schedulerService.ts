import cron from 'node-cron';
import { PlaidService } from './plaidService';

export class SchedulerService {
    static initScheduledJobs() {
        // Run transaction sync every day at 2 AM
        cron.schedule('0 2 * * *', async () => {
            console.log('Running scheduled transaction sync...');
            try {
                await PlaidService.syncTransactions();
                console.log('Scheduled transaction sync completed successfully');
            } catch (error) {
                console.error('Scheduled transaction sync failed:', error);
            }
        }, {
            scheduled: true,
            timezone: 'America/New_York' // Adjust timezone as needed
        });

        console.log('Scheduled jobs initialized');
    }

    static stopScheduledJobs() {
        cron.getTasks().forEach(task => task.stop());
        console.log('Scheduled jobs stopped');
    }
} 