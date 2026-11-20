
import sequelize from '../config/database.js';
import Order from '../models/order.js';
import OrderItem from '../models/orderitem.js';
import Product from '../models/product.js';
import User from '../models/user.js';
import Payment from '../models/payment.js';
import { httpError } from '../utils/httpError.js';

export async function getMyOrders(userId) {
    const orders = await Order.findAll({
        where: { userId },
        include: [
            {
                model: OrderItem,
                include: [{ model: Product }]
            }
        ],
        order: [['createdAt', 'DESC']]
    });

    return orders;
}

export async function getOrderById(orderId, userId) {
    const order = await Order.findOne({
        where: {
            id: orderId,
            userId
        },
        include: [
            {
                model: OrderItem,
                include: [{ model: Product }]
            }
        ]
    });

    if (!order) {
        throw httpError(404, 'Order not found');
    }

    return order;
}

// Puts an order's items back where they came from and marks it cancelled.
// - card payment already succeeded  -> stock was deducted, so add it back
// - otherwise (reserved / COD confirmed) -> the units are still held in reservedStock, so release them
async function cancelOrderRecord(order, transaction) {
    const payment = await Payment.findOne({
        where: { orderId: order.id },
        transaction
    });

    const stockDeducted = payment?.status === 'successful';
    const holdsReservation = ['reserved', 'confirmed', 'paid'].includes(order.status);

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
            // product was deleted from the catalogue, nothing to give back
            continue;
        }

        if (stockDeducted) {
            product.stock += item.quantity;
        } else if (holdsReservation) {
            if (order.status === 'reserved' && product.reservedStock < item.quantity) {
                throw new Error('Invalid reserved stock');
            }

            product.reservedStock = Math.max(0, product.reservedStock - item.quantity);
        }

        await product.save({ transaction });
    }

    order.status = 'cancelled';
    order.reservationExpiresAt = null;

    await order.save({ transaction });
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
            throw httpError(404, 'Order not found');
        }

        if (!['reserved', 'confirmed'].includes(order.status)) {
            throw httpError(400, 'Order cannot be cancelled');
        }

        await cancelOrderRecord(order, transaction);
        await transaction.commit();

        return order;
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }

        throw error;
    }
}

// Admin: every order in the store, newest first, with the customer who placed it.
export async function getAllOrders() {
    return Order.findAll({
        include: [
            { model: User, attributes: ['id', 'name', 'email'] },
            { model: Payment, attributes: ['id', 'method', 'status'] },
            {
                model: OrderItem,
                include: [{ model: Product }]
            }
        ],
        order: [['createdAt', 'DESC']],
        limit: 500
    });
}

async function adminCancelOrder(orderId) {
    const transaction = await sequelize.transaction();

    try {
        const order = await Order.findByPk(orderId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!order) {
            throw httpError(404, 'Order not found');
        }

        if (order.status === 'cancelled') {
            throw httpError(400, 'Order is already cancelled');
        }

        if (!['pending', 'reserved', 'paid', 'confirmed'].includes(order.status)) {
            throw httpError(400, 'Shipped or delivered orders cannot be cancelled');
        }

        await cancelOrderRecord(order, transaction);
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
        throw httpError(400, 'Invalid order status');
    }

    if (status === 'cancelled') {
        return adminCancelOrder(orderId);
    }

    const order = await Order.findByPk(orderId);

    if (!order) {
        throw httpError(404, 'Order not found');
    }

    if (order.status === 'cancelled') {
        throw httpError(400, 'Cancelled orders cannot be updated');
    }

    order.status = status;

    await order.save();

    return order;
}
