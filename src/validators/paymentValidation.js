import { param } from 'express-validator';

export const processPaymentValidation = [
    param('paymentId')
        .isInt({ min: 1 })
        .withMessage('Invalid payment ID')
];
