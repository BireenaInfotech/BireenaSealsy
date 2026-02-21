require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('Testing Email Configuration...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD?.length);
    
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD.replace(/\s/g, '')
            }
        });

        console.log('\nVerifying transporter...');
        await transporter.verify();
        console.log('✅ Email transporter verified successfully!');

        console.log('\nSending test email...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: 'Test Email from Bireena Salesy',
            html: `
                <h2>Test Email</h2>
                <p>If you received this email, your email configuration is working correctly!</p>
                <p>Time: ${new Date().toLocaleString()}</p>
            `
        });

        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('\nCheck your inbox at:', process.env.EMAIL_USER);
        
    } catch (error) {
        console.error('❌ Email test failed!');
        console.error('Error:', error.message);
        
        if (error.code === 'EAUTH') {
            console.error('\n⚠️  Authentication failed! Please check:');
            console.error('1. Make sure 2-Step Verification is enabled on your Gmail account');
            console.error('2. Generate a new App Password at: https://myaccount.google.com/apppasswords');
            console.error('3. Use the 16-character App Password (not your Gmail password)');
            console.error('4. Remove all spaces from the App Password in .env file');
        }
    }
}

testEmail();
