import Payment from '../models/Payment.js';

export const submitPayment = async (req, res, next) => {
  try {
    const {
      ticketNumber,
      serviceId,
      serviceName,
      category,
      applicantName,
      applicantPhone,
      amount,
      utrNumber,
      upiIdUsed,
      paymentScreenshot,
    } = req.body;

    if (!ticketNumber || !serviceId || !applicantName || !applicantPhone || !utrNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment details (ticketNumber, serviceId, applicantName, applicantPhone, utrNumber)',
      });
    }

    const cleanUtr = String(utrNumber).trim();
    if (cleanUtr.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid UTR / UPI Transaction Reference Number',
      });
    }

    const payment = await Payment.create({
      ticketNumber,
      serviceId,
      serviceName: serviceName || serviceId,
      category: category || 'General',
      applicantName,
      applicantPhone,
      amount: Number(amount) || 0,
      utrNumber: cleanUtr,
      upiIdUsed: upiIdUsed || 'jjesper143@oksbi',
      paymentScreenshot: paymentScreenshot || '',
      status: 'Pending Verification',
    });

    return res.status(201).json({
      success: true,
      message: 'Payment details submitted successfully. Verification pending by Admin.',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllPayments = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { ticketNumber: regex },
        { utrNumber: regex },
        { applicantName: regex },
        { applicantPhone: regex },
        { serviceName: regex },
      ];
    }

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const pendingCount = await Payment.countDocuments({ status: 'Pending Verification' });
    const verifiedCount = await Payment.countDocuments({ status: 'Verified & Approved' });
    const rejectedCount = await Payment.countDocuments({ status: 'Rejected' });

    return res.status(200).json({
      success: true,
      data: {
        payments,
        stats: {
          total,
          pending: pendingCount,
          verified: verifiedCount,
          rejected: rejectedCount,
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks, verifiedBy = 'Admin' } = req.body;

    if (!['Verified & Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "Verified & Approved" or "Rejected"',
      });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    payment.status = status;
    payment.verifiedBy = verifiedBy;
    payment.verifiedAt = new Date();
    if (adminRemarks) {
      payment.adminRemarks = adminRemarks;
      if (status === 'Rejected') {
        payment.rejectionReason = adminRemarks;
      }
    }

    await payment.save();

    return res.status(200).json({
      success: true,
      message: `Payment ${status === 'Verified & Approved' ? 'Approved & Verified' : 'Rejected'} successfully`,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

