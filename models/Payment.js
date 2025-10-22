const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderId: {
        type: String,
        required: true
    },
    paymentId: String,
    signature: String,
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum: ['created', 'success', 'failed'],
        default: 'created'
    },
    cartItems: [{
        productId: mongoose.Schema.Types.ObjectId,
        quantity: Number,
        size: String
    }],
    razorpayOrder: Object,
    failureReason: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    verifiedAt: Date
});

module.exports = mongoose.model('Payment', paymentSchema);