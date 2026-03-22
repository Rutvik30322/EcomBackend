import User from '../models/User.js';
import Product from '../models/Product.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';

/**
 * @desc    Add item to cart
 * @route   POST /api/cart/add
 * @access  Private (Customer)
 */
export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      throw new ApiError(400, 'Product ID is required');
    }

    if (quantity <= 0) {
      throw new ApiError(400, 'Quantity must be greater than 0');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    if (!product.inStock || product.stock < quantity) {
      throw new ApiError(400, 'Product is out of stock or insufficient quantity available');
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const existingCartItem = user.cart.find(
      item => item.product.toString() === productId
    );

    if (existingCartItem) {

      existingCartItem.quantity += quantity;
    } else {

      user.cart.push({
        product: productId,
        quantity: quantity,
      });
    }

    await user.save();

    await user.populate({
      path: 'cart.product',
      select: 'name price image category inStock stock',
    });

    const validCartItems = user.cart.filter(item => item.product !== null && item.product !== undefined);

    return successResponse(res, 200, 'Item added to cart successfully', {
      cart: validCartItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/remove/:productId
 * @access  Private (Customer)
 */
export const removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    user.cart = user.cart.filter(
      item => item.product.toString() !== productId
    );

    await user.save();

    await user.populate({
      path: 'cart.product',
      select: 'name price image category inStock stock',
    });

    return successResponse(res, 200, 'Item removed from cart successfully', {
      cart: user.cart,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/cart/update/:productId
 * @access  Private (Customer)
 */
export const updateCartItemQuantity = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity <= 0) {
      throw new ApiError(400, 'Quantity must be greater than 0');
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const cartItem = user.cart.find(
      item => item.product.toString() === productId
    );

    if (!cartItem) {
      throw new ApiError(404, 'Item not found in cart');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    if (!product.inStock || product.stock < quantity) {
      throw new ApiError(400, 'Insufficient stock available');
    }

    cartItem.quantity = quantity;

    await user.save();

    await user.populate({
      path: 'cart.product',
      select: 'name price image category inStock stock',
    });

    const validCartItems = user.cart.filter(item => item.product !== null && item.product !== undefined);

    if (validCartItems.length !== user.cart.length) {
      user.cart = validCartItems;
      await user.save();
    }

    return successResponse(res, 200, 'Cart item updated successfully', {
      cart: validCartItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's cart
 * @route   GET /api/cart
 * @access  Private (Customer)
 */
export const getCart = async (req, res, next) => {
  try {

    const user = await User.findById(req.user._id).populate({
      path: 'cart.product',
      select: 'name price image category inStock stock',
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const validCartItems = user.cart.filter(item => item.product !== null && item.product !== undefined);

    if (validCartItems.length !== user.cart.length) {
      user.cart = validCartItems;
      await user.save();
    }

    return successResponse(res, 200, 'Cart retrieved successfully', {
      cart: validCartItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear user's cart
 * @route   DELETE /api/cart/clear
 * @access  Private (Customer)
 */
export const clearCart = async (req, res, next) => {
  try {

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { cart: [] } },
      { new: true, runValidators: true }
    ).populate({
      path: 'cart.product',
      select: 'name price image category inStock stock',
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return successResponse(res, 200, 'Cart cleared successfully', {
      cart: user.cart,
    });
  } catch (error) {
    next(error);
  }
};