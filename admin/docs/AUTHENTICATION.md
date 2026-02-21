# 🔐 Authentication System - Complete Guide

## Overview
The Bireena Bakery Management System now features a dual authentication system with JWT tokens:
- **Admin Login**: Username + Password authentication
- **Employee Login**: Email + Password authentication

## 🎯 Key Features

### 1. Dual Login System
- **Two login tabs** on the login page
- **Admin Authentication**: Uses username (default: admin/admin123)
- **Employee Authentication**: Uses email and password
- **JWT Tokens**: Secure token-based authentication with 24-hour expiry
- **Session Management**: Combined with traditional sessions for flexibility

### 2. User Roles
- **Admin Role**: Full access to all features including employee management
- **Staff Role**: Access to sales, inventory, and reports (no admin features)

### 3. JWT Token Implementation
- Token generated on successful login
- Stored in HTTP-only cookies
- 24-hour expiration time
- Verified on each protected route
- Automatically cleared on logout

## 📋 How to Use

### Admin Login
1. Go to http://localhost:3000/login
2. Click **"Admin"** tab (default selected)
3. Enter:
   - **Username**: admin
   - **Password**: admin123
4. Click **"Login as Admin"**

### Employee Login
1. Go to http://localhost:3000/login
2. Click **"Employee"** tab
3. Enter:
   - **Email**: (employee's registered email)
   - **Password**: (employee's password)
4. Click **"Login as Employee"**

### Adding Employees (Admin Only)
1. Login as admin
2. Navigate to **Employees** in the menu
3. Click **"Add Employee"**
4. Fill in:
   - Username (min 3 characters)
   - Email address
   - Password (min 6 characters)
5. Click **"Add Employee"**
6. Employee can now login using their email

### Managing Employees (Admin Only)
- **View All Employees**: See list with username, email, role, created date
- **Edit Employee**: Update username, email, or reset password
- **Delete Employee**: Remove employee access (they cannot login anymore)

## 🔧 Technical Details

### Database Schema Updates
**User Model** now includes:
```javascript
{
  username: String (required, unique),
  email: String (required for staff, unique),
  password: String (hashed with bcrypt),
  role: String (enum: 'admin' or 'staff'),
  createdAt: Date
}
```

### JWT Token Structure
```javascript
{
  id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  exp: 24 hours from creation
}
```

### Environment Variables
Make sure your `.env` has:
```
JWT_SECRET=your_jwt_secret_key_here_change_in_production
SESSION_SECRET=your_session_secret_here_change_in_production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Superadmin credentials (for creating multiple shop admins via hidden route)
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=superadmin123
```

## 🔑 Superadmin Hidden Route (Multi-Shop Setup)

For managing multiple shops, you can create admin accounts programmatically using the **hidden superadmin route**.

### Hidden Route Endpoint
```
POST /.hidden/create-admin
```

### Authentication Methods

**Method 1: HTTP Basic Authorization (Recommended)**
```powershell
# PowerShell example
$cred = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("superadmin:superadmin123"))
Invoke-RestMethod -Uri http://localhost:3000/.hidden/create-admin -Method POST `
  -Headers @{ Authorization = "Basic $cred" } `
  -Body (@{ 
    username = "shop1admin"; 
    password = "SecurePass123!"; 
    fullName = "Shop 1 Manager";
    shopName = "Shop 1 Branch"
  } | ConvertTo-Json) `
  -ContentType 'application/json'
```

```bash
# curl example
curl -u superadmin:superadmin123 -X POST http://localhost:3000/.hidden/create-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"shop1admin","password":"SecurePass123!","fullName":"Shop 1 Manager","shopName":"Shop 1 Branch"}'
```

**Method 2: Body Fields (Quick Testing)**
```bash
curl -X POST http://localhost:3000/.hidden/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "superadmin_username":"superadmin",
    "superadmin_password":"superadmin123",
    "username":"shop2admin",
    "password":"SecurePass456!",
    "fullName":"Shop 2 Manager"
  }'
```

### Request Body Fields
- **username** (required): Unique admin username
- **password** (required): Strong password (min 6 chars)
- **fullName** (optional): Admin's full name
- **email** (optional): Admin's email
- **phone** (optional): 10-digit phone number
- **shopName** (optional): Shop/branch name

### Response Codes
- **201 Created**: Admin successfully created
  ```json
  { "message": "Admin created", "id": "mongodb_object_id" }
  ```
- **400 Bad Request**: Missing required fields
- **401 Unauthorized**: Invalid superadmin credentials
- **409 Conflict**: Username already exists
- **500 Server Error**: Database or server issue

### Security Notes
⚠️ **IMPORTANT**: 
- Change `SUPERADMIN_USERNAME` and `SUPERADMIN_PASSWORD` in production
- Never commit `.env` with production secrets to public repositories
- Consider IP restrictions or VPN-only access to this route
- Disable or remove this route after provisioning admins if not needed
- Use strong, unique passwords for each shop admin

## 🛡️ Security Features

1. **Password Hashing**: All passwords hashed with bcryptjs (10 rounds)
2. **HTTP-Only Cookies**: JWT tokens stored securely
3. **Token Verification**: Every protected route verifies token
4. **Session Expiry**: Automatic logout after 24 hours
5. **Role-Based Access**: Admin-only routes protected
6. **Email Validation**: Valid email format required for employees

## 📱 User Interface

### Login Page Features
- **Tabbed Interface**: Switch between Admin/Employee login
- **Animated Transitions**: Smooth tab switching
- **Form Validation**: Client-side and server-side validation
- **Error Messages**: Clear feedback on login failures
- **Gradient Design**: Modern purple gradient background
- **Responsive**: Works on mobile and desktop

### Employee Management Pages
- **List View**: Table with all employees
- **Add Form**: User-friendly employee creation
- **Edit Form**: Update employee details
- **Delete Confirmation**: Prevent accidental deletion

## 🚀 API Endpoints

### Authentication Routes
```
GET  /login              - Show login page
POST /login              - Process login (admin or employee)
GET  /logout             - Logout and clear tokens
```

### Employee Management Routes (Admin Only)
```
GET  /employees          - List all employees
GET  /employees/add      - Show add employee form
POST /employees/add      - Create new employee
GET  /employees/edit/:id - Show edit employee form
POST /employees/edit/:id - Update employee
POST /employees/delete/:id - Delete employee
```

## 🔐 Middleware Protection

### isAuthenticated
- Checks if user is logged in
- Verifies JWT token validity
- Redirects to login if unauthorized

### isAdmin
- Checks if user has admin role
- Protects admin-only routes
- Redirects to dashboard if not admin

### redirectIfAuthenticated
- Prevents logged-in users from accessing login page
- Redirects authenticated users to dashboard

## 📊 Protected Routes

### All Users (After Login)
- Dashboard
- New Sale
- Sales List
- Inventory (view, add, edit)
- Reports
- Bill viewing and printing

### Admin Only
- Employee Management
- Discount Management
- Delete operations

## 🎨 Visual Indicators

- **Admin Badge**: Shows "Admin" role in navbar dropdown
- **Staff Badge**: Shows "Staff" role in navbar dropdown
- **Email Icon**: Displayed for employee login
- **Shield Icon**: Displayed for admin features
- **People Icon**: Employee management menu item

## 🐛 Troubleshooting

### "Invalid credentials" error
- Check username/email spelling
- Verify password is correct
- Ensure employee account exists (admin must create it)

### "Session expired" message
- JWT token expired (24 hours)
- Login again to get new token

### Cannot access Employees menu
- Only admin can see this menu
- Login with admin account

### Email already registered
- Each email must be unique
- Use different email for new employee

## 📝 Best Practices

1. **Change Default Admin Password**: Update ADMIN_PASSWORD in .env
2. **Use Strong Passwords**: Minimum 6 characters for employees
3. **Unique Emails**: Each employee needs unique email
4. **Regular Password Updates**: Change passwords periodically
5. **JWT Secret Security**: Use long random string for JWT_SECRET

## 🔄 Workflow Example

### Day 1: Setup
1. Admin logs in with default credentials
2. Admin adds first employee (username: john, email: john@bakery.com)
3. Employee can now login with their email

### Daily Operations
1. **Morning**: Admin logs in, checks low stock
2. **Sales**: Staff logs in, processes customer orders
3. **Evening**: Admin reviews reports, manages inventory
4. **Night**: All users logout automatically after 24 hours

## 🆕 What's New

✅ **Email-based employee login**
✅ **JWT token authentication**
✅ **Cookie-based token storage**
✅ **Employee CRUD operations**
✅ **Tabbed login interface**
✅ **Role-based menu visibility**
✅ **Session expiry with token verification**
✅ **HTTP-only cookie security**

## 📦 Dependencies

- `jsonwebtoken`: ^9.0.2 - JWT token generation/verification
- `cookie-parser`: Latest - Parse cookies from requests
- `bcryptjs`: ^2.4.3 - Password hashing
- `express-session`: ^1.17.3 - Session management

## 🎯 Future Enhancements

- [ ] Forgot password functionality
- [ ] Email verification on registration
- [ ] Two-factor authentication (2FA)
- [ ] Password strength indicator
- [ ] Employee profile pages
- [ ] Activity logs
- [ ] Role permissions customization

---

**Version**: 3.0
**Last Updated**: November 18, 2025
**Status**: ✅ Fully Implemented

🔐 **Secure. Simple. Professional.**
