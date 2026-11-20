import { checkout } from '../services/checkoutServices.js';

export async function checkoutController(req, res, next) {
    try {
        const userId = req.user.id;

        const {
            paymentMethod,
            recipientName,
            phone,
            shippingAddress
        } = req.body;

        const result = await checkout(userId, paymentMethod, {
            recipientName,
            phone,
            shippingAddress
        });

        return res.status(201).json({
            message: 'Checkout completed successfully',
            ...result
        });
    } catch (error) {
        next(error);
    }
}
