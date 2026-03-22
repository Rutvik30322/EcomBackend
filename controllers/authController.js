import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Otp from '../models/Otp.js';
import { generateToken } from '../utils/jwtHelper.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import axios from 'axios';
import { notifyNewUser } from '../utils/notifications.js';

/**
 * @desc    Register new customer user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res, next) => {
  try {


    const { name, email, mobile, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { mobile }],
    });

    if (existingUser) {
      throw new ApiError(400, 'User with this email or mobile already exists');
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      mobile,
      password,
    });

    // Generate token
    const token = generateToken(user._id, 'customer');

    // Prepare user data (without password)
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      profilePicture: user.profilePicture,
      role: user.role,
    };


    // Emit notification to admin panel for new customer registration
    notifyNewUser(user);

    return successResponse(res, 201, 'User registered successfully', {
      user: userData,
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login customer user (email or mobile + password)
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res, next) => {
  try {

    const { email, mobile, password } = req.body;

    // Check if email or mobile is provided
    if (!email && !mobile) {
      throw new ApiError(400, 'Please provide email or mobile number');
    }

    // Find user by email or mobile
    const user = await User.findOne({
      $or: [{ email }, { mobile }],
    }).select('+password');

    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated');
    }

    // Verify password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Generate token
    const token = generateToken(user._id, 'customer');

    // Prepare user data (without password)
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      profilePicture: user.profilePicture,
      role: user.role,
      addresses: user.addresses,
    };


    return successResponse(res, 200, 'Login successful', {
      user: userData,
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register/Login admin
 * @route   POST /api/auth/admin/login
 * @access  Public (but restricted to admin credentials)
 */
