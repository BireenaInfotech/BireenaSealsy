const express = require('express');
const router = express.Router();
const { isAuthenticated, getAdminId } = require('../middleware/auth');
const Product = require('../models/Product');
const StockHistory = require('../models/StockHistory');
const DamageEntry = require('../models/DamageEntry');
const Batch = require('../models/Batch');
const StockTransfer = require('../models/StockTransfer');
const User = require('../models/User');
const { trackProductAddition, initializeProductReport, trackProductDamage } = require('../utils/inventory-tracker');

// 🎯 HELPER FUNCTION - Update expiry status for all products
async function updateExpiryStatus() {
    try {
        // Note: This is a global helper that updates all products
        const products = await Product.find({ expiryDate: { $exists: true, $ne: null } });
        const today = new Date();
        
        for (const product of products) {
            const expiry = new Date(product.expiryDate);
            const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
            
            // Update expirySoon status
            const newExpirySoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
            
            if (product.expirySoon !== newExpirySoon) {
                product.expirySoon = newExpirySoon;
                await product.save();
            }
        }
    } catch (error) {
        console.error('Error updating expiry status:', error);
    }
}

// 🎯 View all products with advanced filtering
router.get('/', isAuthenticated, async (req, res) => {
    try {
        // 🎯 UPDATE EXPIRY STATUS ON PAGE LOAD
        await updateExpiryStatus();
        
        const User = require('../models/User');
        const adminId = getAdminId(req);
        let filter = { adminId };
        const { expiryFilter, stockFilter, employee, search } = req.query;
        
        // If user is employee (staff), only show their own products
        if (req.session.user.role === 'staff') {
            filter.addedBy = req.session.user.id;
        }
        
        // Admin: if employee filter is selected, show only that employee's products
        if (req.session.user.role === 'admin' && employee) {
            filter.addedBy = employee;
        }
        
        // 🔍 Search filter - search by name or category
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive search
            filter.$or = [
                { name: searchRegex },
                { category: searchRegex }
            ];
        }
        
        // Get all products with filter
        const allProducts = await Product.find(filter)
            .populate('addedBy', 'fullName username role')
            .populate('updatedBy', 'fullName username')
            .sort({ name: 1 });
        
        let products = allProducts;
        
        // Apply expiry filters
        let filteredProducts = products;
        if (expiryFilter) {
            const today = new Date();
            filteredProducts = products.filter(product => {
                if (!product.expiryDate) return expiryFilter === 'no-expiry';
                
                const expiry = new Date(product.expiryDate);
                const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                
                if (expiryFilter === 'expired') return daysUntilExpiry < 0;
                if (expiryFilter === 'soon') return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
                if (expiryFilter === 'fresh') return daysUntilExpiry > 30;
                return true;
            });
        }
        
        // Apply stock filters
        if (stockFilter === 'low') {
            filteredProducts = filteredProducts.filter(p => p.trackStock !== false && p.stock <= p.reorderLevel);
        } else if (stockFilter === 'out') {
            filteredProducts = filteredProducts.filter(p => p.stock === 0);
        }
        
        // Calculate statistics (based on all products or branch-filtered)
        const expiringCount = products.filter(p => {
            if (!p.expiryDate) return false;
            const days = Math.ceil((new Date(p.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
            return days >= 0 && days <= 30;
        }).length;
        
        const expiredCount = products.filter(p => {
            if (!p.expiryDate) return false;
            return new Date(p.expiryDate) < new Date();
        }).length;
        
        // Get all users (admin + employees) for filter dropdown - filtered by adminId
        let employees = [];
        if (req.session.user.role === 'admin') {
            // Get admin (self) + all employees
            const admin = await User.findById(adminId).select('fullName username role');
            const staff = await User.find({ isActive: true, adminId: adminId, role: 'staff' }).select('fullName username role').sort({ fullName: 1 });
            if (admin) employees.push(admin);
            employees = employees.concat(staff);
        }
        
        res.render('inventory/list', { 
            products: filteredProducts,
            allProducts: allProducts,
            expiringCount,
            expiredCount,
            filters: { expiryFilter, stockFilter, employee, search },
            employees,
            userRole: req.session.user.role
        });
    } catch (error) {
        console.error('Inventory error:', error);
        req.flash('error_msg', 'Error loading inventory');
        res.redirect('/dashboard');
    }
});

// Add product page
router.get('/add', isAuthenticated, (req, res) => {
    res.render('inventory/add', {
        user: req.session.user
    });
});

// 🎯 Create product with enhanced fields
router.post('/add', isAuthenticated, async (req, res) => {
    try {
        const { 
            name, category, price, purchasePrice, sellingPrice, stock, unit, 
            reorderLevel, description, image, mfgDate, expiryDate, supplierName, 
            supplierContact, batchNumber, branch, hsnCode,
            totalPurchaseAmount, amountPaid, paymentMethod, paymentNotes, trackStock,
            halfKgPrice, oneKgPrice, pastryPrice, pastryGrams, gramAmount
        } = req.body;

        // 🎯 Calculate expirySoon status
        let expirySoon = false;
        if (expiryDate) {
            const today = new Date();
            const expiry = new Date(expiryDate);
            const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
            expirySoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
        }

        // 💰 Calculate payment details
        const totalPurchase = parseFloat(totalPurchaseAmount || 0);
        const paid = parseFloat(amountPaid || 0);
        const due = totalPurchase - paid;
        
        let paymentStatus = 'none';
        if (totalPurchase > 0) {
            if (paid === 0) {
                paymentStatus = 'pending';
            } else if (due <= 0) {
                paymentStatus = 'paid';
            } else {
                paymentStatus = 'partial';
            }
        }

        const product = new Product({
            name,
            category,
            price: parseFloat(price || sellingPrice || 0),
            purchasePrice: parseFloat(purchasePrice || 0),
            sellingPrice: parseFloat(sellingPrice || price || 0),
            halfKgPrice: parseFloat(halfKgPrice || 0),
            oneKgPrice: parseFloat(oneKgPrice || 0),
            pastryPrice: parseFloat(pastryPrice || 0),
            pastryGrams: parseInt(pastryGrams || 100),
            trackStock: trackStock === 'false' ? false : true,
            stock: trackStock === 'false' ? 0 : parseInt(stock || 0),
            unit,
            gramAmount: parseInt(gramAmount || 0),
            reorderLevel: parseInt(reorderLevel || 10),
            description,
            image: image || '',
            mfgDate: mfgDate || null,
            expiryDate: expiryDate || null,
            expirySoon: expirySoon,
            supplierName: supplierName || '',
            supplierContact: supplierContact || '',
            hsnCode: hsnCode || '',
            lastPurchasedDate: new Date(),
            batchNumber: batchNumber || '',
            totalPurchaseAmount: totalPurchase,
            amountPaid: paid,
            amountDue: due,
            paymentMethod: paymentMethod || 'none',
            paymentNotes: paymentNotes || '',
            supplierPaymentStatus: paymentStatus,
            branch: req.session.user.branch || 'Main Branch',
            adminId: getAdminId(req),
            addedBy: req.session.user ? req.session.user.id : null
        });

        await product.save();
        
        // 🎯 Track in daily inventory report
        await initializeProductReport(product, getAdminId(req));
        
        // 🎯 Log activity to Stock History
        const stockHistory = new StockHistory({
            productId: product._id,
            productName: product.name,
            action: 'PRODUCT_ADDED',
            newValue: {
                stock: product.stock,
                price: product.price,
                purchasePrice: product.purchasePrice,
                sellingPrice: product.sellingPrice
            },
            quantityChanged: product.stock,
            performedBy: req.session.user.id,
            performedByName: req.session.user.fullName || req.session.user.username,
            branch: product.branch,
            adminId: getAdminId(req),
            supplierName: product.supplierName || '',
            supplierContact: product.supplierContact || '',
            batchNumber: product.batchNumber || ''
        });
        await stockHistory.save();
        
        console.log(`[INVENTORY] User: ${req.session.user.username} added product: ${name}`);
        
        req.flash('success_msg', 'Product added successfully');
        res.redirect('/inventory');
    } catch (error) {
        console.error('Add product error:', error);
        req.flash('error_msg', 'Error adding product');
        res.redirect('/inventory/add');
    }
});

// 🎯 BULK ADD PRODUCTS
router.post('/add-bulk', isAuthenticated, async (req, res) => {
    try {
        const { products } = req.body;

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.json({ success: false, message: 'No products provided' });
        }

        const adminId = getAdminId(req);
        const userId = req.session.user ? req.session.user.id : null;
        const userName = req.session.user ? (req.session.user.fullName || req.session.user.username) : 'Unknown';
        const branch = req.session.user.branch || 'Main Branch';

        let addedCount = 0;
        const errors = [];

        for (let i = 0; i < products.length; i++) {
            try {
                const productData = products[i];

                // Calculate expirySoon status
                let expirySoon = false;
                if (productData.expiryDate) {
                    const today = new Date();
                    const expiry = new Date(productData.expiryDate);
                    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                    expirySoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
                }

                const amountPaid = parseFloat(productData.amountPaid || 0);
                const totalPurchaseAmount = parseFloat(productData.totalPurchaseAmount || 0);
                const amountDue = parseFloat(productData.amountDue || 0);
                const paymentMethod = productData.paymentMethod || 'none';
                let supplierPaymentStatus = 'none';
                if (totalPurchaseAmount > 0) {
                    if (amountPaid >= totalPurchaseAmount) supplierPaymentStatus = 'paid';
                    else if (amountPaid > 0) supplierPaymentStatus = 'partial';
                    else supplierPaymentStatus = 'unpaid';
                }

                const product = new Product({
                    name: productData.name,
                    category: productData.category,
                    price: parseFloat(productData.sellingPrice || 0),
                    purchasePrice: parseFloat(productData.purchasePrice || 0),
                    sellingPrice: parseFloat(productData.sellingPrice || 0),
                    halfKgPrice: parseFloat(productData.halfKgPrice || 0),
                    oneKgPrice: parseFloat(productData.oneKgPrice || 0),
                    pastryPrice: parseFloat(productData.pastryPrice || 0),
                    pastryGrams: parseInt(productData.pastryGrams || 100),
                    trackStock: productData.trackStock === 'false' ? false : true,
                    stock: productData.trackStock === 'false' ? 0 : parseInt(productData.stock || 0),
                    unit: productData.unit || 'piece',
                    gramAmount: parseInt(productData.gramAmount || 0),
                    reorderLevel: 10,
                    description: '',
                    image: productData.image || '',
                    mfgDate: productData.mfgDate || null,
                    expiryDate: productData.expiryDate || null,
                    expirySoon: expirySoon,
                    supplierName: productData.supplierName || '',
                    supplierContact: productData.supplierContact || '',
                    hsnCode: '',
                    lastPurchasedDate: new Date(),
                    batchNumber: productData.batchNumber || '',
                    totalPurchaseAmount: totalPurchaseAmount,
                    amountPaid: amountPaid,
                    amountDue: amountDue,
                    paymentMethod: paymentMethod,
                    paymentNotes: productData.paymentNotes || '',
                    supplierPaymentStatus: supplierPaymentStatus,
                    branch: branch,
                    adminId: adminId,
                    addedBy: userId
                });

                await product.save();

                // Track in daily inventory report
                await initializeProductReport(product, adminId);

                // Log activity to Stock History
                const stockHistory = new StockHistory({
                    productId: product._id,
                    productName: product.name,
                    action: 'PRODUCT_ADDED',
                    newValue: {
                        stock: product.stock,
                        price: product.price,
                        purchasePrice: product.purchasePrice,
                        sellingPrice: product.sellingPrice
                    },
                    quantityChanged: product.stock,
                    performedBy: userId,
                    performedByName: userName,
                    branch: product.branch,
                    adminId: adminId,
                    supplierName: product.supplierName || '',
                    supplierContact: product.supplierContact || '',
                    batchNumber: product.batchNumber || ''
                });
                await stockHistory.save();

                addedCount++;
            } catch (error) {
                console.error(`Error adding product ${i + 1}:`, error);
                errors.push(`Product ${i + 1} (${productData.name}): ${error.message}`);
            }
        }

        console.log(`[INVENTORY] User: ${req.session.user.username} added ${addedCount} products in bulk`);

        if (addedCount === products.length) {
            res.json({ success: true, addedCount, message: `Successfully added ${addedCount} products` });
        } else {
            res.json({ 
                success: true, 
                addedCount, 
                message: `Added ${addedCount} of ${products.length} products. Some failed: ${errors.join(', ')}` 
            });
        }
    } catch (error) {
        console.error('Bulk add product error:', error);
        res.json({ success: false, message: error.message });
    }
});

// Edit product page
router.get('/edit/:id', isAuthenticated, async (req, res) => {
    try {
        const adminId = getAdminId(req);
        const product = await Product.findOne({ _id: req.params.id, adminId });
        if (!product) {
            req.flash('error_msg', 'Product not found or access denied');
            return res.redirect('/inventory');
        }
        res.render('inventory/edit', { 
            product,
            user: req.session.user
        });
    } catch (error) {
        console.error('Edit product error:', error);
        req.flash('error_msg', 'Error loading product');
        res.redirect('/inventory');
    }
});

// 🎯 Update product with enhanced tracking
router.post('/edit/:id', isAuthenticated, async (req, res) => {
    try {
        const { 
            name, category, price, purchasePrice, sellingPrice, stock, unit, 
            reorderLevel, description, mfgDate, expiryDate, supplierName, 
            supplierContact, batchNumber, branch, hsnCode, halfKgPrice, oneKgPrice,
            pastryPrice, pastryGrams, gramAmount, image, trackStock
        } = req.body;

        const adminId = getAdminId(req);
        const oldProduct = await Product.findOne({ _id: req.params.id, adminId });
        
        if (!oldProduct) {
            req.flash('error_msg', 'Product not found or access denied');
            return res.redirect('/inventory');
        }
        
        // 🎯 Calculate expirySoon status
        let expirySoon = false;
        if (expiryDate) {
            const today = new Date();
            const expiry = new Date(expiryDate);
            const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
            expirySoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
        }
        
        // Handle reorderLevel - allow 0 or empty for cakes, default to 10 for others
        const reorderLevelValue = reorderLevel === '' || reorderLevel === null || reorderLevel === undefined 
            ? (category && category.toLowerCase().includes('cake') ? 0 : 10)
            : parseInt(reorderLevel);

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, {
            name,
            category,
            price: parseFloat(price || sellingPrice || 0),
            purchasePrice: parseFloat(purchasePrice || 0),
            sellingPrice: parseFloat(sellingPrice || price || 0),
            halfKgPrice: parseFloat(halfKgPrice || 0),
            oneKgPrice: parseFloat(oneKgPrice || 0),
            pastryPrice: parseFloat(pastryPrice || 0),
            pastryGrams: parseInt(pastryGrams || 100),
            stock: parseInt(stock || 0),
            trackStock: trackStock === 'false' ? false : true,
            unit,
            gramAmount: parseInt(gramAmount || 0),
            reorderLevel: reorderLevelValue,
            description,
            image: image || '',
            mfgDate: mfgDate || null,
            expiryDate: expiryDate || null,
            expirySoon: expirySoon,
            supplierName: supplierName || '',
            supplierContact: supplierContact || '',
            hsnCode: hsnCode || '',
            batchNumber: batchNumber || '',
            branch: branch || 'Main Branch',
            updatedBy: req.session.user ? req.session.user.id : null,
            updatedAt: Date.now()
        }, { new: true });

        // 🎯 Log activity to Stock History
        const stockHistory = new StockHistory({
            productId: oldProduct._id,
            productName: oldProduct.name,
            action: 'PRODUCT_EDITED',
            oldValue: {
                stock: oldProduct.stock,
                price: oldProduct.price,
                purchasePrice: oldProduct.purchasePrice,
                sellingPrice: oldProduct.sellingPrice
            },
            newValue: {
                stock: updatedProduct.stock,
                price: updatedProduct.price,
                purchasePrice: updatedProduct.purchasePrice,
                sellingPrice: updatedProduct.sellingPrice
            },
            quantityChanged: updatedProduct.stock - oldProduct.stock,
            performedBy: req.session.user.id,
            performedByName: req.session.user.fullName || req.session.user.username,
            branch: updatedProduct.branch,
            adminId: getAdminId(req),
            batchNumber: updatedProduct.batchNumber || ''
        });
        await stockHistory.save();

        console.log(`[INVENTORY] User: ${req.session.user.username} updated product: ${name}`);

        req.flash('success_msg', 'Product updated successfully');
        res.redirect('/inventory');
    } catch (error) {
        console.error('Update product error:', error);
        req.flash('error_msg', 'Error updating product');
        res.redirect('/inventory');
    }
});

