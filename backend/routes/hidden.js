const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to check if superadmin is logged in via session
function requireSuperadminSession(req, res, next) {
    if (req.session && req.session.superadmin) {
        return next();
    }
    return res.redirect('/.hidden/login');
}

function isAuthorizedSuperadmin(req) {
    const envUser = process.env.SUPERADMIN_USERNAME || '';
    const envPass = process.env.SUPERADMIN_PASSWORD || '';

    // 1) Check HTTP Basic Authorization header
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Basic ')) {
        try {
            const creds = Buffer.from(auth.split(' ')[1], 'base64').toString();
            const [u, p] = creds.split(':');
            if (u === envUser && p === envPass) return true;
        } catch (e) {
            // ignore parsing errors
        }
    }

    // 2) Fallback: check body fields (use only for quick CLI/testing)
    if (req.body && req.body.superadmin_username === envUser && req.body.superadmin_password === envPass) {
        return true;
    }

    return false;
}

// GET /.hidden/login - Show superadmin login page
router.get('/login', (req, res) => {
    // If already logged in, redirect to admin panel
    if (req.session && req.session.superadmin) {
        return res.redirect('/.hidden/admin-panel');
    }
    res.render('hidden-login');
});

// POST /.hidden/login - Process superadmin login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const envUser = process.env.SUPERADMIN_USERNAME || '';
    const envPass = process.env.SUPERADMIN_PASSWORD || '';

    if (username === envUser && password === envPass) {
        req.session.superadmin = true;
        req.flash('success_msg', 'Welcome, Superadmin!');
        return res.redirect('/.hidden/admin-panel');
    }

    req.flash('error_msg', 'Invalid superadmin credentials');
    return res.redirect('/.hidden/login');
});

// GET /.hidden/admin-panel - Show admin creation form and shop list (requires superadmin session)
router.get('/admin-panel', requireSuperadminSession, async (req, res) => {
    try {
        const admins = await User.find({ role: 'admin' })
            .select('username fullName shopName branch isActive packExpiry suspendedReason createdAt')
            .sort({ createdAt: -1 });
        
        res.render('hidden-admin-panel', { admins });
    } catch (error) {
        console.error('Admin panel error:', error);
        res.render('hidden-admin-panel', { admins: [] });
    }
});

// POST /.hidden/admin-panel - Create new admin (requires superadmin session)
router.post('/admin-panel', requireSuperadminSession, async (req, res) => {
    const { username, password, fullName, email, phone, shopName, shopAddress, shopGST } = req.body;

    if (!username || !password) {
        req.flash('error_msg', 'Username and password are required');
        return res.redirect('/.hidden/admin-panel');
    }

    try {
        const normalized = String(username).toLowerCase().trim();
        const existing = await User.findOne({ username: normalized });
        
        if (existing) {
            req.flash('error_msg', `Admin with username "${normalized}" already exists. Please try a different username (e.g., ${normalized}2, ${normalized}3, etc.)`);
            return res.redirect('/.hidden/admin-panel');
        }

        const newAdmin = new User({
            fullName: fullName || 'Admin',
            username: normalized,
            email: email || undefined,
            phone: phone || undefined,
            shopName: shopName || undefined,
            shopAddress: shopAddress || undefined,
            shopGST: shopGST || undefined,
            branch: normalized, // Each admin has unique branch = their username
            password: password,
            role: 'admin',
            createdBy: null,
            adminId: null // Admin has no adminId, they are the shop owner
        });

        await newAdmin.save();

        req.flash('success_msg', `Admin "${normalized}" created successfully! They can now login at /login`);
        return res.redirect('/.hidden/admin-panel');
    } catch (err) {
        console.error('Hidden admin creation error:', err);
        
        if (err && err.code === 11000) {
            // Check which field caused duplicate key error
            const duplicateField = err.message.includes('email') ? 'email' : 
                                   err.message.includes('phone') ? 'phone' : 'username';
            req.flash('error_msg', `This ${duplicateField} is already in use. Please use a different ${duplicateField}.`);
        } else if (err && err.errors) {
            const errorMessages = Object.values(err.errors).map(e => e.message).join(', ');
            req.flash('error_msg', errorMessages);
        } else {
            req.flash('error_msg', 'Failed to create admin. Please try again.');
        }
        
        return res.redirect('/.hidden/admin-panel');
    }
});

