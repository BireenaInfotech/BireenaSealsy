// Script to check daily inventory reports
const mongoose = require('mongoose');
const DailyInventoryReport = require('./backend/models/DailyInventoryReport');
const Product = require('./backend/models/Product');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/bireena_bakery', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function checkReports() {
    try {
        console.log('\n📊 Checking Daily Inventory Reports...\n');
        
        // Get all reports
        const reports = await DailyInventoryReport.find({})
            .populate('productId', 'name addedBy')
            .sort({ date: -1 });
        
        console.log(`Total reports: ${reports.length}\n`);
        
        if (reports.length === 0) {
            console.log('❌ No reports found in database!');
            console.log('Please click "Generate Today\'s Report" button first.\n');
            process.exit(0);
        }
        
        // Group by date
        const reportsByDate = {};
        reports.forEach(report => {
            const dateKey = report.date.toISOString().split('T')[0];
            if (!reportsByDate[dateKey]) {
                reportsByDate[dateKey] = [];
            }
            reportsByDate[dateKey].push(report);
        });
        
        // Display by date
        Object.keys(reportsByDate).sort().reverse().forEach(dateKey => {
            const dateReports = reportsByDate[dateKey];
            console.log(`📅 Date: ${dateKey} (${dateReports.length} products)`);
            dateReports.forEach(r => {
                const productName = r.productId ? r.productId.name : r.productName;
                const addedBy = r.productId && r.productId.addedBy ? r.productId.addedBy : 'Unknown';
                console.log(`   - ${productName}: Opening=${r.openingStock}, Closing=${r.closingStock}, Sales=${r.sales}`);
                console.log(`     Product ID: ${r.productId?._id || 'N/A'}, Owner: ${addedBy}`);
            });
            console.log('');
        });
        
        // Check products
        const products = await Product.find({});
        console.log(`\n📦 Total products in inventory: ${products.length}\n`);
        
        console.log('✅ Check completed!\n');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run
checkReports();
