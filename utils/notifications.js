/**
 * Notification utility for emitting real-time notifications to admin panel
 */

/**
 * Emit notification to admin panel and save to database
 * @param {string} type - Type of notification (order, user, customer, etc.)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} data - Additional data to send with notification
 */
export const emitNotification = async (type, title, message, data = {}) => {
  try {

    const Notification = (await import('../models/Notification.js')).default;

    const savedNotification = await Notification.create({
      type,
      title,
      message,
      data,
      read: false,
    });

    if (global.io) {
      const notification = {
        id: savedNotification._id.toString(),
        type: savedNotification.type,
        title: savedNotification.title,
        message: savedNotification.message,
        timestamp: savedNotification.createdAt.toISOString(),
        data: savedNotification.data,
        read: savedNotification.read,
      };

      global.io.to('admin').emit('notification', notification);
    } else {
      console.warn('Socket.io not initialized, notification saved but not sent via socket');
    }
  } catch (error) {
    console.error('Error saving notification to database:', error);

    if (global.io) {
      const notification = {
        id: Date.now().toString(),
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        data,
      };
      global.io.to('admin').emit('notification', notification);
    }
  }
};

/**
 * Emit new order notification
 * @param {object} order - Order object
 */
export const notifyNewOrder = (order) => {
  emitNotification(
    'order',
    'New Order Received',
    `Order #${order._id.toString().slice(-6)} from ${order.user?.name || 'Customer'}`,
    {
      orderId: order._id,
      orderTotal: order.totalPrice,
      orderStatus: order.orderStatus,
      customerName: order.user?.name,
      customerEmail: order.user?.email,
    }
  );
};

/**
 * Emit new user/customer notification
 * @param {object} user - User object
 */
export const notifyNewUser = (user) => {
  const isCustomer = user.role === 'customer';
  emitNotification(
    isCustomer ? 'customer' : 'user',
    isCustomer ? 'New Customer Registered' : 'New User Created',
    `${user.name} (${user.email}) has ${isCustomer ? 'registered' : 'been created'}`,
    {
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
    }
  );
};

/**
 * Emit new product notification
 * @param {object} product - Product object
 */
export const notifyNewProduct = (product) => {
  emitNotification(
    'product',
    'New Product Added',
    `${product.name} has been added to the catalog`,
    {
      productId: product._id,
      productName: product.name,
      productPrice: product.price,
    }
  );
};

/**
 * Emit real-time data update to admin panel
 * @param {string} type - Type of data (products, orders, categories, users, reviews, dashboard)
 * @param {string} action - Action type (create, update, delete)
 * @param {object} payload - Data payload
 */
export const emitDataUpdate = (type, action, payload) => {
  if (!global.io) {
    console.warn('Socket.io not initialized, data update not sent');
    return;
  }

  global.io.to('admin').emit('data-update', {
    type,
    action,
    payload,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Emit dashboard stats update with full stats
 */
export const emitDashboardStatsUpdate = async () => {
  if (!global.io) {
    console.warn('Socket.io not initialized, dashboard update not sent');
    return;
  }

  try {

    const Order = (await import('../models/Order.js')).default;
    const Product = (await import('../models/Product.js')).default;
    const User = (await import('../models/User.js')).default;
    const Category = (await import('../models/Category.js')).default;
    const Review = (await import('../models/Review.js')).default;

    const totalOrders = await Order.countDocuments();
    
    const revenueData = await Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]);

    const totalProducts = await Product.countDocuments({ isActive: true });
    const outOfStockProducts = await Product.countDocuments({ 
      isActive: true, 
      $or: [{ inStock: false }, { stock: 0 }] 
    });

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const customers = await User.countDocuments({ role: 'customer' });
    const admins = await User.countDocuments({ role: 'admin' });

    const totalCategories = await Category.countDocuments({ isActive: true });

    const totalReviews = await Review.countDocuments();
    const approvedReviews = await Review.countDocuments({ isApproved: true });
    const pendingReviews = await Review.countDocuments({ isApproved: false });

    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const revenueByMonth = await Order.aggregate([
      { 
        $match: { 
          isPaid: true,
          createdAt: { $gte: sixMonthsAgo }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalPrice' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const ordersByMonth = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: sixMonthsAgo }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({ createdAt: { $gte: today } });
    const todayRevenueData = await Order.aggregate([
      { 
        $match: { 
          isPaid: true,
          createdAt: { $gte: today }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const todayRevenue = todayRevenueData[0]?.total || 0;

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    const thisMonthOrders = await Order.countDocuments({ createdAt: { $gte: thisMonthStart } });
    const thisMonthRevenueData = await Order.aggregate([
      { 
        $match: { 
          isPaid: true,
          createdAt: { $gte: thisMonthStart }
        } 
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const thisMonthRevenue = thisMonthRevenueData[0]?.total || 0;

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const paidOrders = await Order.countDocuments({ isPaid: true });
    const unpaidOrders = await Order.countDocuments({ isPaid: false });

    const revenueByPaymentMethod = await Order.aggregate([
      { 
        $match: { isPaid: true } 
      },
      {
        $group: {
          _id: '$paymentMethod',
          revenue: { $sum: '$totalPrice' },
          count: { $sum: 1 }
        }
      }
    ]);

    const ordersByPaymentMethod = await Order.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          paid: {
            $sum: { $cond: ['$isPaid', 1, 0] }
          },
          unpaid: {
            $sum: { $cond: ['$isPaid', 0, 1] }
          }
        }
      }
    ]);

    const paymentStatusBreakdown = {
      paid: paidOrders,
      unpaid: unpaidOrders,
      total: totalOrders
    };

    const stats = {
      totalOrders,
      totalRevenue,
      ordersByStatus,
      totalProducts,
      outOfStockProducts,
      totalUsers,
      activeUsers,
      customers,
      admins,
      totalCategories,
      totalReviews,
      approvedReviews,
      pendingReviews,
      recentOrders,
      revenueByMonth,
      ordersByMonth,
      todayOrders,
      todayRevenue,
      thisMonthOrders,
      thisMonthRevenue,
      avgOrderValue,
      paidOrders,
      unpaidOrders,
      paymentStatusBreakdown,
      revenueByPaymentMethod,
      ordersByPaymentMethod,
    };

    global.io.to('admin').emit('dashboard-stats-update', stats);
  } catch (error) {
    console.error('Error emitting dashboard stats update:', error);
  }
};
