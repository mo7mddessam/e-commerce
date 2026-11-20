import sequelize from '../config/database.js';
import stripe from '../config/stripe.js';

import {
    Cart,
    CartItem,
    Product,
    Order,
    OrderItem,
    Payment
} from '../models/relations.js';

export async function checkout(userId, paymentMethod, shippingData) {
    const transaction = await sequelize.transaction();

    try {
        if (!['cash', 'card'].includes(paymentMethod)) {
            const error = new Error('Invalid payment method');
            error.statusCode = 400;
            throw error;
        }

        const {
            recipientName,
            phone,
            shippingAddress
        } = shippingData ?? {};

        if (
            typeof recipientName !== 'string' ||
            !recipientName.trim() ||
            typeof phone !== 'string' ||
            !phone.trim() ||
            typeof shippingAddress !== 'string' ||
            !shippingAddress.trim()
        ) {
            const error = new Error(
                'Recipient name, phone and shipping address are required'
            );
            error.statusCode = 400;
            throw error;
        }

        const cart = await Cart.findOne({
            where: { userId },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!cart) {
            const error = new Error('Cart not found');
            error.statusCode = 404;
            throw error;
        }

        const cartItems = await CartItem.findAll({
            where: { cartId: cart.id },
            include: [{ model: Product }],
            transaction
        });

        if (cartItems.length === 0) {
            const error = new Error('Cart is empty');
            error.statusCode = 400;
            throw error;
        }

        for (const item of cartItems) {
            if (!Number.isInteger(Number(item.quantity)) ||
                Number(item.quantity) <= 0) {
                const error = new Error('Invalid quantity');
                error.statusCode = 400;
                throw error;
            }

            if (!item.Product) {
                const error = new Error('Product not found');
                error.statusCode = 404;
                throw error;
            }
        }

        const totalPrice = Number(
            cartItems.reduce(
                (total, item) =>
                    total +
                    Number(item.quantity) * Number(item.Product.price),
                0
            ).toFixed(2)
        );

        const sortedItems = [...cartItems].sort(
            (a, b) => a.productId - b.productId
        );

        for (const item of sortedItems) {
            const product = await Product.findByPk(item.productId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (
                !product ||
                Number(item.quantity) >
                    Number(product.stock) - Number(product.reservedStock)
            ) {
                const error = new Error('Not enough available stock');
                error.statusCode = 400;
                throw error;
            }

            product.reservedStock =
                Number(product.reservedStock) + Number(item.quantity);

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
                reservationExpiresAt: new Date(
                    Date.now() + 15 * 60 * 1000
                )
            },
            { transaction }
        );

        for (const item of cartItems) {
            await OrderItem.create(
                {
                    orderId: order.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: Number(item.Product.price) * Number(item.quantity),
                    unitPrice: item.Product.price
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
                const error = new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in the environment.');
                error.statusCode = 503;
                throw error;
            }

            const currency = (
                process.env.STRIPE_CURRENCY || 'egp'
            ).toLowerCase();

            const session = await stripe.checkout.sessions.create({
                mode: 'payment',

                line_items: cartItems.map((item) => ({
                    price_data: {
                        currency,
                        product_data: {
                            name: item.Product.name
                        },
                        unit_amount: Math.round(
                            Number(item.Product.price) * 100
                        )
                    },
                    quantity: Number(item.quantity)
                })),

                client_reference_id: String(order.id),

                metadata: {
                    orderId: String(order.id),
                    paymentId: String(payment.id)
                },

                success_url:
                    `${process.env.CLIENT_URL || 'http://localhost:3000'}` +
                    '/payment/success?session_id={CHECKOUT_SESSION_ID}',

                cancel_url:
                    `${process.env.CLIENT_URL || 'http://localhost:3000'}` +
                    '/payment/cancel'
            });

            checkoutUrl = session.url;
        }

        await CartItem.destroy({
            where: { cartId: cart.id },
            transaction
        });

        await transaction.commit();

        return {
            order,
            payment,
            checkoutUrl
        };
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }

        throw error;
    }
}
