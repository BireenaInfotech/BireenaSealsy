# 🏗️ Salesy - Complete MVC Structure & Architecture

## 📁 Project Structure Overview

```
Salesy/admin/
│
├── 🎯 server.js                    # Main entry point & Express setup
├── 📦 package.json                 # Dependencies & npm scripts
├── 🔐 .env                         # Environment variables (secrets)
├── ⚙️ vercel.json                  # Vercel deployment configuration
├── ⚙️ webpack.config.js            # Webpack bundling config
│
├── 📂 backend/                     # Backend (MVC - Models & Controllers)
│   ├── 📂 config/                  # Configuration & setup files
│   │   ├── database.js             # MongoDB connection manager
│   │   ├── setupAdmin.js           # Admin account setup
│   │   ├── updateAdmin.js          # Admin credentials updater
│   │   └── createTestEmployee.js   # Test employee creator
│   │
│   ├── 📂 models/                  # 🗄️ Models (M in MVC) - Data Layer
│   │   ├── User.js                 # User/Admin/Staff schema
│   │   ├── Product.js              # Product/inventory schema
│   │   ├── Sale.js                 # Sales transaction schema
│   │   ├── Batch.js                # Product batch tracking
│   │   ├── StockHistory.js         # Stock movement history
│   │   ├── StockTransfer.js        # Inter-branch stock transfers
│   │   ├── DamageEntry.js          # Damaged goods tracking
│   │   ├── DailyInventoryReport.js # Daily inventory snapshots
│   │   ├── Discount.js             # Discount/offers schema
│   │   ├── Expense.js              # Business expense tracking
│   │   └── GSTSettings.js          # GST configuration & rules
│   │
│   ├── 📂 routes/                  # 🎮 Controllers (C in MVC) - Business Logic
│   │   ├── auth.js                 # Authentication & authorization
│   │   ├── dashboard.js            # Main dashboard & overview
│   │   ├── inventory.js            # Product/stock management
│   │   ├── inventory-report.js     # Inventory reports & analytics
│   │   ├── sales.js                # Sales/billing operations
│   │   ├── bill.js                 # Bill viewing & printing
│   │   ├── discount.js             # Discount management
│   │   ├── expenses.js             # Expense tracking & reports
│   │   ├── reports.js              # General reports & analytics
│   │   ├── gst-reports.js          # GST reports (B2B, B2C, GSTR)
│   │   ├── employees.js            # Employee management (CRUD)
│   │   ├── employee-activity.js    # Activity tracking & logs
│   │   ├── profile.js              # User profile management
│   │   ├── contact.js              # Contact form handling
│   │   └── hidden.js               # Hidden/admin-only routes
│   │
│   ├── 📂 middleware/              # 🛡️ Middleware Layer
│   │   ├── auth.js                 # Authentication & role checks
│   │   └── database.js             # DB connection middleware
│   │
│   ├── 📂 utils/                   # 🔧 Utility Functions
│   │   ├── sms.js                  # SMS service (Twilio integration)
│   │   └── timezone.js             # Timezone handling (UTC ↔ IST)
│   │
│   └── 📂 scripts/                 # 🔨 Database & management scripts
│
├── 📂 frontend/                    # Frontend (V in MVC) - Presentation Layer
│   ├── 📂 views/                   # 👁️ Views (V in MVC) - EJS Templates
│   │   ├── 📂 partials/            # Reusable UI components
│   │   │   └── navbar.ejs          # Navigation bar with auth state
│   │   │
│   │   ├── 📂 sales/               # Sales module views
│   │   │   ├── list.ejs            # Sales history with filters
│   │   │   ├── new.ejs             # New sale/billing form
│   │   │   ├── cancel.ejs          # Sale cancellation form
│   │   │   └── 📂 partials/        # Sales table components
│   │   │       ├── sales-table-header.ejs
│   │   │       └── sales-table-row.ejs
│   │   │
│   │   ├── 📂 bill/                # Bill viewing & printing
│   │   │   ├── view.ejs            # Bill details view
│   │   │   └── print.ejs           # Printable bill format
│   │   │
│   │   ├── 📂 inventory/           # Inventory management views
│   │   │   ├── list.ejs            # Product listing & search
│   │   │   ├── add.ejs             # Add new product form
│   │   │   ├── edit.ejs            # Edit product form
│   │   │   ├── batches.ejs         # Batch management
│   │   │   ├── damage-entry.ejs    # Record damaged goods
│   │   │   └── stock-transfer.ejs  # Inter-branch transfers
│   │   │
│   │   ├── 📂 discount/            # Discount management
│   │   │   ├── list.ejs            # Active/inactive discounts
│   │   │   └── add.ejs             # Create discount offer
│   │   │
│   │   ├── 📂 reports/             # Reports & analytics
│   │   │   ├── index.ejs           # Reports dashboard
│   │   │   ├── add-expense.ejs     # Expense entry form
│   │   │   ├── inventory.ejs       # Inventory reports
│   │   │   ├── gst-summary.ejs     # GST summary reports
│   │   │   └── gst-detailed.ejs    # Detailed GST reports
│   │   │
│   │   ├── 📂 employees/           # Employee management
│   │   │   ├── list.ejs            # Employee roster
│   │   │   ├── add.ejs             # Add employee form
│   │   │   ├── edit.ejs            # Edit employee details
│   │   │   └── activity.ejs        # Activity tracking view
│   │   │
│   │   ├── 📂 profile/             # User profile management
│   │   │   ├── view.ejs            # View profile details
│   │   │   ├── edit.ejs            # Edit profile form
│   │   │   └── change-password.ejs # Password change form
│   │   │
│   │   ├── dashboard.ejs           # Main dashboard (post-login)
│   │   ├── home.ejs                # Landing page (public)
│   │   ├── login.ejs               # User login page
│   │   ├── register.ejs            # New user registration
│   │   ├── about.ejs               # About page (public)
│   │   ├── features.ejs            # Features showcase
│   │   ├── pricing.ejs             # Pricing plans
│   │   ├── contact.ejs             # Contact form
│   │   └── reset-password.ejs      # Password reset flow
│   │
│   ├── 📂 public/                  # Static assets (served directly)
│   │   ├── 📂 css/                 # Stylesheets
│   │   │   └── style.css           # Main stylesheet
│   │   ├── 📂 js/                  # Client-side JavaScript
│   │   │   └── auth-protection.js  # Browser session handling
│   │   └── 📂 images/              # Images & logos
│   │
│   └── 📂 components/              # Reusable frontend components
│
├── 📂 scripts/                     # 🔨 Standalone utility scripts
│   ├── add-sample-products.js      # Seed sample products
│   ├── check-shop-data.js          # Verify shop configuration
│   ├── complete-system-check.js    # Full system health check
│   ├── fix-product-owners.js       # Fix product ownership
│   ├── migrate-branches.js         # Branch data migration
│   ├── setup-gst-settings.js       # Initialize GST config
│   └── test-*.js                   # Various test scripts
│
└── 📂 docs/                        # 📚 Documentation
    ├── MVC_STRUCTURE.md            # This file - Architecture docs
    ├── AUTHENTICATION_GUIDE.md     # Auth implementation guide
    ├── DEPLOYMENT_GUIDE.md         # Production deployment
    ├── GST_IMPLEMENTATION.md       # GST system documentation
    ├── SECURITY_BEST_PRACTICES.md  # Security guidelines
    └── ... (30+ documentation files)

```

