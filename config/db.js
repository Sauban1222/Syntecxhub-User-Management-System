import mongoose from 'mongoose';

let connectionPromise;

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI environment variable is required');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    }).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  try {
    await connectionPromise;
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection failed', {
      name: error?.name || 'UnknownError',
      code: error?.code,
    });
    throw error;
  }
}
