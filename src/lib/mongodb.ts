
import mongoose from 'mongoose';

// Import all models to ensure they are registered with Mongoose
import '@/models/Team';
import '@/models/Match';
import '@/models/Prediction';
import '@/models/History';


const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGO_URI environment variable inside .env.local'
  );
}

if (MONGODB_URI === 'YOUR_MONGODB_CONNECTION_STRING_HERE') {
    throw new Error(
        'The MONGO_URI is still set to the placeholder value. Please replace it with your actual connection string in .env.local'
    );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;

