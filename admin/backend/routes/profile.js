const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
// Wrapped in try/catch because Vercel's filesystem is read-only in serverless
const uploadsDir = path.join(__dirname, '../../frontend/public/uploads');
let diskStorageAvailable = false;
try {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    diskStorageAvailable = true;
} catch (e) {
    console.log('⚠️ Cannot create uploads dir (read-only filesystem on Vercel). Using memory storage.');
}

// Configure multer - use diskStorage locally, memoryStorage on Vercel (read-only fs)
const storage = diskStorageAvailable
    ? multer.diskStorage({
        destination: function(req, file, cb) {
            cb(null, uploadsDir);
        },
        filename: function(req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    })
    : multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    },
    fileFilter: function(req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|jfif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            // Skip invalid files instead of crashing - just reject silently
            console.log(`⚠️ Skipping invalid file: ${file.originalname} (only JPG/PNG/GIF/WEBP allowed)`);
            return cb(null, false);
        }
    }
});

// Profile view page
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id).select('-password');
        
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/dashboard');
        }

        res.render('profile/view', {
            title: 'My Profile',
            user: user,
            session: req.session
        });
    } catch (error) {
        console.error('Profile view error:', error);
        req.flash('error_msg', 'Error loading profile');
        res.redirect('/dashboard');
    }
});

// Profile edit page
router.get('/edit', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id).select('-password');
        
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/dashboard');
        }

        res.render('profile/edit', {
            title: 'Edit Profile',
            user: user,
            session: req.session
        });
    } catch (error) {
        console.error('Profile edit page error:', error);
        req.flash('error_msg', 'Error loading profile edit page');
        res.redirect('/profile');
    }
});

