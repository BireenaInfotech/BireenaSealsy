const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin, getAdminId } = require('../middleware/auth');
const User = require('../models/User');

// List all employees (Admin only)
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
    try {
        // Admin only sees their shop's employees
        const adminId = getAdminId(req);
        const employees = await User.find({ role: 'staff', adminId }).sort({ createdAt: -1 });
        res.render('employees/list', { employees });
    } catch (error) {
        console.error('Employee list error:', error);
        req.flash('error_msg', 'Error loading employees');
        res.redirect('/dashboard');
    }
});

// Add employee page (Admin only)
router.get('/add', isAuthenticated, isAdmin, (req, res) => {
    res.render('employees/add');
});

// Check username availability (AJAX endpoint)
router.post('/check-username', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username || username.trim() === '') {
            return res.json({ available: false, message: 'Username is required' });
        }

        const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
        
        if (!existingUser) {
            return res.json({ available: true, message: 'Username is available' });
        }

        const adminId = getAdminId(req);
        
        // Username exists - provide specific feedback
        if (existingUser.role === 'admin') {
            return res.json({ 
                available: false, 
                message: 'This username belongs to a shop owner. Please choose a different username.' 
            });
        } else if (existingUser.adminId && existingUser.adminId.toString() === adminId.toString()) {
            return res.json({ 
                available: false, 
                message: `This username is already used by "${existingUser.fullName}" in your shop.` 
            });
        } else {
            return res.json({ 
                available: false, 
                message: 'This username is already taken by another user in the system.' 
            });
        }
    } catch (error) {
        console.error('Check username error:', error);
        return res.json({ available: false, message: 'Error checking username' });
    }
});

// Create employee (Admin only)
router.post('/add', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { fullName, username, email, phone, password, branch } = req.body;

        // Validation
        if (!fullName || !username || !email || !password || !branch) {
            req.flash('error_msg', 'Please fill all required fields');
            return res.redirect('/employees/add');
        }

        // Validate phone if provided
        if (phone && !/^[0-9]{10}$/.test(phone)) {
            req.flash('error_msg', 'Please enter a valid 10-digit phone number');
            return res.redirect('/employees/add');
        }

        // Get admin ID for this shop
        const adminId = getAdminId(req);

        // Check if email already exists (should be unique globally)
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            // Check if it's in the same shop or different shop
            if (existingEmail.adminId && existingEmail.adminId.toString() === adminId.toString()) {
                req.flash('error_msg', 'This email is already used by another employee in your shop');
            } else {
                req.flash('error_msg', 'This email is already registered in the system');
            }
            return res.redirect('/employees/add');
        }

        // Check if username already exists (must be unique globally for login)
        const existingUsername = await User.findOne({ username: username.toLowerCase() });
        if (existingUsername) {
            // Check if it's in the same shop or different shop
            if (existingUsername.role === 'admin') {
                req.flash('error_msg', 'This username is already taken by a shop owner. Please choose a different username.');
            } else if (existingUsername.adminId && existingUsername.adminId.toString() === adminId.toString()) {
                req.flash('error_msg', 'This username is already used by another employee in your shop');
            } else {
                req.flash('error_msg', 'This username is already taken. Please choose a different username.');
            }
            return res.redirect('/employees/add');
        }

        // Create new employee under this shop
        const employee = new User({
            fullName,
            username,
            email,
            phone: phone || '',
            password,
            branch: branch || 'Main Branch',
            role: 'staff',
            createdBy: req.session.user.id,
            adminId // Link employee to shop owner
        });

        await employee.save();
        
        // Flash success message with employee credentials
        req.flash('success_msg', `Employee ${fullName} added successfully! Employee ID: ${username}`);
        res.redirect('/employees');
    } catch (error) {
        console.error('Add employee error:', error);
        req.flash('error_msg', 'Error adding employee: ' + error.message);
        res.redirect('/employees/add');
    }
});

// Edit employee page (Admin only)
router.get('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const employee = await User.findById(req.params.id);
        if (!employee || employee.role !== 'staff') {
            req.flash('error_msg', 'Employee not found');
            return res.redirect('/employees');
        }
        res.render('employees/edit', { employee });
    } catch (error) {
        console.error('Edit employee error:', error);
        req.flash('error_msg', 'Error loading employee');
        res.redirect('/employees');
    }
});

