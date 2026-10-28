import RationRequest, {
  RATION_SERVICE_TYPES,
  CARD_TYPES,
  RATION_STATUSES,
  PRIORITY_LEVELS,
  RELATION_TYPES,
} from '../models/RationRequest.js';

const buildAuditEntry = (action, user, fromStatus, toStatus, remarks = '') => ({
  action,
  fromStatus: fromStatus || null,
  toStatus: toStatus || null,
  performedBy: user._id,
  performedByName: user.username,
  remarks: remarks ? remarks.trim() : '',
});

// ─────────────────────────────────────────────────────────────
//  @desc    Get Ration Service metadata (Services, Card Types, Enums)
//  @route   GET /api/ration/meta
//  @access  Public
// ─────────────────────────────────────────────────────────────
export const getRationMeta = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        serviceTypes: RATION_SERVICE_TYPES,
        cardTypes: CARD_TYPES,
        statuses: RATION_STATUSES,
        priorities: PRIORITY_LEVELS,
        relationTypes: RELATION_TYPES,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Submit a new Ration Service application
//  @route   POST /api/ration/requests
//  @access  Public / Private (Logged-in or Citizen Guest)
// ─────────────────────────────────────────────────────────────
export const submitRationRequest = async (req, res, next) => {
  try {
    const {
      serviceType,
      rationCardNumber,
      cardType,
      applicantName,
      relativeName,
      relationType,
      gender,
      dateOfBirth,
      applicantPhone,
      applicantEmail,
      aadhaarNumber,
      state,
      district,
      taluk,
      villageOrWard,
      fpsCode,
      newAddress,
      members,
      correctionDetails,
      remarksOrNotes,
      priority,
    } = req.body;

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
        message: 'Please provide a valid 10-digit mobile number.',
      });
    }

    let cleanAadhaar = '';
    if (aadhaarNumber && String(aadhaarNumber).trim()) {
      cleanAadhaar = String(aadhaarNumber).replace(/\D/g, '');
      if (cleanAadhaar.length !== 12) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_AADHAAR',
          message: 'Aadhaar number must be exactly 12 digits.',
        });
      }
    }

    let cleanCardNo = '';
    if (rationCardNumber && String(rationCardNumber).trim()) {
      cleanCardNo = String(rationCardNumber).trim().toUpperCase();
    }

    // Default user identity for portal citizens
    const currentUser = req.user || {
      _id: '65e000000000000000000001',
      username: applicantName.trim(),
      role: 'citizen',
    };

    const initialAudit = {
      action: `Ration Application Created: ${serviceType}`,
      fromStatus: null,
      toStatus: 'Submitted',
      performedBy: currentUser._id,
      performedByName: currentUser.username,
      remarks: 'Application successfully queued for TNPDS Civil Supplies verification.',
    };

    const newRequest = new RationRequest({
      serviceType,
      rationCardNumber: cleanCardNo,
      cardType: cardType || 'PHH - Priority Household (Rice)',
      applicantName: applicantName.trim(),
      relativeName: relativeName ? relativeName.trim() : '',
      relationType: relationType || 'Husband',
      gender: gender || 'Female',
      dateOfBirth: dateOfBirth || '',
      applicantPhone: cleanPhone,
      applicantEmail: applicantEmail ? applicantEmail.trim().toLowerCase() : '',
      aadhaarNumber: cleanAadhaar,
      state: state || 'Tamil Nadu',
      district: district || 'Salem',
      taluk: taluk ? taluk.trim() : '',
      villageOrWard: villageOrWard ? villageOrWard.trim() : '',
      fpsCode: fpsCode ? fpsCode.trim() : '',
      newAddress: newAddress ? newAddress.trim() : '',
      members: Array.isArray(members) ? members : [],
      correctionDetails: correctionDetails ? correctionDetails.trim() : '',
      remarksOrNotes: remarksOrNotes ? remarksOrNotes.trim() : '',
      priority: priority || 'Medium',
      status: 'Submitted',
      submittedBy: currentUser._id,
      submittedByName: currentUser.username,
      auditLog: [initialAudit],
    });

    const saved = await newRequest.save();

    res.status(201).json({
      success: true,
      message: 'Ration service application submitted successfully.',
      ticketNumber: saved.ticketNumber,
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Get all Ration service requests (Filterable, Paginated)
//  @route   GET /api/ration/requests
//  @access  Public / Private
// ─────────────────────────────────────────────────────────────
export const getRationRequests = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      serviceType,
      district,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    // User Id Scoping: Unless admin requesting all, citizen only sees their own submitted records
    const isAdminScope = req.user?.role === 'admin' && req.query.scope === 'all';
    if (!isAdminScope) {
      if (!req.user) {
        return res.status(200).json({
          success: true,
          data: [],
          meta: { page: 1, limit: parseInt(limit, 10) || 20, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
        });
      }
      query.submittedBy = req.user._id;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (serviceType && serviceType !== 'All') {
      query.serviceType = serviceType;
    }

    if (district && district !== 'All') {
      query.district = district;
    }

    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      query.$or = [
        { ticketNumber: regex },
        { applicantName: regex },
        { rationCardNumber: regex },
        { applicantPhone: regex },
        { aadhaarNumber: regex },
        { tnpdsAckNumber: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * pageSize;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      RationRequest.find(query).sort(sort).skip(skip).limit(pageSize),
      RationRequest.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: items,
      meta: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Get a single Ration request by ID or Ticket Number
//  @route   GET /api/ration/requests/:id
//  @access  Public / Private
// ─────────────────────────────────────────────────────────────
export const getRationRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let request = null;
    if (id.startsWith('RAT-')) {
      request = await RationRequest.findOne({ ticketNumber: id });
    } else {
      request = await RationRequest.findById(id);
    }

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Ration request '${id}' not found.`,
      });
    }

    if (req.user?.role !== 'admin' && String(request.submittedBy?._id || request.submittedBy) !== String(req.user?._id)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to view this request.',
      });
    }

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Aggregate Ration stats for Dashboard & Operator Queue
//  @route   GET /api/ration/stats
//  @access  Public / Private
// ─────────────────────────────────────────────────────────────
export const getRationStats = async (req, res, next) => {
  try {
    const isAdminScope = req.user?.role === 'admin' && req.query.scope === 'all';
    const matchFilter = isAdminScope ? {} : req.user ? { submittedBy: req.user._id } : { submittedBy: null };

    const [statusStats, serviceStats, total] = await Promise.all([
      RationRequest.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      RationRequest.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$serviceType', count: { $sum: 1 } } },
      ]),
      RationRequest.countDocuments(matchFilter),
    ]);

    const byStatus = {};
    RATION_STATUSES.forEach((st) => (byStatus[st] = 0));
    statusStats.forEach((s) => {
      byStatus[s._id] = s.count;
    });

    const byService = {};
    serviceStats.forEach((s) => {
      byService[s._id] = s.count;
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus,
        byService,
        availableStatuses: RATION_STATUSES,
        availableServices: RATION_SERVICE_TYPES,
        availableCardTypes: CARD_TYPES,
        availablePriorities: PRIORITY_LEVELS,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Lookup requests by Ration Card No, Aadhaar or Mobile
//  @route   GET /api/ration/lookup/:identifier
//  @access  Public
// ─────────────────────────────────────────────────────────────
export const lookupRationByIdentifier = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const cleanId = String(identifier || '').trim().toUpperCase();

    if (!cleanId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_IDENTIFIER',
        message: 'Please provide a Ration Card Number, Aadhaar Number, or Mobile Number.',
      });
    }

    const query = {
      $or: [
        { rationCardNumber: cleanId },
        { aadhaarNumber: cleanId.replace(/\D/g, '') },
        { applicantPhone: cleanId.replace(/\D/g, '') },
        { ticketNumber: cleanId },
        { tnpdsAckNumber: cleanId },
      ],
    };

    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin) {
      if (!req.user) {
        return res.status(200).json({
          success: true,
          data: [],
          summary: { totalRequests: 0, byStatus: {} },
          identifier: cleanId,
        });
      }
      query.submittedBy = req.user._id;
    }

    const requests = await RationRequest.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests,
      summary: {
        totalRequests: requests.length,
        byStatus: requests.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {}),
      },
      identifier: cleanId,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Update Ration request status & resolution remarks
//  @route   PATCH /api/ration/requests/:id/status
//  @access  Private (Admin / Operator)
// ─────────────────────────────────────────────────────────────
export const updateRationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, tnpdsAckNumber, resolutionRemarks, assignedToName } = req.body;

    const request = await RationRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Ration application not found.',
      });
    }

    const previousStatus = request.status;
    const targetStatus = status || request.status;

    if (status && !RATION_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Status must be one of: ${RATION_STATUSES.join(', ')}`,
      });
    }

    const currentUser = req.user || {
      _id: '65e000000000000000000002',
      username: 'Administrator',
      role: 'admin',
    };

    if (status) request.status = status;
    if (tnpdsAckNumber !== undefined) request.tnpdsAckNumber = tnpdsAckNumber.trim();
    if (resolutionRemarks !== undefined) request.resolutionRemarks = resolutionRemarks.trim();
    if (assignedToName !== undefined) request.assignedToName = assignedToName.trim();

    if (status === 'Resolved' && previousStatus !== 'Resolved') {
      request.resolvedAt = new Date();
    }

    const auditEntry = buildAuditEntry(
      `Status changed: ${previousStatus} ➜ ${targetStatus}`,
      currentUser,
      previousStatus,
      targetStatus,
      resolutionRemarks || (tnpdsAckNumber ? `TNPDS Reference generated: ${tnpdsAckNumber}` : '')
    );
    request.auditLog.push(auditEntry);

    const updated = await request.save();

    res.status(200).json({
      success: true,
      message: `Ration application ${updated.ticketNumber} updated successfully.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Add an internal audit note to a Ration request
//  @route   POST /api/ration/requests/:id/audit
//  @access  Private (Admin / Operator)
// ─────────────────────────────────────────────────────────────
export const addRationAuditLogEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;

    if (!action || !action.trim()) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ACTION',
        message: 'Action description is required.',
      });
    }

    const request = await RationRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Ration request not found.',
      });
    }

    const currentUser = req.user || {
      _id: '65e000000000000000000002',
      username: 'Operator',
    };

    const newAudit = buildAuditEntry(
      action.trim(),
      currentUser,
      request.status,
      request.status,
      remarks || ''
    );

    request.auditLog.push(newAudit);
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Audit log entry added.',
      data: request.auditLog,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Delete a Ration application
//  @route   DELETE /api/ration/requests/:id
//  @access  Private (Admin only)
// ─────────────────────────────────────────────────────────────
export const deleteRationRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await RationRequest.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Ration application not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ration application deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
