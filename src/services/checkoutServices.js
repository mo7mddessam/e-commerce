import sequelize from '../config/database.js';
import stripe from '../config/stripe.js';

import {
    Cart,
    CartItem,
    Product,
    Order,
    OrderItem,
    Payment
} from '../models/index.js';

import { releaseExpiredReservations } from './reservationServices.js';
import { httpError } from '../utils/httpError.js';

const clientUrl = (
    process.env.CLIENT_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    'http://localhost:5173'
).replace(/\/+$/, '');

export async function checkout(userId, paymentMethod, shippingData) {
    // Free stock held by expired reservations (there is no background cron on Vercel)
    try {
        await releaseExpiredReservations();
    } catch (err) {
        console.error('Could not release expired reservations:', err.message);
    }

    const transaction = await sequelize.transaction();

    try {
        if (!['cash', 'card'].includes(paymentMethod)) {
            throw httpError(400, 'Invalid payment method');
        }

        const { recipientName, phone, shippingAddress } = shippingData ?? {};

        if (
            typeof recipientName !== 'string' || !recipientName.trim() ||
            typeof phone !== 'string' || !phone.trim() ||
            typeof shippingAddress !== 'string' || !shippingAddress.trim()
        ) {
            throw httpError(400, 'Recipient name, phone and shipping address are required');
        }

        const cart = await Cart.findOne({
            where: { userId },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!cart) {
            throw httpError(404, 'Cart not found');
        }

        // The association is declared with `as: 'product'` (models/relations.js),
        // so the include MUST use the same alias and the result is `item.product`.
        const cartItems = await CartItem.findAll({
            where: { cartId: cart.id },
            include: [{ model: Product, as: 'product' }],
            transaction
        });

        if (cartItems.length === 0) {
            throw httpError(400, 'Cart is empty');
        }

        for (const item of cartItems) {
            if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0) {
                throw httpError(400, 'Invalid quantity');
            }
        }

        // Items whose product was deleted: remove them from the bag and tell the user.
        const missing = cartItems.filter((item) => !item.product);

        if (missing.length > 0) {
            await CartItem.destroy({
                where: { id: missing.map((item) => item.id) },
                transaction
            });
            await transaction.commit();

            throw httpError(
                404,
                'Some items in your bag are no longer available and were removed. Please review your bag and try again.'
            );
        }

        const totalPrice = Number(
            cartItems
                .reduce((total, item) => total + Number(item.quantity) * Number(item.product.price), 0)
                .toFixed(2)
        );

        // Lock products in a stable order to avoid deadlocks, then reserve stock.
        const sortedItems = [...cartItems].sort((a, b) => a.productId - b.productId);

        for (const item of sortedItems) {
            const product = await Product.findByPk(item.productId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (
                !product ||
                Number(item.quantity) > Number(product.stock) - Number(product.reservedStock)
            ) {
                throw httpError(400, 'Not enough available stock');
            }

            product.reservedStock = Number(product.reservedStock) + Number(item.quantity);
            await product.save({ transaction });
        }

        const order = await Order.create(
            {
                userId,
                recipientName: recipientName.trim(),
                phone: phone.trim(),
                shippingAddress: shippingAddress.trim(),
                totalPrice,
                status: 'reserved',
                reservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000)
            },
            { transaction }
        );

        for (const item of cartItems) {
            await OrderItem.create(
                {
                    orderId: order.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: Number(item.product.price) * Number(item.quantity),
                    unitPrice: item.product.price
                },
                { transaction }
            );
        }

        const payment = await Payment.create(
            {
                orderId: order.id,
                amount: totalPrice,
                method: paymentMethod,
                status: 'pending'
            },
            { transaction }
        );

        let checkoutUrl = null;

        if (paymentMethod === 'card') {
            if (!stripe) {
                throw httpError(503, 'Stripe is not configured. Set STRIPE_SECRET_KEY in the environment.');
            }

            const currency = (process.env.STRIPE_CURRENCY || 'egp').toLowerCase();

            const session = await stripe.checkout.sessions.create({
                mode: 'payment',

                line_items: cartItems.map((item) => ({
                    price_data: {
                        currency,
                        product_data: { name: item.product.name },
                        unit_amount: Math.round(Number(item.product.price) * 100)
                    },
                    quantity: Number(item.quantity)
                })),

                client_reference_id: String(order.id),

                metadata: {
                    orderId: String(order.id),
                    paymentId: String(payment.id)
                },

                success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${clientUrl}/payment/cancel`
            });

            checkoutUrl = session.url;
        }

        await CartItem.destroy({
            where: { cartId: cart.id },
            transaction
        });

        await transaction.commit();

        return { order, payment, checkoutUrl };
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }

        throw error;
    }
}
