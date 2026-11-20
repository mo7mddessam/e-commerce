import express from 'express';
import {addToCartt,getCartt,updateCartItemt,deleteCartItemt,clearCartt} from '../controllers/cartController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {addToCartValidation,updateCartValidation} from '../validators/cartValidation.js';
import {validateRequest} from '../middlewares/validateRequest.js';

const router = express.Router();

router.post('/', authMiddleware, addToCartValidation, validateRequest, addToCartt);
router.get('/', authMiddleware, getCartt);
router.patch('/', authMiddleware, updateCartValidation, validateRequest, updateCartItemt);
router.delete('/:productId', authMiddleware, deleteCartItemt);
router.delete('/', authMiddleware, clearCartt);

export default router;
