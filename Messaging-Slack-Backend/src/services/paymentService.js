import crypto from 'crypto';

import { RAZORPAY_KEY_SECRET } from '../config/serverConfig.js';
import paymentRepository from '../repositories/paymentRepository.js';

export const createPaymentService = async (orderId, amount) => {
    const payment = await paymentRepository.create({
        orderId,
        amount
    });
    return payment;
}

export const updatePaymentStatusService = async (orderId, status, paymentId, signature) => {

    // 1. verify if payment is sucess or not ?
    if(status === 'success') {
        const sharesponse = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
        console.log('sharesponse', sharesponse, signature);
        if(sharesponse === signature) {
            await paymentRepository.updateOrder(orderId, { status: 'success', paymentId });
        } else {
            throw new Error('Payment verification failed');
        }
    }
}