// 🎯 Delete product with logging
router.post('/delete/:id', isAuthenticated, async (req, res) => {
    try {
        const adminId = getAdminId(req);
        const product = await Product.findOne({ _id: req.params.id, adminId });
        
        if (!product) {
            req.flash('error_msg', 'Product not found or access denied');
            return res.redirect('/inventory');
        }
        
        // Log activity before deletion
        const stockHistory = new StockHistory({
            productId: product._id,
            productName: product.name,
            action: 'PRODUCT_DELETED',
            oldValue: {
                stock: product.stock,
                price: product.price
            },
            performedBy: req.session.user.id,
            performedByName: req.session.user.fullName || req.session.user.username,
            branch: product.branch || 'Main Branch',
            adminId: getAdminId(req)
        });
        await stockHistory.save();
        
        await Product.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Product deleted successfully');
        res.redirect('/inventory');
    } catch (error) {
        console.error('Delete product error:', error);
        req.flash('error_msg', 'Error deleting product');
        res.redirect('/inventory');
    }
});

// Low stock alert
router.get('/low-stock', isAuthenticated, async (req, res) => {
    try {
        const adminId = getAdminId(req);
        let filter = {
            adminId,
            trackStock: { $ne: false }, // Only products with stock tracking enabled
            $expr: { $lte: ['$stock', '$reorderLevel'] }
        };
        
        // If user is employee (staff), only show products from their branch
        if (req.session.user.role === 'staff') {
            filter.addedBy = req.session.user.id;
        }
        
        const products = await Product.find(filter).sort({ stock: 1 });
        res.render('inventory/low-stock', { products });
    } catch (error) {
        console.error('Low stock error:', error);
        req.flash('error_msg', 'Error loading low stock items');
        res.redirect('/inventory');
    }
});

