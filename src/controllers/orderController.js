import {
    getMyOrders,
    getOrderById,
    cancelOrder,
    updateOrderStatus
} from '../services/orderServices.js';

export async function getMyOrdersController(req, res, next) {
    try {
        const userId = req.user.id;

        const orders = await getMyOrders(userId);

        return res.status(200).json({
            message: 'Orders retrieved successfully',
            orders
        });
    } catch (error) {
        next(error);
    }
}

export async function getOrderByIdController(req, res, next) {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        const order = await getOrderById(orderId, userId);

        return res.status(200).json({
            message: 'Order retrieved successfully',
            order
        });
    } catch (error) {
        next(error);
    }
}

export async function cancelOrderController(req, res, next) {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        const order = await cancelOrder(orderId, userId);

        return res.status(200).json({
            message: 'Order cancelled successfully',
            order
        });
    } catch (error) {
        next(error);
    }
}

export async function updateOrderStatusController(req, res, next) {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const order = await updateOrderStatus(orderId, status);

        return res.status(200).json({
            message: 'Order status updated successfully',
            order
        });
    } catch (error) {
        next(error);
    }
}
