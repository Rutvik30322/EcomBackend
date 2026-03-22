import Banner from '../models/Banner.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';

/**
 * @desc    Get all banners (active only for public, all for admin)
 * @route   GET /api/banners
 * @access  Public/Admin
 */
export const getAllBanners = async (req, res, next) => {
  try {
    const { active } = req.query;

    const query = {};

    if (active !== 'false' && req.user?.role !== 'admin') {
      query.isActive = true;
    }
    
    const banners = await Banner.find(query).sort({ order: 1, createdAt: -1 });
    
    return successResponse(res, 200, 'Banners fetched successfully', { banners });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single banner by ID
 * @route   GET /api/banners/:id
 * @access  Public
 */
export const getBannerById = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    
    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }
    
    return successResponse(res, 200, 'Banner fetched successfully', { banner });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new banner (Admin only)
 * @route   POST /api/banners
 * @access  Private/Admin
 */
export const createBanner = async (req, res, next) => {
  try {
    const { title, description, image, offer, link, order, isActive } = req.body;

    if (!title || !image) {
      throw new ApiError(400, 'Please provide title and image');
    }

    const bannerData = {
      title,
      description: description || '',
      image: req.image || image, // Use image from middleware if available
      offer: offer || '',
      link: link || '',
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
    };

    if (req.files && req.files.image && req.files.image[0]) {
      bannerData.image = req.files.image[0].path;
    }
    
    const banner = await Banner.create(bannerData);
    
    return successResponse(res, 201, 'Banner created successfully', { banner });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update banner (Admin only)
 * @route   PUT /api/banners/:id
 * @access  Private/Admin
 */
export const updateBanner = async (req, res, next) => {
  try {
    const { title, description, image, offer, link, order, isActive } = req.body;
    
    const bannerData = {};
    
    if (title !== undefined) bannerData.title = title;
    if (description !== undefined) bannerData.description = description;
    if (offer !== undefined) bannerData.offer = offer;
    if (link !== undefined) bannerData.link = link;
    if (order !== undefined) bannerData.order = order;
    if (isActive !== undefined) bannerData.isActive = isActive;

    if (req.image) {
      bannerData.image = req.image;
    } else if (image) {
      bannerData.image = image;
    }

    if (req.files && req.files.image && req.files.image[0]) {
      bannerData.image = req.files.image[0].path;
    }
    
    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      bannerData,
      { new: true, runValidators: true }
    );
    
    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }
    
    return successResponse(res, 200, 'Banner updated successfully', { banner });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete banner (Admin only)
 * @route   DELETE /api/banners/:id
 * @access  Private/Admin
 */
export const deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    
    if (!banner) {
      throw new ApiError(404, 'Banner not found');
    }
    
    return successResponse(res, 200, 'Banner deleted successfully', null);
  } catch (error) {
    next(error);
  }
};
