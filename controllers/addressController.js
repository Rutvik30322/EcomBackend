import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';

/**
 * @desc    Get all addresses for authenticated user
 * @route   GET /api/addresses
 * @access  Private
 */
export const getUserAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('addresses');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    return successResponse(res, 200, 'Addresses fetched successfully', {
      addresses: user.addresses || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add new address for authenticated user
 * @route   POST /api/addresses
 * @access  Private
 */
export const addAddress = async (req, res, next) => {
  try {
    const { name, addressLine, city, state, pincode, phone, type, isDefault } = req.body;

    if (!addressLine || !city || !state || !pincode) {
      throw new ApiError(400, 'Please provide all required address fields');
    }
    
    if (pincode && !/^[0-9]{6}$/.test(pincode)) {
      throw new ApiError(400, 'Pincode must be 6 digits');
    }
    
    if (phone && !/^[0-9]{10}$/.test(phone)) {
      throw new ApiError(400, 'Phone must be 10 digits');
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (isDefault === true) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    const newAddress = {
      name: name || '',
      addressLine,
      city,
      state,
      pincode,
      phone: phone || '',
      type: type || 'Home',
      isDefault: isDefault === true,
    };
    
    user.addresses.push(newAddress);
    await user.save();

    const addedAddress = user.addresses[user.addresses.length - 1];
    
    return successResponse(res, 201, 'Address added successfully', {
      address: addedAddress,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update address for authenticated user
 * @route   PUT /api/addresses/:addressId
 * @access  Private
 */
export const updateAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const { name, addressLine, city, state, pincode, phone, type, isDefault } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const address = user.addresses.id(addressId);
    
    if (!address) {
      throw new ApiError(404, 'Address not found');
    }

    if (isDefault === true) {
      user.addresses.forEach(addr => {
        if (addr._id.toString() !== addressId) {
          addr.isDefault = false;
        }
      });
    }

    if (name !== undefined) address.name = name;
    if (addressLine !== undefined) address.addressLine = addressLine;
    if (city !== undefined) address.city = city;
    if (state !== undefined) address.state = state;
    if (pincode !== undefined) {
      if (!/^[0-9]{6}$/.test(pincode)) {
        throw new ApiError(400, 'Pincode must be 6 digits');
      }
      address.pincode = pincode;
    }
    if (phone !== undefined) {
      if (phone && !/^[0-9]{10}$/.test(phone)) {
        throw new ApiError(400, 'Phone must be 10 digits');
      }
      address.phone = phone;
    }
    if (type !== undefined) address.type = type;
    if (isDefault !== undefined) address.isDefault = isDefault;
    
    await user.save();
    
    return successResponse(res, 200, 'Address updated successfully', {
      address: address,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete address for authenticated user
 * @route   DELETE /api/addresses/:addressId
 * @access  Private
 */
export const deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const address = user.addresses.id(addressId);
    
    if (!address) {
      throw new ApiError(404, 'Address not found');
    }
    
    user.addresses.pull(addressId);
    await user.save();
    
    return successResponse(res, 200, 'Address deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set address as default for authenticated user
 * @route   PUT /api/addresses/:addressId/set-default
 * @access  Private
 */
export const setDefaultAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const address = user.addresses.id(addressId);
    
    if (!address) {
      throw new ApiError(404, 'Address not found');
    }

    user.addresses.forEach(addr => {
      addr.isDefault = addr._id.toString() === addressId;
    });
    
    await user.save();
    
    return successResponse(res, 200, 'Default address updated successfully', {
      address: address,
    });
  } catch (error) {
    next(error);
  }
};
