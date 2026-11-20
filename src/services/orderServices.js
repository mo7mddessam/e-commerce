import sequelize from '../config/database.js';
import Order from '../models/order.js';
import OrderItem from '../models/orderitem.js';
import Product from '../models/product.js';
import { httpError } from '../utils/httpError.js';

export async function getMyOrders(userId) {
  const orders = await Order.findAll({
    where: { userId },
    include: [OrderItem]
  });
  if (orders.length===0) {
    throw httpError(200, 'No orders found');
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
        throw httpError(404, 'Order not found');
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
            throw httpError(404, 'Order not found');
        }

        if (!['reserved', 'confirmed'].includes(order.status)) {
            throw httpError(400, 'Order cannot be cancelled');
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
                throw httpError(404, 'Product not found');
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
        throw httpError(400, 'Invalid order status');
    }

    const order = await Order.findByPk(orderId);

    if (!order) {
        throw httpError(404, 'Order not found');
    }

    order.status = status;

    await order.save();

    return order;
}
