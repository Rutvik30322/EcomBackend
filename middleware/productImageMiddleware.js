/**
 * Middleware to handle product images from request body and file uploads
 * This middleware extracts image URLs from the request body and handles file uploads
 * and attaches them to the request object for use in controllers
 */

export const processProductImages = (req, res, next) => {
  try {

    if (!req.image) req.image = null;
    if (!req.images) req.images = [];

    if (req.body && req.body.image !== undefined) {
      if (typeof req.body.image === 'string' && req.body.image.trim() !== '' && req.body.image.trim() !== '🍫') {
        req.image = req.body.image.trim(); // Main product image
      } else if (req.body.image === null || req.body.image === '') {
        req.image = null; // Clear if it's null or empty string
      } else if (req.body.image === '🍫' || (typeof req.body.image === 'string' && req.body.image.trim() === '🍫')) {
        req.image = null; // Clear if it's the default emoji
      }
    }

    if (req.body && req.body.images !== undefined && Array.isArray(req.body.images)) {

      const validImages = req.body.images.filter(img => typeof img === 'string' && img.trim() !== '' && img !== '🍫');
      req.images = validImages; // Additional product images
    }

    if (req.file) {
      req.image = req.file.path;
    }

    if (req.files && req.files.length > 0) {
      const uploadedImageUrls = req.files.map(file => file.path);
      req.images = [...req.images, ...uploadedImageUrls];
    }

    if (req.body && req.body.image && Array.isArray(req.body.image) && req.body.image.length > 0) {
      const extractedImage = req.body.image[0];
      if (typeof extractedImage === 'string' && extractedImage.trim() !== '🍫') {
        req.image = extractedImage;
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to handle product image uploads using Cloudinary
 */
import { productImageUpload } from './upload.js';

export const uploadProductImages = [
  productImageUpload.fields([
    { name: 'mainImage', maxCount: 1 },      // For main product image
    { name: 'additionalImages', maxCount: 10 } // For additional product images
  ]),
  processProductImages
];