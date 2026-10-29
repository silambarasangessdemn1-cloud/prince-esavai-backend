import PricingConfig from '../models/Pricing.js';

const DEFAULT_UPI_ID = 'jjesper143@oksbi';
const DEFAULT_PAYEE_NAME = 'j jesper';
const DEFAULT_QR_CODE = '/assets/qrcode.jpeg';

export const getPricing = async (req, res, next) => {
  try {
    let config = await PricingConfig.findOne();
    if (!config) {
      config = await PricingConfig.create({
        upiId: DEFAULT_UPI_ID,
        payeeName: DEFAULT_PAYEE_NAME,
        qrCodeImage: DEFAULT_QR_CODE,
        isPaymentRequired: true,
        services: [],
      });
    }

    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePricing = async (req, res, next) => {
  try {
    const { upiId, payeeName, qrCodeImage, isPaymentRequired, services } = req.body;

    let config = await PricingConfig.findOne();
    if (!config) {
      config = new PricingConfig();
    }

    if (upiId !== undefined) config.upiId = upiId;
    if (payeeName !== undefined) config.payeeName = payeeName;
    if (qrCodeImage !== undefined) config.qrCodeImage = qrCodeImage;
    if (isPaymentRequired !== undefined) config.isPaymentRequired = isPaymentRequired;
    if (Array.isArray(services)) config.services = services;

    await config.save();

    return res.status(200).json({
      success: true,
      message: 'Pricing and payment settings updated successfully',
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSingleServicePrice = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const { price, serviceName, category } = req.body;

    let config = await PricingConfig.findOne();
    if (!config) {
      config = await PricingConfig.create({
        upiId: DEFAULT_UPI_ID,
        payeeName: DEFAULT_PAYEE_NAME,
        qrCodeImage: DEFAULT_QR_CODE,
        services: [],
      });
    }

    const index = config.services.findIndex((s) => s.serviceId === serviceId);
    if (index >= 0) {
      config.services[index].price = price;
      if (serviceName) config.services[index].serviceName = serviceName;
      if (category) config.services[index].category = category;
    } else {
      config.services.push({
        serviceId,
        serviceName: serviceName || serviceId,
        category: category || 'General',
        price: Number(price) || 0,
      });
    }

    await config.save();

    return res.status(200).json({
      success: true,
      message: `Price for service ${serviceId} updated to ₹${price}`,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

