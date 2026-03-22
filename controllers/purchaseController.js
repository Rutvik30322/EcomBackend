import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';

/**
 * @desc    Create new purchase
 * @route   POST /api/purchases
 * @access  Private/Admin
 */
export const createPurchase = async (req, res, next) => {
  try {
    const { purchaseNo, supplierName, invoiceNo, invoiceDate, items } = req.body;

    if (!purchaseNo || !supplierName || !invoiceNo || !invoiceDate) {
      throw new ApiError(400, 'Purchase No, Supplier Name, Invoice No, and Invoice Date are required');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, 'At least one product item is required');
    }

    const processedItems = items.map((item) => {
      if (!item.product || !item.quantity || !item.purchaseRate || !item.mrp || !item.expiryDate || !item.batchNo) {
        throw new ApiError(400, 'Each item must have product, quantity, purchaseRate, mrp, expiryDate, and batchNo');
      }
      return {
        ...item,
        expiryDate: new Date(item.expiryDate),
      };
    });

    const existingPurchase = await Purchase.findOne({ purchaseNo });
    if (existingPurchase) {
      throw new ApiError(400, 'Purchase No already exists');
    }

    const purchase = await Purchase.create({
      purchaseNo,
      supplierName,
      invoiceNo,
      invoiceDate: new Date(invoiceDate),
      items: processedItems,
    });

    await Promise.all(
      processedItems.map(async (item) => {
        const qty = Number(item.quantity) || 0;
        if (item.product && qty > 0) {
          await Product.findByIdAndUpdate(
            item.product,
            {
              $inc: { stock: qty },
              $set: {
                inStock: true,
                expiryDate: new Date(item.expiryDate)
              },
            },
            { new: true }
          );
        }
      })
    );

    await purchase.populate('items.product', 'name price image');

    return successResponse(res, 201, 'Purchase created successfully', { purchase });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(400, 'Purchase No already exists'));
    }
    next(error);
  }
};

/**
 * @desc    Get all purchases
 * @route   GET /api/purchases
 * @access  Private/Admin
 */
export const getAllPurchases = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, supplierName, startDate, endDate } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { purchaseNo: { $regex: search, $options: 'i' } },
        { invoiceNo: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
      ];
    }

    if (supplierName) {
      query.supplierName = { $regex: supplierName, $options: 'i' };
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) {
        query.invoiceDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.invoiceDate.$lte = new Date(endDate);
      }
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Purchase.countDocuments(query);

    const purchases = await Purchase.find(query)
      .populate('items.product', 'name price image category')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    return successResponse(res, 200, 'Purchases fetched successfully', {
      purchases,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single purchase by ID
 * @route   GET /api/purchases/:id
 * @access  Private/Admin
 */
export const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id).populate(
      'items.product',
      'name price image category description'
    );

    if (!purchase) {
      throw new ApiError(404, 'Purchase not found');
    }

    return successResponse(res, 200, 'Purchase fetched successfully', { purchase });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update purchase
 * @route   PUT /api/purchases/:id
 * @access  Private/Admin
 */
export const updatePurchase = async (req, res, next) => {
  try {
    const { purchaseNo, supplierName, invoiceNo, invoiceDate, items } = req.body;

    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      throw new ApiError(404, 'Purchase not found');
    }

    if (purchaseNo && purchaseNo !== purchase.purchaseNo) {
      const existingPurchase = await Purchase.findOne({ purchaseNo });
      if (existingPurchase) {
        throw new ApiError(400, 'Purchase No already exists');
      }
    }

    if (purchaseNo) purchase.purchaseNo = purchaseNo;
    if (supplierName) purchase.supplierName = supplierName;
    if (invoiceNo) purchase.invoiceNo = invoiceNo;
    if (invoiceDate) purchase.invoiceDate = new Date(invoiceDate);
    if (items && Array.isArray(items)) {

      const processedItems = items.map((item) => {
        if (!item.product || !item.quantity || !item.purchaseRate || !item.mrp || !item.expiryDate || !item.batchNo) {
          throw new ApiError(400, 'Each item must have product, quantity, purchaseRate, mrp, expiryDate, and batchNo');
        }
        return {
          ...item,
          expiryDate: new Date(item.expiryDate),
        };
      });

      await Promise.all(
        purchase.items.map(async (oldItem) => {
          const oldQty = Number(oldItem.quantity) || 0;
          if (oldItem.product && oldQty > 0) {
            const updated = await Product.findByIdAndUpdate(
              oldItem.product,
              { $inc: { stock: -oldQty } },
              { new: true }
            );
            if (updated) {
              await Product.findByIdAndUpdate(
                oldItem.product,
                { $set: { inStock: updated.stock > 0 } }
              );
            }
          }
        })
      );

      purchase.items = processedItems;

      await Promise.all(
        processedItems.map(async (item) => {
          const qty = Number(item.quantity) || 0;
          if (item.product && qty > 0) {
            await Product.findByIdAndUpdate(
              item.product,
              {
                $inc: { stock: qty },
                $set: {
                  inStock: true,
                  expiryDate: new Date(item.expiryDate)
                },
              },
              { new: true }
            );
          }
        })
      );
    }

    await purchase.save();

    await purchase.populate('items.product', 'name price image category');

    return successResponse(res, 200, 'Purchase updated successfully', { purchase });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(400, 'Purchase No already exists'));
    }
    next(error);
  }
};

/**
 * @desc    Delete purchase
 * @route   DELETE /api/purchases/:id
 * @access  Private/Admin
 */
export const deletePurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findByIdAndDelete(req.params.id);

    if (!purchase) {
      throw new ApiError(404, 'Purchase not found');
    }

    return successResponse(res, 200, 'Purchase deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get purchase by purchase number
 * @route   GET /api/purchases/purchase-no/:purchaseNo
 * @access  Private/Admin
 */
export const getPurchaseByPurchaseNo = async (req, res, next) => {
  try {
    const purchase = await Purchase.findOne({ purchaseNo: req.params.purchaseNo }).populate(
      'items.product',
      'name price image category description'
    );

    if (!purchase) {
      throw new ApiError(404, 'Purchase not found');
    }

    return successResponse(res, 200, 'Purchase fetched successfully', { purchase });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get next unique purchase number
 * @route   GET /api/purchases/next-purchase-no
 * @access  Private/Admin
 */
export const getNextPurchaseNo = async (req, res, next) => {
  try {

    const purchases = await Purchase.find({}, { purchaseNo: 1 }).lean();

    let maxNum = 0;
    const prefix = 'PUR-';

    purchases.forEach((p) => {
      if (p.purchaseNo && p.purchaseNo.startsWith(prefix)) {
        const num = parseInt(p.purchaseNo.replace(prefix, ''), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    const nextPurchaseNo = `${prefix}${String(nextNum).padStart(4, '0')}`;

    return successResponse(res, 200, 'Next purchase number generated', { purchaseNo: nextPurchaseNo });
  } catch (error) {
    next(error);
  }
};
