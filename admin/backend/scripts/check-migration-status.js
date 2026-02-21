/**
 * 🔍 CHECK MIGRATION STATUS
 * 
 * This script checks if your database needs migration to the multi-shop system.
 * It's a read-only script that doesn't make any changes.
 * 
 * USAGE: node backend/scripts/check-migration-status.js
 */

const mongoose = require('mongoose');

// ⚙️ CONFIGURATION
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/birre';

// Import all models
const User = require('../models/User');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Discount = require('../models/Discount');
const Batch = require('../models/Batch');
const DamageEntry = require('../models/DamageEntry');
const StockHistory = require('../models/StockHistory');
const StockTransfer = require('../models/StockTransfer');
const DailyInventoryReport = require('../models/DailyInventoryReport');

async function checkStatus() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');
        
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('         📊 MULTI-SHOP MIGRATION STATUS CHECK\n');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        // Check Users
        const admins = await User.find({ role: 'admin', adminId: null });
        const staffWithoutAdmin = await User.countDocuments({ role: 'staff', adminId: null });
        const staffWithAdmin = await User.countDocuments({ role: 'staff', adminId: { $ne: null } });
        
        console.log('👥 USERS:');
        console.log(`   Shop Owners (Admins): ${admins.length}`);
        admins.forEach(admin => {
            console.log(`      - ${admin.fullName} (@${admin.username})`);
            if (admin.shopName) console.log(`        Shop: ${admin.shopName}`);
        });
        console.log(`   Staff with adminId: ${staffWithAdmin} ✅`);
        console.log(`   Staff WITHOUT adminId: ${staffWithoutAdmin} ${staffWithoutAdmin > 0 ? '⚠️' : '✅'}`);
        
        // Check Products
        const productsWithoutAdmin = await Product.countDocuments({ adminId: null });
        const productsWithAdmin = await Product.countDocuments({ adminId: { $ne: null } });
        const totalProducts = productsWithoutAdmin + productsWithAdmin;
        
        console.log('\n📦 PRODUCTS:');
        console.log(`   Total: ${totalProducts}`);
        console.log(`   With adminId: ${productsWithAdmin} ✅`);
        console.log(`   WITHOUT adminId: ${productsWithoutAdmin} ${productsWithoutAdmin > 0 ? '⚠️' : '✅'}`);
        
        // Check Sales
        const salesWithoutAdmin = await Sale.countDocuments({ adminId: null });
        const salesWithAdmin = await Sale.countDocuments({ adminId: { $ne: null } });
        const totalSales = salesWithoutAdmin + salesWithAdmin;
        
        console.log('\n💰 SALES:');
        console.log(`   Total: ${totalSales}`);
        console.log(`   With adminId: ${salesWithAdmin} ✅`);
        console.log(`   WITHOUT adminId: ${salesWithoutAdmin} ${salesWithoutAdmin > 0 ? '⚠️' : '✅'}`);
        
        // Check Expenses
        const expensesWithoutAdmin = await Expense.countDocuments({ adminId: null });
        const expensesWithAdmin = await Expense.countDocuments({ adminId: { $ne: null } });
        const totalExpenses = expensesWithoutAdmin + expensesWithAdmin;
        
        console.log('\n💸 EXPENSES:');
        console.log(`   Total: ${totalExpenses}`);
        console.log(`   With adminId: ${expensesWithAdmin} ✅`);
        console.log(`   WITHOUT adminId: ${expensesWithoutAdmin} ${expensesWithoutAdmin > 0 ? '⚠️' : '✅'}`);
        
        // Check other collections
        const discountsWithoutAdmin = await Discount.countDocuments({ adminId: null });
        const batchesWithoutAdmin = await Batch.countDocuments({ adminId: null });
        const damageEntriesWithoutAdmin = await DamageEntry.countDocuments({ adminId: null });
        const stockHistoryWithoutAdmin = await StockHistory.countDocuments({ adminId: null });
        const stockTransfersWithoutAdmin = await StockTransfer.countDocuments({ adminId: null });
        const inventoryReportsWithoutAdmin = await DailyInventoryReport.countDocuments({ adminId: null });
        
        console.log('\n🏷️  OTHER DATA:');
        console.log(`   Discounts without adminId: ${discountsWithoutAdmin} ${discountsWithoutAdmin > 0 ? '⚠️' : '✅'}`);
        console.log(`   Batches without adminId: ${batchesWithoutAdmin} ${batchesWithoutAdmin > 0 ? '⚠️' : '✅'}`);
        console.log(`   Damage Entries without adminId: ${damageEntriesWithoutAdmin} ${damageEntriesWithoutAdmin > 0 ? '⚠️' : '✅'}`);
        console.log(`   Stock History without adminId: ${stockHistoryWithoutAdmin} ${stockHistoryWithoutAdmin > 0 ? '⚠️' : '✅'}`);
        console.log(`   Stock Transfers without adminId: ${stockTransfersWithoutAdmin} ${stockTransfersWithoutAdmin > 0 ? '⚠️' : '✅'}`);
        console.log(`   Inventory Reports without adminId: ${inventoryReportsWithoutAdmin} ${inventoryReportsWithoutAdmin > 0 ? '⚠️' : '✅'}`);
        
        // Summary
        const needsMigration = productsWithoutAdmin > 0 || 
                             salesWithoutAdmin > 0 || 
                             expensesWithoutAdmin > 0 ||
                             staffWithoutAdmin > 0 ||
                             discountsWithoutAdmin > 0 ||
                             batchesWithoutAdmin > 0 ||
                             damageEntriesWithoutAdmin > 0 ||
                             stockHistoryWithoutAdmin > 0 ||
                             stockTransfersWithoutAdmin > 0 ||
                             inventoryReportsWithoutAdmin > 0;
        
        console.log('\n═══════════════════════════════════════════════════════════\n');
        
        if (needsMigration) {
            console.log('⚠️  MIGRATION REQUIRED!\n');
            console.log('Your database has data without adminId. You need to:');
            console.log('1. Run: node backend/scripts/migrate-existing-data.js');
            console.log('   OR');
            console.log('2. Delete existing data and start fresh\n');
        } else {
            console.log('✅ MIGRATION COMPLETE!\n');
            console.log('All data has been properly migrated to the multi-shop system.');
            console.log('Your application is ready to use!\n');
        }
        
        console.log('═══════════════════════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the check
checkStatus();
