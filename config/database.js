import mongoose from 'mongoose';

const connectDB = async () => {
  try {

    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chocolateapp';

    const conn = await mongoose.connect(mongoURI);

    const connectionType = mongoURI.includes('mongodb+srv') || mongoURI.includes('mongodb.net')
      ? 'MongoDB Atlas (Cloud)'
      : 'MongoDB Local';

  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error(`💡 Make sure MongoDB is running (if using local) or check your connection string (if using Atlas)`);
  }
};

export default connectDB;
