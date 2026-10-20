import express from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
  refreshToken,
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getMe);
router.post('/refresh', protect, refreshToken);

export default router;
