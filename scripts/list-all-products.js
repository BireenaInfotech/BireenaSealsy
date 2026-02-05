// Script to list all products and their owners
const mongoose = require('mongoose');
const Product = require('./backend/models/Product');
const User = require('./backend/models/User');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/bireena_bakery', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function listAllProducts() {
    try {
        console.log('\n📦 All Products in Database:\n');
        
        const products = await Product.find({}).populate('addedBy', 'fullName username role');
        
        console.log(`Total products: ${products.length}\n`);
        
        if (products.length === 0) {
            console.log('❌ No products found in database!');
            console.log('Please add some products first.\n');
            process.exit(0);
        }
        
        products.forEach((product, index) => {
            const owner = product.addedBy ? 
                `${product.addedBy.fullName || product.addedBy.username} (${product.addedBy.role})` : 
                'NO OWNER';
            console.log(`${index + 1}. ${product.name}`);
            console.log(`   Owner: ${owner}`);
            console.log(`   Stock: ${product.stock}`);
            console.log(`   Branch: ${product.branch || 'N/A'}`);
            console.log('');
        });
        
        console.log('✅ Done!\n');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the list
listAllProducts();
