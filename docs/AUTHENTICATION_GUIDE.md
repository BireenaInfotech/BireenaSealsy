# 🔐 Dual-Role Authentication System - Complete Guide

## Overview
This application implements a secure dual-role authentication system with **Admin** and **Employee** login capabilities, separate authentication flows, and role-based access control.

---

## 🎯 System Architecture

### **User Roles**
1. **Admin** - Full system access, can create/manage employees
2. **Employee (Staff)** - Limited access based on role permissions

### **Database Schema**
```javascript
User Model {
  fullName: String (required)
  username: String (required, unique, lowercase)
  email: String (required for staff, unique)
  phone: String (optional, 10 digits)
  password: String (required, hashed with bcrypt)
  role: String (enum: 'admin', 'staff')
  isActive: Boolean (default: true)
  createdBy: ObjectId (reference to admin who created employee)
  lastLogin: Date
  resetPasswordToken: String
  resetPasswordExpires: Date
  createdAt: Date
  updatedAt: Date
}
```

---

## 🔑 Authentication Endpoints

### **Admin Authentication**

#### 1. Admin Login
- **Endpoint**: `POST /admin/login`
- **Request Body**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Admin login successful",
  "redirectUrl": "/dashboard"
}
```
- **Features**:
  - Auto-creates default admin on first login
  - Username is case-insensitive
  - JWT token generated (24h expiry)
  - Session stored with user details
  - Last login timestamp updated

#### 2. Admin Registration
- **Endpoint**: `POST /admin/register`
- **Request Body**:
```json
{
  "fullName": "Administrator Name",
  "username": "admin2",
  "password": "securePassword123",
  "confirmPassword": "securePassword123",
  "secretKey": "admin_secret_2024"
}
```
- **Features**:
  - Optional secret key verification
  - Password must be 6+ characters
  - Usernames converted to lowercase
  - Prevents duplicate usernames

### **Employee Authentication**

#### 3. Employee Login
- **Endpoint**: `POST /employee/login`
- **Request Body**:
```json
{
  "username": "emp001",  // Can be username OR email
  "password": "employeePassword"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Welcome back, John Doe!",
  "redirectUrl": "/dashboard"
}
```
- **Features**:
  - Login with username OR email
  - Case-insensitive matching
  - Only active employees can login
  - JWT token with employee details

#### 4. Create Employee (Admin Only)
- **Endpoint**: `POST /employee/create`
- **Authorization**: Requires admin role
- **Request Body**:
```json
{
  "fullName": "John Doe",
  "username": "emp001",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "employeePass123",
  "confirmPassword": "employeePass123"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Employee John Doe created successfully",
  "employee": {
    "id": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "username": "emp001",
    "email": "john@example.com",
    "phone": "1234567890"
  }
}
```
- **Validation**:
  - All fields except phone are required
  - Email must be valid format
  - Phone must be exactly 10 digits (if provided)
  - Password minimum 6 characters
  - Username and email must be unique

#### 5. Logout
- **Endpoint**: `GET /logout` or `POST /logout`
- **Features**:
  - Destroys session
  - Clears authentication cookies
  - Redirects to login page

---

## 🛡️ Security Features

### **Password Security**
- Hashed using bcrypt with salt rounds: 12
- Minimum length: 6 characters
- Never stored or transmitted in plain text
- Pre-save hook automatically hashes passwords

### **JWT Tokens**
- Algorithm: HS256
- Expiry: 24 hours
- Payload includes: `id`, `username`, `email`, `role`
- Stored in httpOnly cookies (XSS protection)
- Verified on every authenticated request

### **Session Management**
- Express-session with secure configuration
- Session data includes user ID, role, token
- Auto-expires after 24 hours
- Cleared on logout

### **Middleware Protection**

#### `isAuthenticated`
- Verifies session exists
- Validates JWT token
- Checks token matches session
- Returns 401 for AJAX, redirects for regular requests

#### `isAdmin`
- Requires authenticated user
- Checks role === 'admin'
- Returns 403 for AJAX, redirects to dashboard for regular

#### `isEmployee`
- Requires authenticated user
- Checks role === 'staff'
- Returns 403 for AJAX, redirects for regular

#### `redirectIfAuthenticated`
- Redirects logged-in users to dashboard
- Prevents accessing login page when authenticated

---

## 🎨 Frontend Implementation

### **Login Page**
- **File**: `frontend/views/login.ejs`
- **Features**:
  - Futuristic neon design with split-screen layout
  - Role toggle between Admin and Employee
  - AJAX form submission (no page reload)
  - Real-time notifications
  - Smooth animations and transitions
  - 3D parallax tilt effect
  - Animated particles background

### **Employee Creation Page**
- **File**: `frontend/views/employees/add.ejs`
- **Access**: Admin only
- **Features**:
  - AJAX form submission
  - Client-side validation
  - Real-time feedback
  - Password confirmation
  - Phone number validation
  - Success notification with credentials

---

## 📝 Usage Examples

### **1. First-Time Setup**
```
1. Access http://localhost:3000
2. Click "Admin" tab
3. Enter:
   Username: admin
   Password: admin123
