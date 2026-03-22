import User from '../models/User.js';
import Admin from '../models/Admin.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import { notifyNewUser, emitDataUpdate, emitDashboardStatsUpdate } from '../utils/notifications.js';
import { buildPagination, buildSort, buildSearchQuery } from '../utils/queryBuilder.js';

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { search, role, isActive, sort, page = 1, limit = 10 } = req.query;

    const query = {};

    const searchConditions = buildSearchQuery(search, ['name', 'email', 'mobile']);
    if (searchConditions) query.$or = searchConditions;

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const sortOption = buildSort(sort);

    const total = await User.countDocuments(query);
    const { limitNum, skip, paginationResult } = buildPagination(page, limit, total, 10);

    const users = await User.find(query)
      .select('-password') // Exclude password field
      .sort(sortOption)
      .limit(limitNum)
      .skip(skip);

    return successResponse(res, 200, 'Users fetched successfully', {
      users,
      pagination: paginationResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user by ID (Admin only)
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return successResponse(res, 200, 'User fetched successfully', { user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new user (Admin only)
 * @route   POST /api/users
 * @access  Private/Admin
 */
export const createUser = async (req, res, next) => {
  try {
    const { name, email, mobile, password, role, isActive, profilePicture, addresses } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { mobile }]
    });

    if (existingUser) {
      throw new ApiError(400, 'User with this email or mobile already exists');
    }

    const userData = {
      name,
      email,
      mobile,
      password,
      role: role || 'customer',
      isActive: isActive !== undefined ? isActive : true,
      ...(profilePicture && { profilePicture }),
      ...(addresses && { addresses })
    };

    const user = await User.create(userData);

    if (role === 'admin') {
      try {

        const existingAdmin = await Admin.findOne({
          $or: [{ email }, { mobile }]
        });

        if (!existingAdmin) {

          const adminData = {
            name,
            email,
            mobile,
            password, // Will be hashed by Admin model pre-save hook
            role: 'admin', // Default admin role (not superadmin)
            isActive: isActive !== undefined ? isActive : true,
            ...(profilePicture && { profilePicture })
          };

          await Admin.create(adminData);
        }
      } catch (adminError) {

        console.error('Error creating admin entry:', adminError);

      }
    }

    const userResponse = user.toObject();
    delete userResponse.password;

    notifyNewUser(user);

    emitDataUpdate('users', 'create', userResponse);
    emitDashboardStatsUpdate();

    return successResponse(res, 201, 'User created successfully', { user: userResponse });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user (Admin only)
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
export const updateUser = async (req, res, next) => {
  try {
    const { name, email, mobile, role, isActive, profilePicture, addresses, password } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new ApiError(400, 'Email already exists');
      }
    }

    if (mobile && mobile !== user.mobile) {
      const existingUser = await User.findOne({ mobile });
      if (existingUser) {
        throw new ApiError(400, 'Mobile number already exists');
      }
    }

    const oldRole = user.role;

    if (name !== undefined && name !== null) user.name = name;
    if (email !== undefined && email !== null) user.email = email;
    if (mobile !== undefined && mobile !== null) user.mobile = mobile;
    if (role !== undefined && role !== null) {

      if (role !== 'customer' && role !== 'admin') {
        throw new ApiError(400, 'Invalid role. Must be "customer" or "admin"');
      }
      user.role = role;
    }
    if (isActive !== undefined && isActive !== null) user.isActive = isActive;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    if (addresses !== undefined) user.addresses = addresses;
    if (password !== undefined && password !== null && password.trim() !== '') {
      user.password = password; // Will be hashed by pre-save hook
    }

    const updatedUser = await user.save();

    const newRole = updatedUser.role;
    const roleChanged = oldRole !== newRole;

    if (roleChanged || newRole === 'admin') {
      try {

        const adminEmail = email !== undefined ? email : updatedUser.email;
        const adminMobile = mobile !== undefined ? mobile : updatedUser.mobile;

        const existingAdmin = await Admin.findOne({
          $or: [
            { email: adminEmail },
            { mobile: adminMobile }
          ]
        });

        if (newRole === 'admin') {

          if (existingAdmin) {

            if (name !== undefined && name !== null) existingAdmin.name = name;
            if (email !== undefined && email !== null) existingAdmin.email = email;
            if (mobile !== undefined && mobile !== null) existingAdmin.mobile = mobile;
            if (isActive !== undefined && isActive !== null) existingAdmin.isActive = isActive;
            if (profilePicture !== undefined) existingAdmin.profilePicture = profilePicture;
            if (password !== undefined && password !== null && password.trim() !== '') {
              existingAdmin.password = password; // Will be hashed by pre-save hook
            }
            await existingAdmin.save();
          } else {

            const adminPassword = (password && password.trim() !== '')
              ? password
              : 'Temp@123456'; // Temporary password - admin should change on first login

            const adminData = {
              name: updatedUser.name,
              email: updatedUser.email,
              mobile: updatedUser.mobile,
              password: adminPassword,
              role: 'admin',
              isActive: updatedUser.isActive !== undefined ? updatedUser.isActive : true,
              ...(updatedUser.profilePicture && { profilePicture: updatedUser.profilePicture })
            };

            await Admin.create(adminData);

            if (!password || password.trim() === '') {
              console.warn(`Admin entry created for user ${updatedUser._id} with temporary password. Admin should change password on first login.`);
            }
          }
        } else if (oldRole === 'admin' && newRole === 'customer') {

          if (existingAdmin) {
            await existingAdmin.deleteOne();
          }
        }
      } catch (adminError) {

        console.error('Error updating admin entry:', adminError);

      }
    }

    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    emitDataUpdate('users', 'update', userResponse);
    emitDashboardStatsUpdate();

    return successResponse(res, 200, 'User updated successfully', { user: userResponse });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user (Admin only)
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    await user.deleteOne();

    emitDataUpdate('users', 'delete', { _id: user._id });
    emitDashboardStatsUpdate();

    return successResponse(res, 200, 'User deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle user active status (Admin only)
 * @route   PUT /api/users/:id/toggle-status
 * @access  Private/Admin
 */
export const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    user.isActive = !user.isActive;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    emitDataUpdate('users', 'update', userResponse);
    emitDashboardStatsUpdate();

    return successResponse(res, 200, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, { user: userResponse });
  } catch (error) {
    next(error);
  }
};