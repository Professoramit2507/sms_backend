import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure_sms');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Drop stale legacy uid index if present in existing collections
    try {
      await conn.connection.collection('users').dropIndex('uid_1');
      console.log('🧹 Cleaned up legacy uid_1 index on users collection');
    } catch {
      // index already dropped or collection doesn't exist
    }
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.warn('⚠️  Note: Make sure your MongoDB service is running or check your MONGO_URI in .env file.');
  }
};

export default connectDB;
