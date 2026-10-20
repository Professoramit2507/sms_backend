import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import keyRoutes from './keyRoutes.js';
import contactRoutes from './contactRoutes.js';
import conversationRoutes from './conversationRoutes.js';
import messageRoutes from './messageRoutes.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/keys', keyRoutes);
router.use('/contacts', contactRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);

export default router;
