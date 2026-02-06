const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { redirectIfAuthenticated, isAuthenticated, isAdmin } = require('../middleware/auth');
const { ensureDBConnection } = require('../middleware/database');
const { loginLimiter } = require('../middleware/security');
const { validateLogin, handleValidationErrors } = require('../utils/validator');

// Login page
router.get('/', (req, res) => {
    res.render('home', {
        title: 'Welcome to Bireena Salesy',
        user: req.session.user || null,
        currentPage: 'home'
    });
});

router.get('/features', (req, res) => {
    res.render('features', { 
        title: 'Features - Bireena Salesy',
        user: req.session.user || null,
        currentPage: 'features'
    });
});

router.get('/contact', (req, res) => {
    res.render('contact', { 
        title: 'Contact Us - Bireena Salesy',
        user: req.session.user || null,
        currentPage: 'contact'
    });
});

router.get('/about', (req, res) => {
    res.render('about', { 
        title: 'About - Bireena Salesy',
        user: req.session.user || null,
        currentPage: 'about'
    });
});

router.get('/pricing', (req, res) => {
    res.render('pricing', { 
        title: 'Pricing - Bireena Salesy',
        user: req.session.user || null,
        currentPage: 'pricing'
    });
});

router.get('/login', (req, res) => {
    // If user is already logged in, redirect to dashboard
    if (req.session && req.session.user) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/dashboard');
        } else if (req.session.user.role === 'staff') {
            return res.redirect('/dashboard');
        }
    }
    
    // Render login page
    res.render('login', {
        user: null
    });
});

// ==================== ADMIN LOGIN ====================
router.post('/admin/login', loginLimiter, validateLogin, handleValidationErrors, ensureDBConnection, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required' 
            });
        }

        // Find admin user (must be created by superadmin)
        let admin;
        try {
            admin = await User.findOne({ 
                username: username.toLowerCase(), 
                role: 'admin',
                isActive: true 
            }).maxTimeMS(20000); // 20 second timeout
        } catch (dbError) {
            console.error('Database query error:', dbError);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error. Please try again.' 
            });
        }

        if (!admin) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid admin credentials. Please contact superadmin if you need an account.' 
            });
        }

        // Check if account is suspended
        if (!admin.isActive) {
            return res.status(403).json({ 
                success: false, 
                message: admin.suspendedReason || 'Your account has been suspended. Please contact support.' 
            });
        }

        // Check pack expiry
        if (admin.packExpiry && new Date(admin.packExpiry) < new Date()) {
            return res.status(403).json({ 
                success: false, 
                message: 'Your subscription has expired. Please renew to continue.' 
            });
        }

        // Verify password
        const isPasswordValid = await admin.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid admin credentials' 
            });
        }

        // Update last login
        await admin.updateLastLogin();

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: admin._id, 
                username: admin.username,
                role: admin.role 
            },
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
            { expiresIn: '24h' }
        );

        // Create session
        req.session.user = {
            id: admin._id,
            fullName: admin.fullName,
            username: admin.username,
            role: admin.role,
            shopName: admin.shopName,
            token: token
        };

        // Set token in cookie
        res.cookie('authToken', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/'
        });

        // Force session save with timeout fallback
        let responded = false;
        const saveTimeout = setTimeout(() => {
            if (!responded) {
                responded = true;
                console.warn('Session save timeout - proceeding anyway');
                res.json({ 
                    success: true, 
                    message: 'Admin login successful',
                    redirectUrl: '/dashboard'
                });
            }
        }, 3000); // 3 second timeout

        req.session.save((err) => {
            clearTimeout(saveTimeout);
            if (responded) return;
            responded = true;
            
            if (err) {
                console.error('Session save error:', {
                    error: err.message,
                    stack: err.stack,
                    session: req.sessionID
                });
                // Still allow login even if session save fails
                return res.json({ 
                    success: true, 
                    message: 'Admin login successful',
                    redirectUrl: '/dashboard',
                    warning: 'Session may not persist'
                });
            }
            
            res.json({ 
                success: true, 
                message: 'Admin login successful',
                redirectUrl: '/dashboard'
            });
        });

    } catch (error) {
        console.error('Admin login error:', error.message, error.stack);
        // Always log errors even in production
        if (process.env.NODE_ENV === 'production') {
            console.error('Production error details:', JSON.stringify({
                message: error.message,
                stack: error.stack,
                name: error.name
            }));
        }
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred during admin login' 
        });
    }
});