export const loginAdmin = async (req, res, next) => {
  try {
    const { mobile, password } = req.body;

    // Check if mobile is provided
    if (!mobile) {
      throw new ApiError(400, 'Please provide mobile number');
    }

    // Validate mobile format
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

    // Find admin by mobile
    const admin = await Admin.findOne({ mobile }).select('+password');

    if (!admin) {
      throw new ApiError(401, 'Invalid admin credentials');
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw new ApiError(403, 'Your admin account has been deactivated');
    }

    // Verify password
    const isPasswordMatch = await admin.comparePassword(password);

    if (!isPasswordMatch) {
      throw new ApiError(401, 'Invalid admin credentials');
    }

    // Generate token with actual admin role (admin or superadmin)
    const token = generateToken(admin._id, admin.role);

    // Prepare admin data (without password)
    const adminData = {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      mobile: admin.mobile,
      profilePicture: admin.profilePicture,
      role: admin.role,
      permissions: admin.permissions,
    };

    return successResponse(res, 200, 'Admin login successful', {
      admin: adminData,
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated user/admin profile
 * @route   GET /api/auth/me
 * @access  Private (Customer/Admin)
 */
export const getMe = async (req, res, next) => {
  try {
    if (req.role === 'admin' || req.role === 'superadmin') {
      return successResponse(res, 200, 'Admin profile fetched successfully', {
        admin: req.admin,
        role: req.role,
      });
    } else {
      return successResponse(res, 200, 'User profile fetched successfully', {
        user: req.user,
        role: 'customer',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private (Customer)
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, mobile, profilePicture } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (mobile) user.mobile = mobile;
    // Allow profile picture URL to be updated directly (for cases where image is already uploaded)
    if (profilePicture !== undefined) {
      // Validate it's a valid URL if provided
      if (profilePicture && !profilePicture.startsWith('http://') && !profilePicture.startsWith('https://')) {
        throw new ApiError(400, 'Profile picture must be a valid URL');
      }
      user.profilePicture = profilePicture || null;
    }

    await user.save();

    // Fetch updated user without password
    const updatedUser = await User.findById(user._id).select('-password');

    return successResponse(res, 200, 'Profile updated successfully', {
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change user password
 * @route   PUT /api/auth/change-password
 * @access  Private (Customer)
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isPasswordMatch = await user.comparePassword(currentPassword);

    if (!isPasswordMatch) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return successResponse(res, 200, 'Password changed successfully', null);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send OTP for forgot password
 * @route   POST /api/auth/forgot-password/send-otp
 * @access  Public
 */
export const sendOtp = async (req, res, next) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      throw new ApiError(400, 'Mobile number is required');
    }

    // Validate mobile format
    if (!/^[0-9]{10}$/.test(mobile)) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

    // Check if user exists with this mobile number
    const user = await User.findOne({ mobile });
    if (!user) {
      throw new ApiError(404, 'No account found with this mobile number');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTP for this mobile
    await Otp.deleteMany({ mobile });

    // Save OTP to database
    const otpRecord = await Otp.create({
      mobile,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send OTP via SMS - exact format as provided
    try {
      const message = `Your Passcode to Reset Password in BSPL App is :${otp}. Bespoke Systems Pvt Ltd`;
      const smsUrl = `https://onlysms.co.in/api/otp.aspx?UserID=bespokeotp&UserPass=Bspl909@&MobileNo=${mobile}!MsgID &GSMID=BSPLIT&PEID=1701172122280972916&Message=${encodeURIComponent(message)}&TEMPID=1707172182459340105&UNICODE=TEXT`;


      const smsResponse = await axios.get(smsUrl);
    } catch (smsError) {
      // Don't throw error, OTP is saved in DB even if SMS fails
      // User can still use the OTP from database
    }

    return successResponse(res, 200, 'OTP sent successfully to your mobile number', {
      mobile: mobile.substring(0, 2) + '****' + mobile.substring(6), // Mask mobile number
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP for forgot password
 * @route   POST /api/auth/forgot-password/verify-otp
 * @access  Public
 */
export const verifyOtp = async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      throw new ApiError(400, 'Mobile number and OTP are required');
    }

    // Find OTP record
    const otpRecord = await Otp.findOne({ mobile, otp });

    if (!otpRecord) {
      throw new ApiError(400, 'Invalid OTP');
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      throw new ApiError(400, 'OTP has expired. Please request a new one.');
    }

    // Check if OTP is already verified
    if (otpRecord.isVerified) {
      throw new ApiError(400, 'OTP has already been used');
    }

    // Mark OTP as verified
    otpRecord.isVerified = true;
    await otpRecord.save();

    return successResponse(res, 200, 'OTP verified successfully', {
      mobile: mobile.substring(0, 2) + '****' + mobile.substring(6), // Mask mobile number
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password after OTP verification
 * @route   POST /api/auth/forgot-password/reset
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { mobile, otp, newPassword } = req.body;

    if (!mobile || !otp || !newPassword) {
      throw new ApiError(400, 'Mobile number, OTP, and new password are required');
    }

    if (newPassword.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters long');
    }

    // Verify OTP
    const otpRecord = await Otp.findOne({ mobile, otp, isVerified: true });

    if (!otpRecord) {
      throw new ApiError(400, 'Invalid or unverified OTP');
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      throw new ApiError(400, 'OTP has expired. Please request a new one.');
    }

    // Find user
    const user = await User.findOne({ mobile }).select('+password');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Delete OTP record after successful password reset
    await Otp.deleteOne({ _id: otpRecord._id });

    return successResponse(res, 200, 'Password reset successfully', null);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send OTP for admin forgot password (mobile-based)
 * @route   POST /api/auth/admin/forgot-password/send-otp
 * @access  Public
 */
export const sendAdminOtp = async (req, res, next) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      throw new ApiError(400, 'Mobile number is required');
    }

    // Validate mobile format
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

    // Check if admin exists with this mobile
    const admin = await Admin.findOne({ mobile });
    if (!admin) {
      throw new ApiError(404, 'No admin account found with this mobile number');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTP for this mobile
    await Otp.deleteMany({ mobile });

    // Save OTP to database
    const otpRecord = await Otp.create({
      mobile,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send OTP via SMS - EXACT same as mobile app
    try {
      // const message = `Your Passcode to Login in Admin Panel is :${otp}. Chocolate.Bespoke Systems Pvt Ltd`;
      // const smsUrl = `https://onlysms.co.in/api/otp.aspx?UserID=bespokeotp&UserPass=Bspl909@&MobileNo=${mobile}&MsgID&GSMID=BSPLIT&PEID=1701172122280972916&Message=${encodeURIComponent(message)}&TEMPID=1707172182452589219&UNICODE=TEXT`;
      const message = `Your Passcode to Login in BSPL App is :${otp}. Chocolate.Bespoke Systems Pvt Ltd`;
      const smsUrl = `https://onlysms.co.in/api/otp.aspx?UserID=bespokeotp&UserPass=Bspl909@&MobileNo=${mobile}&MsgID&GSMID=BSPLIT&PEID=1701172122280972916&Message=${encodeURIComponent(message)}&TEMPID=1707172182452589219&UNICODE=TEXT`;


      const smsResponse = await axios.get(smsUrl);
    } catch (smsError) {
      // Don't throw error, OTP is saved in DB even if SMS fails
      // Admin can still use the OTP from database
    }

    const maskedMobile = mobile.substring(0, 3) + '***' + mobile.substring(6);

    return successResponse(res, 200, 'OTP sent successfully. Please check your mobile.', {
      identifier: maskedMobile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP for admin forgot password
 * @route   POST /api/auth/admin/forgot-password/verify-otp
 * @access  Public
 */
export const verifyAdminOtp = async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;

    // Check if mobile and OTP are provided
    if (!mobile || !otp) {
      throw new ApiError(400, 'Mobile number and OTP are required');
    }

    // Validate mobile format
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

    // Find OTP record
    const otpRecord = await Otp.findOne({ mobile, otp });

    if (!otpRecord) {
      throw new ApiError(400, 'Invalid OTP');
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      throw new ApiError(400, 'OTP has expired. Please request a new one.');
    }

    // Check if OTP is already verified
    if (otpRecord.isVerified) {
      throw new ApiError(400, 'OTP has already been used');
    }

    // Mark OTP as verified
    otpRecord.isVerified = true;
    await otpRecord.save();

    const maskedIdentifier = mobile.substring(0, 3) + '***' + mobile.substring(6);

    return successResponse(res, 200, 'OTP verified successfully', {
      identifier: maskedIdentifier,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset admin password after OTP verification
 * @route   POST /api/auth/admin/forgot-password/reset
 * @access  Public
 */
export const resetAdminPassword = async (req, res, next) => {
  try {
    const { mobile, otp, newPassword } = req.body;

    // Check if mobile, OTP, and new password are provided
    if (!mobile || !otp || !newPassword) {
      throw new ApiError(400, 'Mobile number, OTP, and new password are required');
    }

    // Validate mobile format
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

    if (newPassword.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters long');
    }

    // Verify OTP
    const otpRecord = await Otp.findOne({ mobile, otp, isVerified: true });

    if (!otpRecord) {
      throw new ApiError(400, 'Invalid or unverified OTP');
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      throw new ApiError(400, 'OTP has expired. Please request a new one.');
    }

    // Find admin by mobile
    const admin = await Admin.findOne({ mobile }).select('+password');

    if (!admin) {
      throw new ApiError(404, 'Admin not found');
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    // Delete OTP record after successful password reset
    await Otp.deleteOne({ _id: otpRecord._id });

    return successResponse(res, 200, 'Password reset successfully', null);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update admin profile
 * @route   PUT /api/auth/admin/profile
 * @access  Private (Admin)
 */
export const updateAdminProfile = async (req, res, next) => {
  try {
    const { name, email, mobile, profilePicture } = req.body;
    const admin = await Admin.findById(req.admin._id);

    if (!admin) {
      throw new ApiError(404, 'Admin not found');
    }

    // Check if email already exists for another admin
    if (email && email !== admin.email) {
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        throw new ApiError(400, 'Email already exists');
      }
    }

    // Check if mobile already exists for another admin
    if (mobile && mobile !== admin.mobile) {
      const existingAdmin = await Admin.findOne({ mobile });
      if (existingAdmin) {
        throw new ApiError(400, 'Mobile number already exists');
      }
    }

    // Validate mobile number format if provided
    if (mobile && !/^[0-9]{10}$/.test(mobile)) {
      throw new ApiError(400, 'Mobile number must be exactly 10 digits');
    }

    if (name) admin.name = name;
    if (email) admin.email = email;
    if (mobile) admin.mobile = mobile;
    if (profilePicture !== undefined) admin.profilePicture = profilePicture;

    await admin.save();
    const updatedAdmin = await Admin.findById(admin._id).select('-password');
    return successResponse(res, 200, 'Profile updated successfully', { admin: updatedAdmin });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change admin password
 * @route   PUT /api/auth/admin/change-password
 * @access  Private (Admin)
 */
export const changeAdminPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const admin = await Admin.findById(req.admin._id).select('+password');

    if (!admin) {
      throw new ApiError(404, 'Admin not found');
    }

    // Verify current password
    const isPasswordMatch = await admin.comparePassword(currentPassword);

    if (!isPasswordMatch) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    return successResponse(res, 200, 'Password changed successfully', null);
  } catch (error) {
    next(error);
  }
};
