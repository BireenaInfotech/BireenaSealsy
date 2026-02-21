const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bireena_bakery')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const Product = require('./backend/models/Product');
const User = require('./backend/models/User');

async function addSampleProducts() {
    try {
        // Get admin user
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.log('No admin found. Please create an admin first.');
            process.exit(1);
        }

        console.log('Admin found:', admin.username);

        // Sample products with images
        const products = [
            {
                name: 'Chocolate Cake',
                category: 'Cake',
                price: 450,
                purchasePrice: 300,
                sellingPrice: 450,
                stock: 10,
                unit: 'piece',
                description: 'Delicious chocolate cake',
                image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300',
                adminId: admin._id,
                addedBy: admin._id
            },
            {
                name: 'Vanilla Cupcake',
                category: 'Cake',
                price: 50,
                purchasePrice: 30,
                sellingPrice: 50,
                stock: 50,
                unit: 'piece',
                description: 'Sweet vanilla cupcake',
                image: 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=300',
                adminId: admin._id,
                addedBy: admin._id
            },
            {
                name: 'Garlic Bread',
                category: 'Bread',
                price: 80,
                purchasePrice: 50,
                sellingPrice: 80,
                stock: 30,
                unit: 'piece',
                description: 'Fresh garlic bread',
                image: 'https://images.unsplash.com/photo-1573140401552-3fab0b24f970?w=300',
                adminId: admin._id,
                addedBy: admin._id
            },
            {
                name: 'Chocolate Cookies',
                category: 'Cookie',
                price: 120,
                purchasePrice: 80,
                sellingPrice: 120,
                stock: 40,
                unit: 'dozen',
                description: 'Chocolate chip cookies',
                image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=300',
                adminId: admin._id,
                addedBy: admin._id
            },
            {
                name: 'Butter Croissant',
                category: 'Pastry',
                price: 60,
                purchasePrice: 35,
                sellingPrice: 60,
                stock: 25,
                unit: 'piece',
                description: 'Flaky butter croissant',
                image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300',
                adminId: admin._id,
                addedBy: admin._id
            }
        ];

        // Delete existing products for this admin
        await Product.deleteMany({ adminId: admin._id });
        console.log('Cleared existing products');

        // Insert products
        const result = await Product.insertMany(products);
        console.log(`✅ Added ${result.length} sample products successfully!`);
        
        result.forEach(p => {
            console.log(`  - ${p.name} (₹${p.price})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

addSampleProducts();