// ==================== EMPLOYEE LOGIN ====================
router.post('/employee/login', loginLimiter, validateLogin, handleValidationErrors, ensureDBConnection, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required' 
            });
        }

        // Find employee user (can login with username or email)
        let employee;
        try {
            employee = await User.findOne({ 
                $or: [
                    { username: username.toLowerCase() },
                    { email: username.toLowerCase() }
                ],
                role: 'staff',
                isActive: true 
            }).populate('adminId', 'username shopName isActive').maxTimeMS(20000);
        } catch (dbError) {
            console.error('Database query error:', dbError);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error. Please try again.' 
            });
        }

        if (!employee) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid employee credentials' 
            });
        }

        // Check if admin's shop is active
        if (employee.adminId && !employee.adminId.isActive) {
            return res.status(403).json({ 
                success: false, 
                message: 'Your shop account has been suspended. Please contact your admin.' 
            });
        }

        // Verify password
        const isPasswordValid = await employee.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid employee credentials' 
            });
        }

        // Update last login
        await employee.updateLastLogin();

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: employee._id, 
                username: employee.username,
                email: employee.email,
                role: employee.role,
                adminId: employee.adminId?._id
            },
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
            { expiresIn: '24h' }
        );

        // Create session
        req.session.user = {
            id: employee._id,
            fullName: employee.fullName,
            username: employee.username,
            email: employee.email,
            role: employee.role,
            adminId: employee.adminId?._id,
            shopName: employee.adminId?.shopName,
            token: token
        };

        // Set token in cookie
        res.cookie('authToken', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/'
        });

        // Force session save with timeout fallback
        let responded = false;
        const saveTimeout = setTimeout(() => {
            if (!responded) {
                responded = true;
                console.warn('Session save timeout - proceeding anyway');
                res.json({ 
                    success: true, 
                    message: `Welcome back, ${employee.fullName}!`,
                    redirectUrl: '/sales/new',
                    forceRedirect: true
                });
            }
        }, 3000); // 3 second timeout

        req.session.save((err) => {
            clearTimeout(saveTimeout);
            if (responded) return;
            responded = true;
            
            if (err) {
                console.error('Session save error:', {
                    error: err.message,
                    stack: err.stack,
                    session: req.sessionID
                });
                // Still allow login even if session save fails
                return res.json({ 
                    success: true, 
                    message: `Welcome back, ${employee.fullName}!`,
                    redirectUrl: '/sales/new',
                    forceRedirect: true,
                    warning: 'Session may not persist'
                });
            }
            
            res.json({ 
                success: true, 
                message: `Welcome back, ${employee.fullName}!`,
                redirectUrl: '/sales/new',
                forceRedirect: true
            });
        });

    } catch (error) {
        console.error('Employee login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred during employee login' 
        });
    }
});

// ==================== ADMIN REGISTRATION ====================
router.post('/admin/register', async (req, res) => {
    try {
        const { fullName, username, password, confirmPassword, secretKey } = req.body;

        // Secret key verification (optional security layer)
        const adminSecretKey = process.env.ADMIN_SECRET_KEY || 'admin_secret_2024';
        if (secretKey && secretKey !== adminSecretKey) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid admin secret key' 
            });
        }

        // Validation
        if (!fullName || !username || !password || !confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Validate fullName
        if (fullName.trim().length < 2 || fullName.trim().length > 100) {
            return res.status(400).json({ 
                success: false, 
                message: 'Full name must be between 2 and 100 characters' 
            });
        }

        // Validate username
        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username must be between 3 and 30 characters' 
            });
        }

        if (!/^[a-z0-9_]+$/i.test(username)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username can only contain letters, numbers, and underscores' 
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Passwords do not match' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters' 
            });
        }

        // Check if username exists (case-insensitive)
        const existingUser = await User.findOne({ 
            username: { $regex: new RegExp(`^${username}$`, 'i') }
        });
        if (existingUser) {
            return res.status(409).json({ 
                success: false, 
                message: 'Username already exists. Please choose a different username.' 
            });
        }

        // Create new admin
        const newAdmin = new User({
            fullName: fullName.trim(),
            username: username.toLowerCase().trim(),
            password,
            role: 'admin',
            isActive: true
        });

        await newAdmin.save();

        res.json({ 
            success: true, 
            message: 'Admin account created successfully',
            redirectUrl: '/login'
        });

    } catch (error) {
        console.error('Admin registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred during admin registration' 
        });
    }
});