// 🎯 DAMAGE ENTRY - View damage page for a product
router.get('/damage/:id', isAuthenticated, async (req, res) => {
    try {
        const adminId = getAdminId(req);
        const product = await Product.findOne({ _id: req.params.id, adminId });
        if (!product) {
            req.flash('error_msg', 'Product not found or access denied');
            return res.redirect('/inventory');
        }
        res.render('inventory/damage-entry', { product });
    } catch (error) {
        console.error('Damage entry page error:', error);
        req.flash('error_msg', 'Error loading damage entry page');
        res.redirect('/inventory');
    }
});

// 🎯 DAMAGE ENTRY - Submit damage entry
router.post('/damage/:id', isAuthenticated, async (req, res) => {
    try {
        const { damagedQuantity, reason, reasonDetails } = req.body;
        const adminId = getAdminId(req);
        const product = await Product.findOne({ _id: req.params.id, adminId });
        
        if (!product) {
            req.flash('error_msg', 'Product not found or access denied');
            return res.redirect('/inventory');
        }
        
        const quantity = parseInt(damagedQuantity);
        
        if (quantity > product.stock) {
            req.flash('error_msg', 'Damaged quantity cannot exceed current stock');
            return res.redirect(`/inventory/damage/${req.params.id}`);
        }
        
        // Calculate estimated loss
        const estimatedLoss = quantity * (product.purchasePrice || product.price || 0);
        
        // Create damage entry
        const damageEntry = new DamageEntry({
            productId: product._id,
            productName: product.name,
            damagedQuantity: quantity,
            unit: product.unit,
            reason,
            reasonDetails: reasonDetails || '',
            estimatedLoss,
            reportedBy: req.session.user.id,
            reportedByName: req.session.user.fullName || req.session.user.username,
            branch: product.branch || 'Main Branch'
        });
        await damageEntry.save();
        
        // Reduce stock
        product.stock -= quantity;
        await product.save();
        
        // 🎯 Track in daily inventory report
        await trackProductDamage(product._id, quantity, product.name, product.unit, product.category, getAdminId(req));
        
        // Log to stock history
        const stockHistory = new StockHistory({
            productId: product._id,
            productName: product.name,
            action: 'DAMAGE_ENTRY',
            oldValue: { stock: product.stock + quantity },
            newValue: { stock: product.stock },
            quantityChanged: -quantity,
            reason: `${reason}: ${reasonDetails}`,
            performedBy: req.session.user.id,
            performedByName: req.session.user.fullName || req.session.user.username,
            branch: product.branch || 'Main Branch',
            adminId: getAdminId(req)
        });
        await stockHistory.save();
        
        req.flash('success_msg', `Damage entry recorded. Stock reduced by ${quantity} ${product.unit}`);
        res.redirect('/inventory');
    } catch (error) {
        console.error('Damage entry error:', error);
        req.flash('error_msg', 'Error recording damage entry');
        res.redirect('/inventory');
    }
});

