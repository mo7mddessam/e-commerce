import sequelize from '../config/database.js';
import { Op } from 'sequelize';
import { Order, OrderItem, Product } from '../models/relations.js';

export async function releaseExpiredReservations() {
    const transaction = await sequelize.transaction();

    try {
        // Find expired reservations
        const orders = await Order.findAll({
            where: {
                status: 'reserved',
                reservationExpiresAt: {
                    [Op.lte]: new Date()
                }
            },
            order: [['id', 'ASC']],
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        for (const order of orders) {
            const items = await OrderItem.findAll({
                where: { orderId: order.id },
                order: [['productId', 'ASC']],
                transaction
            });

            for (const item of items) {
                const product = await Product.findByPk(item.productId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!product || product.reservedStock < item.quantity) {
                    throw new Error(
                        `Invalid reservation for product ${item.productId}`
                    );
                }

                product.reservedStock -= item.quantity;

                await product.save({ transaction });
            }

            order.status = 'cancelled';
            order.reservationExpiresAt = null;

            await order.save({ transaction });
        }

        await transaction.commit();

        return { releasedReservations: orders.length };

    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }

        throw error;
    }
}
