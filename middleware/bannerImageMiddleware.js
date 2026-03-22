/**
 * Middleware to handle banner images from request body and file uploads
 * This middleware extracts image URLs from the request body and handles file uploads
 * and attaches them to the request object for use in controllers
 */

import { bannerImageUpload } from './upload.js';

export const processBannerImage = (req, res, next) => {
  try {

    if (!req.image) req.image = null;

    if (req.body && req.body.image !== undefined) {
      if (typeof req.body.image === 'string' && req.body.image.trim() !== '') {
        req.image = req.body.image.trim();
      } else if (req.body.image === null || req.body.image === '') {
        req.image = null;
      }
    }

    if (req.file) {
      req.image = req.file.path;
    }

    if (req.files && req.files.image && req.files.image[0]) {
      req.image = req.files.image[0].path;
    }

    if (req.body && req.body.image && Array.isArray(req.body.image) && req.body.image.length > 0) {
      const extractedImage = req.body.image[0];
      if (typeof extractedImage === 'string' && extractedImage.trim() !== '') {
        req.image = extractedImage;
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to handle banner image uploads using Cloudinary
 */
export const uploadBannerImage = [
  bannerImageUpload.single('image'),
  processBannerImage
];
