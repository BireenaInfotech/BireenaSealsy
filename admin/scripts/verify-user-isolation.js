const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Product = require('./backend/models/Product');
const Sale = require('./backend/models/Sale');

mongoose.connect('mongodb://localhost:27017/birre').then(async () => {
    console.log('✅ Connected to MongoDB\n');
    console.log('='.repeat(80));
    console.log('🔍 USER-LEVEL DATA ISOLATION CHECK');
    console.log('='.repeat(80));
    
    try {
        // Find shahil1
        const shahil = await User.findOne({ username: 'shahil1' });
        
        if (!shahil) {
            console.log('❌ User shahil1 not found');
            process.exit(1);
        }
        
        console.log('\n📋 USER INFO');
        console.log('-'.repeat(80));
        console.log(`Username: ${shahil.username}`);
        console.log(`Role: ${shahil.role}`);
        console.log(`AdminId: ${shahil.adminId}`);
        console.log(`User ID: ${shahil._id}`);
        
        // Find admin
        const admin = await User.findById(shahil.adminId);
        console.log(`\nShop Owner: ${admin ? admin.username : 'Not found'}`);
        console.log(`Shop Name: ${admin ? (admin.shopName || 'N/A') : 'N/A'}`);
        
        // Check products
        console.log('\n📦 PRODUCTS CHECK');
        console.log('-'.repeat(80));
        
        const allShopProducts = await Product.find({ adminId: shahil.adminId });
        const shahilProducts = await Product.find({ 
            adminId: shahil.adminId,
            addedBy: shahil._id 
        });
        const adminProducts = await Product.find({ 
            adminId: shahil.adminId,
            addedBy: admin._id 
        });
        
        console.log(`Total products in shop: ${allShopProducts.length}`);
        console.log(`\nShahil's products: ${shahilProducts.length}`);
        shahilProducts.forEach(p => {
            console.log(`  - ${p.name} (Stock: ${p.stock}) addedBy: ${p.addedBy}`);
        });
        
        console.log(`\nAdmin's products: ${adminProducts.length}`);
        adminProducts.forEach(p => {
            console.log(`  - ${p.name} (Stock: ${p.stock}) addedBy: ${p.addedBy}`);
        });
        
        const productsWithoutAddedBy = await Product.countDocuments({
            adminId: shahil.adminId,
            $or: [
                { addedBy: { $exists: false } },
                { addedBy: null }
            ]
        });
        
        if (productsWithoutAddedBy > 0) {
            console.log(`\n⚠️ WARNING: ${productsWithoutAddedBy} products without addedBy field!`);
        }
        
        // Check sales
        console.log('\n💰 SALES CHECK');
        console.log('-'.repeat(80));
        
        const allShopSales = await Sale.find({ adminId: shahil.adminId });
        const shahilSales = await Sale.find({ 
            adminId: shahil.adminId,
            createdBy: shahil._id 
        });
        const adminSales = await Sale.find({ 
            adminId: shahil.adminId,
            createdBy: admin._id 
        });
        
        console.log(`Total sales in shop: ${allShopSales.length}`);
        console.log(`Shahil's sales: ${shahilSales.length}`);
        console.log(`Admin's sales: ${adminSales.length}`);
        
        const salesWithoutCreatedBy = await Sale.countDocuments({
            adminId: shahil.adminId,
            $or: [
                { createdBy: { $exists: false } },
                { createdBy: null }
            ]
        });
        
        if (salesWithoutCreatedBy > 0) {
            console.log(`\n⚠️ WARNING: ${salesWithoutCreatedBy} sales without createdBy field!`);
        }
        
        // Summary
        console.log('\n' + '='.repeat(80));
        console.log('📊 SUMMARY');
        console.log('='.repeat(80));
        
        console.log('\n✅ What Shahil SHOULD see:');
        console.log(`   - Inventory: ${shahilProducts.length} products (only his)`);
        console.log(`   - Sales: ${shahilSales.length} sales (only his)`);
        
        console.log('\n✅ What Admin SHOULD see:');
        console.log(`   - Inventory: ${allShopProducts.length} products (all)`);
        console.log(`   - Sales: ${allShopSales.length} sales (all)`);
        console.log(`   - Can filter to see: Shahil: ${shahilProducts.length} products, ${shahilSales.length} sales`);
        
        if (productsWithoutAddedBy > 0 || salesWithoutCreatedBy > 0) {
            console.log('\n⚠️  ACTION NEEDED:');
            if (productsWithoutAddedBy > 0) {
                console.log(`   - Fix ${productsWithoutAddedBy} products without addedBy`);
            }
            if (salesWithoutCreatedBy > 0) {
                console.log(`   - Fix ${salesWithoutCreatedBy} sales without createdBy`);
            }
            console.log('\n💡 These old records need addedBy/createdBy fields to show correctly');
        } else {
            console.log('\n✅ All data has proper user tracking!');
        }
        
        console.log('\n' + '='.repeat(80));
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}).catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});
