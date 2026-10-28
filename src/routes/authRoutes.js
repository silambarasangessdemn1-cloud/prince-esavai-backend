import express from 'express';
import { register, login, adminLogin, getMe } from '../controllers/authController.js';
import { validateRegister, validateLogin } from '../middleware/validationMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/admin-login', adminLogin);
router.get('/me', protect, getMe);

export default router;

