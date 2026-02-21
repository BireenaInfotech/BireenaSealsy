const mongoose = require('mongoose');
const StockHistory = require('./backend/models/StockHistory');
const Product = require('./backend/models/Product');
const User = require('./backend/models/User');

mongoose.connect('mongodb://localhost:27017/birre', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    try {
        // Get all stock history records without adminId
        const records = await StockHistory.find({ 
            $or: [
                { adminId: { $exists: false } },
                { adminId: null }
            ]
        });
        
        console.log(`Found ${records.length} StockHistory records without adminId\n`);
        
        let updated = 0;
        let skipped = 0;
        let errors = 0;
        
        for (const record of records) {
            try {
                // Try to get adminId from the product
                if (record.productId) {
                    const product = await Product.findById(record.productId).select('adminId');
                    if (product && product.adminId) {
                        record.adminId = product.adminId;
                        await record.save();
                        updated++;
                        console.log(`✅ Updated record ${record._id} with adminId from product: ${product.adminId}`);
                        continue;
                    }
                }
                
                // Try to get adminId from performedBy user
                if (record.performedBy) {
                    const user = await User.findById(record.performedBy).select('role adminId');
                    if (user) {
                        const adminId = user.role === 'admin' ? user._id : user.adminId;
                        if (adminId) {
                            record.adminId = adminId;
                            await record.save();
                            updated++;
                            console.log(`✅ Updated record ${record._id} with adminId from user: ${adminId}`);
                            continue;
                        }
                    }
                }
                
                // Could not determine adminId
                console.log(`⚠️ Could not determine adminId for record ${record._id}`);
                skipped++;
                
            } catch (err) {
                console.error(`❌ Error updating record ${record._id}:`, err.message);
                errors++;
            }
        }
        
        console.log('\n=== Migration Summary ===');
        console.log(`Total records: ${records.length}`);
        console.log(`✅ Updated: ${updated}`);
        console.log(`⚠️ Skipped: ${skipped}`);
        console.log(`❌ Errors: ${errors}`);
        
        // Show sample of updated records
        console.log('\n=== Sample Updated Records ===');
        const updated_records = await StockHistory.find({ adminId: { $exists: true } })
            .limit(5)
            .populate('productId', 'name')
            .populate('performedBy', 'username');
            
        updated_records.forEach(rec => {
            console.log(`Product: ${rec.productName || 'N/A'} | Action: ${rec.action} | AdminId: ${rec.adminId}`);
        });
        
        process.exit(0);
        
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});