// Update employee (Admin only)
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { fullName, username, employeeId, email, phone, password, branch } = req.body;
        const employee = await User.findById(req.params.id);

        if (!employee || employee.role !== 'staff') {
            req.flash('error_msg', 'Employee not found');
            return res.redirect('/employees');
        }

        // Validate fullName
        if (!fullName || fullName.trim().length < 2 || fullName.trim().length > 100) {
            req.flash('error_msg', 'Full name must be between 2 and 100 characters');
            return res.redirect('/employees/edit/' + req.params.id);
        }

        // Validate username
        if (!username || username.length < 3 || username.length > 30) {
            req.flash('error_msg', 'Username must be between 3 and 30 characters');
            return res.redirect('/employees/edit/' + req.params.id);
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            req.flash('error_msg', 'Username can only contain letters, numbers, and underscores');
            return res.redirect('/employees/edit/' + req.params.id);
        }

        // Validate employeeId - must be numeric
        if (!employeeId || !/^[0-9]+$/.test(employeeId)) {
            req.flash('error_msg', 'Employee ID is required and must contain only numbers');
            return res.redirect('/employees/edit/' + req.params.id);
        }

        if (employeeId.length < 3 || employeeId.length > 10) {
            req.flash('error_msg', 'Employee ID must be between 3 and 10 digits');
            return res.redirect('/employees/edit/' + req.params.id);
        }

        // Validate phone if provided
        if (phone && !/^[0-9]{10}$/.test(phone)) {
            req.flash('error_msg', 'Please enter a valid 10-digit phone number');
            return res.redirect('/employees/edit/' + req.params.id);
        }

        // Check if email changed and if new email already exists (case-insensitive)
        if (email.toLowerCase() !== employee.email.toLowerCase()) {
            const existingEmail = await User.findOne({ 
                email: { $regex: new RegExp(`^${email.trim()}$`, 'i') },
                _id: { $ne: employee._id } 
            });
            if (existingEmail) {
                req.flash('error_msg', 'This email is already registered in the system');
                return res.redirect('/employees/edit/' + req.params.id);
            }
        }

        // Check if username changed and if new username already exists (case-insensitive)
        if (username.toLowerCase() !== employee.username.toLowerCase()) {
            const existingUsername = await User.findOne({ 
                username: { $regex: new RegExp(`^${username}$`, 'i') },
                _id: { $ne: employee._id } 
            });
            if (existingUsername) {
                if (existingUsername.role === 'admin') {
                    req.flash('error_msg', 'This username is already taken by a shop owner');
                } else {
                    req.flash('error_msg', 'This username is already taken');
                }
                return res.redirect('/employees/edit/' + req.params.id);
            }
        }

        // Check if employeeId changed and if new employeeId already exists
        if (employeeId !== employee.employeeId) {
            const existingEmployeeId = await User.findOne({ 
                employeeId: employeeId,
                _id: { $ne: employee._id } 
            });
            if (existingEmployeeId) {
                req.flash('error_msg', 'This Employee ID is already taken. Please use a unique ID.');
                return res.redirect('/employees/edit/' + req.params.id);
            }
        }

        // Update fields
        employee.fullName = fullName.trim();
        employee.username = username.toLowerCase().trim();
        employee.employeeId = employeeId.trim();
        employee.email = email.toLowerCase().trim();
        employee.phone = phone ? phone.trim() : '';
        employee.branch = branch ? branch.trim() : 'Main Branch';
        
        // Only update password if provided
        if (password && password.trim() !== '') {
            if (password.length < 6) {
                req.flash('error_msg', 'Password must be at least 6 characters');
                return res.redirect('/employees/edit/' + req.params.id);
            }
            employee.password = password;
        }

        await employee.save();
        req.flash('success_msg', 'Employee updated successfully');
        res.redirect('/employees');
    } catch (error) {
        console.error('Update employee error:', error);
        req.flash('error_msg', 'Error updating employee: ' + (error.message || 'Unknown error'));
        res.redirect('/employees/edit/' + req.params.id);
    }
});

// Delete employee (Admin only)
router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const employee = await User.findById(req.params.id);
        
        if (!employee || employee.role !== 'staff') {
            req.flash('error_msg', 'Employee not found');
            return res.redirect('/employees');
        }

        await User.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Employee deleted successfully');
        res.redirect('/employees');
    } catch (error) {
        console.error('Delete employee error:', error);
        req.flash('error_msg', 'Error deleting employee');
        res.redirect('/employees');
    }
});

module.exports = router;
