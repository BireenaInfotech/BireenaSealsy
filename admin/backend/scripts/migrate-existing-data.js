/**
 * 🔄 DATA MIGRATION SCRIPT FOR MULTI-SHOP SYSTEM
 * 
 * This script migrates existing data to the new multi-shop architecture.
 * It assigns an adminId to all existing records.
 * 
 * USAGE:
 * 1. Make sure MongoDB is running
 * 2. Update MONGO_URI in this file
 * 3. Run: node backend/scripts/migrate-existing-data.js
 */

const mongoose = require('mongoose');
const readline = require('readline');

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

// Readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Display current database status
 */
async function displayStatus() {
    console.log('\n📊 CURRENT DATABASE STATUS:\n');
    
    const admins = await User.find({ role: 'admin', adminId: null });
    const staffWithoutAdmin = await User.find({ role: 'staff', adminId: null });
    const staffWithAdmin = await User.find({ role: 'staff', adminId: { $ne: null } });
    
    const productsWithoutAdmin = await Product.countDocuments({ adminId: null });
    const productsWithAdmin = await Product.countDocuments({ adminId: { $ne: null } });
    
    const salesWithoutAdmin = await Sale.countDocuments({ adminId: null });
    const salesWithAdmin = await Sale.countDocuments({ adminId: { $ne: null } });
    
    const expensesWithoutAdmin = await Expense.countDocuments({ adminId: null });
    const expensesWithAdmin = await Expense.countDocuments({ adminId: { $ne: null } });
    
    const discountsWithoutAdmin = await Discount.countDocuments({ adminId: null });
    const batchesWithoutAdmin = await Batch.countDocuments({ adminId: null });
    const damageEntriesWithoutAdmin = await DamageEntry.countDocuments({ adminId: null });
    const stockHistoryWithoutAdmin = await StockHistory.countDocuments({ adminId: null });
    const stockTransfersWithoutAdmin = await StockTransfer.countDocuments({ adminId: null });
    const inventoryReportsWithoutAdmin = await DailyInventoryReport.countDocuments({ adminId: null });
    
    console.log('👥 USERS:');
    console.log(`   - Admins (Shop Owners): ${admins.length}`);
    console.log(`   - Staff with adminId: ${staffWithAdmin.length}`);
    console.log(`   - Staff WITHOUT adminId: ${staffWithoutAdmin.length} ⚠️`);
    
    console.log('\n📦 PRODUCTS:');
    console.log(`   - With adminId: ${productsWithAdmin}`);
    console.log(`   - WITHOUT adminId: ${productsWithoutAdmin} ⚠️`);
    
    console.log('\n💰 SALES:');
    console.log(`   - With adminId: ${salesWithAdmin}`);
    console.log(`   - WITHOUT adminId: ${salesWithoutAdmin} ⚠️`);
    
    console.log('\n💸 EXPENSES:');
    console.log(`   - With adminId: ${expensesWithAdmin}`);
    console.log(`   - WITHOUT adminId: ${expensesWithoutAdmin} ⚠️`);
    
    console.log('\n🏷️ OTHER DATA:');
    console.log(`   - Discounts without adminId: ${discountsWithoutAdmin} ⚠️`);
    console.log(`   - Batches without adminId: ${batchesWithoutAdmin} ⚠️`);
    console.log(`   - Damage Entries without adminId: ${damageEntriesWithoutAdmin} ⚠️`);
    console.log(`   - Stock History without adminId: ${stockHistoryWithoutAdmin} ⚠️`);
    console.log(`   - Stock Transfers without adminId: ${stockTransfersWithoutAdmin} ⚠️`);
    console.log(`   - Inventory Reports without adminId: ${inventoryReportsWithoutAdmin} ⚠️`);
    
    return {
        admins,
        needsMigration: productsWithoutAdmin > 0 || 
                       salesWithoutAdmin > 0 || 
                       expensesWithoutAdmin > 0 ||
                       staffWithoutAdmin.length > 0 ||
                       discountsWithoutAdmin > 0 ||
                       batchesWithoutAdmin > 0 ||
                       damageEntriesWithoutAdmin > 0 ||
                       stockHistoryWithoutAdmin > 0 ||
                       stockTransfersWithoutAdmin > 0 ||
                       inventoryReportsWithoutAdmin > 0
    };
}

/**
 * Display available admins
 */
