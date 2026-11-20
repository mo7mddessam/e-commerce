
import stripe from '../config/stripe.js';
import Payment from '../models/payment.js';
import { processPayment } from '../services/paymentServices.js';

export async function stripeWebhookController(req, res) {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !signature || !webhookSecret) {
        return res.status(400).send('Missing webhook signature or secret');
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            webhookSecret
        );
    } catch (error) {
        console.error('Stripe signature verification failed');
        return res.status(400).send('Invalid webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        try {
            if (session.payment_status !== 'paid') {
                return res.status(200).json({
                    received: true,
                    message: 'Payment is not paid yet'
                });
            }

            const { orderId, paymentId } = session.metadata ?? {};

            if (!orderId || !paymentId) {
                return res.status(400).send('Missing payment metadata');
            }

            if (session.client_reference_id !== orderId) {
                return res.status(400).send('Order reference mismatch');
            }

            const payment = await Payment.findByPk(paymentId);

            if (
                !payment ||
                payment.orderId !== Number(orderId) ||
                payment.method !== 'card'
            ) {
                return res.status(400).send('Invalid payment record');
            }

            const expectedAmount = Math.round(
                Number(payment.amount) * 100
            );

            const expectedCurrency = (
                process.env.STRIPE_CURRENCY || 'egp'
            ).toLowerCase();

            if (
                session.amount_total !== expectedAmount ||
                session.currency !== expectedCurrency
            ) {
                return res.status(400).send('Payment amount mismatch');
            }

            if (payment.status === 'successful') {
                return res.status(200).json({
                    received: true,
                    message: 'Payment already processed'
                });
            }

            await processPayment(payment.id);

            return res.status(200).json({
                received: true,
                message: 'Payment confirmed'
            });
        } catch (error) {
            console.error('Stripe payment processing failed:', error.message);

            return res.status(500).json({
                received: false,
                message: 'Payment processing failed'
            });
        }
    }

    return res.status(200).json({ received: true });
}
