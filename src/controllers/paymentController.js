import stripe from '../config/stripe.js';

/**
 * This endpoint is only a customer-facing return page/status check.
 * The Stripe webhook remains the source of truth for updating the database.
 */
export async function paymentSuccessController(req, res, next) {
    try {
        const { session_id: sessionId } = req.query;

        if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
            return res.status(400).json({ message: 'A valid Stripe session_id is required' });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        return res.status(200).json({
            message: session.payment_status === 'paid'
                ? 'Payment received. Order confirmation is being finalized.'
                : 'Payment has not been confirmed yet.',
            paymentStatus: session.payment_status,
            orderId: session.metadata?.orderId ?? null
        });
    } catch (error) {
        next(error);
    }
}

export function paymentCancelController(req, res) {
    return res.status(200).json({
        message: 'Checkout was cancelled. Any stock reservation will expire automatically.'
    });
}
