import Brand from '../models/Brand.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import { emitDataUpdate, emitDashboardStatsUpdate } from '../utils/notifications.js';

/**
 * @desc    Get all brands
 * @route   GET /api/brands
 * @access  Public
 */
export const getAllBrands = async (req, res, next) => {
  try {
    const { search, isActive } = req.query;

    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.brandName = { $regex: search, $options: 'i' };
    }

    const brands = await Brand.find(query).sort({ brandName: 1 });

    return successResponse(res, 200, 'Brands fetched successfully', {
      brands,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get brand by ID
 * @route   GET /api/brands/:id
 * @access  Public
 */
export const getBrandById = async (req, res, next) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      throw new ApiError(404, 'Brand not found');
    }

    return successResponse(res, 200, 'Brand fetched successfully', { brand });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new brand
 * @route   POST /api/brands
 * @access  Private/Admin
 */
export const createBrand = async (req, res, next) => {
  try {
    const brandData = { ...req.body };

    // Handle image from middleware
    if (req.image) {
      brandData.brandImage = req.image;
    }

    // Handle file upload
    if (req.file) {
      brandData.brandImage = req.file.path;
    }

    const existingBrand = await Brand.findOne({
      brandName: brandData.brandName,
    });

    if (existingBrand) {
      throw new ApiError(400, 'Brand name already exists');
    }

    const brand = await Brand.create(brandData);

    emitDataUpdate('brands', 'create', brand);
    emitDashboardStatsUpdate();

    return successResponse(res, 201, 'Brand created successfully', { brand });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update brand
 * @route   PUT /api/brands/:id
 * @access  Private/Admin
 */
export const updateBrand = async (req, res, next) => {
  try {
    const brandData = { ...req.body };

    // Handle image
    if (req.image) {
      brandData.brandImage = req.image;
    }

    if (req.file) {
      brandData.brandImage = req.file.path;
    }

    // Prevent duplicate brand name
    if (brandData.brandName) {
      const existingBrand = await Brand.findOne({
        brandName: brandData.brandName,
        _id: { $ne: req.params.id },
      });

      if (existingBrand) {
        throw new ApiError(400, 'Brand name already exists');
      }
    }

    const brand = await Brand.findByIdAndUpdate(
      req.params.id,
      brandData,
      { new: true, runValidators: true }
    );

    if (!brand) {
      throw new ApiError(404, 'Brand not found');
    }

    emitDataUpdate('brands', 'update', brand);
    emitDashboardStatsUpdate();

    return successResponse(res, 200, 'Brand updated successfully', { brand });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete brand
 * @route   DELETE /api/brands/:id
 * @access  Private/Admin
 */
export const deleteBrand = async (req, res, next) => {
  try {
    const brand = await Brand.findByIdAndDelete(req.params.id);

    if (!brand) {
      throw new ApiError(404, 'Brand not found');
    }

    emitDataUpdate('brands', 'delete', { _id: brand._id });
    emitDashboardStatsUpdate();

    return successResponse(res, 200, 'Brand deleted successfully', null);
  } catch (error) {
    next(error);
  }
};