const express = require('express');
const router = express.Router();
const { isAuthenticated, getAdminId } = require('../middleware/auth');
const DailyInventoryReport = require('../models/DailyInventoryReport');
const Product = require('../models/Product');
const User = require('../models/User');

// View inventory report page
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const { startDate, endDate, employee } = req.query;
        
        // Default to last 7 days if no dates provided
        let end, start;
        
        if (endDate) {
            // Parse as local date and set to end of day
            const [year, month, day] = endDate.split('-').map(Number);
            end = new Date(year, month - 1, day, 23, 59, 59, 999);
        } else {
            end = new Date();
            end.setHours(23, 59, 59, 999);
        }
        
        if (startDate) {
            // Parse as local date and set to start of day
            const [year, month, day] = startDate.split('-').map(Number);
            start = new Date(year, month - 1, day, 0, 0, 0, 0);
        } else {
            start = new Date(end);
            start.setDate(start.getDate() - 6); // Last 7 days
            start.setHours(0, 0, 0, 0);
        }
        
        // Build query filter
        let filter = {
            date: { $gte: start, $lte: end }
        };
        
        // 🎯 ADMIN FILTER - Each admin/staff only sees their shop products
        const adminId = getAdminId(req);
        
        // If employee (staff), show only their products
        if (req.session.user.role === 'staff') {
            // Get products in their shop
            const employeeProducts = await Product.find({
                adminId,
                addedBy: req.session.user.id
            }).select('_id');
            
            const productIds = employeeProducts.map(p => p._id);
            if (productIds.length > 0) {
                filter.productId = { $in: productIds };
            } else {
                // If no products found, return empty result
                filter.productId = { $in: [] };
            }
        }
        // If admin and employee filter is selected
        else if (req.session.user.role === 'admin' && employee && employee !== 'all') {
            // Get products added by this employee in this shop
            const employeeProducts = await Product.find({ 
                adminId,
                addedBy: employee 
            }).select('_id');
            const productIds = employeeProducts.map(p => p._id);
            filter.productId = { $in: productIds };
        }
        // Admin without employee filter - show all shop products
        else if (req.session.user.role === 'admin') {
            const employeeProducts = await Product.find({ 
                adminId 
            }).select('_id');
            const productIds = employeeProducts.map(p => p._id);
            if (productIds.length > 0) {
                filter.productId = { $in: productIds };
            } else {
                filter.productId = { $in: [] };
            }
        }
        
        // Get daily reports
        const reports = await DailyInventoryReport.find(filter).sort({ date: -1, productName: 1 });
        
        // Get all employees for admin filter (including admin self) - only from same shop
        let allEmployees = [];
        if (req.session.user.role === 'admin') {
            const admin = await User.findById(adminId).select('_id fullName role');
            const staff = await User.find({ 
                isActive: true, 
                adminId,
                role: 'staff'
            }).select('_id fullName role').sort({ fullName: 1 });
            if (admin) allEmployees.push(admin);
            allEmployees = allEmployees.concat(staff);
        }
        
        // Group by date and calculate totals
        const reportsByDate = {};
        reports.forEach(report => {
            // Use local date string for grouping
            const localDate = new Date(report.date);
            const dateKey = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
            if (!reportsByDate[dateKey]) {
                reportsByDate[dateKey] = [];
            }
            reportsByDate[dateKey].push(report);
        });
        
        // Format dates for input fields
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        res.render('inventory/daily-report', {
            reportsByDate,
            startDate: formatDate(start),
            endDate: formatDate(end),
            employees: allEmployees,
            selectedEmployee: employee || 'all'
        });
    } catch (error) {
        console.error('Inventory report error:', error);
        req.flash('error_msg', 'Error loading inventory report');
        res.redirect('/inventory');
    }
});

