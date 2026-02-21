const mongoose = require('mongoose');
const Product = require('./backend/models/Product');
const User = require('./backend/models/User');

mongoose.connect('mongodb://localhost:27017/birre').then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    try {
        // Find products without addedBy
        const productsWithoutAddedBy = await Product.find({
            $or: [
                { addedBy: { $exists: false } },
                { addedBy: null }
            ]
        });
        
        console.log(`Found ${productsWithoutAddedBy.length} products without addedBy field\n`);
        
        if (productsWithoutAddedBy.length === 0) {
            console.log('✅ All products have addedBy field!');
            process.exit(0);
        }
        
        let updated = 0;
        let errors = 0;
        
        for (const product of productsWithoutAddedBy) {
            try {
                // Get the admin for this product's shop
                const admin = await User.findOne({ 
                    _id: product.adminId,
                    role: 'admin' 
                });
                
                if (admin) {
                    product.addedBy = admin._id;
                    await product.save();
                    console.log(`✅ Updated "${product.name}" - addedBy set to admin: ${admin.username}`);
                    updated++;
                } else {
                    console.log(`⚠️ Could not find admin for product: ${product.name}`);
                    errors++;
                }
            } catch (err) {
                console.error(`❌ Error updating ${product.name}:`, err.message);
                errors++;
            }
        }
        
        console.log('\n=== Summary ===');
        console.log(`Total: ${productsWithoutAddedBy.length}`);
        console.log(`✅ Updated: ${updated}`);
        console.log(`❌ Errors: ${errors}`);
        
        process.exit(0);
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});
