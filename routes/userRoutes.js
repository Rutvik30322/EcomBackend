import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus
} from '../controllers/userController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { body } from 'express-validator';

const router = express.Router();

const createUserValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('mobile').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit mobile number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['customer', 'admin']).withMessage('Invalid role. Must be "customer" or "admin"'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
];

const updateUserValidation = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('mobile').optional().matches(/^[0-9]{10}$/).withMessage('Valid 10-digit mobile number is required'),
  body('role').optional().isIn(['customer', 'admin']).withMessage('Invalid role. Must be "customer" or "admin"'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
];

router.use(protect, adminOnly);

router.route('/')
  .get(getAllUsers)
  .post(createUserValidation, validate, createUser);

router.route('/:id')
  .get(getUserById)
  .put(updateUserValidation, validate, updateUser)
  .delete(deleteUser);

router.put('/:id/toggle-status', toggleUserStatus);

export default router;