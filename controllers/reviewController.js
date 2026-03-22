import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import { emitDataUpdate, emitDashboardStatsUpdate } from '../utils/notifications.js';
import { buildPagination } from '../utils/queryBuilder.js';

/**
 * Calculate and update product average rating
 */
const updateProductRating = async (productId) => {

  const productObjectId = typeof productId === 'string'
    ? new mongoose.Types.ObjectId(productId)
    : productId;

  const stats = await Review.aggregate([
    {
      $match: {
        product: productObjectId,
        isApproved: true,
        isActive: true,
      },
    },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(stats[0].averageRating * 10) / 10, // Round to 1 decimal
      numReviews: stats[0].numReviews,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      rating: 0,
      numReviews: 0,
    });
  }
};

/**
 * @desc    Get reviews for a product
 * @route   GET /api/reviews/product/:productId
 * @access  Public
 */
export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { approved } = req.query;

    const query = { product: productId, isActive: true, isApproved: true };

    if (approved === 'false' && req.user && req.user.role === 'admin') {
      query.isApproved = false;
    } else if (approved === 'true') {
      query.isApproved = true;
    }

    const reviews = await Review.find(query)
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Reviews fetched successfully', { reviews });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new review
 * @route   POST /api/reviews
 * @access  Private (Customer)
 */
export const createReview = async (req, res, next) => {
  try {
    const { product, rating, comment } = req.body;

    if (!product || !rating) {
      throw new ApiError(400, 'Product and rating are required');
    }

    if (rating < 1 || rating > 5) {
      throw new ApiError(400, 'Rating must be between 1 and 5');
    }

    const productExists = await Product.findById(product);
    if (!productExists) {
      throw new ApiError(404, 'Product not found');
    }

    const review = await Review.create({
      user: req.user._id,
      product,
      rating,
      comment: comment || '',
      isApproved: true, // Auto-approve reviews - no admin approval needed
    });

    await updateProductRating(product);

    const populatedReview = await Review.findById(review._id).populate('user', 'name');

    emitDataUpdate('reviews', 'create', populatedReview);
    emitDashboardStatsUpdate();

    return successResponse(res, 201, 'Review submitted successfully and is now visible.', {
      review: populatedReview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update review
 * @route   PUT /api/reviews/:id
 * @access  Private (Customer - own review only)
 */
export const updateReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    if (review.user.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized to update this review');
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        throw new ApiError(400, 'Rating must be between 1 and 5');
      }
      review.rating = rating;
    }

    if (comment !== undefined) {
      review.comment = comment;
    }

    review.isApproved = true;

    await review.save();

    await updateProductRating(review.product);

    const updatedReview = await Review.findById(review._id).populate('user', 'name');

    return successResponse(res, 200, 'Review updated successfully', { review: updatedReview });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete review
 * @route   DELETE /api/reviews/:id
 * @access  Private (Customer - own review only)
 */
export const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    if (review.user.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized to delete this review');
    }

    const productId = review.product;
    await Review.findByIdAndDelete(req.params.id);

    await updateProductRating(productId);

    emitDataUpdate('reviews', 'delete', { _id: review._id });
    emitDashboardStatsUpdate();

    return successResponse(res, 200, 'Review deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all reviews (Admin only)
 * @route   GET /api/reviews
 * @access  Private/Admin
 */
export const getAllReviews = async (req, res, next) => {
  try {
    const { product, approved, page = 1, limit = 20 } = req.query;

    const query = {};
    if (product) query.product = product;
    if (approved !== undefined) query.isApproved = approved === 'true';

    const total = await Review.countDocuments(query);
    const { limitNum, skip, paginationResult } = buildPagination(page, limit, total, 20);

    const reviews = await Review.find(query)
      .populate('user', 'name email')
      .populate('product', 'name')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    return successResponse(res, 200, 'Reviews fetched successfully', {
      reviews,
      pagination: paginationResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve/Reject review (Admin only)
 * @route   PUT /api/reviews/:id/approve
 * @access  Private/Admin
 */
export const approveReview = async (req, res, next) => {
  try {
    const { isApproved } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    review.isApproved = isApproved === true;
    await review.save();

    await updateProductRating(review.product);

    emitDataUpdate('reviews', 'update', review);
    emitDashboardStatsUpdate();

    return successResponse(res, 200, `Review ${isApproved ? 'approved' : 'rejected'} successfully`, {
      review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete review (Admin only)
 * @route   DELETE /api/reviews/:id/admin
 * @access  Private/Admin
 */
export const deleteReviewAdmin = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    const productId = review.product;
    await Review.findByIdAndDelete(req.params.id);

    await updateProductRating(productId);

    emitDataUpdate('reviews', 'delete', { _id: review._id });
    emitDashboardStatsUpdate();

    return successResponse(res, 200, 'Review deleted successfully', null);
  } catch (error) {
    next(error);
  }
};
