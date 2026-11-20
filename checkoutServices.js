import sequelize from '../config/database.js';

import Cart from '../models/cart.js';
import CartItem from '../models/cartitem.js';
import Product from '../models/product.js';

import Order from '../models/order.js';
import OrderItem from '../models/orderitem.js';
import Payment from '../models/payment.js';

export async function checkout(userId, paymentMethod, shippingData) {
    const transaction = await sequelize.transaction();

    try {
        if (!['cash', 'card'].includes(paymentMethod)) {
            const error = new Error('Invalid payment method');
            error.statusCode = 400;
            throw error;
        }

        const { recipientName, phone, shippingAddress } = shippingData ?? {};

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
            include: [Product],
            transaction
        });

        if (cartItems.length === 0) {
            const error = new Error('Cart is empty');
            error.statusCode = 400;
            throw error;
        }

        for (const item of cartItems) {
            if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
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

        let totalPrice = 0;

        for (const item of cartItems) {
            totalPrice += item.quantity * Number(item.Product.price);
        }

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
                item.quantity > product.stock - product.reservedStock
            ) {
                const error = new Error('Not enough available stock');
                error.statusCode = 400;
                throw error;
            }

            product.reservedStock += item.quantity;
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

        await CartItem.destroy({
            where: { cartId: cart.id },
            transaction
        });

        await transaction.commit();

        return { order, payment };
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }

        throw error;
    }
}
