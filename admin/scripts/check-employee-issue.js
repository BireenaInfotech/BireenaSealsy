// Script to check employee's products and reports
const mongoose = require('mongoose');
const Product = require('./backend/models/Product');
const User = require('./backend/models/User');
const DailyInventoryReport = require('./backend/models/DailyInventoryReport');
const StockHistory = require('./backend/models/StockHistory');

mongoose.connect('mongodb://localhost:27017/bireena_bakery', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function checkEmployeeIssue() {
    try {
        console.log('\n🔍 Checking Employee Issue...\n');
        
        // Get all users
        const users = await User.find({ isActive: true });
        
        // Find employee (staff)
        const employee = users.find(u => u.role === 'staff');
        
        if (!employee) {
            console.log('❌ No employee found! Please create an employee first.');
            process.exit(0);
        }
        
        console.log(`👤 Employee: ${employee.fullName || employee.username}`);
        console.log(`   ID: ${employee._id}`);
        console.log(`   Role: ${employee.role}`);
        console.log(`   Branch: ${employee.branch || 'N/A'}\n`);
        
        // Check products
        console.log('📦 Checking Products:\n');
        
        // Products added by this employee
        const employeeProducts = await Product.find({ addedBy: employee._id });
        console.log(`✅ Products with addedBy=${employee._id}: ${employeeProducts.length}`);
        if (employeeProducts.length > 0) {
            employeeProducts.forEach(p => {
                console.log(`   - ${p.name} (Stock: ${p.stock}, Branch: ${p.branch})`);
            });
        } else {
            console.log('   ❌ Employee has NO products with their ID in addedBy field!');
        }
        
        // All products
        const allProducts = await Product.find({});
        console.log(`\n📊 Total products in database: ${allProducts.length}`);
        
        if (allProducts.length > 0) {
            console.log('\nAll products owners:');
            for (const p of allProducts) {
                const owner = p.addedBy ? await User.findById(p.addedBy).select('fullName username role') : null;
                const ownerName = owner ? `${owner.fullName || owner.username} (${owner.role})` : 'NO OWNER';
                console.log(`   - ${p.name}: ${ownerName}`);
            }
        }
        
        // Check reports for employee
        console.log('\n\n📋 Checking Daily Inventory Reports:\n');
        const employeeReports = await DailyInventoryReport.find({
            productId: { $in: employeeProducts.map(p => p._id) }
        });
        console.log(`Reports for employee's products: ${employeeReports.length}`);
        
        // Check activity log
        console.log('\n📝 Checking Stock Activity Log:\n');
        const employeeActivities = await StockHistory.find({
            productId: { $in: employeeProducts.map(p => p._id) }
        });
        console.log(`Activities for employee's products: ${employeeActivities.length}`);
        
        console.log('\n\n💡 SOLUTION:');
        if (employeeProducts.length === 0) {
            console.log('Employee needs to add products from their account.');
            console.log('When employee adds a product, addedBy will automatically be set to their ID.');
            console.log('\nSteps:');
            console.log('1. Login as employee');
            console.log('2. Go to Inventory -> Add Product');
            console.log('3. Add some products');
            console.log('4. Then Daily Report and Activity Log will work!');
        }
        
        console.log('\n✅ Check completed!\n');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkEmployeeIssue();
