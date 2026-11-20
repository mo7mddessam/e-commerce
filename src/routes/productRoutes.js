import {Router} from 'express';

import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductById
} from '../controllers/productController.js';

import {
    createProductValidation,
    updateProductValidation
} from '../validators/productValidation.js';

import { validateRequest } from '../middlewares/validateRequest.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { authorizeAdmin } from '../middlewares/authorizeAdmin.js';

const router = Router();

router.post('/', authMiddleware, authorizeAdmin, createProductValidation, validateRequest, createProduct);
router.patch('/:id', authMiddleware, authorizeAdmin, updateProductValidation, validateRequest, updateProduct);
router.delete('/:id', authMiddleware, authorizeAdmin, deleteProduct);
router.get('/', getAllProducts);
router.get('/:id', getProductById);

export default router;
