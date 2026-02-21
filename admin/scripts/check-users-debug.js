const mongoose = require('mongoose');
const User = require('./backend/models/User');

mongoose.connect('mongodb://localhost:27017/birre', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('Connected to MongoDB\n');
    
    const users = await User.find({}).select('username role adminId branch fullName isActive');
    
    console.log('=== ALL USERS ===');
    users.forEach(user => {
        console.log(`\nUsername: ${user.username}`);
        console.log(`Role: ${user.role}`);
        console.log(`Full Name: ${user.fullName || 'N/A'}`);
        console.log(`Branch: ${user.branch || 'N/A'}`);
        console.log(`AdminId: ${user.adminId || 'N/A'}`);
        console.log(`Active: ${user.isActive}`);
        console.log(`ID: ${user._id}`);
    });
    
    console.log('\n=== ADMINS ===');
    const admins = await User.find({ role: 'admin' }).select('username fullName _id shopName');
    admins.forEach(admin => {
        console.log(`\n${admin.username} (${admin.fullName || 'N/A'}) - Shop: ${admin.shopName || 'N/A'}`);
        console.log(`  ID: ${admin._id}`);
    });
    
    console.log('\n=== EMPLOYEES BY ADMIN ===');
    for (const admin of admins) {
        const employees = await User.find({ role: 'staff', adminId: admin._id }).select('username fullName branch');
        console.log(`\nAdmin: ${admin.username}`);
        console.log(`  Employees (${employees.length}):`);
        employees.forEach(emp => {
            console.log(`    - ${emp.username} (${emp.fullName || 'N/A'}) - Branch: ${emp.branch || 'N/A'}`);
        });
    }
    
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
