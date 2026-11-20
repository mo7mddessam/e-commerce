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

import { startReservationScheduler } from './reservationScheduler.js';
import { errorMiddleware } from './middlewares/errorMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();


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

app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

app.use(errorMiddleware);

startReservationScheduler();

export default app;
