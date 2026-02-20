const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../backend/models/Product');

async function checkPastryPrices() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all cake products
        const cakes = await Product.find({ 
            category: /cake/i 
        }).select('name category halfKgPrice oneKgPrice pastryPrice');

        console.log(`\n🎂 Found ${cakes.length} cake products:\n`);
        
        cakes.forEach(cake => {
            console.log(`📦 ${cake.name}`);
            console.log(`   Category: ${cake.category}`);
            console.log(`   Half Kg: ₹${cake.halfKgPrice || 0}`);
            console.log(`   One Kg: ₹${cake.oneKgPrice || 0}`);
            console.log(`   Pastry: ₹${cake.pastryPrice || 0} ${cake.pastryPrice > 0 ? '✅' : '❌ NOT SET'}`);
            console.log('');
        });

        await mongoose.disconnect();
        console.log('✅ Done!');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkPastryPrices();