---

## 🛣️ Complete Routes Structure

### 🔐 Authentication Routes (`backend/routes/auth.js`)

| Method | Route | Description | Auth Required | Role |
|--------|-------|-------------|---------------|------|
| GET | `/` | Landing/home page | ❌ | Public |
| GET | `/features` | Features showcase | ❌ | Public |
| GET | `/about` | About page | ❌ | Public |
| GET | `/contact` | Contact form page | ❌ | Public |
| GET | `/pricing` | Pricing plans | ❌ | Public |
| POST | `/api/contact` | Submit contact form | ❌ | Public |
| GET | `/login` | Login page | ❌ | Public |
| POST | `/login` | Process login | ❌ | Public |
| GET | `/register` | Registration page | ❌ | Public |
| POST | `/register` | Create new account | ❌ | Public |
| GET | `/logout` | Logout (GET method) | ✅ | All |
| POST | `/logout` | Logout (POST method) | ✅ | All |
| GET | `/reset-password` | Password reset page | ❌ | Public |
| POST | `/reset-password` | Send reset email | ❌ | Public |
| GET | `/reset-password/:token` | Reset password form | ❌ | Public |
| POST | `/reset-password/:token` | Process password reset | ❌ | Public |
| GET | `/api/check-auth` | Check session validity | ✅ | All |
| GET | `/test-timezone` | Test timezone conversion | ❌ | Dev Only |

---

### 📊 Dashboard Routes (`backend/routes/dashboard.js`)

