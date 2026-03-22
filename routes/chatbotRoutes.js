import express from 'express';
import { chatWithBot } from '../controllers/chatbotController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, adminOnly);

router.post('/', chatWithBot);

export default router;
