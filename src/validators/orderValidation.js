import { body, param } from 'express-validator';

export const getOrderValidation = [
    param('orderId')
        .isInt({ min: 1 })
        .withMessage('Invalid order ID')
];

export const cancelOrderValidation = [
    param('orderId')
        .isInt({ min: 1 })
        .withMessage('Invalid order ID')
];

export const updateOrderStatusValidation = [
    param('orderId')
        .isInt({ min: 1 })
        .withMessage('Invalid order ID'),

    body('status')
        .notEmpty()
        .withMessage('Order status is required')
        .bail()
        .isIn(['confirmed', 'shipped', 'delivered', 'cancelled'])
        .withMessage('Invalid order status')
];
