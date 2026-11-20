import sequelize from '../config/database.js';
import { Order, OrderItem, Product } from '../models/relations.js';

export async function getMyOrders(userId) {
    const orders = await Order.findAll({
        where: { userId },
        include: [OrderItem]
    });

    if (orders.length === 0) {
        const error = new Error('No orders found');
        error.statusCode = 200;
        throw error;
    }

    return orders;
}

export async function getOrderById(orderid, userId) {
    const order = await Order.findOne({
        where: {
            id: orderid,
            userId
        },
        include: [OrderItem]
    });

    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
    }

    return order;
}

export async function cancelOrder(orderId, userId) {
    const transaction = await sequelize.transaction();

    try {
        const order = await Order.findOne({
            where: { id: orderId, userId },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }

        if (!['reserved', 'confirmed'].includes(order.status)) {
            const error = new Error('Order cannot be cancelled');
            error.statusCode = 400;
            throw error;
        }

        const orderItems = await OrderItem.findAll({
            where: { orderId: order.id },
            order: [['productId', 'ASC']],
            transaction
        });

        for (const item of orderItems) {
            const product = await Product.findByPk(item.productId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!product) {
                const error = new Error('Product not found');
                error.statusCode = 404;
                throw error;
            }

            if (order.status === 'reserved') {
                if (product.reservedStock < item.quantity) {
                    throw new Error('Invalid reserved stock');
                }

                product.reservedStock -= item.quantity;
            } else {
                product.stock += item.quantity;
            }

            await product.save({ transaction });
        }

        order.status = 'cancelled';
        order.reservationExpiresAt = null;

        await order.save({ transaction });
        await transaction.commit();

        return order;
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }

        throw error;
    }
}

export async function updateOrderStatus(orderId, status) {
    const allowedStatuses = [
        'confirmed',
        'shipped',
        'delivered',
        'cancelled'
    ];

    if (!allowedStatuses.includes(status)) {
        const error = new Error('Invalid order status');
        error.statusCode = 400;
        throw error;
    }

    const order = await Order.findByPk(orderId);

    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
    }

    order.status = status;

    await order.save();

    return order;
}
