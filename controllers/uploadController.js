import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Product from '../models/Product.js';
import { cloudinary } from '../config/cloudinary.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';

/**
 * @desc    Upload profile picture to Cloudinary
 * @route   POST /api/upload/profile-picture
 * @access  Private (Customer/Admin)
 */
export const uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Please upload an image file');
    }

    const imageUrl = req.file.path; // Cloudinary URL

    if (req.role === 'admin') {
      const admin = await Admin.findById(req.admin._id);

      if (admin.profilePicture) {
        const publicId = admin.profilePicture.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`chocolate-app/profiles/${publicId}`);
      }
      
      admin.profilePicture = imageUrl;
      await admin.save();

      return successResponse(res, 200, 'Profile picture uploaded successfully', {
        profilePicture: imageUrl,
      });
    } else {
      const user = await User.findById(req.user._id);

      if (user.profilePicture) {
        const publicId = user.profilePicture.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`chocolate-app/profiles/${publicId}`);
      }
      
      user.profilePicture = imageUrl;
      await user.save();

      return successResponse(res, 200, 'Profile picture uploaded successfully', {
        profilePicture: imageUrl,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete profile picture
 * @route   DELETE /api/upload/profile-picture
 * @access  Private (Customer/Admin)
 */
export const deleteProfilePicture = async (req, res, next) => {
  try {
    if (req.role === 'admin') {
      const admin = await Admin.findById(req.admin._id);

      if (admin.profilePicture) {
        const publicId = admin.profilePicture.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`chocolate-app/profiles/${publicId}`);
        
        admin.profilePicture = null;
        await admin.save();
      }

      return successResponse(res, 200, 'Profile picture deleted successfully', null);
    } else {
      const user = await User.findById(req.user._id);

      if (user.profilePicture) {
        const publicId = user.profilePicture.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`chocolate-app/profiles/${publicId}`);
        
        user.profilePicture = null;
        await user.save();
      }

      return successResponse(res, 200, 'Profile picture deleted successfully', null);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload product images to Cloudinary
 * @route   POST /api/upload/product-images
 * @access  Private (Admin)
 */
export const uploadProductImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, 'Please upload at least one image file');
    }

    const imageUrls = req.files.map(file => file.path); // Cloudinary URLs
    
    return successResponse(res, 200, 'Product images uploaded successfully', {
      imageUrls,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete product image from Cloudinary
 * @route   DELETE /api/upload/product-image/:publicId
 * @access  Private (Admin)
 */
export const deleteProductImage = async (req, res, next) => {
  try {
    const { publicId } = req.params;

    const cleanPublicId = publicId.includes('/') ? publicId.split('/').pop().split('.')[0] : publicId;

    await cloudinary.uploader.destroy(`chocolate-app/products/${cleanPublicId}`);
    
    return successResponse(res, 200, 'Product image deleted successfully', null);
  } catch (error) {
    next(error);
  }
};