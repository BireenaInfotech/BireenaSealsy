const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../backend/models/Product');

async function setDefaultPastryPrice() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all cake products without pastry price
        const cakesWithoutPastry = await Product.find({ 
            category: /cake/i,
            pastryPrice: { $lte: 0 }
        });

        console.log(`\n🎂 Found ${cakesWithoutPastry.length} cakes without pastry price\n`);

        if (cakesWithoutPastry.length === 0) {
            console.log('✅ All cakes already have pastry price set!');
            await mongoose.disconnect();
            return;
        }

        // Set default pastry price based on half kg price
        // Formula: pastryPrice = halfKgPrice * 0.15 (15% of half kg)
        // Or you can set a fixed price like ₹50

        for (const cake of cakesWithoutPastry) {
            // Option 1: Calculate based on half kg price
            const suggestedPrice = Math.round((cake.halfKgPrice || 200) * 0.15);
            
            // Option 2: Use fixed price
            // const suggestedPrice = 50;

            console.log(`📦 ${cake.name}`);
            console.log(`   Current: Half Kg ₹${cake.halfKgPrice}, Pastry ₹${cake.pastryPrice}`);
            console.log(`   Setting Pastry Price: ₹${suggestedPrice}`);
            
            cake.pastryPrice = suggestedPrice;
            await cake.save();
        }

        console.log(`\n✅ Updated ${cakesWithoutPastry.length} products!`);
        
        await mongoose.disconnect();
        console.log('✅ Done!');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

setDefaultPastryPrice();
