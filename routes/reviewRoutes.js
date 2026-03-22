import express from 'express';
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getAllReviews,
  approveReview,
  deleteReviewAdmin,
} from '../controllers/reviewController.js';
import { protect, customerOnly, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/product/:productId', getProductReviews);

router.post('/', protect, customerOnly, createReview);
router.put('/:id', protect, customerOnly, updateReview);
router.delete('/:id', protect, customerOnly, deleteReview);

router.get('/', protect, adminOnly, getAllReviews);
router.put('/:id/approve', protect, adminOnly, approveReview);
router.delete('/:id/admin', protect, adminOnly, deleteReviewAdmin);

export default router;
