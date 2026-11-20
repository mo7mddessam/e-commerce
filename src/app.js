import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import checkoutRoutes from './routes/checkoutRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

import {
    stripeWebhookController
} from './controllers/stripeWebhookController.js';
import { paymentSuccessController, paymentCancelController } from './controllers/paymentController.js';

import { releaseExpiredReservations } from './services/reservationServices.js';
import { initDb } from './config/initDb.js';
import { errorMiddleware } from './middlewares/errorMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use((req, res, next) => {
    if (req.url.startsWith('/backend/')) {
        req.url = req.url.slice('/backend'.length);
    }
    next();
});

// make sure the tables / associations are ready before any request touches the DB
app.use(async (req, res, next) => {
    try {
        await initDb();
        next();
    } catch (error) {
        next(error);
    }
});

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookController);

app.get('/payment/success', paymentSuccessController);
app.get('/payment/cancel', paymentCancelController);

app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/payments', paymentRoutes);

// Vercel Cron target (the reservation scheduler can't run in a serverless function)
app.get('/api/cron/release-reservations', async (req, res, next) => {
    try {
        const secret = process.env.CRON_SECRET;
        if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        res.json(await releaseExpiredReservations());
    } catch (error) {
        next(error);
    }
});

// Local only: on Vercel the frontend is served as static files straight from frontend/public
if (!process.env.VERCEL) {
    app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
}

app.use(errorMiddleware);

export default app;
