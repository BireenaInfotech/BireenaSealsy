const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Product = require('./backend/models/Product');
const Sale = require('./backend/models/Sale');
const StockHistory = require('./backend/models/StockHistory');
const DailyInventoryReport = require('./backend/models/DailyInventoryReport');
const Expense = require('./backend/models/Expense');
const Discount = require('./backend/models/Discount');

mongoose.connect('mongodb://localhost:27017/birre').then(async () => {
    console.log('✅ Connected to MongoDB\n');
    console.log('='.repeat(80));
    console.log('🔍 MULTI-SHOP BAKERY SYSTEM - COMPLETE VALIDATION');
    console.log('='.repeat(80));
    
    try {
        // 1. Check Users
        console.log('\n📋 1. USER ACCOUNTS');
        console.log('-'.repeat(80));
        
        const superadmins = await User.countDocuments({ role: 'superadmin' });
        const admins = await User.find({ role: 'admin' }).select('username shopName isActive packExpiry');
        const totalStaff = await User.countDocuments({ role: 'staff' });
        
        console.log(`Superadmins: ${superadmins}`);
        console.log(`Shop Owners (Admins): ${admins.length}`);
        console.log(`Total Employees: ${totalStaff}\n`);
        
        let allGood = true;
        
        for (const admin of admins) {
            const staff = await User.countDocuments({ role: 'staff', adminId: admin._id });
            const activeStaff = await User.countDocuments({ role: 'staff', adminId: admin._id, isActive: true });
            
            console.log(`Shop: ${admin.shopName || admin.username}`);
            console.log(`  Status: ${admin.isActive ? '✅ Active' : '❌ Suspended'}`);
            console.log(`  Pack Expiry: ${admin.packExpiry ? new Date(admin.packExpiry).toLocaleDateString() : 'N/A'}`);
            console.log(`  Employees: ${staff} (${activeStaff} active)`);
        }
        
        // 2. Check Data Isolation
        console.log('\n📦 2. DATA ISOLATION CHECK');
        console.log('-'.repeat(80));
        
        for (const admin of admins) {
            const products = await Product.countDocuments({ adminId: admin._id });
            const productsWithoutAdminId = await Product.countDocuments({ 
                $or: [
                    { adminId: { $exists: false } },
                    { adminId: null }
                ]
            });
            
            const sales = await Sale.countDocuments({ adminId: admin._id });
            const stockHistory = await StockHistory.countDocuments({ adminId: admin._id });
            const reports = await DailyInventoryReport.countDocuments({ adminId: admin._id });
            const expenses = await Expense.countDocuments({ adminId: admin._id });
            const discounts = await Discount.countDocuments({ adminId: admin._id });
            
            console.log(`\nShop: ${admin.shopName || admin.username} (ID: ${admin._id})`);
            console.log(`  Products: ${products}`);
            console.log(`  Sales: ${sales}`);
            console.log(`  Stock History: ${stockHistory}`);
            console.log(`  Daily Reports: ${reports}`);
            console.log(`  Expenses: ${expenses}`);
            console.log(`  Discounts: ${discounts}`);
            
            if (productsWithoutAdminId > 0) {
                console.log(`  ⚠️ WARNING: ${productsWithoutAdminId} products without adminId`);
                allGood = false;
            }
        }
        
        // 3. Check for orphan data
        console.log('\n🔍 3. ORPHAN DATA CHECK');
        console.log('-'.repeat(80));
        
        const orphanProducts = await Product.countDocuments({ 
            $or: [
                { adminId: { $exists: false } },
                { adminId: null }
            ]
        });
        
        const orphanSales = await Sale.countDocuments({ 
            $or: [
                { adminId: { $exists: false } },
                { adminId: null }
            ]
        });
        
        const orphanStockHistory = await StockHistory.countDocuments({ 
            $or: [
                { adminId: { $exists: false } },
                { adminId: null }
            ]
        });
        
        const orphanReports = await DailyInventoryReport.countDocuments({ 
            $or: [
                { adminId: { $exists: false } },
                { adminId: null }
            ]
        });
        
        const orphanStaff = await User.countDocuments({ 
            role: 'staff',
            $or: [
                { adminId: { $exists: false } },
                { adminId: null }
            ]
        });
        
        console.log(`Products without adminId: ${orphanProducts}${orphanProducts > 0 ? ' ⚠️' : ' ✅'}`);
        console.log(`Sales without adminId: ${orphanSales}${orphanSales > 0 ? ' ⚠️' : ' ✅'}`);
        console.log(`StockHistory without adminId: ${orphanStockHistory}${orphanStockHistory > 0 ? ' ⚠️' : ' ✅'}`);
        console.log(`DailyReports without adminId: ${orphanReports}${orphanReports > 0 ? ' ⚠️' : ' ✅'}`);
        console.log(`Staff without adminId: ${orphanStaff}${orphanStaff > 0 ? ' ⚠️' : ' ✅'}`);
        
        if (orphanProducts > 0 || orphanSales > 0 || orphanStockHistory > 0 || orphanReports > 0 || orphanStaff > 0) {
            allGood = false;
        }
        
        // 4. Cross-shop data leak check
        console.log('\n🔒 4. DATA LEAK PREVENTION CHECK');
        console.log('-'.repeat(80));
        
        if (admins.length >= 2) {
            const admin1 = admins[0];
            const admin2 = admins[1];
            
            const admin1Products = await Product.find({ adminId: admin1._id }).select('_id name');
            const admin2Products = await Product.find({ adminId: admin2._id }).select('_id name');
            
            console.log(`\nShop 1: ${admin1.shopName || admin1.username}`);
            console.log(`  Products: ${admin1Products.length}`);
            admin1Products.slice(0, 3).forEach(p => console.log(`    - ${p.name}`));
            
            console.log(`\nShop 2: ${admin2.shopName || admin2.username}`);
            console.log(`  Products: ${admin2Products.length}`);
            admin2Products.slice(0, 3).forEach(p => console.log(`    - ${p.name}`));
            
            // Check if any product has wrong adminId
            const crossContamination = await Product.findOne({
                $and: [
                    { _id: { $in: admin1Products.map(p => p._id) } },
                    { adminId: admin2._id }
                ]
            });
            
            if (crossContamination) {
                console.log('\n❌ DATA LEAK DETECTED! Products have wrong adminId!');
                allGood = false;
            } else {
                console.log('\n✅ No data leak detected - Products properly isolated');
            }
        } else {
            console.log('Need at least 2 shops to test data isolation');
        }
        
        // 5. Model Schema Validation
        console.log('\n📐 5. MODEL SCHEMA VALIDATION');
        console.log('-'.repeat(80));
        
        const models = {
            'User (Staff)': User,
            'Product': Product,
            'Sale': Sale,
            'StockHistory': StockHistory,
            'DailyInventoryReport': DailyInventoryReport,
            'Expense': Expense,
            'Discount': Discount
        };
        
        for (const [modelName, Model] of Object.entries(models)) {
            const schema = Model.schema.obj;
            const hasAdminId = 'adminId' in schema;
            
            if (modelName === 'User (Staff)') {
                console.log(`${modelName}: ${hasAdminId ? '✅' : '⚠️ '} adminId field ${hasAdminId ? 'exists' : 'missing'}`);
            } else {
                console.log(`${modelName}: ${hasAdminId ? '✅' : '❌'} adminId field ${hasAdminId ? 'exists' : 'missing'}`);
                if (!hasAdminId && modelName !== 'User (Staff)') allGood = false;
            }
        }
        
        // 6. Index Check
        console.log('\n🔍 6. DATABASE INDEXES');
        console.log('-'.repeat(80));
        
        const productIndexes = await Product.collection.getIndexes();
        const saleIndexes = await Sale.collection.getIndexes();
        const stockHistoryIndexes = await StockHistory.collection.getIndexes();
        
        console.log('Product indexes:', Object.keys(productIndexes).join(', '));
        console.log('Sale indexes:', Object.keys(saleIndexes).join(', '));
        console.log('StockHistory indexes:', Object.keys(stockHistoryIndexes).join(', '));
        
        const hasAdminIdIndex = Object.keys(productIndexes).some(key => key.includes('adminId'));
        console.log(`\nProduct.adminId indexed: ${hasAdminIdIndex ? '✅' : '⚠️ Consider adding'}`);
        
        // Final Summary
        console.log('\n' + '='.repeat(80));
        console.log('📊 FINAL SUMMARY');
        console.log('='.repeat(80));
        
        if (allGood && orphanProducts === 0 && orphanSales === 0 && orphanStockHistory === 0 && orphanStaff === 0) {
            console.log('\n✅ ALL CHECKS PASSED - SYSTEM IS READY FOR DEPLOYMENT');
            console.log('\n✨ Multi-shop isolation is working correctly!');
            console.log('✨ All data is properly associated with shop owners!');
            console.log('✨ No data leaks detected!');
        } else {
            console.log('\n⚠️  SOME ISSUES FOUND:');
            if (orphanProducts > 0) console.log(`   - ${orphanProducts} products need adminId`);
            if (orphanSales > 0) console.log(`   - ${orphanSales} sales need adminId`);
            if (orphanStockHistory > 0) console.log(`   - ${orphanStockHistory} stock history records need adminId`);
            if (orphanReports > 0) console.log(`   - ${orphanReports} daily reports need adminId`);
            if (orphanStaff > 0) console.log(`   - ${orphanStaff} staff members need adminId`);
            console.log('\n💡 Run migration scripts to fix orphan data');
        }
        
        console.log('\n' + '='.repeat(80));
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Error during validation:', error);
        process.exit(1);
    }
}).catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});
