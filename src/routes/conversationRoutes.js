import express from 'express';
import {
  getConversations,
  createConversation,
  getConversationById,
} from '../controllers/conversationController.js';
import {
  getMessages,
  sendMessage,
} from '../controllers/messageController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getConversations).post(createConversation);
router.route('/:id').get(getConversationById);

// Nested routes for messages under conversation
router.route('/:conversationId/messages').get(getMessages).post(sendMessage);

export default router;
