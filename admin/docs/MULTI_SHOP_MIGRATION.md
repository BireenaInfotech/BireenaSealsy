# 🏪 Multi-Shop Architecture Migration

## Overview
This document describes the migration from single-shop to multi-shop architecture where:
- **Superadmin**: Creates shop owners (admins)
- **Admin** (Shop Owner): Manages their own shop, creates employees, manages inventory, sales, etc.
- **Employee** (Staff): Works under an admin, can make sales, manage inventory (based on permissions)

## Changes Made

### 1. Database Models Updated ✅

#### User Model (`backend/models/User.js`)
- Added `adminId` field: References the shop owner (null for admins, populated for employees)
- Removed default admin creation logic
- Admin accounts must be created by superadmin

#### Product Model (`backend/models/Product.js`)
- Added `adminId` field (required): Links products to shop owner
- All products are scoped to a specific shop

#### Sale Model (`backend/models/Sale.js`)
- Added `adminId` field (required): Links sales to shop owner
- Sales are scoped to specific shops

#### Expense Model (`backend/models/Expense.js`)
- Added `adminId` field (required): Links expenses to shop owner

#### Discount Model (`backend/models/Discount.js`)
- Added `adminId` field (required): Discounts are shop-specific

#### Batch Model (`backend/models/Batch.js`)
- Added `adminId` field (required): Batches are shop-specific

#### DamageEntry Model (`backend/models/DamageEntry.js`)
- Added `adminId` field (required): Damage entries are shop-specific

### 2. Environment Variables Updated ✅

`.env` file:
- **REMOVED**: `ADMIN_USERNAME` and `ADMIN_PASSWORD` (no default admin)
- **KEPT**: `SUPERADMIN_USERNAME` and `SUPERADMIN_PASSWORD` (for shop admin creation)

### 3. Authentication Updated ✅

#### Admin Login (`backend/routes/auth.js`)
- Removed automatic default admin creation
- Admin must exist in database (created by superadmin)
- Added checks for account suspension and pack expiry
- Admin can only be created via superadmin panel

#### Employee Login (`backend/routes/auth.js`)
- Employee login now populates and checks `adminId`
- Validates that parent shop (admin account) is active
- Employee session includes `adminId` for data filtering

#### Employee Creation (`backend/routes/auth.js`)
- New employees get `adminId` set to their creator's admin ID
- If created by admin: `adminId = admin._id`
- If created by staff: `adminId = staff.adminId`

### 4. Middleware Updated ✅

#### Auth Middleware (`backend/middleware/auth.js`)
- Added `getAdminId(req)` helper function:
  - Returns admin's own ID if user is admin
  - Returns employee's adminId if user is staff
  - Used throughout app for data filtering

### 5. Routes To Update ⚠️

All routes that create or query data need to:

1. **Use `getAdminId()` for filtering**:
   ```javascript
   const { getAdminId } = require('../middleware/auth');
   const adminId = getAdminId(req);
   const filter = { adminId };
   ```

2. **Set `adminId` when creating records**:
   ```javascript
   const newProduct = new Product({
       name: 'Product Name',
       // ... other fields
       adminId: getAdminId(req)
   });
   ```

#### Routes Needing Updates:
- ✅ `backend/routes/auth.js` - Updated
- ✅ `backend/routes/hidden.js` - Updated
- ⚠️ `backend/routes/sales.js` - Needs update
- ⚠️ `backend/routes/inventory.js` - Needs update
- ⚠️ `backend/routes/expenses.js` - Needs update
- ⚠️ `backend/routes/dashboard.js` - Needs update
- ⚠️ `backend/routes/reports.js` - Needs update
- ⚠️ `backend/routes/employees.js` - Needs update
- ⚠️ `backend/routes/discount.js` - Needs update
- ⚠️ `backend/routes/bill.js` - Needs update
- ⚠️ `backend/routes/inventory-report.js` - Needs update
- ⚠️ `backend/routes/employee-activity.js` - Needs update
- ⚠️ `backend/routes/gst-reports.js` - Needs update

### 6. Data Migration Required ⚠️

Existing data in database needs migration:
```javascript
// For all existing products, sales, expenses, etc.
// Set adminId to the admin who created them
```

## How To Use

### Superadmin Access
1. Navigate to: `http://localhost:3000/.hidden/login`
2. Login with:
   - Username: `superadmin`
   - Password: `superadmin123`

### Create Shop Owner (Admin)
1. Login as superadmin
2. Go to admin panel
3. Fill form:
   - Username (unique)
   - Password
   - Full Name
   - Shop Name
   - Email, Phone (optional)
4. Click "Create Admin"

### Admin Login
1. Navigate to: `http://localhost:3000/login`
2. Click "Admin" tab
3. Enter credentials provided by superadmin
4. Admin can now:
   - Create employees
   - Manage products (only their shop's products)
   - View sales (only their shop's sales)
   - Manage expenses (only their shop's expenses)

### Employee Login
1. Navigate to: `http://localhost:3000/login`
2. Click "Employee" tab
3. Enter credentials provided by admin
4. Employee can access features based on their shop

## Security Benefits

1. **Data Isolation**: Each shop sees only their own data
2. **No Default Admin**: Prevents unauthorized access
3. **Centralized Control**: Superadmin manages all shops
4. **Subscription Control**: Pack expiry and suspension features
5. **Multi-Tenancy**: Multiple shops can use same system

## Next Steps

1. Update all remaining routes to use `adminId` filtering
2. Create data migration script for existing data
3. Add data seeding script for testing
4. Update all views to reflect multi-shop structure
5. Add shop name/branding to UI
6. Test thoroughly with multiple shops

---

**Status**: 🚧 IN PROGRESS
**Last Updated**: December 2, 2025