// POST /.hidden/toggle-shop/:id - Suspend/Activate shop
router.post('/toggle-shop/:id', requireSuperadminSession, async (req, res) => {
    try {
        const admin = await User.findOne({ _id: req.params.id, role: 'admin' });
        
        if (!admin) {
            req.flash('error_msg', 'Admin not found');
            return res.redirect('/.hidden/admin-panel');
        }
        
        admin.isActive = !admin.isActive;
        admin.suspendedReason = admin.isActive ? null : (req.body.reason || 'Suspended by superadmin');
        await admin.save();
        
        req.flash('success_msg', `Shop ${admin.isActive ? 'activated' : 'suspended'} successfully`);
        return res.redirect('/.hidden/admin-panel');
    } catch (error) {
        console.error('Toggle shop error:', error);
        req.flash('error_msg', 'Error updating shop status');
        return res.redirect('/.hidden/admin-panel');
    }
});

// POST /.hidden/update-expiry/:id - Update pack expiry
router.post('/update-expiry/:id', requireSuperadminSession, async (req, res) => {
    try {
        const { expiryDate } = req.body;
        const admin = await User.findOne({ _id: req.params.id, role: 'admin' });
        
        if (!admin) {
            req.flash('error_msg', 'Admin not found');
            return res.redirect('/.hidden/admin-panel');
        }
        
        admin.packExpiry = expiryDate ? new Date(expiryDate) : null;
        await admin.save();
        
        req.flash('success_msg', `Pack expiry updated for ${admin.username}`);
        return res.redirect('/.hidden/admin-panel');
    } catch (error) {
        console.error('Update expiry error:', error);
        req.flash('error_msg', 'Error updating pack expiry');
        return res.redirect('/.hidden/admin-panel');
    }
});

// POST /.hidden/delete-shop/:id - Delete shop (admin)
router.post('/delete-shop/:id', requireSuperadminSession, async (req, res) => {
    try {
        const admin = await User.findOne({ _id: req.params.id, role: 'admin' });
        
        if (!admin) {
            req.flash('error_msg', 'Admin not found');
            return res.redirect('/.hidden/admin-panel');
        }
        
        // Delete admin and all associated employees
        await User.deleteMany({ branch: admin.branch });
        
        req.flash('success_msg', `Shop "${admin.username}" and all associated data deleted`);
        return res.redirect('/.hidden/admin-panel');
    } catch (error) {
        console.error('Delete shop error:', error);
        req.flash('error_msg', 'Error deleting shop');
        return res.redirect('/.hidden/admin-panel');
    }
});

// GET /.hidden/logout - Logout superadmin
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
        res.redirect('/.hidden/login');
    });
});

// Hidden route to create an admin user. Requires superadmin auth.
// POST /.hidden/create-admin
// Body: { username, password, fullName?, email?, phone?, shopName? }
router.post('/create-admin', async (req, res) => {
    if (!isAuthorizedSuperadmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { username, password, fullName, email, phone, shopName } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'username and password are required' });
    }

    try {
        const normalized = String(username).toLowerCase().trim();
        const existing = await User.findOne({ username: normalized });
        if (existing) {
            return res.status(409).json({ error: 'Admin with this username already exists' });
        }

        const newAdmin = new User({
            fullName: fullName || 'Admin',
            username: normalized,
            email: email || undefined,
            phone: phone || undefined,
            shopName: shopName || undefined,
            password: password,
            role: 'admin',
            createdBy: null,
            adminId: null // Admin has no adminId, they are the shop owner
        });

        await newAdmin.save();

        return res.status(201).json({ message: 'Admin created', id: newAdmin._id });
    } catch (err) {
        console.error('Hidden create-admin error:', err);
        // If duplicate key error slips through
        if (err && err.code === 11000) {
            return res.status(409).json({ error: 'Username or email already in use' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
