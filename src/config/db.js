import mongoose from 'mongoose';

const connectDB = async () => {
  let attempts = 0;
  while (true) {
    try {
      attempts++;
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`❌ MongoDB Connection Attempt #${attempts} Failed: ${error.message}`);
      console.log(`💡 Tip: If your IP changed, ensure your current IP or '0.0.0.0/0' is whitelisted in MongoDB Atlas Network Access.`);
      console.log(`🔄 Retrying in 5 seconds...`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
};

export default connectDB;
