import { Router } from 'express';
import {
    register,
    login,
    getUser,
    getMe,
  update,
    deletee
} from '../controllers/userController.js';

import {
  registerValidation,
  loginValidation,
  updateValidation,
    checkValidation
} from '../validators/userValidation.js';

import { authMiddleware } from '../middlewares/authMiddleware.js';
import { authorizeUser } from '../middlewares/authorizeUser.js';
const router = Router();

router.post('/register',registerValidation,checkValidation, register);
router.post('/login', loginValidation, checkValidation, login);
router.get('/me',authMiddleware, getMe);
router.get('/users/:id', getUser);
router.patch('/users/:id',authMiddleware,authorizeUser,updateValidation ,checkValidation,update);
router.delete('/:id', authMiddleware, authorizeUser, deletee);

export default router;