// 🎯 DAMAGE REPORT - View all damage entries
router.get('/damage-report', isAuthenticated, async (req, res) => {
    try {
        const { startDate, endDate, reason } = req.query;
        
        const adminId = getAdminId(req);
        let filter = { adminId };
        
        // Staff: only their reported damages
        if (req.session.user.role === 'staff') {
            filter.reportedBy = req.session.user.id;
        }
        
        if (startDate && endDate) {
            filter.damageDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        if (reason && reason !== 'all') {
            filter.reason = reason;
        }
        
        const damageEntries = await DamageEntry.find(filter)
            .populate('productId', 'name category')
            .populate('reportedBy', 'fullName username')
            .sort({ damageDate: -1 });
        
        // Calculate total loss
        const totalLoss = damageEntries.reduce((sum, entry) => sum + entry.estimatedLoss, 0);
        
        res.render('inventory/damage-report', { 
            damageEntries, 
            totalLoss,
            filters: { startDate, endDate, reason }
        });
    } catch (error) {
        console.error('Damage report error:', error);
        req.flash('error_msg', 'Error loading damage report');
        res.redirect('/inventory');
    }
});

// 🎯 STOCK ACTIVITY LOG - Export to CSV
router.get('/activity-log/export-csv', isAuthenticated, async (req, res) => {
    try {
        const { productId, action, startDate, endDate, employee } = req.query;
        
        const adminId = getAdminId(req);
        const StockHistory = require('../models/StockHistory');
        let filter = { adminId };
        
        // Staff: their own activities + transfers received by them
        if (req.session.user.role === 'staff') {
            filter.$or = [
                { performedBy: req.session.user.id },
                { transferDestinationEmployee: req.session.user.id }
            ];
        }
        // Admin with employee filter
        else if (req.session.user.role === 'admin' && employee) {
            filter.$or = [
                { performedBy: employee },
                { transferDestinationEmployee: employee }
            ];
        }
        
        if (productId) {
            filter.productId = productId;
        }
        
        if (action && action !== 'all') {
            filter.action = action;
        }
        
        if (startDate && endDate) {
            filter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        const activities = await StockHistory.find(filter)
            .populate('productId', 'name category branch')
            .populate('performedBy', 'fullName username branch')
            .sort({ createdAt: -1 });
        
        // Create CSV content
        let csvContent = '\uFEFF'; // UTF-8 BOM for Excel compatibility
        
        csvContent += 'BIREENA BAKERY - STOCK ACTIVITY LOG\n';
        csvContent += '====================================\n';
        csvContent += `Report Generated: ${new Date().toLocaleString('en-IN')}\n`;
        if (startDate && endDate) {
            csvContent += `Period: ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}\n`;
        }
        csvContent += '\n';
        
        csvContent += 'Timestamp,Product,Branch,Action,Performed By,Changes\n';
        
        activities.forEach(activity => {
            const timestamp = new Date(activity.createdAt).toLocaleString('en-IN');
            const product = activity.productId ? activity.productId.name : 'Unknown';
            
            // Determine branch based on performer
            let displayBranch = 'N/A';
            if (activity.performedBy) {
                if (activity.performedBy.role === 'admin') {
                    displayBranch = 'ADMIN';
                } else if (activity.performedBy.branch) {
                    displayBranch = activity.performedBy.branch;
                }
            } else if (activity.branch) {
                displayBranch = activity.branch;
            }
            
            const action = activity.action;
            const performedBy = activity.performedByName || (activity.performedBy ? (activity.performedBy.fullName || activity.performedBy.username) : 'System');
            
            let changes = '';
            if (activity.quantityChanged) {
                changes += `Quantity: ${activity.quantityChanged}`;
            }
            if (activity.oldValue && activity.newValue) {
                changes += ` | Old: ${JSON.stringify(activity.oldValue)} | New: ${JSON.stringify(activity.newValue)}`;
            }
            if (activity.reason) {
                changes += ` | Reason: ${activity.reason}`;
            }
            
            csvContent += `"${timestamp}","${product}","${displayBranch}","${action}","${performedBy}","${changes}"\n`;
        });
        
        csvContent += '\n';
        csvContent += '====================================\n';
        csvContent += 'Report End\n';
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Stock_Activity_Log_${new Date().toISOString().split('T')[0]}.csv"`);
        
        res.send(csvContent);
        
    } catch (error) {
        console.error('Activity log CSV export error:', error);
        req.flash('error_msg', 'Error exporting activity log');
        res.redirect('/inventory/activity-log');
    }
});

// 🎯 STOCK ACTIVITY LOG - View activity history
router.get('/activity-log', isAuthenticated, async (req, res) => {
    try {
        const { productId, action, startDate, endDate, employee } = req.query;
        
        // 🎯 ADMIN FILTER - Direct filter on StockHistory by adminId
        const adminId = getAdminId(req);
        let filter = { adminId };
        
        // Staff: their own activities + transfers received by them
        if (req.session.user.role === 'staff') {
            filter.$or = [
                { performedBy: req.session.user.id },
                { transferDestinationEmployee: req.session.user.id }
            ];
        }
        // Admin with employee filter
        else if (req.session.user.role === 'admin' && employee) {
            filter.$or = [
                { performedBy: employee },
                { transferDestinationEmployee: employee }
            ];
        }
        
        // Get products for dropdown - adminId filtered
        let productFilter = { adminId };
        if (req.session.user.role === 'staff') {
            productFilter.addedBy = req.session.user.id;
        } else if (req.session.user.role === 'admin' && employee) {
            productFilter.addedBy = employee;
        }
        
        if (productId) {
            filter.productId = productId;
        }
        
        if (action && action !== 'all') {
            filter.action = action;
        }
        
        if (startDate && endDate) {
            filter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        const activities = await StockHistory.find(filter)
            .populate('productId', 'name category branch')
            .populate('performedBy', 'fullName username branch')
            .sort({ createdAt: -1 })
            .limit(200);
        
        // Get products for dropdown - based on role
        const products = await Product.find(productFilter).select('name _id').sort({ name: 1 });
        
        // Get all users (admin + employees) for filter dropdown (only for admin) - filtered by adminId
        let employees = [];
        if (req.session.user.role === 'admin') {
            // Get admin (self) + all employees
            const admin = await User.findById(adminId).select('fullName username role');
            const staff = await User.find({ isActive: true, adminId: adminId, role: 'staff' }).select('fullName username role').sort({ fullName: 1 });
            if (admin) employees.push(admin);
            employees = employees.concat(staff);
        }
        
        res.render('inventory/activity-log', { 
            activities, 
            products,
            employees,
            filters: { productId, action, startDate, endDate, employee },
            userRole: req.session.user.role
        });
    } catch (error) {
        console.error('Activity log error:', error);
        req.flash('error_msg', 'Error loading activity log');
        res.redirect('/inventory');
    }
});

// 🎯 EXPIRING SOON - View products expiring soon
router.get('/expiring-soon', isAuthenticated, async (req, res) => {
    try {
        const adminId = getAdminId(req);
        const products = await Product.find({ 
            expiryDate: { $exists: true, $ne: null },
            adminId 
        })
            .populate('addedBy', 'fullName username')
            .sort({ expiryDate: 1 });
        
        const today = new Date();
        const expiringProducts = products.filter(product => {
            const daysUntilExpiry = Math.ceil((new Date(product.expiryDate) - today) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
        });
        
        res.render('inventory/expiring-soon', { products: expiringProducts });
    } catch (error) {
        console.error('Expiring soon error:', error);
        req.flash('error_msg', 'Error loading expiring products');
        res.redirect('/inventory');
    }
});

// 🎯 EXPIRED PRODUCTS - View expired products
router.get('/expired', isAuthenticated, async (req, res) => {
    try {
        const adminId = getAdminId(req);
        const products = await Product.find({ 
            expiryDate: { $exists: true, $ne: null },
            adminId 
        })
            .populate('addedBy', 'fullName username')
            .sort({ expiryDate: 1 });
        
        const today = new Date();
        const expiredProducts = products.filter(product => {
            return new Date(product.expiryDate) < today;
        });
        
        res.render('inventory/expired', { products: expiredProducts });
    } catch (error) {
        console.error('Expired products error:', error);
        req.flash('error_msg', 'Error loading expired products');
        res.redirect('/inventory');
    }
});

// 🎯 BATCH MANAGEMENT - View batches for a product
router.get('/batches/:id', isAuthenticated, async (req, res) => {
    try {
        const adminId = getAdminId(req);
        const product = await Product.findOne({ _id: req.params.id, adminId });
        if (!product) {
            req.flash('error_msg', 'Product not found or access denied');
            return res.redirect('/inventory');
        }
        const batches = await Batch.find({ productId: req.params.id })
            .populate('addedBy', 'fullName username')
            .sort({ expiryDate: 1 });
        
        res.render('inventory/batches', { product, batches });
    } catch (error) {
        console.error('Batches error:', error);
        req.flash('error_msg', 'Error loading batches');
        res.redirect('/inventory');
    }
});

// 🎯 BATCH MANAGEMENT - Add new batch
router.post('/batches/:id/add', isAuthenticated, async (req, res) => {
    try {
        const { batchNumber, mfgDate, expiryDate, quantity, purchasePrice, sellingPrice, supplierName, supplierContact } = req.body;
        const adminId = getAdminId(req);
        const product = await Product.findOne({ _id: req.params.id, adminId });
        
        if (!product) {
            req.flash('error_msg', 'Product not found or access denied');
            return res.redirect('/inventory');
        }
        
        const batch = new Batch({
            productId: product._id,
            productName: product.name,
            batchNumber,
            mfgDate,
            expiryDate,
            quantity: parseInt(quantity),
            purchasePrice: parseFloat(purchasePrice || 0),
            sellingPrice: parseFloat(sellingPrice || 0),
            supplierName: supplierName || '',
            supplierContact: supplierContact || '',
            branch: product.branch || 'Main Branch',
            addedBy: req.session.user.id
        });
        await batch.save();
        
        // Update product stock
        product.stock += parseInt(quantity);
        await product.save();
        
        req.flash('success_msg', 'Batch added successfully');
        res.redirect(`/inventory/batches/${req.params.id}`);
    } catch (error) {
        console.error('Add batch error:', error);
        req.flash('error_msg', 'Error adding batch');
        res.redirect(`/inventory/batches/${req.params.id}`);
    }
});

// 🎯 STOCK TRANSFER - View transfer page (Admin Only)
router.get('/transfer', isAuthenticated, async (req, res) => {
    try {
        // Check if user is admin
        if (req.session.user.role !== 'admin') {
            req.flash('error_msg', 'Only admin can access stock transfer');
            return res.redirect('/inventory');
        }
        
        const adminId = getAdminId(req);
        const products = await Product.find({ adminId }).select('name stock unit addedBy').populate('addedBy', 'fullName username role').sort({ name: 1 });
        const transfers = await StockTransfer.find({ adminId })
            .populate('productId', 'name')
            .populate('initiatedBy', 'fullName username')
            .populate('approvedBy', 'fullName username')
            .sort({ transferDate: -1 })
            .limit(50);
        
        // Get all employees including admin (self)
        const User = require('../models/User');
        const admin = await User.findById(adminId).select('fullName username role');
        const staff = await User.find({ isActive: true, adminId: adminId, role: 'staff' }).select('fullName username role').sort({ fullName: 1 });
        const employees = admin ? [admin, ...staff] : staff;
        
        res.render('inventory/stock-transfer', { products, transfers, employees });
    } catch (error) {
        console.error('Stock transfer error:', error);
        req.flash('error_msg', 'Error loading stock transfer page');
        res.redirect('/inventory');
    }
});

// 🎯 STOCK TRANSFER - Create transfer (Admin Only)
router.post('/transfer', isAuthenticated, async (req, res) => {
    try {
        // Check if user is admin
        if (req.session.user.role !== 'admin') {
            req.flash('error_msg', 'Only admin can create stock transfer');
            return res.redirect('/inventory');
        }
        
        const { productId, quantity, sourceEmployee, destinationEmployee, notes } = req.body;
        
        // Validate input
        if (!productId || !quantity || !sourceEmployee || !destinationEmployee) {
            req.flash('error_msg', 'All fields are required');
            return res.redirect('/inventory/transfer');
        }
        
        if (sourceEmployee === destinationEmployee) {
            req.flash('error_msg', 'Source and destination employees cannot be the same');
            return res.redirect('/inventory/transfer');
        }
        
        const transferQty = parseInt(quantity);
        if (transferQty < 1) {
            req.flash('error_msg', 'Quantity must be at least 1');
            return res.redirect('/inventory/transfer');
        }
        
        // Find the source product (the actual product selected)
        const adminId = getAdminId(req);
        const sourceProduct = await Product.findOne({ _id: productId, adminId }).populate('addedBy');
        if (!sourceProduct) {
            req.flash('error_msg', 'Product not found or access denied');
            return res.redirect('/inventory/transfer');
        }
        
        // Verify the source product belongs to the source employee
        const sourceProductOwner = sourceProduct.addedBy ? sourceProduct.addedBy._id.toString() : null;
        if (sourceProductOwner !== sourceEmployee) {
            const User = require('../models/User');
            const sourceUser = await User.findById(sourceEmployee);
            req.flash('error_msg', `Product does not belong to ${sourceUser ? (sourceUser.fullName || sourceUser.username) : 'selected employee'}`);
            return res.redirect('/inventory/transfer');
        }
        
        // Check if sufficient stock available in source
        if (sourceProduct.stock < transferQty) {
            req.flash('error_msg', `Insufficient stock! Available: ${sourceProduct.stock} ${sourceProduct.unit}`);
            return res.redirect('/inventory/transfer');
        }
        
        // Find or create product in destination employee's inventory
        const User = require('../models/User');
        const destUser = await User.findById(destinationEmployee);
        const sourceUser = await User.findById(sourceEmployee);
        
        let destProduct = await Product.findOne({ 
            name: sourceProduct.name,
            addedBy: destinationEmployee
        });
        
        if (!destProduct) {
            // Create new product for destination employee
            // Record the source person (admin) as the supplier so employee can see where stock came from
            const transferSupplierName = sourceUser ? (sourceUser.fullName || sourceUser.username) : 'Admin Transfer';
            destProduct = new Product({
                name: sourceProduct.name,
                category: sourceProduct.category,
                price: sourceProduct.price,
                purchasePrice: sourceProduct.purchasePrice || 0,
                sellingPrice: sourceProduct.sellingPrice || sourceProduct.price,
                stock: 0,
                unit: sourceProduct.unit,
                reorderLevel: sourceProduct.reorderLevel || 10,
                description: sourceProduct.description || '',
                image: sourceProduct.image || '',
                hsnCode: sourceProduct.hsnCode || '',
                mfgDate: sourceProduct.mfgDate,
                expiryDate: sourceProduct.expiryDate,
                expirySoon: sourceProduct.expirySoon || false,
                supplierName: transferSupplierName,
                supplierContact: '',
                addedBy: destinationEmployee,
                adminId: getAdminId(req),
                branch: destUser ? (destUser.branch || sourceProduct.branch || 'Main Branch') : (sourceProduct.branch || 'Main Branch')
            });
        }
        
        // Record old values for logging
        const oldSourceStock = sourceProduct.stock;
        const oldDestStock = destProduct.stock;
        
        // Perform the transfer: REDUCE from source, ADD to destination
        sourceProduct.stock -= transferQty;
        destProduct.stock += transferQty;
        
        // Save both products
        await sourceProduct.save();
        await destProduct.save();
        
        // Create transfer record
        const transfer = new StockTransfer({
            productId: sourceProduct._id,
            productName: sourceProduct.name,
            quantity: transferQty,
            sourceBranch: sourceUser ? (sourceUser.fullName || sourceUser.username) : 'Unknown',
            destinationBranch: destUser ? (destUser.fullName || destUser.username) : 'Unknown',
            notes: notes || '',
            initiatedBy: req.session.user.id,
            approvedBy: req.session.user.id,
            status: 'Completed',
            completedDate: new Date(),
            adminId: getAdminId(req)
        });
        await transfer.save();
        
        // Log stock history for source (OUTGOING)
        const stockHistoryOut = new StockHistory({
            productId: sourceProduct._id,
            productName: sourceProduct.name,
            action: 'STOCK_TRANSFER_OUT',
            oldValue: { stock: oldSourceStock },
            newValue: { stock: sourceProduct.stock },
            quantityChanged: -transferQty,
            reason: `Transferred to ${destUser ? (destUser.fullName || destUser.username) : 'employee'}`,
            performedBy: req.session.user.id,
            performedByName: req.session.user.fullName || req.session.user.username,
            transferSourceEmployee: sourceEmployee,
            transferSourceEmployeeName: sourceUser ? (sourceUser.fullName || sourceUser.username) : '',
            transferDestinationEmployee: destinationEmployee,
            transferDestinationEmployeeName: destUser ? (destUser.fullName || destUser.username) : '',
            adminId: getAdminId(req)
        });
        await stockHistoryOut.save();
        
        // Log stock history for destination (INCOMING)
        // performedBy = destinationEmployee so it appears in their own activity log
        const stockHistoryIn = new StockHistory({
            productId: destProduct._id,
            productName: destProduct.name,
            action: 'STOCK_TRANSFER_IN',
            oldValue: { stock: oldDestStock },
            newValue: { stock: destProduct.stock },
            quantityChanged: transferQty,
            reason: `Received from ${sourceUser ? (sourceUser.fullName || sourceUser.username) : 'employee'}`,
            performedBy: destinationEmployee,
            performedByName: destUser ? (destUser.fullName || destUser.username) : 'Employee',
            transferSourceEmployee: sourceEmployee,
            transferSourceEmployeeName: sourceUser ? (sourceUser.fullName || sourceUser.username) : '',
            transferDestinationEmployee: destinationEmployee,
            transferDestinationEmployeeName: destUser ? (destUser.fullName || destUser.username) : '',
            adminId: getAdminId(req)
        });
        await stockHistoryIn.save();
        
        const sourceEmployeeName = sourceUser ? (sourceUser.fullName || sourceUser.username) : 'employee';
        const destEmployeeName = destUser ? (destUser.fullName || destUser.username) : 'employee';
        
        console.log(`[TRANSFER] ${transferQty} units of "${sourceProduct.name}" transferred from ${sourceEmployeeName} to ${destEmployeeName}`);
        
        req.flash('success_msg', `✅ Successfully transferred ${transferQty} ${sourceProduct.unit} of "${sourceProduct.name}" from ${sourceEmployeeName} to ${destEmployeeName}`);
        res.redirect('/inventory/transfer');
    } catch (error) {
        console.error('Transfer error:', error);
        req.flash('error_msg', 'Error creating transfer: ' + error.message);
        res.redirect('/inventory/transfer');
    }
});

// 🎯 API ENDPOINT - Get product details
router.get('/api/product/:id', isAuthenticated, async (req, res) => {
    try {
        const adminId = getAdminId(req);
        const product = await Product.findOne({ _id: req.params.id, adminId })
            .populate('addedBy', 'fullName username')
            .populate('updatedBy', 'fullName username');
        
        if (!product) {
            return res.json({ success: false, error: 'Product not found or access denied' });
        }
        
        res.json({ success: true, product });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 🎯 SUPPLIER REPORTS - Main page (Admin only)
router.get('/supplier-reports', isAuthenticated, async (req, res) => {
    try {
        const adminId = getAdminId(req);
        const { search, status, sortBy, dateFilter } = req.query;
        
        // Build filter — staff sees only their own products
        let productFilter = { adminId };
        if (req.session.user.role === 'staff') {
            productFilter.addedBy = req.session.user.id;
        }
        
        // Apply date filter if specified
        if (dateFilter) {
            const now = new Date();
            let startDate;
            
            if (dateFilter === 'today') {
                startDate = new Date(now.setHours(0, 0, 0, 0));
            } else if (dateFilter === 'week') {
                startDate = new Date(now.setDate(now.getDate() - 7));
            } else if (dateFilter === 'month') {
                startDate = new Date(now.setMonth(now.getMonth() - 1));
            }
            
            if (startDate) {
                productFilter.createdAt = { $gte: startDate };
            }
        }
        
        // Get all products
        const products = await Product.find(productFilter);
        
        // Group by supplier
        const supplierMap = new Map();
        
        products.forEach(product => {
            const supplierName = product.supplierName || 'Unknown Supplier';
            const supplierContact = product.supplierContact || '';
            const key = `${supplierName}|||${supplierContact}`;
            
            if (!supplierMap.has(key)) {
                supplierMap.set(key, {
                    name: supplierName,
                    contact: supplierContact,
                    products: [],
                    totalStock: 0,
                    totalValue: 0,
                    totalPurchaseAmount: 0,
                    amountPaid: 0,
                    amountDue: 0,
                    firstPurchaseDate: null,
                    lastPurchaseDate: null
                });
            }
            
            const supplier = supplierMap.get(key);
            supplier.products.push(product);
            supplier.totalStock += product.stock || 0;
            
            // Track purchase dates
            const productDate = product.createdAt || new Date();
            if (!supplier.firstPurchaseDate || productDate < supplier.firstPurchaseDate) {
                supplier.firstPurchaseDate = productDate;
            }
            if (!supplier.lastPurchaseDate || productDate > supplier.lastPurchaseDate) {
                supplier.lastPurchaseDate = productDate;
            }
            
            // Calculate stock value using purchase price
            const purchasePrice = product.purchasePrice || product.price || 0;
            const stockValue = (product.stock || 0) * purchasePrice;
            supplier.totalValue += stockValue;
            
            // Calculate payment details - use totalPurchaseAmount if set, otherwise use stock value
            const purchaseAmount = product.totalPurchaseAmount || stockValue;
            const paid = product.amountPaid || 0;
            
            supplier.totalPurchaseAmount += purchaseAmount;
            supplier.amountPaid += paid;
            supplier.amountDue += (purchaseAmount - paid);
        });
        
        // Convert to array
        let suppliers = Array.from(supplierMap.values());
        
        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            suppliers = suppliers.filter(s => 
                s.name.toLowerCase().includes(searchLower) || 
                s.contact.toLowerCase().includes(searchLower)
            );
        }
        
        // Apply status filter
        if (status === 'active') {
            suppliers = suppliers.filter(s => s.products.length > 0 && s.totalStock > 0);
        } else if (status === 'inactive') {
            suppliers = suppliers.filter(s => s.totalStock === 0);
        }
        
        // Apply sorting
        if (sortBy === 'products') {
            suppliers.sort((a, b) => b.products.length - a.products.length);
        } else if (sortBy === 'value') {
            suppliers.sort((a, b) => b.totalValue - a.totalValue);
        } else {
            // Default: sort by name
            suppliers.sort((a, b) => a.name.localeCompare(b.name));
        }
        
        // Calculate statistics
        const totalProducts = products.length;
        const totalValue = suppliers.reduce((sum, s) => sum + s.totalValue, 0);
        const activeSuppliers = suppliers.filter(s => s.products.length > 0 && s.totalStock > 0).length;
        
        res.render('inventory/supplier-reports', {
            user: req.session.user,
            suppliers,
            totalProducts,
            totalValue,
            activeSuppliers,
            filters: {
                search: search || '',
                status: status || '',
                sortBy: sortBy || 'name',
                dateFilter: dateFilter || ''
            }
        });
    } catch (error) {
        console.error('Supplier reports error:', error);
        res.status(500).send('Error loading supplier reports');
    }
});

// 🎯 SUPPLIER DETAILS API
router.get('/supplier-details', isAuthenticated, async (req, res) => {
    try {
        const adminId = getAdminId(req);
        const { name, contact } = req.query;
        
        // Find all products from this supplier — staff sees only their own
        const filter = { adminId };
        if (req.session.user.role === 'staff') {
            filter.addedBy = req.session.user.id;
        }
        // 'Unknown Supplier' card represents products with blank/null supplierName
        if (!name || name === 'Unknown Supplier') {
            filter.$or = [
                { supplierName: '' },
                { supplierName: null },
                { supplierName: { $exists: false } },
                { supplierName: 'Unknown Supplier' }
            ];
        } else {
            filter.supplierName = name;
            if (contact) {
                filter.supplierContact = contact;
            }
        }
        
        const products = await Product.find(filter).sort({ createdAt: -1 });
        
        // Calculate totals with consistent logic
        let totalStock = 0;
        let totalValue = 0;
        let totalPurchaseAmount = 0;
        let amountPaid = 0;
        
        products.forEach(product => {
            const stock = product.stock || 0;
            const purchasePrice = product.purchasePrice || product.price || 0;
            const stockValue = stock * purchasePrice;
            
            totalStock += stock;
            totalValue += stockValue;
            
            // Use totalPurchaseAmount if set, otherwise use stock value
            const purchaseAmount = product.totalPurchaseAmount || stockValue;
            const paid = product.amountPaid || 0;
            
            totalPurchaseAmount += purchaseAmount;
            amountPaid += paid;
        });
        
        const amountDue = totalPurchaseAmount - amountPaid;
        
        // Calculate purchase dates
        let firstPurchaseDate = null;
        let lastPurchaseDate = null;
        
        if (products.length > 0) {
            // Products are sorted by createdAt descending, so first is newest
            lastPurchaseDate = products[0].createdAt;
            firstPurchaseDate = products[products.length - 1].createdAt;
        }
        
        const supplier = {
            name: name || 'Unknown Supplier',
            contact: contact || '',
            products: products,
            totalProducts: products.length,
            totalStock: totalStock,
            totalValue: totalValue,
            totalPurchaseAmount: totalPurchaseAmount,
            amountPaid: amountPaid,
            amountDue: amountDue,
            paymentStatus: amountDue === 0 ? 'Fully Paid' : amountPaid === 0 ? 'Pending' : 'Partial',
            firstPurchaseDate: firstPurchaseDate,
            lastPurchaseDate: lastPurchaseDate
        };
        
        res.json({ success: true, supplier });
    } catch (error) {
        console.error('Supplier details error:', error);
        res.json({ success: false, message: error.message });
    }
});

// 🎯 SUPPLIER REPORT PRINT
router.get('/supplier-report-print', isAuthenticated, async (req, res) => {
    try {
        const adminId = getAdminId(req);
        const { name, contact } = req.query;
        
        // Find all products from this supplier — staff sees only their own
        const filter = { adminId };
        if (req.session.user.role === 'staff') {
            filter.addedBy = req.session.user.id;
        }
        if (!name || name === 'Unknown Supplier') {
            filter.$or = [
                { supplierName: '' },
                { supplierName: null },
                { supplierName: { $exists: false } },
                { supplierName: 'Unknown Supplier' }
            ];
        } else {
            filter.supplierName = name;
            if (contact) { filter.supplierContact = contact; }
        }
        
        const products = await Product.find(filter);
        
        const supplier = {
            name: name || 'Unknown Supplier',
            contact: contact || '',
            products: products,
            totalStock: products.reduce((sum, p) => sum + (p.stock || 0), 0),
            totalValue: products.reduce((sum, p) => sum + ((p.stock || 0) * (p.purchasePrice || p.price || 0)), 0)
        };
        
        // Render print template
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Supplier Report - ${supplier.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #4F46E5; border-bottom: 3px solid #4F46E5; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background: #4F46E5; color: white; }
                    .info-box { background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 8px; }
                    .stat { display: inline-block; margin-right: 30px; }
                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>📋 Supplier Report</h1>
                <div class="info-box">
                    <h3>Supplier Information</h3>
                    <p><strong>Name:</strong> ${supplier.name}</p>
                    <p><strong>Contact:</strong> ${supplier.contact || 'No Contact'}</p>
                    <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                
                <div class="info-box">
                    <h3>Statistics</h3>
                    <div class="stat"><strong>Total Products:</strong> ${supplier.products.length}</div>
                    <div class="stat"><strong>Total Stock:</strong> ${supplier.totalStock.toFixed(1)} units</div>
                    <div class="stat"><strong>Stock Value:</strong> ₹${supplier.totalValue.toFixed(2)}</div>
                </div>
                
                <h3>Products List</h3>
                ${supplier.products.length === 0 ? '<p>No products from this supplier</p>' : `
                <table>
                    <thead>
                        <tr>
                            <th>S.No</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Stock</th>
                            <th>Price</th>
                            <th>Purchase Price</th>
                            <th>Total Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${supplier.products.map((product, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td><strong>${product.name}</strong></td>
                                <td>${product.category || 'N/A'}</td>
                                <td>${product.stock.toFixed(1)} ${product.unit || 'units'}</td>
                                <td>₹${product.price.toFixed(2)}</td>
                                <td>₹${(product.purchasePrice || product.price).toFixed(2)}</td>
                                <td>₹${((product.stock || 0) * (product.purchasePrice || product.price)).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr style="background: #f3f4f6; font-weight: bold;">
                            <td colspan="6" style="text-align: right;">Grand Total:</td>
                            <td>₹${supplier.totalValue.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
                `}
                
                <div style="margin-top: 50px; text-align: right;">
                    <p>___________________________</p>
                    <p><strong>Authorized Signature</strong></p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Print error:', error);
        res.status(500).send('Error generating print report');
    }
});

// 🎯 SUPPLIER EXPORT (CSV)
router.get('/supplier-export', isAuthenticated, async (req, res) => {
    try {
        const adminId = getAdminId(req);
        const { search, status, sortBy } = req.query;
        
        // Get products — staff sees only their own
        let exportFilter = { adminId };
        if (req.session.user.role === 'staff') {
            exportFilter.addedBy = req.session.user.id;
        }
        const products = await Product.find(exportFilter);
        
        // Group by supplier
        const supplierMap = new Map();
        
        products.forEach(product => {
            const supplierName = product.supplierName || 'Unknown Supplier';
            const supplierContact = product.supplierContact || '';
            const key = `${supplierName}|||${supplierContact}`;
            
            if (!supplierMap.has(key)) {
                supplierMap.set(key, {
                    name: supplierName,
                    contact: supplierContact,
                    products: [],
                    totalStock: 0,
                    totalValue: 0
                });
            }
            
            const supplier = supplierMap.get(key);
            supplier.products.push(product);
            supplier.totalStock += product.stock || 0;
            supplier.totalValue += (product.stock || 0) * (product.purchasePrice || product.price || 0);
        });
        
        let suppliers = Array.from(supplierMap.values());
        
        // Apply filters (same as main route)
        if (search) {
            const searchLower = search.toLowerCase();
            suppliers = suppliers.filter(s => 
                s.name.toLowerCase().includes(searchLower) || 
                s.contact.toLowerCase().includes(searchLower)
            );
        }
        
        if (status === 'active') {
            suppliers = suppliers.filter(s => s.products.length > 0 && s.totalStock > 0);
        } else if (status === 'inactive') {
            suppliers = suppliers.filter(s => s.totalStock === 0);
        }
        
        // Generate CSV
        let csv = 'Supplier Name,Contact,Total Products,Total Stock,Stock Value\n';
        suppliers.forEach(s => {
            csv += `"${s.name}","${s.contact}",${s.products.length},${s.totalStock.toFixed(1)},${s.totalValue.toFixed(2)}\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=supplier-report.csv');
        res.send(csv);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).send('Error exporting report');
    }
});

// 🎯 CLEAR/UPDATE SUPPLIER DUES
router.post('/supplier-payment', isAuthenticated, async (req, res) => {
    try {
        const adminId = getAdminId(req);
        const { supplierName, supplierContact, paymentAmount, paymentMethod, paymentNotes } = req.body;
        
        console.log('Payment request:', { supplierName, supplierContact, paymentAmount, paymentMethod });
        
        // Validate input
        if (!supplierName || !paymentAmount || paymentAmount <= 0) {
            return res.json({ success: false, message: 'Invalid payment details' });
        }
        
        // Find all products from this supplier
        const filter = { 
            adminId,
            supplierName: supplierName
        };
        
        if (supplierContact) {
            filter.supplierContact = supplierContact;
        }
        
        const products = await Product.find(filter);
        console.log(`Found ${products.length} products for supplier ${supplierName}`);
        
        if (products.length === 0) {
            return res.json({ success: false, message: 'No products found for this supplier' });
        }
        
        // Calculate total dues (similar to supplier-details calculation)
        let totalDue = 0;
        let totalPurchaseAmount = 0;
        let totalAmountPaid = 0;
        
        products.forEach(product => {
            const stock = product.stock || 0;
            const purchasePrice = product.purchasePrice || product.price || 0;
            const stockValue = stock * purchasePrice;
            
            // Use totalPurchaseAmount if set, otherwise use stock value
            const purchaseAmount = product.totalPurchaseAmount || stockValue;
            const paid = product.amountPaid || 0;
            const due = purchaseAmount - paid;
            
            totalPurchaseAmount += purchaseAmount;
            totalAmountPaid += paid;
            totalDue += due;
            
            // Update product fields if not set
            if (!product.totalPurchaseAmount) {
                product.totalPurchaseAmount = stockValue;
            }
            if (!product.amountDue || product.amountDue !== due) {
                product.amountDue = due;
            }
        });
        
        console.log('Total due:', totalDue, 'Total purchase:', totalPurchaseAmount, 'Total paid:', totalAmountPaid);
        
        if (totalDue <= 0) {
            return res.json({ success: false, message: 'No outstanding dues for this supplier' });
        }
        
        const amountToPay = parseFloat(paymentAmount);
        
        if (amountToPay > totalDue) {
            return res.json({ success: false, message: `Payment amount (₹${amountToPay}) exceeds total dues (₹${totalDue.toFixed(2)})` });
        }
        
        // Distribute payment across products with dues (FIFO - oldest first)
        let remainingPayment = amountToPay;
        const updatedProducts = [];
        
        for (const product of products) {
            if (remainingPayment <= 0) break;
            
            // Recalculate product due
            const stock = product.stock || 0;
            const purchasePrice = product.purchasePrice || product.price || 0;
            const stockValue = stock * purchasePrice;
            const purchaseAmount = product.totalPurchaseAmount || stockValue;
            const currentPaid = product.amountPaid || 0;
            const productDue = purchaseAmount - currentPaid;
            
            if (productDue > 0) {
                const paymentForProduct = Math.min(remainingPayment, productDue);
                
                // Initialize/update fields
                if (!product.totalPurchaseAmount) {
                    product.totalPurchaseAmount = purchaseAmount;
                }
                
                product.amountPaid = currentPaid + paymentForProduct;
                product.amountDue = productDue - paymentForProduct;
                
                // Update payment status
                if (product.amountDue <= 0) {
                    product.supplierPaymentStatus = 'paid';
                } else if (product.amountPaid > 0) {
                    product.supplierPaymentStatus = 'partial';
                }
                
                // Update payment method - use lowercase to match enum
                const method = (paymentMethod || 'cash').toLowerCase();
                if (!product.paymentMethod || product.paymentMethod === 'none') {
                    product.paymentMethod = method;
                } else if (product.paymentMethod !== method) {
                    product.paymentMethod = 'mixed';
                }
                
                // Append payment notes
                if (paymentNotes) {
                    const dateStr = new Date().toLocaleDateString('en-IN');
                    const noteEntry = `[${dateStr}] Paid ₹${paymentForProduct.toFixed(2)} via ${method}: ${paymentNotes}`;
                    product.paymentNotes = product.paymentNotes 
                        ? `${product.paymentNotes}\n${noteEntry}` 
                        : noteEntry;
                } else {
                    const dateStr = new Date().toLocaleDateString('en-IN');
                    const noteEntry = `[${dateStr}] Paid ₹${paymentForProduct.toFixed(2)} via ${method}`;
                    product.paymentNotes = product.paymentNotes 
                        ? `${product.paymentNotes}\n${noteEntry}` 
                        : noteEntry;
                }
                
                console.log(`Updating product ${product.name}: paid=${product.amountPaid}, due=${product.amountDue}`);
                
                await product.save();
                updatedProducts.push(product.name);
                
                remainingPayment -= paymentForProduct;
            }
        }
        
        console.log('Payment processed successfully:', updatedProducts);
        
        res.json({ 
            success: true, 
            message: `Payment of ₹${amountToPay.toFixed(2)} recorded successfully`,
            updatedProducts: updatedProducts,
            remainingDue: (totalDue - amountToPay).toFixed(2)
        });
        
    } catch (error) {
        console.error('Supplier payment error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ success: false, message: `Error: ${error.message}` });
    }
});

module.exports = router;
