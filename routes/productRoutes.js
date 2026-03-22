import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getProductsByCategory
} from '../controllers/productController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { processProductImages, uploadProductImages } from '../middleware/productImageMiddleware.js';

const router = express.Router();

router.get('/', getAllProducts);
router.get('/categories/all', getCategories);
router.get('/category/:category', getProductsByCategory);
router.get('/:id', getProductById);

router.post('/', protect, adminOnly, processProductImages, createProduct);
router.put('/:id', protect, adminOnly, processProductImages, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

export default router;
