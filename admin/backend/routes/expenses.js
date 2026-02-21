const express = require('express');
const router = express.Router();
const { isAuthenticated, getAdminId } = require('../middleware/auth');
const Expense = require('../models/Expense');

// Get all expenses
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const { startDate, endDate, category, employee } = req.query;
        const adminId = getAdminId(req);
        let filter = { adminId };
        
        // Date filter
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.date = { $gte: start, $lte: end };
        }
        
        // Category filter
        if (category && category !== 'all') {
            filter.category = category;
        }
        
        // Staff: only their own expenses
        if (req.session.user.role === 'staff') {
            filter.addedBy = req.session.user.id;
        }
        // Admin: if employee filter is selected
        else if (req.session.user.role === 'admin' && employee) {
            filter.addedBy = employee;
        }
        
        const expenses = await Expense.find(filter)
            .populate('addedBy', 'fullName')
            .sort({ date: -1, createdAt: -1 });
        
        // Get employees for filter (admin only) - include admin (self)
        const User = require('../models/User');
        let employees = [];
        if (req.session.user.role === 'admin') {
            const admin = await User.findById(adminId).select('fullName username role');
            const staff = await User.find({ isActive: true, adminId: adminId, role: 'staff' }).select('fullName username role').sort({ fullName: 1 });
            if (admin) employees.push(admin);
            employees = employees.concat(staff);
        }
        
        res.render('expenses/list', { expenses, employees, filters: { startDate, endDate, category, employee } });
    } catch (error) {
        console.error('Expenses list error:', error);
        req.flash('error_msg', 'Error loading expenses');
        res.redirect('/dashboard');
    }
});

// Show add expense form
router.get('/add', isAuthenticated, (req, res) => {
    res.render('expenses/add');
});

// Add new expense
router.post('/add', isAuthenticated, async (req, res) => {
    try {
        const { category, description, amount, date, paymentMethod, notes } = req.body;
        
        await Expense.create({
            category,
            description,
            amount: parseFloat(amount),
            date: date ? new Date(date) : new Date(),
            paymentMethod,
            notes,
            addedBy: req.session.user.id,
            branch: req.session.user.branch || 'Main Branch',
            adminId: getAdminId(req)
        });
        
        req.flash('success_msg', 'Expense added successfully');
        res.redirect('/expenses');
    } catch (error) {
        console.error('Add expense error:', error);
        req.flash('error_msg', 'Error adding expense');
        res.redirect('/expenses/add');
    }
});

// Delete expense
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        await Expense.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ success: false, message: 'Error deleting expense' });
    }
});

module.exports = router;
