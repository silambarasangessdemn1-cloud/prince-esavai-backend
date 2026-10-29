import express from 'express';
import {
  submitPayment,
  getAllPayments,
  verifyPayment,
} from '../controllers/paymentController.js';

const router = express.Router();

router.post('/submit', submitPayment);
router.get('/', getAllPayments);
router.patch('/:id/verify', verifyPayment);

export default router;

