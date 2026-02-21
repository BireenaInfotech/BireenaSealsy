// Script to add sample products for testing
const mongoose = require('mongoose');
const Product = require('./backend/models/Product');
const User = require('./backend/models/User');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/bireena_bakery', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function addSampleProducts() {
    try {
        console.log('\n🍞 Adding Sample Products...\n');
        
        // Get admin user
        const admin = await User.findOne({ role: 'admin' });
        
        if (!admin) {
            console.log('❌ No admin user found!');
            process.exit(1);
        }
        
        console.log(`👤 Adding products for: ${admin.fullName || admin.username}\n`);
        
        // Sample products
        const sampleProducts = [
            { name: 'Bread', category: 'Bakery', price: 40, stock: 50, unit: 'piece' },
            { name: 'Cake', category: 'Bakery', price: 500, stock: 10, unit: 'piece' },
            { name: 'Cookies', category: 'Snacks', price: 80, stock: 30, unit: 'box' },
            { name: 'Pastry', category: 'Bakery', price: 60, stock: 25, unit: 'piece' },
            { name: 'Biscuits', category: 'Snacks', price: 50, stock: 40, unit: 'box' }
        ];
        
        for (const item of sampleProducts) {
            const product = new Product({
                ...item,
                purchasePrice: item.price * 0.7,
                sellingPrice: item.price,
                reorderLevel: 10,
                branch: 'Main Branch',
                addedBy: admin._id
            });
            
            await product.save();
            console.log(`✅ Added: ${product.name} (Stock: ${product.stock})`);
        }
        
        console.log(`\n✅ Successfully added ${sampleProducts.length} products!`);
        console.log('Now you can:');
        console.log('  - View them in Inventory');
        console.log('  - Generate Daily Reports');
        console.log('  - View Stock Activity Log');
        console.log('  - Make Sales\n');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run
addSampleProducts();
