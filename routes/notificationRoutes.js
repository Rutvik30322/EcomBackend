import express from 'express';
import {
  getAllNotifications,
  getLatestNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  updateNotification,
  deleteNotification,
  deleteAllNotifications,
  getNotificationStats,
} from '../controllers/notificationController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, adminOnly);

router.get('/stats', getNotificationStats);
router.get('/latest', getLatestNotifications);
router.put('/read-all', markAllAsRead);
router.delete('/', deleteAllNotifications);
router.get('/', getAllNotifications);
router.get('/:id', getNotificationById);
router.put('/:id/read', markAsRead);
router.put('/:id', updateNotification);
router.delete('/:id', deleteNotification);

export default router;
