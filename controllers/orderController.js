import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Review from '../models/Review.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import { notifyNewOrder, emitDataUpdate, emitDashboardStatsUpdate } from '../utils/notifications.js';
import { buildPagination } from '../utils/queryBuilder.js';
import DashboardService from '../services/dashboardService.js';

/**
 * @desc    Create new order
 * @route   POST /api/orders
 * @access  Private (Customer)
 */
export const createOrder = async (req, res, next) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      throw new ApiError(400, 'No order items provided');
    }

    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new ApiError(404, `Product ${item.name} not found`);
      }
      if (!product.inStock || product.stock < item.quantity) {
        throw new ApiError(400, `Product ${item.name} is out of stock`);
      }
    }

    const order = await Order.create({
      user: req.user._id,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $set: { cart: [] }
    });

    const orderWithUser = await Order.findById(order._id)
      .populate('user', 'name email mobile');

    notifyNewOrder(orderWithUser);

    emitDataUpdate('orders', 'create', orderWithUser);
    emitDashboardStatsUpdate();

    return successResponse(res, 201, 'Order created successfully', { order });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user orders
 * @route   GET /api/orders/my-orders
 * @access  Private (Customer)
 */
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('orderItems.product', 'name image price')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Orders fetched successfully', { orders });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order by ID
 * @route   GET /api/orders/:id
 * @access  Private (Customer/Admin)
 */
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email mobile')
      .populate('orderItems.product', 'name image price');

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (req.role === 'customer' && order.user._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized to view this order');
    }

    return successResponse(res, 200, 'Order fetched successfully', { order });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order to paid
 * @route   PUT /api/orders/:id/pay
 * @access  Private (Customer)
 */
export const updateOrderToPaid = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (order.user.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized to update this order');
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      updateTime: req.body.updateTime,
      emailAddress: req.body.emailAddress,
    };

    const updatedOrder = await order.save();

    return successResponse(res, 200, 'Order updated to paid', { order: updatedOrder });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all orders (Admin only)
 * @route   GET /api/orders
 * @access  Private/Admin
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.orderStatus = status;
    }

    const total = await Order.countDocuments(query);
    const { limitNum, skip, paginationResult } = buildPagination(page, limit, total, 20);

    const orders = await Order.find(query)
      .populate('user', 'name email mobile')
      .populate('orderItems.product', 'name image')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    return successResponse(res, 200, 'Orders fetched successfully', {
      orders,
      pagination: paginationResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel order (Customer)
 * @route   PUT /api/orders/:id/cancel
 * @access  Private (Customer)
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (order.user.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Not authorized to cancel this order');
    }

    if (order.orderStatus !== 'Pending' && order.orderStatus !== 'Processing') {
      throw new ApiError(400, `Cannot cancel order with status: ${order.orderStatus}`);
    }

    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    order.orderStatus = 'Cancelled';
    const updatedOrder = await order.save();

    return successResponse(res, 200, 'Order cancelled successfully', { order: updatedOrder });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status (Admin only)
 * @route   PUT /api/orders/:id/status
 * @access  Private/Admin
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (order.orderStatus === 'Cancelled' && orderStatus !== 'Cancelled') {
      for (const item of order.orderItems) {
        const product = await Product.findById(item.product);
        if (product && product.stock < item.quantity) {
          throw new ApiError(400, `Insufficient stock for product ${item.name}`);
        }
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }
    }

    if (order.orderStatus !== 'Cancelled' && orderStatus === 'Cancelled') {
      for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    order.orderStatus = orderStatus;

    if (orderStatus === 'Delivered') {
      order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();

    emitDataUpdate('orders', 'update', updatedOrder);
    emitDashboardStatsUpdate();

    return successResponse(res, 200, 'Order status updated successfully', { order: updatedOrder });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order payment status (Admin only)
 * @route   PUT /api/orders/:id/payment
 * @access  Private/Admin
 */
export const updateOrderPayment = async (req, res, next) => {
  try {
    const { isPaid, paymentResult } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    order.isPaid = isPaid !== undefined ? isPaid : order.isPaid;

    if (order.isPaid && !order.paidAt) {
      order.paidAt = Date.now();
    }

    if (paymentResult) {
      order.paymentResult = {
        ...order.paymentResult,
        ...paymentResult,
      };
    }

    const updatedOrder = await order.save();

    emitDataUpdate('orders', 'update', updatedOrder);
    emitDashboardStatsUpdate();

    return successResponse(res, 200, 'Order payment status updated successfully', { order: updatedOrder });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete order (Admin only)
 * @route   DELETE /api/orders/:id
 * @access  Private/Admin
 */
export const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (order.orderStatus !== 'Cancelled') {
      for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    await Order.findByIdAndDelete(req.params.id);

    emitDataUpdate('orders', 'delete', { _id: order._id });
    emitDashboardStatsUpdate();

    return successResponse(res, 200, 'Order deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard stats (Admin only)
 * @route   GET /api/orders/admin/stats
 * @access  Private/Admin
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await DashboardService.getStats();

    return successResponse(res, 200, 'Dashboard stats fetched successfully', {
      stats
    });
  } catch (error) {
    next(error);
  }
};