| Method | Route | Description | Auth Required | Role |
|--------|-------|-------------|---------------|------|
| GET | `/dashboard` | Main dashboard with KPIs | ✅ | Admin/Staff |

**Dashboard displays:**
- Today's sales summary
- Total revenue
- Product count & low stock alerts
- Recent transactions
- Quick action buttons
- Branch-wise statistics (for admin)

---

### 📦 Inventory Routes (`backend/routes/inventory.js`)

| Method | Route | Description | Auth Required | Role |
|--------|-------|-------------|---------------|------|
| GET | `/inventory` | Product list with filters | ✅ | Admin/Staff |
| GET | `/inventory/add` | Add product form | ✅ | Admin/Staff |
| POST | `/inventory/add` | Create new product | ✅ | Admin/Staff |
| GET | `/inventory/edit/:id` | Edit product form | ✅ | Admin/Staff |
| POST | `/inventory/edit/:id` | Update product details | ✅ | Admin/Staff |
| DELETE | `/inventory/delete/:id` | Delete product | ✅ | Admin/Staff |
| POST | `/inventory/update-stock/:id` | Update stock quantity | ✅ | Admin/Staff |
| GET | `/inventory/batches` | View batch management | ✅ | Admin/Staff |
| POST | `/inventory/batch/add` | Add product batch | ✅ | Admin/Staff |
| GET | `/inventory/damage-entry` | Record damaged goods | ✅ | Admin/Staff |
| POST | `/inventory/damage-entry` | Submit damage entry | ✅ | Admin/Staff |
| GET | `/inventory/stock-transfer` | Stock transfer page | ✅ | Admin |
| POST | `/inventory/stock-transfer` | Transfer stock | ✅ | Admin |
| GET | `/api/products/search` | Search products (API) | ✅ | Admin/Staff |
| GET | `/api/products/:id` | Get product details | ✅ | Admin/Staff |

---

### 📈 Inventory Reports (`backend/routes/inventory-report.js`)

| Method | Route | Description | Auth Required | Role |
|--------|-------|-------------|---------------|------|
| GET | `/inventory-reports` | Inventory reports page | ✅ | Admin/Staff |
| GET | `/inventory-reports/stock-status` | Current stock status | ✅ | Admin/Staff |
| GET | `/inventory-reports/low-stock` | Low stock alerts | ✅ | Admin/Staff |
| GET | `/inventory-reports/expiry` | Expiry tracking | ✅ | Admin/Staff |
| GET | `/inventory-reports/damage` | Damage history | ✅ | Admin/Staff |
| GET | `/inventory-reports/movement` | Stock movement history | ✅ | Admin/Staff |
| GET | `/api/inventory/daily-report` | Daily inventory snapshot | ✅ | Admin/Staff |

---

### 💰 Sales Routes (`backend/routes/sales.js`)

| Method | Route | Description | Auth Required | Role |
|--------|-------|-------------|---------------|------|
| GET | `/sales` | Sales history with filters | ✅ | Admin/Staff |
| GET | `/sales/new` | New sale/billing form | ✅ | Admin/Staff |
| POST | `/sales/create` | Create sale transaction | ✅ | Admin/Staff |
| GET | `/sales/:id` | View sale details | ✅ | Admin/Staff |
| POST | `/sales/clear-due/:id` | Clear due payment | ✅ | Admin/Staff |
| GET | `/sales/cancel/:id` | Cancel sale page | ✅ | Admin/Staff |
| POST | `/sales/cancel/:id` | Process sale cancellation | ✅ | Admin/Staff |
| POST | `/api/sales/validate-cart` | Validate cart items (API) | ✅ | Admin/Staff |
| POST | `/api/sales/calculate-total` | Calculate totals (API) | ✅ | Admin/Staff |
| GET | `/api/sales/stats` | Sales statistics | ✅ | Admin/Staff |

**Key Features:**
- Real-time stock validation
- Backend price verification (security)
- Automatic GST calculation
- Multiple payment methods
- Due payment tracking
- SMS notification on bill

---

### 🧾 Bill Routes (`backend/routes/bill.js`)

| Method | Route | Description | Auth Required | Role |
|--------|-------|-------------|---------------|------|
| GET | `/bill/:id` | View bill details | ✅ | Admin/Staff |
| GET | `/bill/print/:id` | Print-ready bill format | ✅ | Admin/Staff |
| POST | `/bill/resend-sms/:id` | Resend bill SMS | ✅ | Admin/Staff |
| GET | `/api/bill/:id` | Get bill data (API) | ✅ | Admin/Staff |

---

### 🏷️ Discount Routes (`backend/routes/discount.js`)

