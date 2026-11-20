import cron from 'node-cron';
import { releaseExpiredReservations } from './services/reservationServices.js';

export function startReservationScheduler() {
    cron.schedule('* * * * *', async () => {
        try {
            const result = await releaseExpiredReservations();
            console.log('Expired reservations checked', result);
        } catch (error) {
            console.error('Reservation scheduler error:', error);
        }
    });

    console.log('Reservation scheduler started');
}
