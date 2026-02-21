/**
 * FIX: Drop old global billNumber unique index and create new compound index
 * This allows each admin/shop to have their own bill number sequence
 * 
 * Run this ONCE after deploying the model changes:
 * node scripts/fix-bill-number-index.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function fixBillNumberIndex() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const salesCollection = db.collection('sales');

        // Get existing indexes
        const indexes = await salesCollection.indexes();
        console.log('\n📋 Current indexes:');
        indexes.forEach(idx => {
            console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
        });

        // Drop the old global billNumber unique index
        console.log('\n🔧 Dropping old billNumber_1 index...');
        try {
            await salesCollection.dropIndex('billNumber_1');
            console.log('✅ Old index dropped successfully');
        } catch (error) {
            if (error.code === 27) {
                console.log('ℹ️  Index already doesn\'t exist (safe to ignore)');
            } else {
                throw error;
            }
        }

        // Create new compound unique index (billNumber + adminId)
        console.log('\n🔧 Creating new compound index { billNumber: 1, adminId: 1 }...');
        await salesCollection.createIndex(
            { billNumber: 1, adminId: 1 },
            { unique: true, name: 'billNumber_1_adminId_1' }
        );
        console.log('✅ New compound index created successfully');

        // Verify final indexes
        const finalIndexes = await salesCollection.indexes();
        console.log('\n📋 Final indexes:');
        finalIndexes.forEach(idx => {
            console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
        });

        console.log('\n✅ SUCCESS! Bill numbers are now unique per admin/shop.');
        console.log('Each shop can now have: BILL-0001, BILL-0002, etc.');
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

fixBillNumberIndex();