| Method | Route | Description | Auth Required | Role |
|--------|-------|-------------|---------------|------|
| GET | `/discount` | Discount list | ✅ | Admin |
| GET | `/discount/add` | Add discount form | ✅ | Admin |
| POST | `/discount/add` | Create discount offer | ✅ | Admin |
| POST | `/discount/toggle/:id` | Toggle active status | ✅ | Admin |
| DELETE | `/discount/delete/:id` | Delete discount | ✅ | Admin |
| GET | `/api/discounts/active` | Get active discounts | ✅ | Admin/Staff |

**Discount Types:**
- Percentage-based (e.g., 10% off)
- Fixed amount (e.g., ₹50 off)
- Minimum purchase requirement
- Auto-apply on eligible orders

---

### 💸 Expense Routes (`backend/routes/expenses.js`)

| Method | Route | Description | Auth Required | Role |
|--------|-------|-------------|---------------|------|
| GET | `/expenses` | Expense list | ✅ | Admin |
| GET | `/expenses/add` | Add expense form | ✅ | Admin |
| POST | `/expenses/add` | Create expense entry | ✅ | Admin |
| GET | `/expenses/edit/:id` | Edit expense form | ✅ | Admin |
| POST | `/expenses/edit/:id` | Update expense | ✅ | Admin |
| DELETE | `/expenses/delete/:id` | Delete expense | ✅ | Admin |
| GET | `/api/expenses/summary` | Expense summary | ✅ | Admin |

**Expense Categories:**
- Rent & Utilities
- Salaries & Wages
- Raw Materials
- Marketing
- Maintenance
- Other

---

### 📈 Reports Routes (`backend/routes/reports.js`)

| Method | Route | Description | Auth Required | Role |
|--------|-------|-------------|---------------|------|
| GET | `/reports` | Reports dashboard | ✅ | Admin/Staff |
| GET | `/reports/sales` | Sales reports | ✅ | Admin/Staff |
| GET | `/reports/profit-loss` | P&L statement | ✅ | Admin |
| GET | `/reports/inventory` | Inventory reports | ✅ | Admin/Staff |
| GET | `/reports/employee` | Employee performance | ✅ | Admin |
| GET | `/api/reports/sales-data` | Sales data (API) | ✅ | Admin/Staff |
| GET | `/api/reports/chart-data` | Chart data (API) | ✅ | Admin/Staff |

**Report Types:**
- Daily/Weekly/Monthly Sales
- Product-wise analysis
- Category-wise performance
- Payment method breakdown
- Branch comparison (multi-shop)
- Employee performance metrics

---

### 📊 GST Reports (`backend/routes/gst-reports.js`)

| Method | Route | Description | Auth Required | Role |
|--------|-------|-------------|---------------|------|
| GET | `/gst-reports` | GST reports dashboard | ✅ | Admin |
| GET | `/gst-reports/summary` | GST summary report | ✅ | Admin |
| GET | `/gst-reports/b2b` | B2B invoice report | ✅ | Admin |
| GET | `/gst-reports/b2c` | B2C invoice report | ✅ | Admin |
| GET | `/gst-reports/gstr1` | GSTR-1 report | ✅ | Admin |
| GET | `/gst-reports/export` | Export GST data | ✅ | Admin |
| GET | `/api/gst/calculate` | Calculate GST (API) | ✅ | Admin/Staff |

**GST Features:**
- Automatic tax calculation
- CGST, SGST, IGST handling
- HSN code management
- State-wise tax rules
- GSTR-1 ready format
- Excel export support

---

### 👥 Employee Routes (`backend/routes/employees.js`)

| Method | Route | Description | Auth Required | Role |
|--------|-------|-------------|---------------|------|
| GET | `/employees` | Employee list | ✅ | Admin |
| GET | `/employees/add` | Add employee form | ✅ | Admin |
| POST | `/employees/add` | Create employee account | ✅ | Admin |
| GET | `/employees/edit/:id` | Edit employee form | ✅ | Admin |
| POST | `/employees/edit/:id` | Update employee details | ✅ | Admin |
| POST | `/employees/toggle/:id` | Toggle active status | ✅ | Admin |
| DELETE | `/employees/delete/:id` | Delete employee | ✅ | Admin |
| GET | `/api/employees/stats` | Employee statistics | ✅ | Admin |

---

### 📋 Employee Activity (`backend/routes/employee-activity.js`)