function displayAdmins(admins) {
    console.log('\n📋 AVAILABLE SHOP OWNERS (ADMINS):\n');
    
    if (admins.length === 0) {
        console.log('❌ No shop owners found!');
        console.log('   Please create a shop owner first using the superadmin panel:');
        console.log('   http://localhost:3000/.hidden/login\n');
        return false;
    }
    
    admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.fullName}`);
        console.log(`   Username: ${admin.username}`);
        if (admin.shopName) console.log(`   Shop: ${admin.shopName}`);
        console.log(`   ID: ${admin._id}`);
        console.log('');
    });
    
    return true;
}

/**
 * Migrate all data to a specific admin
 */
async function migrateToAdmin(adminId) {
    console.log('\n🔄 Starting migration...\n');
    
    let totalUpdated = 0;
    
    // Migrate Users (Staff)
    const staffResult = await User.updateMany(
        { role: 'staff', adminId: null },
        { $set: { adminId } }
    );
    console.log(`✅ Updated ${staffResult.modifiedCount} staff members`);
    totalUpdated += staffResult.modifiedCount;
    
    // Migrate Products
    const productResult = await Product.updateMany(
        { adminId: null },
        { $set: { adminId } }
    );
    console.log(`✅ Updated ${productResult.modifiedCount} products`);
    totalUpdated += productResult.modifiedCount;
    
    // Migrate Sales
    const saleResult = await Sale.updateMany(
        { adminId: null },
        { $set: { adminId } }
    );
    console.log(`✅ Updated ${saleResult.modifiedCount} sales`);
    totalUpdated += saleResult.modifiedCount;
    
    // Migrate Expenses
    const expenseResult = await Expense.updateMany(
        { adminId: null },
        { $set: { adminId } }
    );
    console.log(`✅ Updated ${expenseResult.modifiedCount} expenses`);
    totalUpdated += expenseResult.modifiedCount;
    
    // Migrate Discounts
    const discountResult = await Discount.updateMany(
        { adminId: null },
        { $set: { adminId } }
    );
    console.log(`✅ Updated ${discountResult.modifiedCount} discounts`);
    totalUpdated += discountResult.modifiedCount;
    
    // Migrate Batches
    const batchResult = await Batch.updateMany(
        { adminId: null },
        { $set: { adminId } }
    );
    console.log(`✅ Updated ${batchResult.modifiedCount} batches`);
    totalUpdated += batchResult.modifiedCount;
    
    // Migrate Damage Entries
    const damageResult = await DamageEntry.updateMany(
        { adminId: null },
        { $set: { adminId } }
    );
    console.log(`✅ Updated ${damageResult.modifiedCount} damage entries`);
    totalUpdated += damageResult.modifiedCount;
    
    // Migrate Stock History
    const stockHistoryResult = await StockHistory.updateMany(
        { adminId: null },
        { $set: { adminId } }
    );
    console.log(`✅ Updated ${stockHistoryResult.modifiedCount} stock history records`);
    totalUpdated += stockHistoryResult.modifiedCount;
    
    // Migrate Stock Transfers
    const stockTransferResult = await StockTransfer.updateMany(
        { adminId: null },
        { $set: { adminId } }
    );
    console.log(`✅ Updated ${stockTransferResult.modifiedCount} stock transfers`);
    totalUpdated += stockTransferResult.modifiedCount;
    
    // Migrate Daily Inventory Reports
    const inventoryReportResult = await DailyInventoryReport.updateMany(
        { adminId: null },
        { $set: { adminId } }
    );
    console.log(`✅ Updated ${inventoryReportResult.modifiedCount} inventory reports`);
    totalUpdated += inventoryReportResult.modifiedCount;
    
    console.log(`\n✅ MIGRATION COMPLETE! Total records updated: ${totalUpdated}`);
}

/**
 * Delete all data (clean slate option)
 */
async function deleteAllData() {
    const confirm = await question('\n⚠️  Are you ABSOLUTELY sure you want to delete ALL data? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
        console.log('❌ Deletion cancelled');
        return false;
    }
    
    const doubleConfirm = await question('⚠️  Type "DELETE ALL" to confirm: ');
    
    if (doubleConfirm !== 'DELETE ALL') {
        console.log('❌ Deletion cancelled');
        return false;
    }
    
    console.log('\n🗑️  Deleting all data...\n');
    
    await User.deleteMany({ role: 'staff' });
    console.log('✅ Deleted all staff members');
    
    await Product.deleteMany({});
    console.log('✅ Deleted all products');
    
    await Sale.deleteMany({});
    console.log('✅ Deleted all sales');
    
    await Expense.deleteMany({});
    console.log('✅ Deleted all expenses');
    
    await Discount.deleteMany({});
    console.log('✅ Deleted all discounts');
    
    await Batch.deleteMany({});
    console.log('✅ Deleted all batches');
    
    await DamageEntry.deleteMany({});
    console.log('✅ Deleted all damage entries');
    
    await StockHistory.deleteMany({});
    console.log('✅ Deleted all stock history');
    
    await StockTransfer.deleteMany({});
    console.log('✅ Deleted all stock transfers');
    
    await DailyInventoryReport.deleteMany({});
    console.log('✅ Deleted all inventory reports');
    
    console.log('\n✅ All data deleted! You can now start fresh.\n');
    
    return true;
}

/**
 * Main execution
 */
async function main() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');
        
        // Display current status
        const { admins, needsMigration } = await displayStatus();
        
        if (!needsMigration) {
            console.log('\n✅ No migration needed! All data already has adminId.\n');
            rl.close();
            process.exit(0);
        }
        
        console.log('\n⚠️  MIGRATION REQUIRED!\n');
        console.log('Choose an option:');
        console.log('1. Assign all existing data to a specific shop owner');
        console.log('2. Delete all data and start fresh');
        console.log('3. Cancel (exit without changes)\n');
        
        const choice = await question('Enter your choice (1/2/3): ');
        
        switch (choice) {
            case '1':
                // Migrate to existing admin
                const hasAdmins = displayAdmins(admins);
                if (!hasAdmins) {
                    console.log('Please create a shop owner first, then run this script again.');
                    break;
                }
                
                const adminChoice = await question('Enter the number of the shop owner: ');
                const adminIndex = parseInt(adminChoice) - 1;
                
                if (adminIndex < 0 || adminIndex >= admins.length) {
                    console.log('❌ Invalid choice!');
                    break;
                }
                
                const selectedAdmin = admins[adminIndex];
                console.log(`\n✅ Selected: ${selectedAdmin.fullName} (${selectedAdmin.username})`);
                
                const confirmMigration = await question('\nProceed with migration? (yes/no): ');
                if (confirmMigration.toLowerCase() === 'yes') {
                    await migrateToAdmin(selectedAdmin._id);
                } else {
                    console.log('❌ Migration cancelled');
                }
                break;
                
            case '2':
                // Delete all data
                await deleteAllData();
                break;
                
            case '3':
                console.log('❌ Migration cancelled');
                break;
                
            default:
                console.log('❌ Invalid choice!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        rl.close();
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the script
main();
