import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI || (!mongoURI.includes('mongodb+srv') && process.env.VERCEL)) {
    console.warn('⚠️ Skipping MongoDB connection: No remote URI provided (or running on Vercel without Atlas)');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
  }
};

export default connectDB;
