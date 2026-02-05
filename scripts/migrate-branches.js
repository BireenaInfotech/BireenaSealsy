// Migration script to update existing data with proper branch isolation
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Product = require('./backend/models/Product');
const Sale = require('./backend/models/Sale');

async function migrateBranches() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Step 1: Update all admins - set branch = username
        console.log('📋 Step 1: Updating Admin Branches...');
        const admins = await User.find({ role: 'admin' });
        
        for (const admin of admins) {
            const oldBranch = admin.branch;
            admin.branch = admin.username; // Set branch = username for isolation
            await admin.save();
            console.log(`   ✅ Admin: ${admin.username} | Old Branch: ${oldBranch} → New Branch: ${admin.branch}`);
        }
        console.log(`   ✨ Updated ${admins.length} admin(s)\n`);

        // Step 2: Update staff/employees - set branch = their admin's branch
        console.log('📋 Step 2: Updating Employee Branches...');
        const employees = await User.find({ role: 'staff' }).populate('createdBy');
        
        for (const employee of employees) {
            const oldBranch = employee.branch;
            if (employee.createdBy && employee.createdBy.role === 'admin') {
                employee.branch = employee.createdBy.username; // Use admin's username as branch
                await employee.save();
                console.log(`   ✅ Employee: ${employee.username} | Admin: ${employee.createdBy.username} | Old: ${oldBranch} → New: ${employee.branch}`);
            } else {
                console.log(`   ⚠️  Employee: ${employee.username} | No admin found, keeping branch: ${oldBranch}`);
            }
        }
        console.log(`   ✨ Updated ${employees.length} employee(s)\n`);

        // Step 3: Update products - set branch based on who added them
        console.log('📋 Step 3: Updating Product Branches...');
        const products = await Product.find({}).populate('addedBy');
        let productCount = 0;
        
        for (const product of products) {
            const oldBranch = product.branch;
            if (product.addedBy) {
                // If added by employee, use employee's branch
                // If added by admin, use admin's username
                const user = await User.findById(product.addedBy);
                if (user) {
                    if (user.role === 'admin') {
                        product.branch = user.username;
                    } else if (user.role === 'staff') {
                        product.branch = user.branch;
                    }
                    await product.save();
                    productCount++;
                    console.log(`   ✅ Product: ${product.name} | User: ${user.username} | Old: ${oldBranch} → New: ${product.branch}`);
                }
            }
        }
        console.log(`   ✨ Updated ${productCount} product(s)\n`);

        // Step 4: Update sales - set branch based on who created them
        console.log('📋 Step 4: Updating Sale Branches...');
        const sales = await Sale.find({}).populate('createdBy');
        let saleCount = 0;
        
        for (const sale of sales) {
            if (sale.createdBy) {
                const user = await User.findById(sale.createdBy);
                if (user) {
                    if (user.role === 'admin') {
                        sale.branch = user.username;
                    } else if (user.role === 'staff') {
                        sale.branch = user.branch;
                    }
                    await sale.save();
                    saleCount++;
                    console.log(`   ✅ Sale: ${sale.billNumber} | User: ${user.username} | Branch: ${sale.branch}`);
                }
            }
        }
        console.log(`   ✨ Updated ${saleCount} sale(s)\n`);

        // Step 5: Show summary by branch
        console.log('📊 Branch Summary:');
        const allAdmins = await User.find({ role: 'admin' });
        
        for (const admin of allAdmins) {
            const branchProducts = await Product.countDocuments({ branch: admin.username });
            const branchSales = await Sale.countDocuments({ branch: admin.username });
            const branchEmployees = await User.countDocuments({ role: 'staff', branch: admin.username });
            
            console.log(`\n   🏪 Branch: ${admin.username} (${admin.shopName || 'No shop name'})`);
            console.log(`      📦 Products: ${branchProducts}`);
            console.log(`      💰 Sales: ${branchSales}`);
            console.log(`      👥 Employees: ${branchEmployees}`);
        }

        console.log('\n\n✅ Migration completed successfully!');
        console.log('🔒 Each admin now has isolated data based on their username as branch.');
        
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed.');
        
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

// Run migration
migrateBranches();