// Export inventory report as CSV
router.get('/export-csv', isAuthenticated, async (req, res) => {
    try {
        const { startDate, endDate, employee } = req.query;
        
        // Default to last 7 days if no dates provided
        let end, start;
        
        if (endDate) {
            const [year, month, day] = endDate.split('-').map(Number);
            end = new Date(year, month - 1, day, 23, 59, 59, 999);
        } else {
            end = new Date();
            end.setHours(23, 59, 59, 999);
        }
        
        if (startDate) {
            const [year, month, day] = startDate.split('-').map(Number);
            start = new Date(year, month - 1, day, 0, 0, 0, 0);
        } else {
            start = new Date(end);
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
        }
        
        // Build query filter
        let filter = {
            date: { $gte: start, $lte: end }
        };
        
        // 🎯 ADMIN FILTER - Each admin/staff only sees their shop products
        const adminId = getAdminId(req);
        
        // If employee (staff), show only their products
        if (req.session.user.role === 'staff') {
            const employeeProducts = await Product.find({
                adminId,
                addedBy: req.session.user.id
            }).select('_id');
            
            const productIds = employeeProducts.map(p => p._id);
            if (productIds.length > 0) {
                filter.productId = { $in: productIds };
            } else {
                filter.productId = { $in: [] };
            }
        }
        else if (req.session.user.role === 'admin' && employee && employee !== 'all') {
            const employeeProducts = await Product.find({ 
                adminId,
                addedBy: employee 
            }).select('_id');
            const productIds = employeeProducts.map(p => p._id);
            filter.productId = { $in: productIds };
        }
        // Admin without employee filter - show all shop products
        else if (req.session.user.role === 'admin') {
            const employeeProducts = await Product.find({ 
                adminId 
            }).select('_id');
            const productIds = employeeProducts.map(p => p._id);
            if (productIds.length > 0) {
                filter.productId = { $in: productIds };
            } else {
                filter.productId = { $in: [] };
            }
        }
        
        // Get daily reports
        const reports = await DailyInventoryReport.find(filter).sort({ date: -1, productName: 1 });
        
        // Group by date
        const reportsByDate = {};
        reports.forEach(report => {
            const localDate = new Date(report.date);
            const dateKey = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
            if (!reportsByDate[dateKey]) {
                reportsByDate[dateKey] = [];
            }
            reportsByDate[dateKey].push(report);
        });
        
        // Create CSV content
        let csvContent = '\uFEFF'; // UTF-8 BOM
        
        csvContent += 'BIREENA BAKERY - DAILY INVENTORY REPORT\n';
        csvContent += '========================================\n';
        csvContent += `Report Generated: ${new Date().toLocaleString('en-IN')}\n`;
        csvContent += `Period: ${new Date(start).toLocaleDateString('en-IN')} to ${new Date(end).toLocaleDateString('en-IN')}\n`;
        csvContent += '\n';
        
        // Process each date
        Object.keys(reportsByDate).sort().reverse().forEach(dateKey => {
            const dateReports = reportsByDate[dateKey];
            
            csvContent += `\n${new Date(dateKey).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
            csvContent += '----------------------------------------\n';
            
            // Calculate financial metrics
            let totalInventoryValue = 0;
            let totalCostValue = 0;
            let totalSalesRevenue = 0;
            let totalSalesCost = 0;
            
            dateReports.forEach(report => {
                const purchasePrice = report.purchasePrice || 0;
                const sellingPrice = report.sellingPrice || 0;
                totalInventoryValue += report.closingStock * purchasePrice;
                totalCostValue += report.additions * purchasePrice;
                totalSalesRevenue += report.sales * sellingPrice;
                totalSalesCost += report.sales * purchasePrice;
            });
            
            const totalProfit = totalSalesRevenue - totalSalesCost;
            
            csvContent += `\nFINANCIAL SUMMARY\n`;
            csvContent += `Inventory Value (Closing Stock Worth): ₹${totalInventoryValue.toFixed(2)}\n`;
            csvContent += `Investment (New Stock Added): ₹${totalCostValue.toFixed(2)}\n`;
            csvContent += `Profit (From Sales): ₹${totalProfit.toFixed(2)}\n`;
            csvContent += '\n';
            
            // Products table
            csvContent += 'Product Name,Category,Branch,Opening Stock,Additions,Sales,Damage,Closing Stock,Net Change,Unit,Purchase Price,Selling Price\n';
            
            let totalOpening = 0, totalAdditions = 0, totalSales = 0, totalDamage = 0, totalClosing = 0;
            
            dateReports.forEach(report => {
                const netChange = report.closingStock - report.openingStock;
                totalOpening += report.openingStock;
                totalAdditions += report.additions;
                totalSales += report.sales;
                totalDamage += report.damage;
                totalClosing += report.closingStock;
                
                csvContent += `"${report.productName}","${report.category}","${report.branch || 'Main Branch'}",${report.openingStock},${report.additions},${report.sales},${report.damage},${report.closingStock},${netChange},"${report.unit}",${report.purchasePrice || 0},${report.sellingPrice || 0}\n`;
            });
            
            csvContent += `"TOTAL","","",${totalOpening},${totalAdditions},${totalSales},${totalDamage},${totalClosing},${totalClosing - totalOpening},"","",""\n`;
        });
        
        csvContent += '\n========================================\n';
        csvContent += 'Report End\n';
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Daily_Inventory_Report_${new Date().toISOString().split('T')[0]}.csv"`);
        
        res.send(csvContent);
        
    } catch (error) {
        console.error('Inventory report CSV export error:', error);
        req.flash('error_msg', 'Error exporting inventory report');
        res.redirect('/inventory-report');
    }
});

// Generate daily snapshot (should be called at end of day or manually)
router.post('/generate', isAuthenticated, async (req, res) => {
    try {
        const { date } = req.body;
        
        // Create date at start of today (local time)
        let reportDate;
        if (date) {
            const [year, month, day] = date.split('-').map(Number);
            reportDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        } else {
            reportDate = new Date();
            reportDate.setHours(0, 0, 0, 0);
        }
        
        // Build product filter based on user role
        let productFilter = {};
        
        // 🎯 ADMIN FILTER - Each admin/staff only generates report for their shop
        const adminId = getAdminId(req);
        productFilter.adminId = adminId;
        
        // If employee (staff), get their own products in their shop
        if (req.session.user.role === 'staff') {
            productFilter.addedBy = req.session.user.id;
        }
        // Admin gets all products in their shop
        
        // Get products based on role
        const products = await Product.find(productFilter);
        
        if (products.length === 0) {
            console.log('⚠️ No products found for this user');
            req.flash('error_msg', 'No products found to generate report. Please add products first.');
            return res.redirect('/inventory-report');
        }
        
        let createdCount = 0;
        let updatedCount = 0;
        
        for (const product of products) {
            // Get previous day's closing stock
            const previousDate = new Date(reportDate);
            previousDate.setDate(previousDate.getDate() - 1);
            previousDate.setHours(0, 0, 0, 0);
            
            const previousReport = await DailyInventoryReport.findOne({
                productId: product._id,
                date: { 
                    $gte: previousDate, 
                    $lt: new Date(previousDate.getTime() + 24 * 60 * 60 * 1000) 
                },
                branch: product.branch || 'Main Branch'
            });
            
            const openingStock = previousReport ? previousReport.closingStock : product.stock;
            const purchasePrice = product.purchasePrice || 0;
            const sellingPrice = product.sellingPrice || product.price || 0;
            
            // Check if report already exists for today
            const existingReport = await DailyInventoryReport.findOne({
                productId: product._id,
                date: { 
                    $gte: reportDate, 
                    $lt: new Date(reportDate.getTime() + 24 * 60 * 60 * 1000) 
                },
                branch: product.branch || 'Main Branch'
            });
            
            if (existingReport) {
                // Update existing report with current prices and stock
                existingReport.closingStock = product.stock;
                existingReport.productName = product.name;
                existingReport.unit = product.unit;
                existingReport.category = product.category;
                existingReport.purchasePrice = purchasePrice;
                existingReport.sellingPrice = sellingPrice;
                existingReport.branch = product.branch || 'Main Branch';
                await existingReport.save();
                updatedCount++;
            } else {
                // Create new report
                await DailyInventoryReport.create({
                    date: reportDate,
                    productId: product._id,
                    productName: product.name,
                    openingStock: openingStock,
                    additions: Math.max(0, product.stock - openingStock),
                    sales: 0, // Will be updated from sales data
                    damage: 0, // Will be updated from damage entries
                    closingStock: product.stock,
                    unit: product.unit,
                    category: product.category,
                    purchasePrice: purchasePrice,
                    sellingPrice: sellingPrice,
                    branch: product.branch || 'Main Branch',
                    adminId: getAdminId(req)
                });
                createdCount++;
            }
        }
        
        req.flash('success_msg', `Daily inventory report generated successfully! Created: ${createdCount}, Updated: ${updatedCount}`);
        res.redirect('/inventory-report');
    } catch (error) {
        console.error('Generate report error:', error);
        req.flash('error_msg', 'Error generating inventory report');
        res.redirect('/inventory-report');
    }
});

module.exports = router;
