import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      required: [true, 'Please provide brand name'],
      unique: true,
      trim: true,
      maxlength: [150, 'Brand name cannot exceed 150 characters'],
    },

    brandImage: {
      type: String,
      default: '',
      maxlength: [500, 'Brand image URL cannot exceed 500 characters'],
    },

    countryOfOrigin: {
      type: String,
      trim: true,
      maxlength: [100, 'Country of origin cannot exceed 100 characters'],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    updatedBy: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt
  }
);

const Brand = mongoose.model('Brand', brandSchema);

export default Brand;