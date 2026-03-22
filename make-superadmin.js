import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

dotenv.config();

const makeSuperAdmin = async () => {
  try {

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chocolateapp');

    const mobile = '1234512346';

    const admin = await Admin.findOne({ mobile });

    if (!admin) {

      const newAdmin = await Admin.create({
        name: 'Super Admin',
        email: `superadmin${mobile}@chocolateapp.com`,
        mobile: mobile,
        password: 'SuperAdmin@123456', // Default password - should be changed
        role: 'superadmin',
        isActive: true,
      });

    } else {

      admin.role = 'superadmin';
      admin.isActive = true;
      await admin.save();

    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

makeSuperAdmin();
