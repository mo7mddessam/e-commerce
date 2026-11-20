import { body, param } from 'express-validator';

export const createProductValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Product name is required')
        .isLength({ max: 100 })
        .withMessage('Product name must not exceed 100 characters'),

    body('price')
        .notEmpty()
        .withMessage('Product price is required')
        .bail()
        .isFloat({ gt: 0 })
        .withMessage('Product price must be greater than zero'),

    body('stock')
        .notEmpty()
        .withMessage('Product stock is required')
        .bail()
        .isInt({ min: 0 })
        .withMessage('Product stock must be a non-negative integer')
];

export const updateProductValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Invalid product ID'),

    body('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Product name cannot be empty')
        .isLength({ max: 100 })
        .withMessage('Product name must not exceed 100 characters'),

    body('price')
        .optional()
        .isFloat({ gt: 0 })
        .withMessage('Product price must be greater than zero'),

    body('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Product stock must be a non-negative integer')
];
