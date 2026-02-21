# 🔄 Data Migration Guide

This guide helps you migrate existing data to the new multi-shop system.

## 🎯 Overview

The multi-shop system requires all data (products, sales, expenses, etc.) to have an `adminId` field that links them to their shop owner. If you have existing data, it needs to be migrated.

---

## ⚙️ Option 1: Check Migration Status (Recommended First Step)

Before doing anything, check if you need migration:

```bash
node backend/scripts/check-migration-status.js
```

This script will show you:
- How many shop owners exist
- How many records need migration
- Current state of your database

**No changes are made** - it's just a status check.

---

## 🔧 Option 2: Migrate Existing Data

If you have valuable data you want to keep, use the migration script:

```bash
node backend/scripts/migrate-existing-data.js
```

### What it does:
1. Shows you all existing shop owners
2. Lets you choose which shop owner should "own" the existing data
3. Assigns `adminId` to all records without it

### Example flow:
```
📊 CURRENT DATABASE STATUS:

👥 USERS:
   - Admins (Shop Owners): 1
   - Staff with adminId: 0
   - Staff WITHOUT adminId: 3 ⚠️

📦 PRODUCTS:
   - With adminId: 0
   - WITHOUT adminId: 150 ⚠️

💰 SALES:
   - With adminId: 0
   - WITHOUT adminId: 420 ⚠️

Choose an option:
1. Assign all existing data to a specific shop owner
2. Delete all data and start fresh
3. Cancel (exit without changes)

Enter your choice: 1

📋 AVAILABLE SHOP OWNERS (ADMINS):

1. Ramesh Kumar
   Username: ramesh_bakery
   Shop: Kumar Bakery
   ID: 507f1f77bcf86cd799439011

Enter the number of the shop owner: 1

✅ Selected: Ramesh Kumar (ramesh_bakery)

Proceed with migration? (yes/no): yes

🔄 Starting migration...

✅ Updated 3 staff members
✅ Updated 150 products
✅ Updated 420 sales
✅ Updated 87 expenses
✅ Updated 12 discounts
...

✅ MIGRATION COMPLETE! Total records updated: 685
```

---

## 🗑️ Option 3: Start Fresh (Delete Everything)

If you don't need existing data, you can start with a clean slate:

```bash
node backend/scripts/migrate-existing-data.js
```

Then choose option `2` - Delete all data and start fresh.

⚠️ **WARNING:** This will permanently delete:
- All staff members (not shop owners)
- All products
- All sales
- All expenses
- All discounts
- All batches
- All damage entries
- All stock history
- All stock transfers
- All inventory reports

**Shop owners (admins) are NOT deleted** - only their data.

---

## 📝 Step-by-Step Migration Process

### Scenario A: You Have NO Existing Shop Owners

1. **Stop the server** if it's running
2. **Create your first shop owner:**
   ```bash
   npm start
   ```
3. Go to: http://localhost:3000/.hidden/login
4. Login with superadmin credentials (from .env)
5. Create first shop owner with shop details
6. **Run migration:**
   ```bash
   node backend/scripts/migrate-existing-data.js
   ```
7. Choose option 1 and select the shop owner you just created
8. All existing data will be assigned to this shop owner

### Scenario B: You Already Have Shop Owners

1. **Check status:**
   ```bash
   node backend/scripts/check-migration-status.js
   ```
2. If migration needed, **run migration:**
   ```bash
   node backend/scripts/migrate-existing-data.js
   ```
3. Choose option 1
4. Select which shop owner should own the existing data
5. Confirm migration

### Scenario C: Starting Fresh (No Existing Data Needed)

1. **Run migration script:**
   ```bash
   node backend/scripts/migrate-existing-data.js
   ```
2. Choose option 2 (Delete all data)
3. Type `yes` to confirm
4. Type `DELETE ALL` to double confirm
5. All data will be deleted
6. Create shop owners and start using the system

---

## 🔍 Understanding adminId

### For Shop Owners (Admins):
- `adminId` = `null` ✅
- They are the "top level" owners
- They see only their own shop's data

### For Staff (Employees):
- `adminId` = their shop owner's user ID
- They see only data from their shop
- They can't see other shops' data

### For All Other Data (Products, Sales, etc.):
- `adminId` = the shop owner's user ID
- Required field - can't be null
- Used to filter data per shop

---

## ✅ After Migration

Once migration is complete:

1. **Restart the server:**
   ```bash
   npm start
   ```

2. **Test shop owner login:**
   - Go to http://localhost:3000/login
   - Click "Admin" tab
   - Login with shop owner credentials
   - Verify you see all migrated data

3. **Create a second shop owner (to test isolation):**
   - Go to /.hidden/login
   - Create another shop owner
   - Login as the new shop owner
   - Verify they DON'T see the first shop's data

4. **Create employees:**
   - Login as shop owner
   - Go to Employees section
   - Create new employee
   - Login as employee
   - Verify they see only their shop's data

---

## 🐛 Troubleshooting

### "No shop owners found!"
- You need to create a shop owner first
- Go to http://localhost:3000/.hidden/login
- Login with superadmin credentials
- Create shop owner
- Run migration script again

### "Error: adminId is required"
- Some routes are trying to create records without adminId
- Make sure you're logged in as admin or staff
- Check that session is working properly

### "Can't see any data after migration"
- Check if you're logged in as the correct shop owner
- Run status check: `node backend/scripts/check-migration-status.js`
- Verify adminId was set correctly

### "Migration script won't connect to MongoDB"
- Make sure MongoDB is running
- Check MONGODB_URI in .env file
- Update MONGO_URI in migration script if needed

---

## 📚 Quick Reference

| Script | Purpose | Makes Changes? |
|--------|---------|----------------|
| `check-migration-status.js` | Check database status | ❌ No (read-only) |
| `migrate-existing-data.js` | Migrate or delete data | ✅ Yes |

---

## 💡 Best Practices

1. **Always check status first:**
   ```bash
   node backend/scripts/check-migration-status.js
   ```

2. **Backup your database before migration:**
   ```bash
   mongodump --db birre --out ./backup
   ```

3. **Test with one shop owner first**

4. **Create a second shop owner to verify isolation**

5. **Test all features after migration:**
   - Create products
   - Make sales
   - Add expenses
   - Generate reports
   - Verify employees can't see other shops' data

---

## 🎓 Example: Complete Migration Workflow

```bash
# Step 1: Backup (optional but recommended)
mongodump --db birre --out ./backup-$(date +%Y%m%d)

# Step 2: Check current status
node backend/scripts/check-migration-status.js

# Step 3: Start server if not running
npm start

# Step 4: Create shop owner (if needed)
# Visit: http://localhost:3000/.hidden/login

# Step 5: Run migration
node backend/scripts/migrate-existing-data.js
# Choose option 1, select shop owner, confirm

# Step 6: Verify migration
node backend/scripts/check-migration-status.js

# Step 7: Test the application
# Login as shop owner and verify data
```

---

## ❓ Need Help?

If you encounter issues:

1. Check `backend/logs/` for error logs
2. Run status check to see current state
3. Verify MongoDB connection
4. Check .env configuration
5. Ensure server is stopped before migration

---

**🎉 You're Ready!** Once migration is complete, your multi-shop system is fully operational!