| Method | Route | Description | Auth Required | Role |
|--------|-------|-------------|---------------|------|
| GET | `/employee-activity` | Activity dashboard | ✅ | Admin |
| GET | `/employee-activity/:id` | Employee activity details | ✅ | Admin |
| GET | `/api/activity/logs` | Activity logs (API) | ✅ | Admin |

**Tracked Activities:**
- Login/Logout times
- Sales created
- Products added/edited
- Stock updates
- Daily performance metrics

---

### 👤 Profile Routes (`backend/routes/profile.js`)

| Method | Route | Description | Auth Required | Role |
|--------|-------|-------------|---------------|------|
| GET | `/profile` | View own profile | ✅ | Admin/Staff |
| GET | `/profile/edit` | Edit profile form | ✅ | Admin/Staff |
| POST | `/profile/edit` | Update profile | ✅ | Admin/Staff |
| GET | `/profile/change-password` | Change password page | ✅ | Admin |
| POST | `/profile/change-password` | Update password | ✅ | Admin |

---

### 📧 Contact Routes (`backend/routes/contact.js`)

| Method | Route | Description | Auth Required | Role |
|--------|-------|-------------|---------------|------|
| POST | `/contact` | Submit contact form | ❌ | Public |
| POST | `/api/contact` | Contact form API | ❌ | Public |

---

### 🔒 Hidden/Admin Routes (`backend/routes/hidden.js`)

| Method | Route | Description | Auth Required | Role |
|--------|-------|-------------|---------------|------|
| GET | `/admin/system-check` | System health check | ✅ | Admin |
| GET | `/admin/database-info` | Database statistics | ✅ | Admin |
| POST | `/admin/reset-demo` | Reset demo data | ✅ | Admin |
| GET | `/admin/logs` | View system logs | ✅ | Admin |

---

## 🗄️ Database Models (MongoDB Schemas)

### 👤 User Model (`backend/models/User.js`)
```javascript
{
  fullName: String,              // Full name of user
  username: String,              // Unique username (required)
  email: String,                 // Email address
  phone: String,                 // Contact number
  shopName: String,              // Shop/business name
  shopGST: String,               // GST number (GSTIN)
  shopAddress: String,           // Shop address
  shopState: String,             // State for GST
  shopStateCode: String,         // State code (01-37)
  branch: String,                // Employee branch assignment
  password: String,              // Hashed password (bcrypt)
  role: String,                  // 'admin' or 'staff'
  isActive: Boolean,             // Account status (default: true)
  createdBy: ObjectId,           // Reference to User who created
  resetPasswordToken: String,    // Password reset token
  resetPasswordExpires: Date,    // Token expiry
  lastLogin: Date,               // Last login timestamp
  permissions: [String],         // Custom permissions array
  createdAt: Date,               // Account creation (UTC)
  updatedAt: Date                // Last update (UTC)
}
```

---

### 📦 Product Model (`backend/models/Product.js`)
```javascript
{
  name: String,                  // Product name (required)
  category: String,              // Category (Bread, Cake, Grocery, etc.)
  price: Number,                 // Selling price per unit
  costPrice: Number,             // Purchase/cost price
  stock: Number,                 // Current stock quantity
  minStock: Number,              // Minimum stock level (alert threshold)
  unit: String,                  // Unit (kg, pieces, liter, etc.)
  hsnCode: String,               // HSN code for GST
  gstRate: Number,               // GST rate (0, 5, 12, 18, 28)
  cess: Number,                  // Cess percentage (if applicable)
  barcode: String,               // Barcode/SKU
  description: String,           // Product description
  image: String,                 // Image URL/path
  isActive: Boolean,             // Active status (default: true)
  expiryDate: Date,              // Product expiry date
  batchEnabled: Boolean,         // Enable batch tracking
  adminId: ObjectId,             // Owner/shop admin reference
  addedBy: ObjectId,             // User who added (reference)
  branch: String,                // Branch/location
  createdAt: Date,               // Creation timestamp (UTC)
  updatedAt: Date                // Last update (UTC)
}
```

---

### 📦 Batch Model (`backend/models/Batch.js`)
```javascript
{
  productId: ObjectId,           // Reference to Product
  batchNumber: String,           // Unique batch number
  quantity: Number,              // Quantity in this batch
  costPrice: Number,             // Purchase price for batch
  manufacturingDate: Date,       // Manufacturing date
  expiryDate: Date,              // Expiry date
  supplier: String,              // Supplier name
  invoiceNumber: String,         // Purchase invoice number
  isActive: Boolean,             // Active status
  adminId: ObjectId,             // Shop owner reference
  branch: String,                // Branch/location
  createdBy: ObjectId,           // User who created
  createdAt: Date,               // Creation timestamp
  updatedAt: Date                // Last update
}
```

