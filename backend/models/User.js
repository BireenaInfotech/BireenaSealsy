const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minlength: [2, 'Full name must be at least 2 characters'],
        maxlength: [100, 'Full name cannot exceed 100 characters']
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores']
    },
    employeeId: {
        type: String,
        required: function() {
            return this.role === 'staff';
        },
        unique: true,
        sparse: true,
        trim: true,
        match: [/^[0-9]+$/, 'Employee ID must be numeric only'],
        minlength: [3, 'Employee ID must be at least 3 digits'],
        maxlength: [10, 'Employee ID cannot exceed 10 digits']
    },
    email: {
        type: String,
        required: function() {
            return this.role === 'staff';
        },
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: false,
        trim: true,
        validate: {
            validator: function(v) {
                return !v || /^[0-9]{10}$/.test(v);
            },
            message: 'Please enter a valid 10-digit phone number'
        }
    },
    shopName: {
        type: String,
        required: false,
        trim: true
    },
    shopGST: {
        type: String,
        required: false,
        trim: true
    },
    shopAddress: {
        type: String,
        required: false,
        trim: true
    },
    branch: {
        type: String,
        required: function() {
            return this.role === 'staff';
        },
        trim: true,
        default: 'Main Branch'
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        maxlength: [128, 'Password is too long']
    },
    role: {
        type: String,
        enum: ['admin', 'staff'],
        default: 'staff',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    packExpiry: {
        type: Date,
        default: null // null means unlimited/no expiry
    },
    suspendedReason: {
        type: String,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    lastLogin: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    // Update timestamp
    this.updatedAt = Date.now();
    
    // Hash password
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Update timestamp before update
userSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: Date.now() });
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = async function() {
    this.lastLogin = Date.now();
    return await this.save();
};

// Indexes for better query performance (username and email already indexed via unique: true)
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
