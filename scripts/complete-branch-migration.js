require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Product = require('./backend/models/Product');
const Sale = require('./backend/models/Sale');
const Expense = require('./backend/models/Expense');
const Discount = require('./backend/models/Discount');
const StockHistory = require('./backend/models/StockHistory');
const DamageEntry = require('./backend/models/DamageEntry');
const DailyInventoryReport = require('./backend/models/DailyInventoryReport');

async function completeBranchMigration() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Get all admins
        const admins = await User.find({ role: 'admin' });
        console.log(`\n📊 Found ${admins.length} admins`);
        
        for (const admin of admins) {
            const adminBranch = admin.branch || admin.username;
            console.log(`\n🔄 Processing branch: ${adminBranch}`);
            
            // Update admin's own branch if needed
            if (!admin.branch || admin.branch === 'Main Branch') {
                admin.branch = adminBranch;
                await admin.save();
                console.log(`   ✅ Updated admin branch: ${adminBranch}`);
            }
            
            // Get employees of this admin
            const employees = await User.find({ 
                role: 'staff',
                $or: [
                    { branch: { $exists: false } },
                    { branch: 'Main Branch' },
                    { addedBy: admin._id }
                ]
            });
            
            console.log(`   📋 Found ${employees.length} employees`);
            for (const emp of employees) {
                emp.branch = adminBranch;
                await emp.save();
            }
            
            // Update Products
            const products = await Product.find({
                $or: [
                    { addedBy: admin._id },
                    { addedBy: { $in: employees.map(e => e._id) } }
                ]
            });
            console.log(`   📦 Updating ${products.length} products`);
            for (const product of products) {
                product.branch = adminBranch;
                await product.save();
            }
            
            // Update Sales
            const sales = await Sale.find({
                $or: [
                    { createdBy: admin._id },
                    { createdBy: { $in: employees.map(e => e._id) } }
                ]
            });
            console.log(`   💰 Updating ${sales.length} sales`);
            for (const sale of sales) {
                sale.branch = adminBranch;
                await sale.save();
            }
            
            // Update Expenses
            const expenses = await Expense.find({
                $or: [
                    { addedBy: admin._id },
                    { addedBy: { $in: employees.map(e => e._id) } }
                ]
            });
            console.log(`   💸 Updating ${expenses.length} expenses`);
            for (const expense of expenses) {
                expense.branch = adminBranch;
                await expense.save();
            }
            
            // Update Discounts (if any)
            const discounts = await Discount.find({
                $or: [
                    { branch: { $exists: false } },
                    { branch: 'Main Branch' }
                ]
            });
            console.log(`   🎟️  Updating ${discounts.length} discounts`);
            for (const discount of discounts) {
                discount.branch = adminBranch;
                await discount.save();
            }
            
            // Update StockHistory
            const stockHistories = await StockHistory.find({
                $or: [
                    { performedBy: admin._id },
                    { performedBy: { $in: employees.map(e => e._id) } }
                ]
            });
            console.log(`   📊 Updating ${stockHistories.length} stock history entries`);
            for (const history of stockHistories) {
                history.branch = adminBranch;
                await history.save();
            }
            
            // Update DamageEntry
            const damageEntries = await DamageEntry.find({
                $or: [
                    { reportedBy: admin._id },
                    { reportedBy: { $in: employees.map(e => e._id) } }
                ]
            });
            console.log(`   🔴 Updating ${damageEntries.length} damage entries`);
            for (const damage of damageEntries) {
                damage.branch = adminBranch;
                await damage.save();
            }
            
            // Update DailyInventoryReport
            const reports = await DailyInventoryReport.find({
                productId: { $in: products.map(p => p._id) }
            });
            console.log(`   📈 Updating ${reports.length} inventory reports`);
            for (const report of reports) {
                report.branch = adminBranch;
                await report.save();
            }
            
            console.log(`   ✅ Branch ${adminBranch} migration complete!`);
        }
        
        console.log('\n🎉 Complete branch migration finished successfully!');
        
        // Summary
        console.log('\n📊 FINAL SUMMARY:');
        const finalAdmins = await User.countDocuments({ role: 'admin' });
        const finalEmployees = await User.countDocuments({ role: 'staff' });
        const finalProducts = await Product.countDocuments();
        const finalSales = await Sale.countDocuments();
        const finalExpenses = await Expense.countDocuments();
        const finalDiscounts = await Discount.countDocuments();
        const finalStockHistory = await StockHistory.countDocuments();
        const finalDamageEntries = await DamageEntry.countDocuments();
        const finalReports = await DailyInventoryReport.countDocuments();
        
        console.log(`   Admins: ${finalAdmins}`);
        console.log(`   Employees: ${finalEmployees}`);
        console.log(`   Products: ${finalProducts}`);
        console.log(`   Sales: ${finalSales}`);
        console.log(`   Expenses: ${finalExpenses}`);
        console.log(`   Discounts: ${finalDiscounts}`);
        console.log(`   Stock History: ${finalStockHistory}`);
        console.log(`   Damage Entries: ${finalDamageEntries}`);
        console.log(`   Inventory Reports: ${finalReports}`);
        
        // Show branch distribution
        console.log('\n🌳 BRANCH DISTRIBUTION:');
        const branches = await User.distinct('branch', { role: 'admin' });
        for (const branch of branches) {
            const branchProducts = await Product.countDocuments({ branch });
            const branchSales = await Sale.countDocuments({ branch });
            const branchExpenses = await Expense.countDocuments({ branch });
            console.log(`\n   Branch: ${branch}`);
            console.log(`      Products: ${branchProducts}`);
            console.log(`      Sales: ${branchSales}`);
            console.log(`      Expenses: ${branchExpenses}`);
        }
        
    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

completeBranchMigration();
