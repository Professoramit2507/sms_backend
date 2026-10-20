import express from 'express';
import {
  markMessageAsRead,
  deleteMessage,
} from '../controllers/messageController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/:id/read').patch(markMessageAsRead).put(markMessageAsRead);
router.route('/:id').delete(deleteMessage);

export default router;