---

### 📊 Stock History Model (`backend/models/StockHistory.js`)
```javascript
{
  productId: ObjectId,           // Reference to Product
  productName: String,           // Product name (for records)
  type: String,                  // 'in', 'out', 'transfer', 'damage', 'adjustment'
  quantity: Number,              // Quantity changed
  previousStock: Number,         // Stock before change
  newStock: Number,              // Stock after change
  reason: String,                // Reason for stock change
  referenceId: ObjectId,         // Reference to Sale/Transfer/etc
  referenceType: String,         // 'sale', 'purchase', 'transfer', 'damage'
  batchId: ObjectId,             // Reference to Batch (if applicable)
  adminId: ObjectId,             // Shop owner reference
  branch: String,                // Branch/location
  createdBy: ObjectId,           // User who made change
  createdAt: Date                // Timestamp (UTC)
}
```

---

### 🔄 Stock Transfer Model (`backend/models/StockTransfer.js`)
```javascript
{
  productId: ObjectId,           // Reference to Product
  productName: String,           // Product name
  quantity: Number,              // Transfer quantity
  fromBranch: String,            // Source branch
  toBranch: String,              // Destination branch
  status: String,                // 'pending', 'completed', 'cancelled'
  reason: String,                // Transfer reason
  transferredBy: ObjectId,       // User who initiated
  acceptedBy: ObjectId,          // User who accepted
  adminId: ObjectId,             // Shop owner reference
  createdAt: Date,               // Transfer initiation
  completedAt: Date,             // Transfer completion
  updatedAt: Date                // Last update
}
```

---

### 💔 Damage Entry Model (`backend/models/DamageEntry.js`)
```javascript
{
  productId: ObjectId,           // Reference to Product
  productName: String,           // Product name
  quantity: Number,              // Damaged quantity
  costValue: Number,             // Cost of damaged goods
  reason: String,                // Damage reason
  description: String,           // Detailed description
  batchId: ObjectId,             // Reference to Batch (if applicable)
  adminId: ObjectId,             // Shop owner reference
  branch: String,                // Branch/location
  reportedBy: ObjectId,          // User who reported
  createdAt: Date                // Report timestamp
}
```

---

### 📋 Daily Inventory Report Model (`backend/models/DailyInventoryReport.js`)
```javascript
{
  date: Date,                    // Report date (midnight UTC)
  adminId: ObjectId,             // Shop owner reference
  branch: String,                // Branch/location
  totalProducts: Number,         // Total product count
  totalStockValue: Number,       // Total inventory value
  lowStockCount: Number,         // Products below min stock
  outOfStockCount: Number,       // Products with 0 stock
  expiringCount: Number,         // Products expiring soon
  products: [{                   // Snapshot of each product
    productId: ObjectId,
    name: String,
    stock: Number,
    value: Number,
    status: String
  }],
  generatedBy: ObjectId,         // User/system who generated
  createdAt: Date                // Generation timestamp
}
```

---

### 💰 Sale Model (`backend/models/Sale.js`)
```javascript
{
  billNumber: String,            // Unique bill number (auto-generated)
  items: [{                      // Cart items
    product: ObjectId,           // Product reference
    productName: String,         // Product name (snapshot)
    quantity: Number,            // Quantity sold
    price: Number,               // Unit price (at time of sale)
    gstRate: Number,             // GST rate applied
    cgst: Number,                // CGST amount
    sgst: Number,                // SGST amount
    igst: Number,                // IGST amount
    subtotal: Number,            // Item subtotal (with GST)
    batchId: ObjectId            // Batch reference (if applicable)
  }],
  subtotal: Number,              // Total before discount
  discount: Number,              // Discount amount
  discountType: String,          // 'percentage' or 'fixed'
  discountReason: String,        // Discount description
  totalGST: Number,              // Total GST amount
  total: Number,                 // Final payable amount
  roundOff: Number,              // Round off amount
  amountPaid: Number,            // Amount received
  dueAmount: Number,             // Remaining due amount
  paymentStatus: String,         // 'paid', 'partial', 'due'
  paymentMethod: String,         // 'cash', 'card', 'upi', 'online'
  
  // Customer details
  customerName: String,          // Customer name
  customerPhone: String,         // Customer phone
  customerGST: String,           // Customer GSTIN (for B2B)
  customerAddress: String,       // Customer address
  customerState: String,         // Customer state
  customerStateCode: String,     // Customer state code
  
  // Tax & compliance
  isInterState: Boolean,         // Inter-state transaction
  placeOfSupply: String,         // Place of supply
  invoiceType: String,           // 'B2B', 'B2C'
  
  // SMS & notifications
  smsSent: Boolean,              // SMS sent status
  smsTimestamp: Date,            // SMS sent time
  
  // Payment tracking
  paymentHistory: [{             // Payment installments
    amount: Number,
    method: String,
    date: Date,
    receivedBy: ObjectId
  }],
  
  // Cancellation
  isCancelled: Boolean,          // Cancellation status
  cancelledAt: Date,             // Cancellation timestamp
  cancelledBy: ObjectId,         // User who cancelled
  cancellationReason: String,    // Cancellation reason
  refundAmount: Number,          // Refund amount
  refundMethod: String,          // Refund method
  refundProcessedBy: ObjectId,   // User who processed refund
  refundNotes: String,           // Refund notes
  
  // Metadata
  adminId: ObjectId,             // Shop owner reference
  branch: String,                // Branch/location
  createdBy: ObjectId,           // User who created sale
  createdAt: Date,               // Sale timestamp (UTC)
  updatedAt: Date                // Last update (UTC)
}
```

