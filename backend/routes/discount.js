const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin, getAdminId } = require('../middleware/auth');
const Discount = require('../models/Discount');
const Sale = require('../models/Sale');
const User = require('../models/User');
const smsService = require('../utils/smsService');

// View all discounts
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const adminId = getAdminId(req);
        const discounts = await Discount.find({ adminId }).sort({ createdAt: -1 });
        
        // Get all customers with phone numbers for messaging
        const customers = await Sale.aggregate([
            { $match: { adminId: adminId, customerPhone: { $exists: true, $ne: '' } } },
            {
                $group: {
                    _id: '$customerPhone',
                    name: { $first: '$customerName' },
                    lastPurchase: { $max: '$createdAt' },
                    totalPurchases: { $sum: 1 }
                }
            },
            { $sort: { lastPurchase: -1 } }
        ]);
        
        res.render('discount/list', { discounts, customers });
    } catch (error) {
        console.error('Discount error:', error);
        req.flash('error_msg', 'Error loading discounts');
        res.redirect('/dashboard');
    }
});

// Add discount page
router.get('/add', isAuthenticated, isAdmin, async (req, res) => {
    try {
        // Get all unique customers with phone numbers
        const adminId = getAdminId(req);
        const customers = await Sale.aggregate([
            { $match: { adminId: adminId, customerPhone: { $exists: true, $ne: '' } } },
            {
                $group: {
                    _id: '$customerPhone',
                    name: { $first: '$customerName' },
                    lastPurchase: { $max: '$createdAt' },
                    totalPurchases: { $sum: 1 }
                }
            },
            { $sort: { lastPurchase: -1 } }
        ]);

        res.render('discount/add', { customers });
    } catch (error) {
        console.error('Error loading customers:', error);
        res.render('discount/add', { customers: [] });
    }
});

// Create discount
router.post('/add', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { name, type, value, applicableOn, categoryOrProduct, startDate, endDate, sendSMS, selectedCustomers } = req.body;

        const discount = new Discount({
            name,
            type,
            value: parseFloat(value),
            applicableOn,
            categoryOrProduct: categoryOrProduct || '',
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            branch: req.session.user.branch || 'Main Branch',
            adminId: getAdminId(req)
        });

        await discount.save();

        // Send SMS to selected customers if checkbox is checked
        if (sendSMS === 'on' && selectedCustomers) {
            try {
                // Get admin's shop details
                const adminId = getAdminId(req);
                const admin = await User.findById(adminId);
                const shopName = admin?.shopName || 'Bireena Salesy';

                // Get selected customer numbers
                let phoneNumbers = [];
                if (selectedCustomers === 'all') {
                    // Send to all customers
                    phoneNumbers = await Sale.find({ 
                        adminId,
                        customerPhone: { $exists: true, $ne: '' }
                    }).distinct('customerPhone');
                } else {
                    // Send to selected customers only
                    phoneNumbers = Array.isArray(selectedCustomers) 
                        ? selectedCustomers 
                        : [selectedCustomers];
                }

                console.log(`📱 Sending discount notifications to ${phoneNumbers.length} selected customers...`);

                // Send bulk SMS
                const smsResults = await smsService.sendBulkDiscountNotifications(
                    phoneNumbers,
                    shopName,
                    {
                        name,
                        type,
                        value,
                        applicableOn,
                        validUntil: endDate
                    }
                );

                console.log(`✅ SMS sent: ${smsResults.sent}, Failed: ${smsResults.failed}`);
                
                if (smsResults.demoMode) {
                    req.flash('success_msg', `Discount added! Demo SMS logged for ${smsResults.sent} customers (check terminal).`);
                } else if (smsResults.sent > 0) {
                    req.flash('success_msg', `Discount added! SMS sent to ${smsResults.sent} customers.`);
                } else {
                    req.flash('success_msg', 'Discount added successfully (SMS service not configured)');
                }
            } catch (smsError) {
                console.error('SMS sending error:', smsError);
                req.flash('success_msg', 'Discount added successfully (SMS failed to send)');
            }
        } else {
            req.flash('success_msg', 'Discount added successfully');
        }

        res.redirect('/discount');
    } catch (error) {
        console.error('Add discount error:', error);
        req.flash('error_msg', 'Error adding discount');
        res.redirect('/discount/add');
    }
});

// Toggle discount status
router.post('/toggle/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const discount = await Discount.findById(req.params.id);
        if (!discount) {
            req.flash('error_msg', 'Discount not found');
            return res.redirect('/discount');
        }

        discount.isActive = !discount.isActive;
        await discount.save();

        req.flash('success_msg', `Discount ${discount.isActive ? 'activated' : 'deactivated'}`);
        res.redirect('/discount');
    } catch (error) {
        console.error('Toggle discount error:', error);
        req.flash('error_msg', 'Error updating discount');
        res.redirect('/discount');
    }
});

// Delete discount
router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await Discount.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Discount deleted successfully');
        res.redirect('/discount');
    } catch (error) {
        console.error('Delete discount error:', error);
        req.flash('error_msg', 'Error deleting discount');
        res.redirect('/discount');
    }
});

module.exports = router;