4. System auto-creates admin account
5. Redirects to dashboard
```

### **2. Create Employee Account**
```
1. Login as Admin
2. Navigate to Employees → Add Employee
3. Fill in employee details:
   - Full Name: John Doe
   - Username: johndoe
   - Email: john@example.com
   - Phone: 1234567890 (optional)
   - Password: securepass123
   - Confirm Password: securepass123
4. Click "Add Employee"
5. Note credentials for employee
```

### **3. Employee Login**
```
1. Access http://localhost:3000
2. Click "Employee" tab
3. Enter:
   Username: johndoe (or john@example.com)
   Password: securepass123
4. Redirects to dashboard
```

---

## 🔧 Environment Configuration

Add to `.env` file:
```env
# JWT Secret for token signing
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production

# Session Secret
SESSION_SECRET=your_session_secret_key_here

# Default Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Admin Registration Secret (optional)
ADMIN_SECRET_KEY=admin_secret_2024

# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Server Port
PORT=3000

# Node Environment
NODE_ENV=development
```

---

## 🔍 Testing the System

### **Test Admin Login**
```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### **Test Employee Creation**
```bash
curl -X POST http://localhost:3000/employee/create \
  -H "Content-Type: application/json" \
  -H "Cookie: authToken=YOUR_ADMIN_TOKEN" \
  -d '{
    "fullName": "Test Employee",
    "username": "testemp",
    "email": "test@example.com",
    "password": "test123",
    "confirmPassword": "test123"
  }'
```

### **Test Employee Login**
```bash
curl -X POST http://localhost:3000/employee/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testemployee@example.com",
    "password": "test123"
  }'
```

---

## 🚨 Error Handling

### **Common Errors**

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid admin credentials" | Wrong username/password | Check credentials, ensure username is 'admin' for default |
| "Invalid employee credentials" | Wrong username/password | Verify employee account exists and is active |
| "Username already exists" | Duplicate username | Choose a different username |
| "Email already exists" | Duplicate email | Choose a different email |
| "Passwords do not match" | confirmPassword !== password | Ensure passwords match |
| "Session expired" | JWT token expired | Login again |
| "Admin access required" | Non-admin accessing admin route | Login as admin |
| "Authentication required" | No session/token | Login first |

---

## 📊 Database Queries

### **Find all admins**
```javascript
User.find({ role: 'admin', isActive: true });
```

### **Find all employees**
```javascript
User.find({ role: 'staff', isActive: true });
```

### **Find employee by username or email**
```javascript
User.findOne({
  $or: [{ username: 'johndoe' }, { email: 'john@example.com' }],
  role: 'staff',
  isActive: true
});
```

