import dotenv from 'dotenv';
import connectDB from './config/database.js';
import Admin from './models/Admin.js';

dotenv.config();

const createAdmin = async () => {
  try {
    await connectDB();

    const { name, email, mobile, password } = process.argv.slice(2).reduce((acc, arg, index, arr) => {
      if (arg.startsWith('--')) {
        const nextValue = arr[index + 1];
        if (nextValue && !nextValue.startsWith('--')) {
          acc[arg.replace('--', '')] = nextValue;
        }
      }
      return acc;
    }, {});

    if (!name || !email || !password || !mobile) {
      console.error('❌ Usage: node create-admin.js --name "Admin Name" --email "admin@example.com" --mobile "1234567890" --password "password123"');
      console.error('❌ All fields (name, email, mobile, password) are required');
      process.exit(1);
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      console.error('❌ Invalid mobile number format. Must be exactly 10 digits.');
      process.exit(1);
    }

    const existingAdmin = await Admin.findOne({ 
      $or: [{ email }, { mobile }]
    });
    
    if (existingAdmin) {
      console.error(`❌ Admin with email ${email} or mobile ${mobile} already exists`);
      process.exit(1);
    }

    const adminData = {
      name,
      email,
      mobile,
      password,
      role: 'admin', // Default role, can be 'admin' or 'superadmin'
    };

    const admin = await Admin.create(adminData);

    if (admin.mobile) {
     
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();