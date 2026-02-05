const twilio = require('twilio');

class SMSService {
    constructor() {
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
        this.demoMode = process.env.SMS_DEMO_MODE === 'true'; // Demo mode for FREE testing
        
        if (this.accountSid && this.authToken && this.phoneNumber) {
            this.client = twilio(this.accountSid, this.authToken);
            this.enabled = true;
        } else {
            this.enabled = false;
            if (!this.demoMode) {
                console.log('⚠️  SMS Service not configured. Enable SMS_DEMO_MODE=true for free testing');
            }
        }

        if (this.demoMode) {
            console.log('📱 SMS DEMO MODE: Messages will be logged only (FREE - No actual SMS sent)');
        }
    }

    async sendDiscountNotification(phoneNumber, shopName, discountData) {
        // Format phone number - Add +91 for India if not present
        let formattedPhone = phoneNumber.replace(/\s/g, '');
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+91' + formattedPhone.replace(/^0+/, '');
        }

        // Create message
        const message = this.createDiscountMessage(shopName, discountData);

        // DEMO MODE - Just log, don't send (FREE!)
        if (this.demoMode) {
            console.log('\n📱 ===== DEMO SMS (Not Actually Sent) =====');
            console.log('To:', formattedPhone);
            console.log('Message:\n' + message);
            console.log('=========================================\n');
            
            return {
                success: true,
                demo: true,
                to: formattedPhone,
                message: 'Demo mode - logged only'
            };
        }

        // REAL SMS MODE
        if (!this.enabled) {
            console.log('SMS not sent - Twilio not configured');
            return { success: false, message: 'SMS service not configured' };
        }

        try {
            // Send SMS via Twilio
            const result = await this.client.messages.create({
                body: message,
                from: this.phoneNumber,
                to: formattedPhone
            });

            console.log('✅ SMS sent successfully!');
            console.log('Message SID:', result.sid);
            console.log('To:', formattedPhone);

            return {
                success: true,
                messageSid: result.sid,
                to: formattedPhone
            };

        } catch (error) {
            console.error('❌ SMS sending failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    createDiscountMessage(shopName, discountData) {
        const { name, type, value, applicableOn, validUntil } = discountData;
        
        let discountText = type === 'percentage' 
            ? `${value}% OFF` 
            : `₹${value} OFF`;

        let message = `🎉 SPECIAL OFFER from ${shopName}!\n\n`;
        message += `${name.toUpperCase()}\n`;
        message += `Get ${discountText} on ${applicableOn}!\n`;
        
        if (validUntil) {
            const date = new Date(validUntil).toLocaleDateString('en-IN');
            message += `Valid till: ${date}\n`;
        }
        
        message += `\nVisit us today and enjoy great savings! 🛍️`;
        
        return message;
    }

    async sendBulkDiscountNotifications(phoneNumbers, shopName, discountData) {
        const results = {
            total: phoneNumbers.length,
            sent: 0,
            failed: 0,
            demoMode: this.demoMode,
            details: []
        };

        for (const phone of phoneNumbers) {
            if (phone && phone.length >= 10) {
                const result = await this.sendDiscountNotification(phone, shopName, discountData);
                
                if (result.success) {
                    results.sent++;
                } else {
                    results.failed++;
                }
                
                results.details.push({
                    phone,
                    ...result
                });

                // Small delay to avoid rate limiting (only in real mode)
                if (!this.demoMode) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        return results;
    }
}

module.exports = new SMSService();
