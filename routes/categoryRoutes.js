import express from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  parsePdfForCategories,
  parsePdfAndCreateProducts,
} from '../controllers/categoryController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pdfUpload } from '../middleware/upload.js';

const router = express.Router();

router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

router.post('/', protect, adminOnly, createCategory);
router.post('/parse-pdf', protect, adminOnly, pdfUpload.single('pdfFile'), parsePdfForCategories);
router.post('/parse-pdf-create-products', protect, adminOnly, pdfUpload.single('pdfFile'), parsePdfAndCreateProducts);
router.put('/:id', protect, adminOnly, updateCategory);
router.delete('/:id', protect, adminOnly, deleteCategory);

export default router;
