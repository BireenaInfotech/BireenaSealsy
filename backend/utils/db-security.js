/**
 * 🔒 DATABASE SECURITY UTILITIES
 * Prevents NoSQL injection and secures database queries
 */

const mongoose = require('mongoose');

/**
 * Sanitize MongoDB query parameters
 * Prevents NoSQL injection attacks
 */
const sanitizeQuery = (query) => {
    if (typeof query !== 'object' || query === null) {
        return query;
    }

    const sanitized = {};
    
    for (const key in query) {
        if (query.hasOwnProperty(key)) {
            // Remove operators that could be used for injection
            if (key.startsWith('$')) {
                console.warn(`⚠️ Potential NoSQL injection attempt: ${key}`);
                continue;
            }

            const value = query[key];

            // Recursively sanitize nested objects
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                sanitized[key] = sanitizeQuery(value);
            } else {
                sanitized[key] = value;
            }
        }
    }

    return sanitized;
};

/**
 * Validate MongoDB ObjectId
 * Prevents invalid ID queries
 */
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Build secure admin filter
 * Ensures users can only access their own data
 */
const buildAdminFilter = (adminId, additionalFilter = {}) => {
    if (!isValidObjectId(adminId)) {
        throw new Error('Invalid admin ID');
    }

    return {
        adminId: new mongoose.Types.ObjectId(adminId),
        ...sanitizeQuery(additionalFilter)
    };
};

/**
 * Build secure user filter
 * Ensures proper isolation between admin and staff
 */
const buildUserFilter = (userId, role, adminId = null, additionalFilter = {}) => {
    if (!isValidObjectId(userId)) {
        throw new Error('Invalid user ID');
    }

    let filter = sanitizeQuery(additionalFilter);

    if (role === 'admin' && isValidObjectId(adminId)) {
        filter.adminId = new mongoose.Types.ObjectId(adminId);
    } else if (role === 'staff') {
        filter.createdBy = new mongoose.Types.ObjectId(userId);
    }

    return filter;
};

/**
 * Secure query execution wrapper
 * Adds timeout and error handling
 */
const executeSecureQuery = async (queryFunction, timeout = 20000) => {
    try {
        const query = queryFunction();
        
        // Add timeout to prevent long-running queries
        if (query.maxTimeMS) {
            query.maxTimeMS(timeout);
        }

        return await query.exec();
    } catch (error) {
        console.error('Secure query execution error:', error);
        
        // Don't expose internal error details
        if (error.name === 'MongooseError' || error.name === 'MongoError') {
            throw new Error('Database operation failed');
        }
        
        throw error;
    }
};

/**
 * Prevent parameter pollution in queries
 * Ensures single values where expected
 */
const ensureSingleValue = (value) => {
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
};

/**
 * Build secure aggregation pipeline
 * Sanitizes all stages
 */
const buildSecurePipeline = (stages) => {
    if (!Array.isArray(stages)) {
        throw new Error('Pipeline must be an array');
    }

    return stages.map(stage => {
        // Ensure each stage is an object
        if (typeof stage !== 'object' || stage === null) {
            throw new Error('Invalid pipeline stage');
        }

        // Sanitize the stage
        return sanitizeQuery(stage);
    });
};

/**
 * Escape regex special characters
 * Prevents regex injection
 */
const escapeRegex = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

/**
 * Build secure search filter
 * Prevents regex injection
 */
const buildSearchFilter = (searchTerm, fields) => {
    if (!searchTerm || typeof searchTerm !== 'string') {
        return {};
    }

    const escapedTerm = escapeRegex(searchTerm.trim());
    
    if (!escapedTerm) {
        return {};
    }

    const regex = new RegExp(escapedTerm, 'i');
    
    return {
        $or: fields.map(field => ({
            [field]: regex
        }))
    };
};

/**
 * Validate and sanitize sort parameters
 */
const sanitizeSortParams = (sortParam) => {
    if (!sortParam || typeof sortParam !== 'object') {
        return { createdAt: -1 }; // Default sort
    }

    const sanitized = {};
    const allowedSortOrders = [1, -1, 'asc', 'desc'];

    for (const key in sortParam) {
        if (sortParam.hasOwnProperty(key)) {
            const value = sortParam[key];
            
            // Only allow valid sort orders
            if (allowedSortOrders.includes(value)) {
                sanitized[key] = value;
            }
        }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : { createdAt: -1 };
};

/**
 * Build secure pagination
 */
const buildSecurePagination = (page = 1, limit = 50) => {
    const sanitizedPage = Math.max(1, parseInt(page) || 1);
    const sanitizedLimit = Math.min(100, Math.max(1, parseInt(limit) || 50));
    
    return {
        skip: (sanitizedPage - 1) * sanitizedLimit,
        limit: sanitizedLimit,
        page: sanitizedPage
    };
};

/**
 * Validate field projection
 * Prevents exposure of sensitive fields
 */
const sanitizeProjection = (projection, sensitiveFields = ['password', 'resetToken', 'apiKey']) => {
    if (!projection || typeof projection !== 'object') {
        // Default: exclude sensitive fields
        const defaultProjection = {};
        sensitiveFields.forEach(field => {
            defaultProjection[field] = 0;
        });
        return defaultProjection;
    }

    const sanitized = {};
    
    for (const key in projection) {
        if (projection.hasOwnProperty(key)) {
            // Never include sensitive fields
            if (!sensitiveFields.includes(key)) {
                sanitized[key] = projection[key];
            }
        }
    }

    // Ensure sensitive fields are excluded
    sensitiveFields.forEach(field => {
        if (!sanitized[field]) {
            sanitized[field] = 0;
        }
    });

    return sanitized;
};

module.exports = {
    sanitizeQuery,
    isValidObjectId,
    buildAdminFilter,
    buildUserFilter,
    executeSecureQuery,
    ensureSingleValue,
    buildSecurePipeline,
    escapeRegex,
    buildSearchFilter,
    sanitizeSortParams,
    buildSecurePagination,
    sanitizeProjection
};
