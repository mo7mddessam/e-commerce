import sequelize from '../config/database.js';

import Payment from '../models/payment.js';
import Order from '../models/order.js';
import OrderItem from '../models/orderitem.js';
import Product from '../models/product.js';
import { httpError } from '../utils/httpError.js';

export async function processPayment(paymentId) {
    const transaction = await sequelize.transaction();

    try {

        const payment = await Payment.findByPk(paymentId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!payment) {
            throw httpError(404, 'Payment not found');
        }

        if (payment.status !== 'pending') {
            throw httpError(400, 'Payment already processed');
        }

        if (payment.method !== 'card') {
            throw httpError(400, 'Payment method must be card');
        }


        const order = await Order.findByPk(payment.orderId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!order) {
            throw httpError(404, 'Order not found');
        }

        if (order.status !== 'reserved') {
            throw httpError(400, 'Order is not awaiting payment');
        }

        if (!order.reservationExpiresAt ||new Date(order.reservationExpiresAt) <= new Date()) {
            throw httpError(400, 'Order reservation has expired');
        }


        const orderItems = await OrderItem.findAll({
            where: { orderId: order.id },
            order: [['productId', 'ASC']],
            transaction
        });

        if (orderItems.length === 0) {
            throw httpError(400, 'Order has no items');
        }


        for (const item of orderItems) {
            const product = await Product.findByPk(item.productId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!product ||product.stock < item.quantity || product.reservedStock < item.quantity
            ) {
                throw httpError(400, 'Reserved stock is no longer available');
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
