import PanRequest, {
  PAN_SERVICE_TYPES,
  PAN_STATUSES,
  PRIORITY_LEVELS,
  DELIVERY_MODES,
} from '../models/PanRequest.js';

const buildAuditEntry = (action, user, fromStatus, toStatus, remarks = '') => ({
  action,
  fromStatus: fromStatus || null,
  toStatus: toStatus || null,
  performedBy: user._id,
  performedByName: user.username,
  remarks: remarks ? remarks.trim() : '',
});

// ─────────────────────────────────────────────────────────────
//  @desc    Submit a new PAN service request
//  @route   POST /api/pan/requests
//  @access  Private (Logged-in citizen / VLE agent)
// ─────────────────────────────────────────────────────────────
export const submitPanRequest = async (req, res, next) => {
  try {
    const {
      serviceType,
      applicantName,
      fatherName,
      dateOfBirth,
      gender,
      applicantPhone,
      applicantEmail,
      aadhaarNumber,
      panNumber,
      deliveryMode,
      correctionDetails,
      instructions,
      priority,
    } = req.body;

    // Validate Aadhaar (must be 12 digits)
    const cleanAadhaar = String(aadhaarNumber || '').replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_AADHAAR',
        message: 'Aadhaar number must be exactly 12 digits.',
      });
    }

    // Validate PAN if supplied
    let cleanPan = '';
    if (panNumber && panNumber.trim()) {
      cleanPan = panNumber.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PAN',
          message: 'PAN number must be in standard format (e.g. ABCDE1234F).',
        });
      }
    }

    if (!applicantName || !applicantName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_NAME',
        message: 'Applicant name is required.',
      });
    }

    const cleanPhone = String(applicantPhone || '').replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PHONE',
        message: 'Valid 10-digit mobile number is required.',
      });
    }

    const request = await PanRequest.create({
      serviceType: serviceType || 'New PAN Card (Form 49A)',
      applicantName: applicantName.trim(),
      fatherName: fatherName ? fatherName.trim() : '',
      dateOfBirth: dateOfBirth ? dateOfBirth.trim() : '',
      gender: gender || '',
      applicantPhone: cleanPhone,
      applicantEmail: applicantEmail ? applicantEmail.trim() : '',
      aadhaarNumber: cleanAadhaar,
      panNumber: cleanPan,
      deliveryMode: deliveryMode || 'Physical Card + e-PAN',
      correctionDetails: correctionDetails ? correctionDetails.trim() : '',
      instructions: instructions ? instructions.trim() : '',
      priority: priority || 'Medium',
      submittedBy: req.user._id,
      submittedByName: req.user.username,
      auditLog: [
        buildAuditEntry(
          'PAN Application Submitted',
          req.user,
          null,
          'Submitted',
          `Application submitted by ${req.user.username}`
        ),
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'PAN Card service application submitted successfully',
      data: { request },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    List ALL PAN requests (paginated, filterable, searchable)
//  @route   GET /api/pan/requests
//  @access  Private
// ─────────────────────────────────────────────────────────────
export const listAllPanRequests = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = {};

    // User Id Scoping: Unless admin requesting all, citizen only sees their own submitted records
    const isAdminScope = req.user?.role === 'admin' && req.query.scope === 'all';
    if (!isAdminScope) {
      if (!req.user) {
        return res.status(200).json({
          success: true,
          data: {
            requests: [],
            pagination: { total: 0, page, limit, totalPages: 0, hasNextPage: false, hasPrevPage: false },
          },
        });
      }
      filter.submittedBy = req.user._id;
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.serviceType) filter.serviceType = req.query.serviceType;

    if (req.query.search) {
      const regex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { applicantName: regex },
        { ticketNumber: regex },
        { applicantPhone: regex },
        { panNumber: regex },
        { nsdlUtiiAckNumber: regex },
      ];
    }

    const [requests, total] = await Promise.all([
      PanRequest.find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('submittedBy', 'username phoneNumber')
        .select('-auditLog'),
      PanRequest.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        requests,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Get PAN requests by 12-digit Aadhaar or 10-digit PAN
//  @route   GET /api/pan/requests/lookup/:identifier
//  @access  Private
// ─────────────────────────────────────────────────────────────
export const getPanRequestsByIdentifier = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const clean = identifier.trim().toUpperCase();

    const query = {};
    if (/^\d{12}$/.test(clean)) {
      query.aadhaarNumber = clean;
    } else if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(clean)) {
      query.panNumber = clean;
    } else {
      return res.status(400).json({
        success: false,
        error: 'INVALID_IDENTIFIER',
        message: 'Please provide either a 12-digit Aadhaar or a 10-character PAN number.',
      });
    }

    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin) {
      if (!req.user) {
        return res.status(200).json({
          success: true,
          data: {
            identifier: clean,
            summary: { totalRequests: 0, byStatus: {}, byServiceType: {} },
            requests: [],
          },
        });
      }
      query.submittedBy = req.user._id;
    }

    const requests = await PanRequest.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate('submittedBy', 'username phoneNumber')
      .populate('assignedTo', 'username phoneNumber');

    const summary = {
      totalRequests: requests.length,
      byStatus: {},
      byServiceType: {},
    };

    requests.forEach((r) => {
      summary.byStatus[r.status] = (summary.byStatus[r.status] || 0) + 1;
      summary.byServiceType[r.serviceType] = (summary.byServiceType[r.serviceType] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      data: {
        identifier: clean,
        summary,
        requests,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Get single PAN request by ID
//  @route   GET /api/pan/requests/:id
//  @access  Private
// ─────────────────────────────────────────────────────────────
export const getPanRequestById = async (req, res, next) => {
  try {
    const request = await PanRequest.findById(req.params.id)
      .populate('submittedBy', 'username phoneNumber')
      .populate('assignedTo', 'username phoneNumber')
      .populate('auditLog.performedBy', 'username');

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'PAN request not found.',
      });
    }

    if (req.user?.role !== 'admin' && String(request.submittedBy?._id || request.submittedBy) !== String(req.user?._id)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to view this request.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { request },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Update PAN request status & official admin response
//  @route   PATCH /api/pan/requests/:id/status
//  @access  Private (Admin / Operator)
// ─────────────────────────────────────────────────────────────
export const updatePanRequestStatus = async (req, res, next) => {
  try {
    const { status, remarks, nsdlUtiiAckNumber } = req.body;

    if (!status || !PAN_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Status must be one of: ${PAN_STATUSES.join(', ')}`,
      });
    }

    const request = await PanRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'PAN request not found.',
      });
    }

    if (req.user?.role !== 'admin' && String(request.submittedBy?._id || request.submittedBy) !== String(req.user?._id)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to view this request.',
      });
    }

    const previousStatus = request.status;
    request.status = status;

    if (nsdlUtiiAckNumber !== undefined) {
      request.nsdlUtiiAckNumber = String(nsdlUtiiAckNumber).trim();
    }

    const auditRemark = remarks
      ? remarks.trim()
      : `Status changed to '${status}'${request.nsdlUtiiAckNumber ? ` with Ack No: ${request.nsdlUtiiAckNumber}` : ''}`;

    request.auditLog.push(
      buildAuditEntry(
        `Status changed to '${status}'`,
        req.user,
        previousStatus,
        status,
        auditRemark
      )
    );

    // Save operator remarks as the highlighted resolution message
    if (remarks && remarks.trim()) {
      request.resolutionRemarks = remarks.trim();
    }

    if (status === 'Resolved' || status === 'Closed') {
      request.resolvedAt = new Date();
    }

    await request.save();

    return res.status(200).json({
      success: true,
      message: `PAN request status updated to '${status}'`,
      data: { request },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Delete PAN request
//  @route   DELETE /api/pan/requests/:id
//  @access  Private (Admin)
// ─────────────────────────────────────────────────────────────
export const deletePanRequest = async (req, res, next) => {
  try {
    const request = await PanRequest.findByIdAndDelete(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'PAN request not found.',
      });
    }

    if (req.user?.role !== 'admin' && String(request.submittedBy?._id || request.submittedBy) !== String(req.user?._id)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to view this request.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `PAN request ${request.ticketNumber} deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Get PAN request statistics
//  @route   GET /api/pan/stats
//  @access  Private
// ─────────────────────────────────────────────────────────────
export const getPanStats = async (req, res, next) => {
  try {
    const isAdminScope = req.user?.role === 'admin' && req.query.scope === 'all';
    const matchFilter = isAdminScope ? {} : req.user ? { submittedBy: req.user._id } : { submittedBy: null };

    const [total, statusAgg, serviceAgg] = await Promise.all([
      PanRequest.countDocuments(matchFilter),
      PanRequest.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      PanRequest.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$serviceType', count: { $sum: 1 } } },
      ]),
    ]);

    const byStatus = {};
    PAN_STATUSES.forEach((st) => (byStatus[st] = 0));
    statusAgg.forEach((item) => {
      byStatus[item._id] = item.count;
    });

    const byServiceType = {};
    PAN_SERVICE_TYPES.forEach((st) => (byServiceType[st] = 0));
    serviceAgg.forEach((item) => {
      byServiceType[item._id] = item.count;
    });

    return res.status(200).json({
      success: true,
      data: {
        total,
        byStatus,
        byServiceType,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Get PAN metadata (enums & options)
//  @route   GET /api/pan/meta
//  @access  Public / Private
// ─────────────────────────────────────────────────────────────
export const getPanMeta = (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      serviceTypes: PAN_SERVICE_TYPES,
      statuses: PAN_STATUSES,
      priorities: PRIORITY_LEVELS,
      deliveryModes: DELIVERY_MODES,
    },
  });
};

