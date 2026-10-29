import mongoose from 'mongoose';

const pricingItemSchema = new mongoose.Schema(
  {
    serviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
      default: 50,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    processingTime: {
      type: String,
      default: '1-2 Working Days',
    },
  },
  { _id: false }
);

const pricingConfigSchema = new mongoose.Schema(
  {
    upiId: {
      type: String,
      default: 'jjesper143@oksbi',
      trim: true,
    },
    payeeName: {
      type: String,
      default: 'j jesper',
      trim: true,
    },
    qrCodeImage: {
      type: String,
      default: '/assets/qrcode.jpeg',
    },
    isPaymentRequired: {
      type: Boolean,
      default: true,
    },
    services: [pricingItemSchema],
  },
  { timestamps: true }
);

const PricingConfig = mongoose.model('PricingConfig', pricingConfigSchema);

export default PricingConfig;

