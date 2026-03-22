import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderToPaid,
  getAllOrders,
  updateOrderStatus,
  updateOrderPayment,
  getDashboardStats,
  cancelOrder,
  deleteOrder,
} from '../controllers/orderController.js';
import { protect, customerOnly, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, customerOnly, createOrder);
router.get('/my-orders', protect, customerOnly, getMyOrders);
router.put('/:id/pay', protect, customerOnly, updateOrderToPaid);
router.put('/:id/cancel', protect, customerOnly, cancelOrder);

router.get('/admin/stats', protect, adminOnly, getDashboardStats);
router.get('/', protect, adminOnly, getAllOrders);
router.put('/:id/status', protect, adminOnly, updateOrderStatus);
router.put('/:id/payment', protect, adminOnly, updateOrderPayment);
router.delete('/:id', protect, adminOnly, deleteOrder);

router.get('/:id', protect, getOrderById);

export default router;
