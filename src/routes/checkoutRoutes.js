
import express from 'express';

import { checkoutController } from '../controllers/checkoutController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { checkoutValidation } from '../validators/checkoutValidation.js';

const router = express.Router();

router.post('/',authMiddleware,checkoutValidation,validateRequest,checkoutController);

export default router;
