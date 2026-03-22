import { verifyToken } from '../utils/jwtHelper.js';
import { errorResponse } from '../utils/apiResponse.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 401, 'Not authorized, no token');
    }

    const decoded = verifyToken(token);

    if (decoded.role === 'admin' || decoded.role === 'superadmin') {
      req.admin = await Admin.findById(decoded.id).select('-password');
      if (!req.admin) {
        return errorResponse(res, 401, 'Admin not found');
      }
      req.role = req.admin.role; // Use role from database, not token
    } else {
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return errorResponse(res, 401, 'User not found');
      }
      req.role = decoded.role;
    }
    next();
  } catch (error) {
    return errorResponse(res, 401, error.message || 'Not authorized');
  }
};

export const adminOnly = (req, res, next) => {
  if (req.role !== 'admin' && req.role !== 'superadmin') {
    return errorResponse(res, 403, 'Access denied. Admin only.');
  }
  next();
};

export const superAdminOnly = (req, res, next) => {
  if (req.role !== 'superadmin') {
    return errorResponse(res, 403, 'Access denied. Super admin only.');
  }
  next();
};

export const customerOnly = (req, res, next) => {
  if (req.role !== 'customer') {
    return errorResponse(res, 403, 'Access denied. Customer only.');
  }
  next();
};
