const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
    if (isConnected) {
        console.log('✅ Using existing MongoDB connection');
        return;
    }

    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        console.log('🔄 Connecting to MongoDB...');
        
        const db = await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,  // Must be < Vercel function timeout (10s)
            socketTimeoutMS: 8000,
            connectTimeoutMS: 5000,           // Must be < Vercel function timeout (10s)
            maxPoolSize: 5,                   // Lower pool for serverless
            minPoolSize: 0,
            retryWrites: true,
            retryReads: true,
            w: 'majority',
            // Important for serverless - don't buffer, fail fast
            bufferCommands: false
        });

        isConnected = db.connections[0].readyState === 1;
        console.log('✅ MongoDB connected successfully');
        console.log('Database:', mongoose.connection.db.databaseName);
        
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        isConnected = false;
        throw error;
    }
};

// Handle connection events
mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose connected to DB');
    isConnected = true;
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
    isConnected = false;
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ Mongoose disconnected');
    isConnected = false;
});

module.exports = connectDB;
