const jwt = require('jsonwebtoken');

// Middleware to prevent caching of protected pages
const noCacheMiddleware = (req, res, next) => {
    // Set headers to prevent browser caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};

// Check if user is authenticated
const isAuthenticated = async (req, res, next) => {
    // Apply no-cache headers to all authenticated routes
    noCacheMiddleware(req, res, () => {});
    
    // Check if session exists and has user data
    if (req.session && req.session.user) {
        const User = require('../models/User');
        
        // Check if account is suspended or expired (admin)
        if (req.session.user.role === 'admin') {
            const admin = await User.findById(req.session.user.id).select('isActive packExpiry suspendedReason');
            
            if (admin) {
                // Check if suspended
                if (!admin.isActive) {
                    req.session.destroy();
                    req.flash('error_msg', admin.suspendedReason || 'Your account has been suspended. Please contact support.');
                    return res.redirect('/login');
                }
                
                // Check if pack expired
                if (admin.packExpiry && new Date(admin.packExpiry) < new Date()) {
                    req.session.destroy();
                    req.flash('error_msg', 'Your pack has expired. Please contact support to renew.');
                    return res.redirect('/login');
                }
            }
        }
        
        // Check if employee's shop owner is suspended or expired (staff)
        if (req.session.user.role === 'staff' && req.session.user.adminId) {
            const employee = await User.findById(req.session.user.id).select('isActive adminId');
            
            if (!employee || !employee.isActive) {
                req.session.destroy();
                req.flash('error_msg', 'Your employee account has been suspended. Please contact your shop owner.');
                return res.redirect('/employee-login');
            }
            
            // Check if shop owner (admin) is active
            const shopOwner = await User.findById(req.session.user.adminId).select('isActive packExpiry shopName');
            
            if (!shopOwner) {
                req.session.destroy();
                req.flash('error_msg', 'Shop owner account not found. Please contact support.');
                return res.redirect('/employee-login');
            }
            
            if (!shopOwner.isActive) {
                req.session.destroy();
                req.flash('error_msg', `Your shop (${shopOwner.shopName || 'N/A'}) has been suspended. Please contact your shop owner.`);
                return res.redirect('/employee-login');
            }
            
            if (shopOwner.packExpiry && new Date(shopOwner.packExpiry) < new Date()) {
                req.session.destroy();
                req.flash('error_msg', `Your shop's (${shopOwner.shopName || 'N/A'}) subscription has expired. Please contact your shop owner.`);
                return res.redirect('/employee-login');
            }
        }
        
        // Refresh session on each request to prevent timeout
        req.session.touch();
        
        return next();
    }
    
    // AJAX request - return JSON
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required',
            redirectUrl: '/login'
        });
    }
    
    // Regular request - redirect to login
    req.flash('error_msg', 'Please login to access this page');
    res.redirect('/login');
};

// Check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    
    // AJAX request - return JSON
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required',
            redirectUrl: '/dashboard'
        });
    }
    
    // Regular request - redirect to dashboard
    req.flash('error_msg', 'You do not have permission to access this page');
    res.redirect('/dashboard');
};

// Check if user is employee/staff
const isEmployee = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'staff') {
        return next();
    }
    
    // AJAX request - return JSON
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(403).json({ 
            success: false, 
            message: 'Employee access required',
            redirectUrl: '/dashboard'
        });
    }
    
    // Regular request
    req.flash('error_msg', 'This page is for employees only');
    res.redirect('/dashboard');
};

// Redirect if already logged in
const redirectIfAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    next();
};

// Get the adminId for the current user (shop owner ID)
// - If user is admin, returns their own ID
// - If user is staff, returns their adminId
const getAdminId = (req) => {
    if (!req.session || !req.session.user) {
        return null;
    }
    
    if (req.session.user.role === 'admin') {
        return req.session.user.id;
    }
    
    return req.session.user.adminId || null;
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isEmployee,
    redirectIfAuthenticated,
    noCacheMiddleware,
    getAdminId
};
