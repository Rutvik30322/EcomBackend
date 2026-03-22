import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Review from '../models/Review.js';

/**
 * Service to aggregate various metrics for the admin dashboard
 */
class DashboardService {
    /**
     * Get comprehensive dashboard statistics
     * @returns {Promise<Object>} Dashboard statistics
     */
    static async getStats() {

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
            .limit(5);

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

        return {
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
    }
}

export default DashboardService;
