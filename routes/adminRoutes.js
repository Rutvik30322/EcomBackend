import express from 'express';
import {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  toggleAdminStatus
} from '../controllers/adminController.js';
import { protect, superAdminOnly } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { body } from 'express-validator';

const router = express.Router();

const createAdminValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('mobile').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit mobile number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'superadmin']).withMessage('Invalid role. Must be "admin" or "superadmin"'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
];

const updateAdminValidation = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('mobile').optional().matches(/^[0-9]{10}$/).withMessage('Valid 10-digit mobile number is required'),
  body('role').optional().isIn(['admin', 'superadmin']).withMessage('Invalid role. Must be "admin" or "superadmin"'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
];

router.use(protect, superAdminOnly);

router.route('/')
  .get(getAllAdmins)
  .post(createAdminValidation, validate, createAdmin);

router.route('/:id')
  .get(getAdminById)
  .put(updateAdminValidation, validate, updateAdmin)
  .delete(deleteAdmin);

router.put('/:id/toggle-status', toggleAdminStatus);

export default router;