// Update profile
router.post('/update', isAuthenticated, upload.fields([
    { name: 'shopLogo', maxCount: 1 },
    { name: 'shopQRCode', maxCount: 1 }
]), async (req, res) => {
    try {
        const { fullName, email, phone, shopName, shopGST, shopAddress, billFooterText, shopLogoURL, shopQRCodeURL } = req.body;

        // Validate required fields
        if (!fullName || !email) {
            req.flash('error_msg', 'Name and email are required');
            return res.redirect('/profile/edit');
        }

        // Validate email format
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            req.flash('error_msg', 'Please enter a valid email address');
            return res.redirect('/profile/edit');
        }

        // Validate phone number if provided
        if (phone && phone.trim() !== '') {
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(phone)) {
                req.flash('error_msg', 'Phone number must be exactly 10 digits');
                return res.redirect('/profile/edit');
            }
        }

        // Check if email is already taken by another user
        const existingUser = await User.findOne({ 
            email: email.toLowerCase(), 
            _id: { $ne: req.session.user.id } 
        });

        if (existingUser) {
            req.flash('error_msg', 'Email is already in use by another account');
            return res.redirect('/profile/edit');
        }

        // Get current user to access existing logo/QR paths
        const currentUser = await User.findById(req.session.user.id);

        // Update user profile
        const updateData = {
            fullName: fullName.trim(),
            email: email.toLowerCase().trim(),
            phone: phone && phone.trim() !== '' ? phone.trim() : null,
            shopName: shopName && shopName.trim() !== '' ? shopName.trim() : null,
            shopGST: shopGST && shopGST.trim() !== '' ? shopGST.trim() : null,
            shopAddress: shopAddress && shopAddress.trim() !== '' ? shopAddress.trim() : null,
            billFooterText: billFooterText && billFooterText.trim() !== '' ? billFooterText.trim() : 'This is a computer-generated bill',
            updatedAt: Date.now()
        };

        // Handle logo upload - URL takes priority over file upload
        if (shopLogoURL && shopLogoURL.trim() !== '') {
            // User provided URL - use it directly
            updateData.shopLogo = shopLogoURL.trim();
        } else if (req.files && req.files.shopLogo && req.files.shopLogo[0]) {
            // File upload provided
            // Delete old logo if exists and is a local file
            if (currentUser.shopLogo && currentUser.shopLogo.startsWith('/uploads/')) {
                try {
                    const oldLogoPath = path.join(uploadsDir, path.basename(currentUser.shopLogo));
                    if (fs.existsSync(oldLogoPath)) {
                        fs.unlinkSync(oldLogoPath);
                    }
                } catch (e) {
                    console.log('Could not delete old logo:', e.message);
                }
            }
            updateData.shopLogo = '/uploads/' + req.files.shopLogo[0].filename;
        }

        // Handle QR code upload - URL takes priority over file upload
        if (shopQRCodeURL && shopQRCodeURL.trim() !== '') {
            // User provided URL - use it directly
            updateData.shopQRCode = shopQRCodeURL.trim();
        } else if (req.files && req.files.shopQRCode && req.files.shopQRCode[0]) {
            // File upload provided
            // Delete old QR code if exists and is a local file
            if (currentUser.shopQRCode && currentUser.shopQRCode.startsWith('/uploads/')) {
                try {
                    const oldQRPath = path.join(uploadsDir, path.basename(currentUser.shopQRCode));
                    if (fs.existsSync(oldQRPath)) {
                        fs.unlinkSync(oldQRPath);
                    }
                } catch (e) {
                    console.log('Could not delete old QR:', e.message);
                }
            }
            updateData.shopQRCode = '/uploads/' + req.files.shopQRCode[0].filename;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.session.user.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/profile/edit');
        }

        // Update session
        req.session.user.fullName = updatedUser.fullName;
        req.session.user.email = updatedUser.email;

        // Auto-sync with GST Settings (if admin and shop details provided)
        if (req.session.user.role === 'admin' && shopName && shopGST) {
            try {
                const GSTSettings = require('../models/GSTSettings');
                const gstSettings = await GSTSettings.findOne();
                
                if (gstSettings) {
                    // Extract state code from GSTIN
                    let stateCode = gstSettings.stateCode;
                    if (shopGST && shopGST.length >= 2) {
                        stateCode = shopGST.substring(0, 2);
                    }
                    
                    await GSTSettings.updateOne({}, {
                        $set: {
                            businessName: shopName.trim(),
                            gstin: shopGST.trim(),
                            address: shopAddress ? shopAddress.trim() : gstSettings.address,
                            stateCode: stateCode,
                            updatedAt: new Date()
                        }
                    });
                    console.log('✅ GST Settings auto-synced with profile data');
                }
            } catch (syncError) {
                console.error('⚠️ GST Settings sync error:', syncError);
                // Don't fail the update if sync fails
            }
        }

        req.flash('success_msg', 'Profile updated successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Profile update error:', error);
        req.flash('error_msg', error.message || 'Error updating profile');
        res.redirect('/profile/edit');
    }
});

// Change password page (Admin only)
router.get('/change-password', isAuthenticated, isAdmin, async (req, res) => {
    try {
        res.render('profile/change-password', {
            title: 'Change Password',
            session: req.session
        });
    } catch (error) {
        console.error('Change password page error:', error);
        req.flash('error_msg', 'Error loading change password page');
        res.redirect('/profile');
    }
});

// Update password (Admin only)
router.post('/change-password', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            req.flash('error_msg', 'All password fields are required');
            return res.redirect('/profile/change-password');
        }

        if (newPassword !== confirmPassword) {
            req.flash('error_msg', 'New passwords do not match');
            return res.redirect('/profile/change-password');
        }

        if (newPassword.length < 6) {
            req.flash('error_msg', 'New password must be at least 6 characters long');
            return res.redirect('/profile/change-password');
        }

        // Get user with password
        const user = await User.findById(req.session.user.id);

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/profile/change-password');
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            req.flash('error_msg', 'Current password is incorrect');
            return res.redirect('/profile/change-password');
        }

        // Update password
        user.password = newPassword;
        await user.save();

        req.flash('success_msg', 'Password changed successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Change password error:', error);
        req.flash('error_msg', 'Error changing password');
        res.redirect('/profile/change-password');
    }
});

module.exports = router;
