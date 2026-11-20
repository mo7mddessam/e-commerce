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
} from '../validators/userValidation.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { authorizeUser } from '../middlewares/authorizeUser.js';
const router = Router();

router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);
router.get('/me',authMiddleware, getMe);
router.get('/:id', authMiddleware, authorizeUser, getUser);
router.patch('/:id',authMiddleware,authorizeUser,updateValidation ,validateRequest,update);
router.delete('/:id', authMiddleware, authorizeUser, deletee);

export default router;
