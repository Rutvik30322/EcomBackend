import express from 'express';
import { uploadProfilePicture, deleteProfilePicture, uploadProductImages, deleteProductImage } from '../controllers/uploadController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import upload, { productImageUpload } from '../middleware/upload.js';

const router = express.Router();

router.post('/profile-picture', protect, upload.single('profilePicture'), uploadProfilePicture);

router.delete('/profile-picture', protect, deleteProfilePicture);

router.post('/product-images', protect, adminOnly, productImageUpload.array('images', 10), uploadProductImages);

router.delete('/product-image/:publicId', protect, adminOnly, deleteProductImage);

export default router;
