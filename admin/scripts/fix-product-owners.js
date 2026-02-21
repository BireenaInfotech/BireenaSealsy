// Script to assign addedBy to existing products
const mongoose = require('mongoose');
const Product = require('./backend/models/Product');
const User = require('./backend/models/User');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/bireena_bakery', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function fixProductOwners() {
    try {
        console.log('\n🔧 Fixing Product Owners...\n');
        
        // Get all products without addedBy
        const productsWithoutOwner = await Product.find({
            $or: [
                { addedBy: { $exists: false } },
                { addedBy: null }
            ]
        });
        
        console.log(`Found ${productsWithoutOwner.length} products without owner\n`);
        
        if (productsWithoutOwner.length === 0) {
            console.log('✅ All products already have owners!');
            process.exit(0);
        }
        
        // Get all users
        const users = await User.find({ isActive: true });
        console.log(`Found ${users.length} active users:\n`);
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.fullName || user.username} (${user.role}) - ID: ${user._id}`);
        });
        
        // Assign products based on branch or default to admin
        let updatedCount = 0;
        const admin = users.find(u => u.role === 'admin');
        
        for (const product of productsWithoutOwner) {
            let owner = admin; // Default to admin
            
            // Try to match by branch for staff
            if (product.branch && product.branch !== 'Main Branch') {
                const branchOwner = users.find(u => u.role === 'staff' && u.branch === product.branch);
                if (branchOwner) {
                    owner = branchOwner;
                }
            }
            
            // Update product
            product.addedBy = owner._id;
            await product.save();
            updatedCount++;
            
            console.log(`✅ ${product.name} -> ${owner.fullName || owner.username} (${owner.role})`);
        }
        
        console.log(`\n✅ Updated ${updatedCount} products!`);
        console.log('\n📊 Summary by user:');
        
        for (const user of users) {
            const count = await Product.countDocuments({ addedBy: user._id });
            if (count > 0) {
                console.log(`   ${user.fullName || user.username}: ${count} products`);
            }
        }
        
        console.log('\n✅ All done!\n');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the fix
fixProductOwners();