### **Update employee password**
```javascript
const employee = await User.findById(employeeId);
employee.password = 'newPassword123';  // Auto-hashed by pre-save hook
await employee.save();
```

---

## 🎯 Best Practices

1. **Change default admin credentials** after first login
2. **Use strong passwords** (min 12 characters, mixed case, numbers, symbols)
3. **Store JWT_SECRET securely** - never commit to Git
4. **Enable HTTPS** in production (set secure: true for cookies)
5. **Implement rate limiting** for login attempts
6. **Add email verification** for employee accounts
7. **Implement password reset** functionality
8. **Regular security audits** of user accounts
9. **Monitor login attempts** and failed authentications
10. **Use environment-specific secrets** for dev/staging/prod

---

## 🔄 API Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User Opens Login Page                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ├─────Admin Tab────────┬──Employee Tab───┐
                      │                      │                 │
                      ▼                      ▼                 ▼
            ┌────────────────┐    ┌────────────────┐ ┌─────────────────┐
            │  Username      │    │ Username/Email │ │  Admin Creates  │
            │  Password      │    │  Password      │ │    Employee     │
            └────────┬───────┘    └────────┬───────┘ └────────┬────────┘
                     │                     │                  │
                     ▼                     ▼                  ▼
            POST /admin/login    POST /employee/login  POST /employee/create
                     │                     │                  │
                     ├─────────────────────┼──────────────────┤
                     │   Verify Password   │                  │
                     │   Generate JWT      │                  │
                     │   Create Session    │                  │
                     │   Update lastLogin  │                  │
                     └─────────┬───────────┘                  │
                               │                              │
                               ▼                              ▼
                    ┌───────────────────┐         ┌──────────────────┐
                    │  Admin Dashboard  │         │ Employee Created │
                    │  (Full Access)    │         │  Stored in DB    │
                    └───────────────────┘         └──────────────────┘
                               │
                               ▼
                    ┌───────────────────┐
                    │ Employee Dashboard│
                    │ (Limited Access)  │
                    └───────────────────┘
```

---

## 📚 File Structure

```
Bireena-Salesy/
├── backend/
│   ├── models/
│   │   └── User.js                    # Enhanced user schema
│   ├── routes/
│   │   ├── auth.js                    # Admin/Employee auth endpoints
│   │   └── employees.js               # Employee management
│   ├── middleware/
│   │   └── auth.js                    # Role-based middleware
│   └── config/
│       └── setupAdmin.js              # Admin setup script
├── frontend/
│   └── views/
│       ├── login.ejs                  # Dual-role login page
│       └── employees/
│           └── add.ejs                # Employee creation form
├── .env                               # Environment variables
└── AUTHENTICATION_GUIDE.md            # This file
```

---

## ✅ Checklist

- [x] User model with admin/staff roles
- [x] Password hashing with bcrypt (12 rounds)
- [x] JWT token generation and validation
- [x] Admin login endpoint
- [x] Employee login endpoint
- [x] Employee creation by admin only
- [x] Role-based middleware (isAdmin, isEmployee, isAuthenticated)
- [x] Session management
- [x] Login page with role toggle
- [x] AJAX form submissions
- [x] Client-side validation
- [x] Server-side validation
- [x] Error handling and notifications
- [x] Logout functionality
- [x] Password confirmation
- [x] Unique username/email validation
- [x] Last login tracking
- [x] Active user status
- [x] Created by tracking for employees

---

## 🎓 Additional Resources

- **Bcrypt Documentation**: https://github.com/kelektiv/node.bcrypt.js
- **JWT Guide**: https://jwt.io/introduction
- **Express Session**: https://github.com/expressjs/session
- **MongoDB Security**: https://docs.mongodb.com/manual/security/

---

**Built with ❤️ for Bireena Salesy Management System**

*Last Updated: November 19, 2025*
