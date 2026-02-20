const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../backend/models/Product');

async function updatePremiumCakesPastry() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all Premium Cakes without pastry price
        const premiumCakes = await Product.find({ 
            category: 'Premium Cakes',
            pastryPrice: { $lte: 0 }
        });

        console.log(`\n🎂 Found ${premiumCakes.length} Premium Cakes without pastry price\n`);

        if (premiumCakes.length === 0) {
            console.log('✅ All Premium Cakes already have pastry price set!');
            await mongoose.disconnect();
            return;
        }

        // Set pastry price to ₹75 for all Premium Cakes
        const pastryPrice = 75;

        for (const cake of premiumCakes) {
            console.log(`📦 ${cake.name}`);
            console.log(`   Current: Half Kg ₹${cake.halfKgPrice}, Pastry ₹${cake.pastryPrice}`);
            console.log(`   Setting Pastry Price: ₹${pastryPrice}`);
            
            cake.pastryPrice = pastryPrice;
            await cake.save();
        }

        console.log(`\n✅ Updated ${premiumCakes.length} Premium Cakes with pastry price ₹${pastryPrice}!`);
        
        await mongoose.disconnect();
        console.log('✅ Done!');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

updatePremiumCakesPastry();
