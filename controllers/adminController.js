import Admin from '../models/Admin.js';
import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import { buildPagination, buildSort, buildSearchQuery } from '../utils/queryBuilder.js';

/**
 * @desc    Get all admins (Super admin only)
 * @route   GET /api/admins
 * @access  Private/SuperAdmin
 */
export const getAllAdmins = async (req, res, next) => {
  try {
    const { search, role, isActive, sort, page = 1, limit = 10 } = req.query;

    const query = {};

    const searchConditions = buildSearchQuery(search, ['name', 'email', 'mobile']);
    if (searchConditions) query.$or = searchConditions;

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const sortOption = buildSort(sort);

    const total = await Admin.countDocuments(query);
    const { limitNum, skip, paginationResult } = buildPagination(page, limit, total, 10);

    const admins = await Admin.find(query)
      .select('-password') // Exclude password field
      .sort(sortOption)
      .limit(limitNum)
      .skip(skip);

    return successResponse(res, 200, 'Admins fetched successfully', {
      admins,
      pagination: paginationResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single admin by ID (Super admin only)
 * @route   GET /api/admins/:id
 * @access  Private/SuperAdmin
 */
export const getAdminById = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.params.id).select('-password');

    if (!admin) {
      throw new ApiError(404, 'Admin not found');
    }

    return successResponse(res, 200, 'Admin fetched successfully', { admin });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new admin (Super admin only)
 * @route   POST /api/admins
 * @access  Private/SuperAdmin
 */
export const createAdmin = async (req, res, next) => {
  try {
    const { name, email, mobile, password, role, isActive, profilePicture } = req.body;

    const existingAdmin = await Admin.findOne({
      $or: [{ email }, { mobile }]
    });

    if (existingAdmin) {
      throw new ApiError(400, 'Admin with this email or mobile already exists');
    }

    if (role && role !== 'admin' && role !== 'superadmin') {
      throw new ApiError(400, 'Invalid role. Must be "admin" or "superadmin"');
    }

    const adminData = {
      name,
      email,
      mobile,
      password,
      role: role || 'admin',
      isActive: isActive !== undefined ? isActive : true,
      ...(profilePicture && { profilePicture })
    };

    const admin = await Admin.create(adminData);

    const adminResponse = admin.toObject();
    delete adminResponse.password;

    return successResponse(res, 201, 'Admin created successfully', { admin: adminResponse });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update admin (Super admin only)
 * @route   PUT /api/admins/:id
 * @access  Private/SuperAdmin
 */
export const updateAdmin = async (req, res, next) => {
  try {
    const { name, email, mobile, role, isActive, profilePicture, password } = req.body;

    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      throw new ApiError(404, 'Admin not found');
    }

    if (req.admin._id.toString() === admin._id.toString() && role && role !== 'superadmin') {
      throw new ApiError(400, 'You cannot change your own role');
    }

    if (email && email !== admin.email) {
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        throw new ApiError(400, 'Email already exists');
      }
    }

    if (mobile && mobile !== admin.mobile) {
      const existingAdmin = await Admin.findOne({ mobile });
      if (existingAdmin) {
        throw new ApiError(400, 'Mobile number already exists');
      }
    }

    if (role && role !== 'admin' && role !== 'superadmin') {
      throw new ApiError(400, 'Invalid role. Must be "admin" or "superadmin"');
    }

    if (name !== undefined && name !== null) admin.name = name;
    if (email !== undefined && email !== null) admin.email = email;
    if (mobile !== undefined && mobile !== null) admin.mobile = mobile;
    if (role !== undefined && role !== null) admin.role = role;
    if (isActive !== undefined && isActive !== null) admin.isActive = isActive;
    if (profilePicture !== undefined) admin.profilePicture = profilePicture;
    if (password !== undefined && password !== null && password.trim() !== '') {
      admin.password = password; // Will be hashed by pre-save hook
    }

    const updatedAdmin = await admin.save();

    const adminResponse = updatedAdmin.toObject();
    delete adminResponse.password;

    return successResponse(res, 200, 'Admin updated successfully', { admin: adminResponse });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete admin (Super admin only)
 * @route   DELETE /api/admins/:id
 * @access  Private/SuperAdmin
 */
export const deleteAdmin = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      throw new ApiError(404, 'Admin not found');
    }

    if (req.admin._id.toString() === admin._id.toString()) {
      throw new ApiError(400, 'You cannot delete your own account');
    }

    await admin.deleteOne();

    return successResponse(res, 200, 'Admin deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle admin active status (Super admin only)
 * @route   PUT /api/admins/:id/toggle-status
 * @access  Private/SuperAdmin
 */
export const toggleAdminStatus = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      throw new ApiError(404, 'Admin not found');
    }

    if (req.admin._id.toString() === admin._id.toString()) {
      throw new ApiError(400, 'You cannot deactivate your own account');
    }

    admin.isActive = !admin.isActive;
    await admin.save();

    const adminResponse = admin.toObject();
    delete adminResponse.password;

    return successResponse(res, 200, `Admin ${admin.isActive ? 'activated' : 'deactivated'} successfully`, { admin: adminResponse });
  } catch (error) {
    next(error);
  }
};
