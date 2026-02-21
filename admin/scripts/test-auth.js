// Test Authentication System
// Run with: node test-auth.js

const testAuth = async () => {
    const baseUrl = 'http://localhost:3000';
    
    console.log('🔐 Testing Bireena Salesy Authentication System\n');
    console.log('='.repeat(60));
    
    // Test 1: Admin Login
    console.log('\n📌 TEST 1: Admin Login');
    console.log('-'.repeat(60));
    try {
        const adminLogin = await fetch(`${baseUrl}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        const adminData = await adminLogin.json();
        console.log('Status:', adminLogin.status);
        console.log('Response:', adminData);
        
        if (adminData.success) {
            console.log('✅ PASSED: Admin login successful');
            
            // Extract cookies for subsequent requests
            const cookies = adminLogin.headers.get('set-cookie');
            console.log('Cookies set:', cookies ? 'Yes' : 'No');
        } else {
            console.log('❌ FAILED: Admin login failed');
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }
    
    // Test 2: Employee Login (without existing employee)
    console.log('\n📌 TEST 2: Employee Login (Should Fail - No Employee)');
    console.log('-'.repeat(60));
    try {
        const empLogin = await fetch(`${baseUrl}/employee/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testemployee',
                password: 'test123'
            })
        });
        
        const empData = await empLogin.json();
        console.log('Status:', empLogin.status);
        console.log('Response:', empData);
        
        if (!empData.success && empLogin.status === 401) {
            console.log('✅ PASSED: Correctly rejected non-existent employee');
        } else {
            console.log('❌ FAILED: Unexpected response');
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }
    
    // Test 3: Invalid Admin Login
    console.log('\n📌 TEST 3: Invalid Admin Credentials');
    console.log('-'.repeat(60));
    try {
        const invalidLogin = await fetch(`${baseUrl}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'wrongpassword'
            })
        });
        
        const invalidData = await invalidLogin.json();
        console.log('Status:', invalidLogin.status);
        console.log('Response:', invalidData);
        
        if (!invalidData.success && invalidLogin.status === 401) {
            console.log('✅ PASSED: Correctly rejected invalid credentials');
        } else {
            console.log('❌ FAILED: Should have rejected invalid password');
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }
    
    // Test 4: Missing Fields
    console.log('\n📌 TEST 4: Missing Required Fields');
    console.log('-'.repeat(60));
    try {
        const missingFields = await fetch(`${baseUrl}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin'
                // password missing
            })
        });
        
        const missingData = await missingFields.json();
        console.log('Status:', missingFields.status);
        console.log('Response:', missingData);
        
        if (!missingData.success && missingFields.status === 400) {
            console.log('✅ PASSED: Correctly rejected missing fields');
        } else {
            console.log('❌ FAILED: Should have rejected missing password');
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Authentication Tests Completed!');
    console.log('='.repeat(60));
    console.log('\n📝 Manual Tests Required:');
    console.log('  1. Open http://localhost:3000 in browser');
    console.log('  2. Test Admin login with username: admin, password: admin123');
    console.log('  3. Create an employee from Admin dashboard');
    console.log('  4. Logout and test Employee login');
    console.log('  5. Verify role-based redirects');
    console.log('\n💡 Next Steps:');
    console.log('  - Change default admin password');
    console.log('  - Create employee accounts for testing');
    console.log('  - Test all protected routes');
    console.log('  - Verify session persistence');
};

// Run tests
testAuth().catch(console.error);
