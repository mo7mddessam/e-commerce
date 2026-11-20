import { body, param } from 'express-validator';

export const addToCartValidation = [
    body('productId')
        .notEmpty()
        .withMessage('Product ID is required')
        .bail()
        .isInt({ min: 1 })
        .withMessage('Invalid product ID'),

    body('quantity')
        .notEmpty()
        .withMessage('Quantity is required')
        .bail()
        .isInt({ min: 1 })
        .withMessage('Quantity must be a positive integer')
];

export const updateCartValidation = [
    body('productId')
        .notEmpty()
        .withMessage('Product ID is required')
        .bail()
        .isInt({ min: 1 })
        .withMessage('Invalid product ID'),

    body('quantity')
        .notEmpty()
        .withMessage('Quantity is required')
        .bail()
        .isInt({ min: 1 })
        .withMessage('Quantity must be a positive integer')
];
