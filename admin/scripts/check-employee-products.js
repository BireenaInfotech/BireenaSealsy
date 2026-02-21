// Script to check employee products and fix addedBy field if needed
const mongoose = require('mongoose');
const Product = require('./backend/models/Product');
const User = require('./backend/models/User');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/bireena_bakery', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function checkEmployeeProducts() {
    try {
        console.log('\n🔍 Checking Employee Products...\n');
        
        // Get all active users
        const users = await User.find({ isActive: true });
        
        for (const user of users) {
            console.log(`\n👤 User: ${user.fullName || user.username} (${user.role})`);
            console.log(`   ID: ${user._id}`);
            
            // Check products added by this user
            const products = await Product.find({ addedBy: user._id });
            console.log(`   ✅ Products with addedBy: ${products.length}`);
            
            if (products.length > 0) {
                console.log('   Products:');
                products.forEach(p => {
                    console.log(`      - ${p.name} (Stock: ${p.stock})`);
                });
            }
            
            // Check products without addedBy in user's branch (for staff)
            if (user.role === 'staff' && user.branch) {
                const branchProducts = await Product.find({ 
                    branch: user.branch,
                    $or: [
                        { addedBy: { $exists: false } },
                        { addedBy: null }
                    ]
                });
                
                if (branchProducts.length > 0) {
                    console.log(`   ⚠️  Products in branch "${user.branch}" without addedBy: ${branchProducts.length}`);
                    console.log('   These products should be assigned:');
                    branchProducts.forEach(p => {
                        console.log(`      - ${p.name} (ID: ${p._id})`);
                    });
                }
            }
        }
        
        // Check all products without addedBy
        const productsWithoutOwner = await Product.find({
            $or: [
                { addedBy: { $exists: false } },
                { addedBy: null }
            ]
        });
        
        console.log(`\n⚠️  Total products without addedBy: ${productsWithoutOwner.length}`);
        if (productsWithoutOwner.length > 0) {
            console.log('Products:');
            productsWithoutOwner.forEach(p => {
                console.log(`   - ${p.name} (Branch: ${p.branch || 'N/A'})`);
            });
        }
        
        console.log('\n✅ Check completed!\n');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the check
checkEmployeeProducts();
