import express from 'express';
import {
    getMyOrdersController,
    getOrderByIdController,
    cancelOrderController,
    updateOrderStatusController
} from '../controllers/orderController.js';

import { authMiddleware } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import {
    getOrderValidation,
    cancelOrderValidation,
    updateOrderStatusValidation
} from '../validators/orderValidation.js';
import { validateRequest } from '../middlewares/validateRequest.js';

const router = express.Router();

router.get('/', authMiddleware, getMyOrdersController);
router.get('/:orderId', authMiddleware, getOrderValidation, validateRequest, getOrderByIdController);
router.patch('/:orderId/cancel', authMiddleware, cancelOrderValidation, validateRequest, cancelOrderController);
router.patch('/:orderId/status', authMiddleware, authorize('admin'), updateOrderStatusValidation, validateRequest, updateOrderStatusController);

export default router;
