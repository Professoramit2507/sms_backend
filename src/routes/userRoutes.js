import express from 'express';
import {
  getMe,
  updateProfile,
  changePassword,
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/me').get(protect, getMe).put(protect, updateProfile);
router.put('/me/password', protect, changePassword);

export default router;
