import express from 'express';
import {
  getContacts,
  addContact,
  removeContact,
  getContactProfile,
} from '../controllers/contactController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getContacts).post(addContact);
router.route('/:id').delete(removeContact).get(getContactProfile);

export default router;
