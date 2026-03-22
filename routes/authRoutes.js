import express from 'express';
import {
  registerUser,
  loginUser,
  loginAdmin,
  getMe,
  updateProfile,
  changePassword,
  sendOtp,
  verifyOtp,
  resetPassword,
  sendAdminOtp,
  verifyAdminOtp,
  resetAdminPassword,
  updateAdminProfile,
  changeAdminPassword,
} from '../controllers/authController.js';
import {
  registerValidation,
  loginValidation,
  adminLoginValidation,
  updateProfileValidation,
  changePasswordValidation,
} from '../validators/authValidator.js';
import validate from '../middleware/validate.js';
import { protect, customerOnly, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerValidation, validate, registerUser);
router.post('/login', loginValidation, validate, loginUser);
router.post('/admin/login', adminLoginValidation, validate, loginAdmin);

router.get('/me', protect, getMe);
router.put('/profile', protect, customerOnly, updateProfileValidation, validate, updateProfile);
router.put('/change-password', protect, customerOnly, changePasswordValidation, validate, changePassword);

router.put('/admin/profile', protect, adminOnly, updateAdminProfile);
router.put('/admin/change-password', protect, adminOnly, changePasswordValidation, validate, changeAdminPassword);

router.post('/forgot-password/send-otp', sendOtp);
router.post('/forgot-password/verify-otp', verifyOtp);
router.post('/forgot-password/reset', resetPassword);

router.post('/admin/forgot-password/send-otp', sendAdminOtp);
router.post('/admin/forgot-password/verify-otp', verifyAdminOtp);
router.post('/admin/forgot-password/reset', resetAdminPassword);

export default router;
