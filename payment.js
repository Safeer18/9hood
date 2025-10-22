// payment.js - Razorpay Payment Integration
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'your_test_key_id',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_test_key_secret'
});

// In-memory payment records (use database in production)
let payments = [];

// ============== CREATE ORDER ==============
// This creates a Razorpay order before payment
router.post('/create-order', async (req, res) => {
    try {
        const { amount, currency, receipt, userId, cartItems } = req.body;

        // Validate amount
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }

        // Create Razorpay order
        const options = {
            amount: amount * 100, // Razorpay expects amount in paise (₹1 = 100 paise)
            currency: currency || 'INR',
            receipt: receipt || `receipt_${Date.now()}`,
            notes: {
                userId: userId || 'guest',
                itemCount: cartItems ? cartItems.length : 0
            }
        };

        const order = await razorpay.orders.create(options);

        // Store order details
        const paymentRecord = {
            id: payments.length + 1,
            orderId: order.id,
            userId: userId || 'guest',
            amount: amount,
            currency: order.currency,
            status: 'created',
            cartItems: cartItems || [],
            createdAt: new Date(),
            razorpayOrder: order
        };

        payments.push(paymentRecord);

        res.json({
            success: true,
            message: 'Order created successfully',
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt
            },
            key: process.env.RAZORPAY_KEY_ID || 'your_test_key_id'
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
});

// ============== VERIFY PAYMENT ==============
// Verify payment signature after successful payment
router.post('/verify-payment', async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            userId
        } = req.body;

        // Create signature for verification
        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'your_test_key_secret')
            .update(sign.toString())
            .digest('hex');

        // Verify signature
        if (razorpay_signature === expectedSign) {
            // Payment is authentic
            
            // Find payment record
            const paymentRecord = payments.find(p => p.orderId === razorpay_order_id);
            
            if (paymentRecord) {
                paymentRecord.status = 'success';
                paymentRecord.paymentId = razorpay_payment_id;
                paymentRecord.signature = razorpay_signature;
                paymentRecord.verifiedAt = new Date();
            }

            // Fetch payment details from Razorpay
            const payment = await razorpay.payments.fetch(razorpay_payment_id);

            res.json({
                success: true,
                message: 'Payment verified successfully',
                payment: {
                    orderId: razorpay_order_id,
                    paymentId: razorpay_payment_id,
                    amount: payment.amount / 100,
                    currency: payment.currency,
                    status: payment.status,
                    method: payment.method,
                    email: payment.email,
                    contact: payment.contact
                }
            });
        } else {
            // Invalid signature
            const paymentRecord = payments.find(p => p.orderId === razorpay_order_id);
            if (paymentRecord) {
                paymentRecord.status = 'failed';
                paymentRecord.failureReason = 'Invalid signature';
            }

            res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: error.message
        });
    }
});

// ============== GET PAYMENT DETAILS ==============
router.get('/payment/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;
        
        // Fetch from Razorpay
        const payment = await razorpay.payments.fetch(paymentId);

        res.json({
            success: true,
            payment: {
                id: payment.id,
                amount: payment.amount / 100,
                currency: payment.currency,
                status: payment.status,
                method: payment.method,
                email: payment.email,
                contact: payment.contact,
                createdAt: payment.created_at
            }
        });

    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment details',
            error: error.message
        });
    }
});

// ============== GET ORDER PAYMENTS ==============
router.get('/order/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Fetch order from Razorpay
        const order = await razorpay.orders.fetch(orderId);
        
        // Fetch payments for this order
        const orderPayments = await razorpay.orders.fetchPayments(orderId);

        res.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount / 100,
                currency: order.currency,
                status: order.status,
                receipt: order.receipt
            },
            payments: orderPayments.items.map(p => ({
                id: p.id,
                amount: p.amount / 100,
                status: p.status,
                method: p.method
            }))
        });

    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order details',
            error: error.message
        });
    }
});

// ============== INITIATE REFUND ==============
router.post('/refund', async (req, res) => {
    try {
        const { paymentId, amount, reason } = req.body;

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID is required'
            });
        }

        // Create refund
        const refund = await razorpay.payments.refund(paymentId, {
            amount: amount ? amount * 100 : undefined, // Full refund if amount not specified
            notes: {
                reason: reason || 'Customer request'
            }
        });

        res.json({
            success: true,
            message: 'Refund initiated successfully',
            refund: {
                id: refund.id,
                paymentId: refund.payment_id,
                amount: refund.amount / 100,
                status: refund.status,
                createdAt: refund.created_at
            }
        });

    } catch (error) {
        console.error('Error processing refund:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process refund',
            error: error.message
        });
    }
});

// ============== WEBHOOK HANDLER ==============
// Handle Razorpay webhooks for real-time payment updates
router.post('/webhook', (req, res) => {
    try {
        const webhookSignature = req.headers['x-razorpay-signature'];
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (webhookSignature === expectedSignature) {
            // Webhook is authentic
            const event = req.body.event;
            const payload = req.body.payload;

            console.log('Webhook received:', event);

            // Handle different events
            switch (event) {
                case 'payment.authorized':
                    console.log('Payment authorized:', payload.payment.entity.id);
                    break;

                case 'payment.captured':
                    console.log('Payment captured:', payload.payment.entity.id);
                    // Update order status, send confirmation email, etc.
                    break;

                case 'payment.failed':
                    console.log('Payment failed:', payload.payment.entity.id);
                    // Handle failed payment
                    break;

                case 'order.paid':
                    console.log('Order paid:', payload.order.entity.id);
                    break;

                case 'refund.created':
                    console.log('Refund created:', payload.refund.entity.id);
                    break;

                default:
                    console.log('Unhandled event:', event);
            }

            res.json({ status: 'ok' });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid webhook signature'
            });
        }

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({
            success: false,
            message: 'Webhook processing failed'
        });
    }
});

// ============== GET ALL PAYMENTS (Admin) ==============
router.get('/all', (req, res) => {
    try {
        const { status, userId } = req.query;
        
        let filteredPayments = [...payments];
        
        if (status) {
            filteredPayments = filteredPayments.filter(p => p.status === status);
        }
        
        if (userId) {
            filteredPayments = filteredPayments.filter(p => p.userId === userId);
        }

        res.json({
            success: true,
            count: filteredPayments.length,
            payments: filteredPayments
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payments',
            error: error.message
        });
    }
});

// ============== PAYMENT STATISTICS ==============
router.get('/stats', (req, res) => {
    try {
        const totalPayments = payments.length;
        const successfulPayments = payments.filter(p => p.status === 'success').length;
        const failedPayments = payments.filter(p => p.status === 'failed').length;
        const totalRevenue = payments
            .filter(p => p.status === 'success')
            .reduce((sum, p) => sum + p.amount, 0);

        res.json({
            success: true,
            stats: {
                totalPayments,
                successfulPayments,
                failedPayments,
                totalRevenue,
                successRate: totalPayments > 0 
                    ? ((successfulPayments / totalPayments) * 100).toFixed(2) 
                    : 0
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment statistics',
            error: error.message
        });
    }
});

module.exports = router;