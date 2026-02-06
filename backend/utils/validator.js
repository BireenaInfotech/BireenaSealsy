/**
 * 🛡️ INPUT VALIDATION UTILITIES
 * Comprehensive validation for all user inputs
 */

const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Validation Rules for Different Entities
 */

// User/Auth Validation
const validateRegister = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('fullName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Full name must contain only letters and spaces'),
    body('email')
        .optional({ checkFalsy: true })
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email format'),
    body('phone')
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone must be 10 digits'),
    body('shopName')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 200 })
        .withMessage('Shop name is too long'),
    body('shopGST')
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
        .withMessage('Invalid GST number format')
];

const validateLogin = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// Product Validation
const validateProduct = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Product name must be 1-200 characters'),
    body('categoryName')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Category name is required'),
    body('purchasePrice')
        .isFloat({ min: 0 })
        .withMessage('Purchase price must be a positive number'),
    body('sellingPrice')
        .isFloat({ min: 0 })
        .withMessage('Selling price must be a positive number'),
    body('stock')
        .isInt({ min: 0 })
        .withMessage('Stock must be a non-negative integer'),
    body('unit')
        .optional({ checkFalsy: true })
        .trim()
        .isIn(['kg', 'g', 'l', 'ml', 'pcs', 'dozen', 'box'])
        .withMessage('Invalid unit type'),
    body('gstRate')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0, max: 100 })
        .withMessage('GST rate must be between 0 and 100')
];

// Sale Validation
const validateSale = [
    body('items')
        .isArray({ min: 1 })
        .withMessage('At least one item is required'),
    body('items.*.product')
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid product ID'),
    body('items.*.quantity')
        .isFloat({ min: 0.001 })
        .withMessage('Quantity must be greater than 0'),
    body('items.*.price')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    body('customerName')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage('Customer name is too long'),
    body('customerPhone')
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone must be 10 digits'),
    body('customerGSTIN')
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
        .withMessage('Invalid GST number format'),
    body('paymentMethod')
        .isIn(['cash', 'card', 'upi', 'online'])
        .withMessage('Invalid payment method'),
    body('discount')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 })
        .withMessage('Discount must be a positive number'),
    body('discountType')
        .optional({ checkFalsy: true })
        .isIn(['percentage', 'fixed'])
        .withMessage('Invalid discount type')
];

// Expense Validation
const validateExpense = [
    body('category')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Category is required'),
    body('description')
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Description must be 1-500 characters'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    body('paymentMethod')
        .isIn(['cash', 'card', 'upi', 'online', 'cheque'])
        .withMessage('Invalid payment method'),
    body('date')
        .optional({ checkFalsy: true })
        .isISO8601()
        .withMessage('Invalid date format')
];

// Discount Validation
const validateDiscount = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Discount name is required'),
    body('type')
        .isIn(['percentage', 'fixed'])
        .withMessage('Invalid discount type'),
    body('value')
        .isFloat({ min: 0 })
        .withMessage('Discount value must be positive'),
    body('applicableOn')
        .isIn(['all', 'category', 'product', 'customer'])
        .withMessage('Invalid applicable type')
];

// MongoDB ObjectId Validation
const validateObjectId = (paramName = 'id') => [
    param(paramName)
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid ID format')
];

// Query Validation
const validateDateRange = [
    query('startDate')
        .optional({ checkFalsy: true })
        .isISO8601()
        .withMessage('Invalid start date format'),
    query('endDate')
        .optional({ checkFalsy: true })
        .isISO8601()
        .withMessage('Invalid end date format')
];

const validatePagination = [
    query('page')
        .optional({ checkFalsy: true })
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional({ checkFalsy: true })
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
];

/**
 * Validation Error Handler Middleware
 * Returns validation errors in a consistent format
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        // Log validation failures
        console.warn(`⚠️ Validation failed for ${req.method} ${req.path} from IP: ${req.ip}`);
        console.warn('Errors:', errors.array());
        
        // Format errors for client
        const formattedErrors = errors.array().map(err => ({
            field: err.param,
            message: err.msg
        }));
        
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: formattedErrors
        });
    }
    
    next();
};

/**
 * Custom validators
 */

// Validate if value is a valid date
const isValidDate = (value) => {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date);
};

// Validate phone number (international format)
const isValidPhone = (value) => {
    return /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/.test(value);
};

// Validate GST number
const isValidGSTIN = (value) => {
    if (!value) return true; // Optional field
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value);
};

// Sanitize and validate amount
const sanitizeAmount = (value) => {
    const amount = parseFloat(value);
    return !isNaN(amount) && amount >= 0 ? amount : 0;
};

// Sanitize MongoDB query
const sanitizeMongoQuery = (query) => {
    // Remove $ operators to prevent injection
    const sanitized = {};
    for (const key in query) {
        if (!key.startsWith('$') && query.hasOwnProperty(key)) {
            sanitized[key] = query[key];
        }
    }
    return sanitized;
};

module.exports = {
    // Validation rules
    validateRegister,
    validateLogin,
    validateProduct,
    validateSale,
    validateExpense,
    validateDiscount,
    validateObjectId,
    validateDateRange,
    validatePagination,
    
    // Middleware
    handleValidationErrors,
    
    // Custom validators
    isValidDate,
    isValidPhone,
    isValidGSTIN,
    sanitizeAmount,
    sanitizeMongoQuery
};
