import express from 'express';
import {
  registerKey,
  getMyKey,
  getKeyStatus,
  getKeyByUserId,
} from '../controllers/keyController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // All key routes are protected

router.post('/', registerKey);
router.get('/me', getMyKey);
router.get('/status', getKeyStatus);
router.get('/:userId', getKeyByUserId);

export default router;
