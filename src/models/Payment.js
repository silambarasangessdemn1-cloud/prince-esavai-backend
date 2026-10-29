import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      trim: true,
    },
    serviceId: {
      type: String,
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: 'General',
    },
    applicantName: {
      type: String,
      required: true,
      trim: true,
    },
    applicantPhone: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    utrNumber: {
      type: String,
      required: [true, 'UTR / Reference number is required'],
      trim: true,
    },
    upiIdUsed: {
      type: String,
      default: 'jjesper143@oksbi',
    },
    paymentScreenshot: {
      type: String,
      default: '',
    },
    paymentMethod: {
      type: String,
      default: 'UPI QR',
    },
    status: {
      type: String,
      enum: ['Pending Verification', 'Verified & Approved', 'Rejected'],
      default: 'Pending Verification',
    },
    verifiedBy: {
      type: String,
      default: '',
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

paymentSchema.index({ ticketNumber: 1 });
paymentSchema.index({ utrNumber: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;

