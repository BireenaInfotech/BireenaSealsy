const mongoose = require('mongoose');
const Product = require('./backend/models/Product');
const User = require('./backend/models/User');

mongoose.connect('mongodb://localhost:27017/birre').then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    try {
        // Get all products with their addedBy info
        const products = await Product.find({})
            .populate('addedBy', 'username role')
            .populate('adminId', 'username role');
        
        console.log('=== ALL PRODUCTS ===\n');
        products.forEach(p => {
            console.log(`Product: ${p.name}`);
            console.log(`  AdminId: ${p.adminId ? (p.adminId.username || p.adminId) : 'MISSING'}`);
            console.log(`  AddedBy: ${p.addedBy ? (p.addedBy.username || p.addedBy) : 'MISSING'}`);
            console.log(`  AddedBy Role: ${p.addedBy ? p.addedBy.role : 'N/A'}`);
            console.log(`  Stock: ${p.stock}`);
            console.log('');
        });
        
        // Find shahil1 user
        const shahil = await User.findOne({ username: 'shahil1' });
        
        if (shahil) {
            console.log('=== SHAHIL1 USER ===');
            console.log(`Username: ${shahil.username}`);
            console.log(`Role: ${shahil.role}`);
            console.log(`ID: ${shahil._id}`);
            console.log(`AdminId: ${shahil.adminId}`);
            
            // What shahil SHOULD see (filter being applied)
            const shahilFilter = {
                adminId: shahil.adminId,
                addedBy: shahil._id,
                stock: { $gt: 0 }
            };
            
            const shahilProducts = await Product.find(shahilFilter);
            console.log(`\n=== PRODUCTS SHAHIL SHOULD SEE ===`);
            console.log(`Filter: adminId=${shahil.adminId}, addedBy=${shahil._id}, stock>0`);
            console.log(`Count: ${shahilProducts.length}`);
            shahilProducts.forEach(p => {
                console.log(`  - ${p.name} (Stock: ${p.stock})`);
            });
            
            // What's being shown (all shop products)
            const allShopProducts = await Product.find({
                adminId: shahil.adminId,
                stock: { $gt: 0 }
            });
            console.log(`\n=== ALL SHOP PRODUCTS (what's showing now) ===`);
            console.log(`Filter: adminId=${shahil.adminId}, stock>0`);
            console.log(`Count: ${allShopProducts.length}`);
            allShopProducts.forEach(p => {
                console.log(`  - ${p.name} (Stock: ${p.stock})`);
            });
            
        } else {
            console.log('❌ shahil1 user not found');
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});
