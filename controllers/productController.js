import Product from '../models/Product.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import { emitDataUpdate, emitDashboardStatsUpdate } from '../utils/notifications.js';
import { buildPagination, buildSort, buildSearchQuery } from '../utils/queryBuilder.js';

const isDefaultEmoji = (str) => {

  return str && str.trim() === '🍫';
};

/**
 * @desc    Get all products (with filters)
 * @route   GET /api/products
 * @access  Public
 */
export const getAllProducts = async (req, res, next) => {
  try {
    const { category, brand, search, minPrice, maxPrice, inStock, sort, page = 1, limit } = req.query;

    const query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (brand) {
      query.brand = brand;
    }

    const searchConditions = buildSearchQuery(search, ['name', 'description']);

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined && !isNaN(parseFloat(minPrice))) query.price.$gte = parseFloat(minPrice);
      if (maxPrice !== undefined && !isNaN(parseFloat(maxPrice))) query.price.$lte = parseFloat(maxPrice);
    }

    if (inStock === 'true') {
      query.inStock = true;
      query.stock = { $gt: 0 };
    } else if (inStock === 'false') {
      query.$or = [{ inStock: false }, { stock: { $lte: 0 } }, { stock: { $exists: false } }];
    }

    if (searchConditions && inStock === 'false') {
      query.$and = [{ $or: searchConditions }, { $or: query.$or }];
      delete query.$or;
    } else if (searchConditions) {
      query.$or = searchConditions;
    }

    const sortOption = buildSort(sort);

    const total = await Product.countDocuments(query);
    const { pageNum, limitNum, skip, paginationResult } = buildPagination(page, limit, total, 20);

    const productsQuery = Product.find(query).sort(sortOption);
    if (limitNum) productsQuery.limit(limitNum).skip(skip);

    const products = await productsQuery;

    return successResponse(res, 200, 'Products fetched successfully', {
      products,
      pagination: paginationResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    return successResponse(res, 200, 'Product fetched successfully', { product });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new product (Admin only)
 * @route   POST /api/products
 * @access  Private/Admin
 */
export const createProduct = async (req, res, next) => {
  try {

    const productData = { ...req.body };

    if (productData.image && isDefaultEmoji(productData.image)) {
      delete productData.image; // Don't create with default emoji
    }

    if (req.image && !isDefaultEmoji(req.image)) {
      productData.image = req.image;
    }

    if (req.images && Array.isArray(req.images)) {
      productData.images = req.images;
    }

    if (req.files) {

      if (req.files.mainImage && req.files.mainImage[0]) {
        productData.image = req.files.mainImage[0].path;
      }

      if (req.files.additionalImages && req.files.additionalImages.length > 0) {
        const additionalImageUrls = req.files.additionalImages.map(file => file.path);
        if (!productData.images) {
          productData.images = [];
        }
        productData.images = [...productData.images, ...additionalImageUrls];
      }
    }

    // Generate unique slug
    let slug;
    let isUnique = false;
    while (!isUnique) {
      slug = `PRD${Math.floor(100000 + Math.random() * 900000)}`;
      const existingProduct = await Product.findOne({ slug });
      if (!existingProduct) {
        isUnique = true;
      }
    }
    productData.slug = slug;

    const product = await Product.create(productData);

    emitDataUpdate('products', 'create', product);
    emitDashboardStatsUpdate();

    return successResponse(res, 201, 'Product created successfully', { product });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product (Admin only)
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
export const updateProduct = async (req, res, next) => {
  try {

    const productData = { ...req.body };

    if (productData.image && isDefaultEmoji(productData.image)) {
      delete productData.image; // Don't update image if it's the default emoji
    }

    const hasValidImageFromMiddleware = req.image &&
      typeof req.image === 'string' &&
      req.image.trim() !== '' &&
      !isDefaultEmoji(req.image) &&
      (req.image.startsWith('http://') || req.image.startsWith('https://'));

    const hasValidImageFromBody = productData.image &&
      typeof productData.image === 'string' &&
      productData.image.trim() !== '' &&
      !isDefaultEmoji(productData.image) &&
      (productData.image.startsWith('http://') || productData.image.startsWith('https://'));

    if (hasValidImageFromMiddleware) {
      productData.image = req.image.trim();
    }
    else if (hasValidImageFromBody) {

      productData.image = productData.image.trim();
    }

    else if (productData.image === '' || productData.image === null || productData.image === undefined) {
      delete productData.image;
    }

    else if (productData.image) {
      delete productData.image;
    }

    if (req.images && Array.isArray(req.images) && req.images.length > 0) {
      productData.images = req.images;
    } else if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {

      productData.images = req.body.images;
    }

    if (req.files) {

      if (req.files.mainImage && req.files.mainImage[0]) {
        productData.image = req.files.mainImage[0].path;
      }

      if (req.files.additionalImages && req.files.additionalImages.length > 0) {
        const additionalImageUrls = req.files.additionalImages.map(file => file.path);
        if (!productData.images) {
          productData.images = [];
        }
        productData.images = [...productData.images, ...additionalImageUrls];
      }
    }

    if (productData.stock > 30) {
      productData.lowStockNotified = false;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true, runValidators: true }
    );

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    emitDataUpdate('products', 'update', product);
    emitDashboardStatsUpdate();

    return successResponse(res, 200, 'Product updated successfully', { product });
  } catch (error) {
    console.error('Error updating product:', error);
    next(error);
  }
};

/**
 * @desc    Delete product (Admin only)
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    emitDataUpdate('products', 'delete', { _id: product._id });
    emitDashboardStatsUpdate();

    return successResponse(res, 200, 'Product deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all categories (deprecated - use /api/categories instead)
 * @route   GET /api/products/categories/all
 * @access  Public
 */
export const getCategories = async (req, res, next) => {
  try {

    const Category = (await import('../models/Category.js')).default;

    const categories = await Category.find({ isActive: true }).sort({ name: 1 });

    const formattedCategories = categories.map(cat => ({
      id: cat._id.toString(),
      name: cat.name,
      icon: cat.icon || '🍫',
    }));

    return successResponse(res, 200, 'Categories fetched successfully', { categories: formattedCategories });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get products by category
 * @route   GET /api/products/category/:category
 * @access  Public
 */
export const getProductsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;

    if (!category) {
      throw new ApiError(400, 'Category is required');
    }

    const products = await Product.find({
      category,
      isActive: true,
    }).sort({ createdAt: -1 });

    if (!products.length) {
      return successResponse(res, 200, 'No products found for this category', {
        products: [],
      });
    }

    return successResponse(res, 200, 'Products fetched successfully', {
      products,
    });

  } catch (error) {
    next(error);
  }
};