---

### 🏷️ Discount Model (`backend/models/Discount.js`)
```javascript
{
  name: String,                  // Discount name/title
  description: String,           // Discount description
  type: String,                  // 'percentage' or 'fixed'
  value: Number,                 // Discount value
  minPurchase: Number,           // Minimum purchase amount
  maxDiscount: Number,           // Max discount cap (for percentage)
  validFrom: Date,               // Start date
  validTill: Date,               // End date
  applicableOn: String,          // 'all', 'category', 'product'
  categories: [String],          // Applicable categories
  products: [ObjectId],          // Applicable products
  isActive: Boolean,             // Active status
  usageLimit: Number,            // Max usage count
  usageCount: Number,            // Current usage count
  adminId: ObjectId,             // Shop owner reference
  createdBy: ObjectId,           // User who created
  createdAt: Date,               // Creation timestamp
  updatedAt: Date                // Last update
}
```

---

### 💸 Expense Model (`backend/models/Expense.js`)
```javascript
{
  category: String,              // Expense category
  subcategory: String,           // Subcategory
  amount: Number,                // Expense amount
  description: String,           // Description/notes
  paymentMethod: String,         // Payment method
  invoiceNumber: String,         // Invoice/bill number
  vendor: String,                // Vendor/supplier name
  date: Date,                    // Expense date
  adminId: ObjectId,             // Shop owner reference
  branch: String,                // Branch/location
  createdBy: ObjectId,           // User who added
  createdAt: Date,               // Entry timestamp
  updatedAt: Date                // Last update
}
```

**Expense Categories:**
- Rent & Utilities
- Salaries & Wages
- Raw Materials & Supplies
- Marketing & Advertising
- Maintenance & Repairs
- Transportation
- Professional Fees
- Other

---

### ⚙️ GST Settings Model (`backend/models/GSTSettings.js`)
```javascript
{
  adminId: ObjectId,             // Shop owner reference (unique)
  
  // Business details
  businessName: String,          // Legal business name
  gstin: String,                 // GSTIN number (15 chars)
  stateCode: String,             // State code (01-37)
  stateName: String,             // State name
  address: String,               // Business address
  pincode: String,               // PIN code
  
  // Tax registration
  registrationType: String,      // 'regular', 'composition'
  compositionScheme: Boolean,    // Composition scheme flag
  
  // Default tax settings
  defaultGSTRate: Number,        // Default GST rate
  enableCess: Boolean,           // Enable cess calculation
  enableReverseCharge: Boolean,  // Reverse charge mechanism
  
  // Invoice settings
  invoicePrefix: String,         // Invoice number prefix
  invoiceStartNumber: Number,    // Starting invoice number
  invoiceSeriesReset: String,    // 'monthly', 'yearly', 'never'
  
  // State-wise settings
  homeState: String,             // Home state for intra-state
  stateTaxSettings: [{           // State-specific rules
    state: String,
    stateCode: String,
    isUnionTerritory: Boolean,
    defaultRate: Number
  }],
  
  // HSN code mapping
  hsnCodes: [{                   // HSN code library
    code: String,
    description: String,
    gstRate: Number,
    cessRate: Number
  }],
  
  // Compliance
  lastGSTRFiling: Date,          // Last GSTR filing date
  filingFrequency: String,       // 'monthly', 'quarterly'
  
  isActive: Boolean,             // Active status
  createdAt: Date,               // Setup timestamp
  updatedAt: Date                // Last update
}
```

