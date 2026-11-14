import {Router} from 'express';

import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductById
} from '../controllers/productController.js';

import { authMiddleware } from '../middlewares/authMiddleware.js';
import { authorizeAdmin } from '../middlewares/authorizeAdmin.js';

const router = Router();

router.post('/', authMiddleware, authorizeAdmin, createProduct);
router.patch('/:id', authMiddleware, authorizeAdmin, updateProduct);
router.delete('/:id', authMiddleware, authorizeAdmin, deleteProduct);
router.get('/', getAllProducts);
router.get('/:id', getProductById);

export default router;
