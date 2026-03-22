import express from 'express';
import {
  addToCart,
  removeFromCart,
  updateCartItemQuantity,
  getCart,
  clearCart,
} from '../controllers/cartController.js';
import { protect, customerOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, customerOnly, getCart);
router.delete('/clear', protect, customerOnly, clearCart);

router.post('/add', protect, customerOnly, addToCart);
router.delete('/remove/:productId', protect, customerOnly, removeFromCart);
router.put('/update/:productId', protect, customerOnly, updateCartItemQuantity);

export default router;