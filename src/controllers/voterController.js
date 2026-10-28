import VoterRequest, {
  VOTER_SERVICE_TYPES,
  VOTER_STATUSES,
  PRIORITY_LEVELS,
  RELATION_TYPES,
} from '../models/VoterRequest.js';

const buildAuditEntry = (action, user, fromStatus, toStatus, remarks = '') => ({
  action,
  fromStatus: fromStatus || null,
  toStatus: toStatus || null,
  performedBy: user._id,
  performedByName: user.username,
  remarks: remarks ? remarks.trim() : '',
});

// ─────────────────────────────────────────────────────────────
//  @desc    Submit a new Voter Service application
//  @route   POST /api/voter/requests
//  @access  Private (Logged-in citizen / VLE agent)
// ─────────────────────────────────────────────────────────────
export const submitVoterRequest = async (req, res, next) => {
  try {
    const {
      serviceType,
      applicantName,
      relativeName,
      relationType,
      dateOfBirth,
      gender,
      applicantPhone,
      applicantEmail,
      aadhaarNumber,
      epicNumber,
      state,
      district,
      assemblyConstituency,
      pollingStation,
      correctionDetails,
      newAddress,
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

    const cleanEpic = epicNumber ? epicNumber.trim().toUpperCase() : '';

    const request = await VoterRequest.create({
      serviceType: serviceType || 'New Voter Registration (Form 6)',
      applicantName: applicantName.trim(),
      relativeName: relativeName ? relativeName.trim() : '',
      relationType: relationType || 'Father',
      dateOfBirth: dateOfBirth ? dateOfBirth.trim() : '',
      gender: gender || 'Male',
      applicantPhone: cleanPhone,
      applicantEmail: applicantEmail ? applicantEmail.trim() : '',
      aadhaarNumber: cleanAadhaar,
      epicNumber: cleanEpic,
      state: state ? state.trim() : 'Tamil Nadu',
      district: district ? district.trim() : '',
      assemblyConstituency: assemblyConstituency ? assemblyConstituency.trim() : '',
      pollingStation: pollingStation ? pollingStation.trim() : '',
      correctionDetails: correctionDetails ? correctionDetails.trim() : '',
      newAddress: newAddress ? newAddress.trim() : '',
      remarksOrNotes: remarksOrNotes ? remarksOrNotes.trim() : '',
      priority: priority || 'Medium',
      submittedBy: req.user._id,
      submittedByName: req.user.username,
      auditLog: [
        buildAuditEntry(
          'Voter Application Submitted',
          req.user,
          null,
          'Submitted',
          `Application for '${serviceType || 'New Voter Registration'}' submitted by ${req.user.username}`
        ),
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Voter service application submitted successfully',
      data: { request },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    List ALL Voter applications (paginated, filterable, searchable)
//  @route   GET /api/voter/requests
//  @access  Private
// ─────────────────────────────────────────────────────────────
export const listAllVoterRequests = async (req, res, next) => {
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
    if (req.query.district) filter.district = req.query.district;

    if (req.query.search) {
      const regex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { applicantName: regex },
        { ticketNumber: regex },
        { applicantPhone: regex },
        { epicNumber: regex },
        { eciReferenceNumber: regex },
        { assemblyConstituency: regex },
      ];
    }

    const [requests, total] = await Promise.all([
      VoterRequest.find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('submittedBy', 'username phoneNumber')
        .select('-auditLog'),
      VoterRequest.countDocuments(filter),
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
//  @desc    Lookup Voter requests by EPIC Number or 12-digit Aadhaar
//  @route   GET /api/voter/requests/lookup/:identifier
//  @access  Private
// ─────────────────────────────────────────────────────────────
export const getVoterRequestsByIdentifier = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const clean = identifier.trim().toUpperCase();

    const query = {};
    if (/^\d{12}$/.test(clean)) {
      query.aadhaarNumber = clean;
    } else {
      query.epicNumber = clean;
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

    const requests = await VoterRequest.find(query)
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
//  @desc    Get single Voter application by ID
//  @route   GET /api/voter/requests/:id
//  @access  Private
// ─────────────────────────────────────────────────────────────
export const getVoterRequestById = async (req, res, next) => {
  try {
    const request = await VoterRequest.findById(req.params.id)
      .populate('submittedBy', 'username phoneNumber')
      .populate('assignedTo', 'username phoneNumber')
      .populate('auditLog.performedBy', 'username');

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Voter service application not found.',
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
//  @desc    Update Voter application status & admin response
//  @route   PATCH /api/voter/requests/:id/status
//  @access  Private (Admin / Operator)
// ─────────────────────────────────────────────────────────────
export const updateVoterRequestStatus = async (req, res, next) => {
  try {
    const { status, remarks, eciReferenceNumber } = req.body;

    if (!status || !VOTER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Status must be one of: ${VOTER_STATUSES.join(', ')}`,
      });
    }

    const request = await VoterRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Voter service application not found.',
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

    if (eciReferenceNumber !== undefined) {
      request.eciReferenceNumber = String(eciReferenceNumber).trim();
    }

    const auditRemark = remarks
      ? remarks.trim()
      : `Status changed to '${status}'${request.eciReferenceNumber ? ` (ECI Ref: ${request.eciReferenceNumber})` : ''}`;

    request.auditLog.push(
      buildAuditEntry(
        `Status changed to '${status}'`,
        req.user,
        previousStatus,
        status,
        auditRemark
      )
    );

    // Save official operator response
    if (remarks && remarks.trim()) {
      request.resolutionRemarks = remarks.trim();
    }

    if (status === 'Resolved' || status === 'Closed') {
      request.resolvedAt = new Date();
    }

    await request.save();

    return res.status(200).json({
      success: true,
      message: `Voter application status updated to '${status}'`,
      data: { request },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Delete Voter application
//  @route   DELETE /api/voter/requests/:id
//  @access  Private (Admin)
// ─────────────────────────────────────────────────────────────
export const deleteVoterRequest = async (req, res, next) => {
  try {
    const request = await VoterRequest.findByIdAndDelete(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Voter service application not found.',
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
      message: `Voter request ${request.ticketNumber} deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  @desc    Get Voter statistics
//  @route   GET /api/voter/stats
//  @access  Private
// ─────────────────────────────────────────────────────────────
export const getVoterStats = async (req, res, next) => {
  try {
    const isAdminScope = req.user?.role === 'admin' && req.query.scope === 'all';
    const matchFilter = isAdminScope ? {} : req.user ? { submittedBy: req.user._id } : { submittedBy: null };

    const [total, statusAgg, serviceAgg] = await Promise.all([
      VoterRequest.countDocuments(matchFilter),
      VoterRequest.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      VoterRequest.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$serviceType', count: { $sum: 1 } } },
      ]),
    ]);

    const byStatus = {};
    VOTER_STATUSES.forEach((st) => (byStatus[st] = 0));
    statusAgg.forEach((item) => {
      byStatus[item._id] = item.count;
    });

    const byServiceType = {};
    VOTER_SERVICE_TYPES.forEach((st) => (byServiceType[st] = 0));
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
//  @desc    Get Voter metadata
//  @route   GET /api/voter/meta
//  @access  Public / Private
// ─────────────────────────────────────────────────────────────
export const getVoterMeta = (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      serviceTypes: VOTER_SERVICE_TYPES,
      statuses: VOTER_STATUSES,
      priorities: PRIORITY_LEVELS,
      relationTypes: RELATION_TYPES,
    },
  });
};