// ==================== CREATE EMPLOYEE (Admin Only) ====================
router.post('/employee/create', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { fullName, username, email, phone, password, confirmPassword, branch, employeeId } = req.body;

        // Validation
        if (!fullName || !username || !email || !password || !confirmPassword || !branch || !employeeId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, username, email, employee ID, password, and branch are required' 
            });
        }

        // Validate fullName
        if (fullName.trim().length < 2) {
            return res.status(400).json({ 
                success: false, 
                message: 'Full name must be at least 2 characters' 
            });
        }

        // Validate username
        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username must be between 3 and 30 characters' 
            });
        }

        if (!/^[a-z0-9_]+$/i.test(username)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username can only contain letters, numbers, and underscores' 
            });
        }

        // Validate employee ID - must be numeric only
        if (!/^[0-9]+$/.test(employeeId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Employee ID must contain only numbers' 
            });
        }

        if (employeeId.length < 3 || employeeId.length > 10) {
            return res.status(400).json({ 
                success: false, 
                message: 'Employee ID must be between 3 and 10 digits' 
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Passwords do not match' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters' 
            });
        }

        // Email validation
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter a valid email address' 
            });
        }

        // Phone validation (if provided)
        if (phone && !/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter a valid 10-digit phone number' 
            });
        }

        // Check if username exists (case-insensitive)
        const existingUsername = await User.findOne({ 
            username: { $regex: new RegExp(`^${username}$`, 'i') }
        });
        if (existingUsername) {
            return res.status(409).json({ 
                success: false, 
                message: 'Username already exists. Please choose a different username.' 
            });
        }

        // Check if employee ID exists
        const existingEmployeeId = await User.findOne({ 
            employeeId: employeeId 
        });
        if (existingEmployeeId) {
            return res.status(409).json({ 
                success: false, 
                message: 'Employee ID already exists. Please use a unique employee ID.' 
            });
        }

        // Check if email exists (case-insensitive) - properly reject duplicates
        const existingEmail = await User.findOne({ 
            email: { $regex: new RegExp(`^${email.trim()}$`, 'i') }
        });
        if (existingEmail) {
            return res.status(409).json({ 
                success: false, 
                message: 'Email address already registered. Please use a different email.' 
            });
        }

        // Create new employee
        const newEmployee = new User({
            fullName: fullName.trim(),
            username: username.toLowerCase().trim(),
            employeeId: employeeId.trim(),
            email: email.toLowerCase().trim(),
            phone: phone ? phone.trim() : undefined,
            branch: branch.trim(),
            password,
            role: 'staff',
            isActive: true,
            createdBy: req.session.user.id,
            adminId: req.session.user.role === 'admin' ? req.session.user.id : req.session.user.adminId
        });

        await newEmployee.save();

        res.json({ 
            success: true, 
            message: `Employee ${fullName} created successfully`,
            employee: {
                id: newEmployee._id,
                fullName: newEmployee.fullName,
                username: newEmployee.username,
                email: newEmployee.email,
                phone: newEmployee.phone
            }
        });

    } catch (error) {
        console.error('Employee creation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while creating employee' 
        });
    }
});

// Forgot password page
router.get('/forgot-password', redirectIfAuthenticated, (req, res) => {
    res.render('forgot-password');
});

