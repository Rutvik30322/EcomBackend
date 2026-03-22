import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    purchaseRate: {
      type: Number,
      required: [true, 'Purchase Rate is required'],
      min: [0, 'Purchase Rate cannot be negative'],
    },
    mrp: {
      type: Number,
      required: [true, 'MRP is required'],
      min: [0, 'MRP cannot be negative'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry Date is required'],
    },
    batchNo: {
      type: String,
      required: [true, 'Batch No is required'],
      trim: true,
    },
  },
  { _id: true }
);

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNo: {
      type: String,
      required: [true, 'Purchase No is required'],
      unique: true,
      trim: true,
      index: true,
    },
    supplierName: {
      type: String,
      required: [true, 'Supplier Name is required'],
      trim: true,
    },
    invoiceNo: {
      type: String,
      required: [true, 'Invoice No is required'],
      trim: true,
    },
    invoiceDate: {
      type: Date,
      required: [true, 'Invoice Date is required'],
    },
    items: [purchaseItemSchema],
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total Amount cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

purchaseSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((total, item) => {
      return total + item.purchaseRate * item.quantity;
    }, 0);
  }
  next();
});

const Purchase = mongoose.model('Purchase', purchaseSchema);

export default Purchase;
