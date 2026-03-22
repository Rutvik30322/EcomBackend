import express from 'express';
import {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
  getPurchaseByPurchaseNo,
  getNextPurchaseNo,
} from '../controllers/purchaseController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, adminOnly, createPurchase);
router.get('/', protect, adminOnly, getAllPurchases);
router.get('/purchase-no/:purchaseNo', protect, adminOnly, getPurchaseByPurchaseNo);
router.get('/next-purchase-no', protect, adminOnly, getNextPurchaseNo);
router.get('/:id', protect, adminOnly, getPurchaseById);
router.put('/:id', protect, adminOnly, updatePurchase);
router.delete('/:id', protect, adminOnly, deletePurchase);

export default router;