// Forgot password handler
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            req.flash('error_msg', 'Email is required');
            return res.redirect('/forgot-password');
        }

        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error_msg', 'No account found with that email');
            return res.redirect('/forgot-password');
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await user.save();

        // In production, send email with reset link
        // For now, display token in flash message
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
        
        req.flash('success_msg', `Password reset link: ${resetUrl} (Valid for 1 hour)`);
        res.redirect('/login');
    } catch (error) {
        console.error('Forgot password error:', error);
        req.flash('error_msg', 'Error processing request');
        res.redirect('/forgot-password');
    }
});

// Reset password page
router.get('/reset-password/:token', (req, res) => {
    res.render('reset-password', { token: req.params.token });
});

// Reset password handler
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        const { token } = req.params;

        if (!password || !confirmPassword) {
            req.flash('error_msg', 'All fields are required');
            return res.redirect(`/reset-password/${token}`);
        }

        if (password !== confirmPassword) {
            req.flash('error_msg', 'Passwords do not match');
            return res.redirect(`/reset-password/${token}`);
        }

        if (password.length < 6) {
            req.flash('error_msg', 'Password must be at least 6 characters');
            return res.redirect(`/reset-password/${token}`);
        }

        // Hash the token from URL
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with valid token
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error_msg', 'Invalid or expired reset token');
            return res.redirect('/forgot-password');
        }

        // Update password
        user.password = password;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        req.flash('success_msg', 'Password reset successful! Please login with your new password');
        res.redirect('/login');
    } catch (error) {
        console.error('Reset password error:', error);
        req.flash('error_msg', 'Error resetting password');
        res.redirect('/forgot-password');
    }
});

// ==================== LOGOUT ====================
router.get('/logout', (req, res) => {
    // Clear all session data
    const sessionId = req.sessionID;
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        
        // Clear all cookies (sessionId is our custom session cookie name)
        res.clearCookie('authToken', { path: '/' });
        res.clearCookie('sessionId', { path: '/' });
        res.clearCookie('connect.sid', { path: '/' });
        
        // Set no-cache headers to prevent back button access
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Send HTML that clears localStorage and redirects
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Logging out...</title>
            </head>
            <body>
                <script>
                    // Clear all localStorage items
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('userRole');
                    localStorage.removeItem('username');
                    localStorage.clear();
                    
                    // Redirect to login page
                    window.location.href = '/login';
                </script>
            </body>
            </html>
        `);
    });
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Logout failed' 
            });
        }
        
        // Clear all cookies (sessionId is our custom session cookie name)
        res.clearCookie('authToken', { path: '/' });
        res.clearCookie('sessionId', { path: '/' });
        res.clearCookie('connect.sid', { path: '/' });
        res.clearCookie('authToken');
        res.json({ 
            success: true, 
            message: 'Logged out successfully' 
        });
    });
});

// ==================== CHECK AUTH STATUS (API) ====================
router.get('/api/check-auth', (req, res) => {
    // Check if session exists and is valid
    if (req.session && req.session.user) {
        return res.status(200).json({ 
            success: true, 
            authenticated: true 
        });
    }
    
    // No valid session
    return res.status(401).json({ 
        success: false, 
        authenticated: false,
        message: 'Not authenticated'
    });
});

// Test timezone conversion
router.get('/test-timezone', (req, res) => {
    const { formatToIST, getDateTimeSeparate } = require('../utils/timezone');
    
    // MongoDB time from your example
    const mongoDate = new Date('2025-11-27T18:06:13.827Z');
    
    const result = {
        mongoDBTime: mongoDate.toISOString(),
        formattedIST: formatToIST(mongoDate),
        separated: getDateTimeSeparate(mongoDate),
        rawDate: mongoDate.toString(),
        explanation: {
            utcHour: mongoDate.getUTCHours(),
            expectedISTHour: '23:36 (11:36 PM)',
            calculation: '18:06 UTC + 5:30 = 23:36 IST'
        }
    };
    
    res.json(result);
});

module.exports = router;
