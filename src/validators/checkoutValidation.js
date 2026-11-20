
import { body } from 'express-validator';

export const checkoutValidation = [
    body('paymentMethod')
        .trim()
        .isIn(['cash', 'card'])
        .withMessage('Payment method must be cash or card'),

    body('recipientName')
        .isString()
        .withMessage('Recipient name must be a string')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('Recipient name is required')
        .bail()
        .isLength({ max: 100 })
        .withMessage('Recipient name must not exceed 100 characters'),

    body('phone')
        .isString()
        .withMessage('Phone must be a string')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .bail()
        .isLength({ min: 8, max: 20 })
        .withMessage('Phone number must be between 8 and 20 characters')
        .bail()
        .matches(/^[+\d][\d\s()-]*$/)
        .withMessage('Phone number contains invalid characters'),

    body('shippingAddress')
        .isString()
        .withMessage('Shipping address must be a string')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('Shipping address is required')
        .bail()
        .isLength({ max: 500 })
        .withMessage('Shipping address must not exceed 500 characters')
];