---

## 🔐 Middleware

### Authentication Middleware (`backend/middleware/auth.js`)
- `isAuthenticated` - Check if user is logged in
- `isAdmin` - Check if user is admin
- `isEmployee` - Check if user is employee/staff
- `redirectIfAuthenticated` - Redirect if already logged in
- `noCacheMiddleware` - Prevent browser caching of protected pages

### Database Middleware (`backend/middleware/database.js`)
- `ensureDBConnection` - Ensure MongoDB connection before route execution

---

## 🛠️ Utilities

### SMS Utility (`backend/utils/sms.js`)
- `sendBillSMS()` - Send bill details via SMS (Twilio)

### Timezone Utility (`backend/utils/timezone.js`)
- `formatToIST()` - Convert UTC to IST format
- `getDateTimeSeparate()` - Get date and time separately
- `formatForBill()` - Format date/time for bill printing
- `getCurrentTime()` - Get current time in UTC
- `addTimezoneToLocals()` - Middleware to add helpers to views

---

## 🎨 View Engine

- **Template Engine**: EJS (Embedded JavaScript)
- **CSS Framework**: Bootstrap 5.3.0
- **Icons**: Bootstrap Icons 1.11.1
- **JavaScript**: Vanilla JS + Bootstrap Bundle

---

## 🚀 Key Features

### ✅ Branch Management
- Admin can view all branches
- Each employee belongs to a branch
- Sales are grouped by branch
- Branch-wise reports and analytics

### ✅ Role-Based Access Control
- **Admin**: Full access to all features
- **Staff/Employee**: Limited access based on branch

### ✅ Sales Management
- Create new sales with cart system
- Backend price validation (security)
- Automatic bill generation
- SMS notification support
- Print bill functionality
- Due payment tracking
- Sale cancellation with refund

### ✅ Inventory Management
- Add/Edit/Delete products
- Stock tracking
- Category-based organization
- Low stock alerts

### ✅ Reports & Analytics
- Daily/Weekly/Monthly sales reports
- Branch-wise performance
- Expense tracking
- Profit/loss calculations
- Visual charts and graphs

### ✅ Security Features
- Password hashing (bcryptjs)
- JWT token authentication
- Session management
- Back-button protection after logout
- Cache control headers
- CSRF protection

### ✅ Timezone Management
- All dates stored in UTC (MongoDB)
- Display in IST (Asia/Kolkata)
- Consistent time across UI and database

---

## 📱 Responsive Design

- Mobile-first approach
- Bootstrap responsive grid
- Touch-friendly UI elements
- Hamburger menu for mobile

---

## 🔄 Data Flow (MVC Pattern)

```
User Request
    ↓
[Route Handler] (Controller)
    ↓
[Middleware] (Auth, Database)
    ↓
[Model] (Database Query)
    ↓
[View] (EJS Template)
    ↓
HTML Response to User
```

---

## 🌐 Environment Variables

Required in `.env` file:
```
MONGODB_URI=<MongoDB connection string>
SESSION_SECRET=<Random secret key>
JWT_SECRET=<JWT secret key>
PORT=3000
TWILIO_ACCOUNT_SID=<Twilio SID>
TWILIO_AUTH_TOKEN=<Twilio token>
TWILIO_PHONE_NUMBER=<Twilio phone>
EMAIL_USER=<Email for notifications>
EMAIL_PASS=<Email password>
NODE_ENV=development
```

---

## 📦 Dependencies

### Backend
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `express-session` - Session management
- `cookie-parser` - Cookie parsing
- `dotenv` - Environment variables
- `luxon` - Timezone handling
- `twilio` - SMS service
- `nodemailer` - Email service

### Frontend
- `ejs` - Template engine
- `bootstrap` - CSS framework
- `bootstrap-icons` - Icon library

---

## 🎯 Entry Point

**File**: `server.js`

**Port**: 3000 (default)

**Start Command**: 
```bash
node server.js
# or
npm start
```

---

## 📚 Documentation Files

- `README.md` - Project overview
- `INSTALLATION.md` - Installation guide
- `AUTHENTICATION.md` - Auth system docs
- `TIMEZONE_FIX.md` - Timezone handling
- `BILLING_SECURITY.md` - Security features
- `VERCEL_DEPLOYMENT.md` - Deployment guide
- `MVC_STRUCTURE.md` - This file

---

**Last Updated**: November 28, 2025
**Version**: 2.0
**Branch**: respo
