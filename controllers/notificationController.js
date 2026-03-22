import Notification from '../models/Notification.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';

/**
 * @desc    Get all notifications (Admin only)
 * @route   GET /api/notifications
 * @access  Private/Admin
 */
export const getAllNotifications = async (req, res, next) => {
  try {
    const { read, type, page = 1, limit = 50 } = req.query;

    const query = {};
    
    if (read !== undefined) {
      query.read = read === 'true';
    }
    
    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(skip);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ read: false });

    return successResponse(res, 200, 'Notifications fetched successfully', {
      notifications,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get latest notifications (top N)
 * @route   GET /api/notifications/latest
 * @access  Private/Admin
 */
export const getLatestNotifications = async (req, res, next) => {
  try {
    const { limit = 3 } = req.query;

    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    const unreadCount = await Notification.countDocuments({ read: false });

    return successResponse(res, 200, 'Latest notifications fetched successfully', {
      notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get notification by ID
 * @route   GET /api/notifications/:id
 * @access  Private/Admin
 */
export const getNotificationById = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }

    return successResponse(res, 200, 'Notification fetched successfully', { notification });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private/Admin
 */
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    return successResponse(res, 200, 'Notification marked as read', { notification });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private/Admin
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { read: false },
      { 
        read: true,
        readAt: new Date(),
      }
    );

    return successResponse(res, 200, 'All notifications marked as read', {
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update notification
 * @route   PUT /api/notifications/:id
 * @access  Private/Admin
 */
export const updateNotification = async (req, res, next) => {
  try {
    const { title, message, type, data } = req.body;
    
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }

    if (title !== undefined) notification.title = title;
    if (message !== undefined) notification.message = message;
    if (type !== undefined) {

      const validTypes = ['order', 'customer', 'user', 'product', 'review', 'other'];
      if (!validTypes.includes(type)) {
        throw new ApiError(400, 'Invalid notification type');
      }
      notification.type = type;
    }
    if (data !== undefined) notification.data = data;

    await notification.save();

    return successResponse(res, 200, 'Notification updated successfully', { notification });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private/Admin
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }

    await notification.deleteOne();

    return successResponse(res, 200, 'Notification deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete all notifications
 * @route   DELETE /api/notifications
 * @access  Private/Admin
 */
export const deleteAllNotifications = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({});

    return successResponse(res, 200, 'All notifications deleted successfully', {
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get notification statistics
 * @route   GET /api/notifications/stats
 * @access  Private/Admin
 */
export const getNotificationStats = async (req, res, next) => {
  try {
    const total = await Notification.countDocuments();
    const unread = await Notification.countDocuments({ read: false });
    const read = await Notification.countDocuments({ read: true });

    const byType = await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
          },
        },
      },
    ]);

    return successResponse(res, 200, 'Notification stats fetched successfully', {
      stats: {
        total,
        unread,
        read,
        byType,
      },
    });
  } catch (error) {
    next(error);
  }
};
