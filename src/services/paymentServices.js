import sequelize from '../config/database.js';

import Payment from '../models/payment.js';
import Order from '../models/order.js';
import OrderItem from '../models/orderitem.js';
import Product from '../models/product.js';

export async function processPayment(paymentId) {
    const transaction = await sequelize.transaction();

    try {

        const payment = await Payment.findByPk(paymentId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!payment) {
            const error = new Error('Payment not found');
            error.statusCode = 404;
            throw error;
        }

        if (payment.status !== 'pending') {
            const error = new Error('Payment already processed');
            error.statusCode = 400;
            throw error;
        }

        if (payment.method !== 'card') {
            const error = new Error('Payment method must be card');
            error.statusCode = 400;
            throw error;
        }


        const order = await Order.findByPk(payment.orderId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }

        if (order.status !== 'reserved') {
            const error = new Error('Order is not awaiting payment');
            error.statusCode = 400;
            throw error;
        }

        if (!order.reservationExpiresAt ||new Date(order.reservationExpiresAt) <= new Date()) {
            const error = new Error('Order reservation has expired');
            error.statusCode = 400;
            throw error;
        }


        const orderItems = await OrderItem.findAll({
            where: { orderId: order.id },
            order: [['productId', 'ASC']],
            transaction
        });

        if (orderItems.length === 0) {
            const error = new Error('Order has no items');
            error.statusCode = 400;
            throw error;
        }


        for (const item of orderItems) {
            const product = await Product.findByPk(item.productId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!product ||product.stock < item.quantity || product.reservedStock < item.quantity
            ) {
                const error = new Error(
                    'Reserved stock is no longer available'
                );
                error.statusCode = 400;
                throw error;
            }

            product.stock -= item.quantity;
            product.reservedStock -= item.quantity;

            await product.save({ transaction });
        }


        payment.status = 'successful';
        await payment.save({ transaction });


        order.status = 'confirmed';
        order.reservationExpiresAt = null;

        await order.save({ transaction });

        await transaction.commit();

        return { order, payment };

    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }

        throw error;
    }
}
